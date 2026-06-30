const express = require('express');
const router = express.Router();
const { supabase } = require('../config/db');
const mockDb = require('../utils/mockDb');
const { authenticateJWT, restrictTo } = require('../middleware/auth');

// 1. Get Employees List (Manager Only)
router.get('/', authenticateJWT, restrictTo('manager'), async (req, res) => {
  try {
    const isOffline = !process.env.TURSO_DATABASE_URL;
    
    if (isOffline) {
      await mockDb.initMockDatabase();
      const list = mockDb.mockEmployees.map(emp => {
        const userObj = mockDb.mockUsers.find(u => String(u._id) === String(emp.userId));
        return {
          id: emp._id,
          username: userObj ? userObj.username : 'N/A',
          email: userObj ? userObj.email : 'N/A',
          name: userObj ? userObj.name : 'N/A',
          role: userObj ? userObj.role : 'N/A',
          salary: emp.salary,
          shift: emp.shift,
          status: emp.status,
          created_at: userObj ? userObj.createdAt : new Date()
        };
      });
      return res.json(list);
    }

    // ONLINE MODE (TURSO)
    const result = await supabase.execute({
      sql: `SELECT e.*, u.username, u.email, u.name, u.role, u.created_at 
            FROM employees e 
            INNER JOIN users u ON e.user_id = u.id`
    });
    const employees = result.rows;
    
    const formatted = employees.map(e => ({
      id: e.id,
      username: e.username,
      email: e.email,
      name: e.name,
      role: e.role,
      salary: parseFloat(e.salary),
      shift: e.shift,
      status: e.status,
      created_at: e.created_at
    }));
    
    res.json(formatted);
  } catch (error) {
    console.error('Fetch employees list error:', error);
    res.status(500).json({ error: 'Failed to retrieve employee roster' });
  }
});

// 2. Change Employee Shift Configuration
router.put('/:id/shift', authenticateJWT, restrictTo('manager'), async (req, res) => {
  const { id } = req.params;
  const { shift } = req.body;
  
  if (!shift || !['morning', 'afternoon', 'night'].includes(shift)) {
    return res.status(400).json({ error: 'Valid shift schedule (morning, afternoon, night) is required' });
  }
  
  try {
    const isOffline = !process.env.TURSO_DATABASE_URL;
    
    if (isOffline) {
      await mockDb.initMockDatabase();
      const employee = mockDb.mockEmployees.find(e => String(e._id) === String(id));
      if (!employee) {
        return res.status(404).json({ error: 'Employee profile not found' });
      }
      employee.shift = shift;
      return res.json({ success: true, message: `Shift scheduled successfully to ${shift}` });
    }

    // ONLINE MODE (TURSO)
    const result = await supabase.execute({
      sql: 'SELECT * FROM employees WHERE id = ?',
      args: [id]
    });
    const employee = result.rows[0];

    if (!employee) {
      return res.status(404).json({ error: 'Employee profile not found' });
    }
    
    await supabase.execute({
      sql: 'UPDATE employees SET shift = ? WHERE id = ?',
      args: [shift, id]
    });
    
    res.json({ success: true, message: `Shift scheduled successfully to ${shift}` });
  } catch (error) {
    console.error('Update shift error:', error);
    res.status(500).json({ error: 'Failed to reschedule shift' });
  }
});

// 3. Daily Attendance Clock-in
router.post('/clock-in', authenticateJWT, async (req, res) => {
  try {
    const isOffline = !process.env.TURSO_DATABASE_URL;
    const dateToday = new Date().toISOString().split('T')[0];
    
    if (isOffline) {
      await mockDb.initMockDatabase();
      const employee = mockDb.mockEmployees.find(e => String(e.userId) === String(req.user.id));
      if (!employee) {
        return res.status(404).json({ error: 'Employee profile not found' });
      }
      
      const check = mockDb.mockAttendance.find(a => 
        String(a.employeeId) === String(employee._id) && a.date === dateToday
      );
      if (check) {
        return res.status(400).json({ error: 'Already clocked in today' });
      }
      
      const status = (employee.shift === 'morning' && new Date().getHours() >= 9) ? 'late' : 'present';
      
      const attRecord = {
        _id: `mock_att_${mockDb.mockAttendance.length + 1}`,
        employeeId: employee._id,
        date: dateToday,
        checkIn: new Date().toLocaleTimeString(),
        checkOut: null,
        status,
        createdAt: new Date()
      };
      
      mockDb.mockAttendance.push(attRecord);
      
      return res.status(201).json({
        success: true,
        message: 'Clocked in successfully',
        record: {
          id: attRecord._id,
          date: attRecord.date,
          check_in: attRecord.checkIn,
          status: attRecord.status
        }
      });
    }

    // ONLINE MODE (TURSO)
    const empResult = await supabase.execute({
      sql: 'SELECT * FROM employees WHERE user_id = ?',
      args: [req.user.id]
    });
    const employee = empResult.rows[0];

    if (!employee) {
      return res.status(404).json({ error: 'Employee profile not found' });
    }
    
    const checkResult = await supabase.execute({
      sql: 'SELECT * FROM attendance WHERE employee_id = ? AND date = ?',
      args: [employee.id, dateToday]
    });
    if (checkResult.rows.length > 0) {
      return res.status(400).json({ error: 'Already clocked in today' });
    }
    
    const timeNow = new Date().toLocaleTimeString();
    const status = (employee.shift === 'morning' && new Date().getHours() >= 9) ? 'late' : 'present';
    
    const insertResult = await supabase.execute({
      sql: 'INSERT INTO attendance (employee_id, date, check_in, status) VALUES (?, ?, ?, ?)',
      args: [employee.id, dateToday, timeNow, status]
    });
    
    res.status(201).json({
      success: true,
      message: 'Clocked in successfully',
      record: {
        id: Number(insertResult.lastInsertRowid),
        date: dateToday,
        check_in: timeNow,
        status
      }
    });
  } catch (error) {
    console.error('Clock in error:', error);
    res.status(500).json({ error: 'Failed to record clock-in attendance' });
  }
});

// 4. Daily Attendance Clock-out
router.post('/clock-out', authenticateJWT, async (req, res) => {
  try {
    const isOffline = !process.env.TURSO_DATABASE_URL;
    const dateToday = new Date().toISOString().split('T')[0];
    
    if (isOffline) {
      await mockDb.initMockDatabase();
      const employee = mockDb.mockEmployees.find(e => String(e.userId) === String(req.user.id));
      if (!employee) {
        return res.status(404).json({ error: 'Employee profile not found' });
      }
      
      const check = mockDb.mockAttendance.find(a => 
        String(a.employeeId) === String(employee._id) && a.date === dateToday
      );
      if (!check) {
        return res.status(400).json({ error: 'Must clock-in first before clocking-out' });
      }
      if (check.checkOut) {
        return res.status(400).json({ error: 'Already clocked out today' });
      }
      
      check.checkOut = new Date().toLocaleTimeString();
      return res.json({
        success: true,
        message: 'Clocked out successfully',
        record: {
          id: check._id,
          date: check.date,
          check_in: check.checkIn,
          check_out: check.checkOut,
          status: check.status
        }
      });
    }

    // ONLINE MODE (TURSO)
    const empResult = await supabase.execute({
      sql: 'SELECT * FROM employees WHERE user_id = ?',
      args: [req.user.id]
    });
    const employee = empResult.rows[0];

    if (!employee) {
      return res.status(404).json({ error: 'Employee profile not found' });
    }
    
    const checkResult = await supabase.execute({
      sql: 'SELECT * FROM attendance WHERE employee_id = ? AND date = ?',
      args: [employee.id, dateToday]
    });
    const record = checkResult.rows[0];

    if (!record) {
      return res.status(400).json({ error: 'Must clock-in first before clocking-out' });
    }
    if (record.check_out) {
      return res.status(400).json({ error: 'Already clocked out today' });
    }
    
    const timeNow = new Date().toLocaleTimeString();
    await supabase.execute({
      sql: 'UPDATE attendance SET check_out = ? WHERE id = ?',
      args: [timeNow, record.id]
    });
    
    res.json({
      success: true,
      message: 'Clocked out successfully',
      record: {
        id: record.id,
        date: record.date,
        check_in: record.check_in,
        check_out: timeNow,
        status: record.status
      }
    });
  } catch (error) {
    console.error('Clock out error:', error);
    res.status(500).json({ error: 'Failed to record clock-out attendance' });
  }
});

// 5. Get Logged Attendance History (30 days)
router.get('/attendance-logs', authenticateJWT, async (req, res) => {
  try {
    const isOffline = !process.env.TURSO_DATABASE_URL;
    
    if (isOffline) {
      await mockDb.initMockDatabase();
      const employee = mockDb.mockEmployees.find(e => String(e.userId) === String(req.user.id));
      if (!employee) {
        return res.status(404).json({ error: 'Employee profile not found' });
      }
      
      const list = mockDb.mockAttendance
        .filter(a => String(a.employeeId) === String(employee._id))
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 30)
        .map(a => ({
          id: a._id,
          date: a.date,
          check_in: a.checkIn,
          check_out: a.checkOut,
          status: a.status
        }));
        
      return res.json(list);
    }

    // ONLINE MODE (TURSO)
    const empResult = await supabase.execute({
      sql: 'SELECT * FROM employees WHERE user_id = ?',
      args: [req.user.id]
    });
    const employee = empResult.rows[0];

    if (!employee) {
      return res.status(404).json({ error: 'Employee profile not found' });
    }
    
    const attResult = await supabase.execute({
      sql: 'SELECT * FROM attendance WHERE employee_id = ? ORDER BY date DESC LIMIT 30',
      args: [employee.id]
    });
    const logs = attResult.rows;
    
    const formatted = logs.map(l => ({
      id: l.id,
      date: l.date,
      check_in: l.check_in,
      check_out: l.check_out,
      status: l.status
    }));
    
    res.json(formatted);
  } catch (error) {
    console.error('Fetch attendance logs error:', error);
    res.status(500).json({ error: 'Failed to retrieve attendance logs' });
  }
});

// 6. Get Attendance Report (Manager Dashboard)
router.get('/attendance/report', authenticateJWT, restrictTo('manager'), async (req, res) => {
  try {
    const isOffline = !process.env.TURSO_DATABASE_URL;
    
    if (isOffline) {
      await mockDb.initMockDatabase();
      const list = mockDb.mockAttendance.map(a => ({
        id: a._id,
        employeeId: a.employeeId,
        date: a.date,
        check_in: a.checkIn,
        check_out: a.checkOut,
        status: a.status
      }));
      return res.json(list);
    }

    // ONLINE MODE (TURSO)
    const result = await supabase.execute({
      sql: 'SELECT * FROM attendance ORDER BY date DESC, created_at DESC'
    });
    const formatted = result.rows.map(row => ({
      id: row.id,
      employeeId: row.employee_id,
      date: row.date,
      check_in: row.check_in,
      check_out: row.check_out,
      status: row.status
    }));
    res.json(formatted);
  } catch (error) {
    console.error('Fetch attendance report error:', error);
    res.status(500).json({ error: 'Failed to retrieve attendance report' });
  }
});

// 7. Manager check-in for specific employee
router.post('/attendance/checkin', authenticateJWT, restrictTo('manager'), async (req, res) => {
  const { employeeId } = req.body;
  if (!employeeId) {
    return res.status(400).json({ error: 'Employee ID is required' });
  }
  
  try {
    const isOffline = !process.env.TURSO_DATABASE_URL;
    const dateToday = new Date().toISOString().split('T')[0];
    
    if (isOffline) {
      await mockDb.initMockDatabase();
      const employee = mockDb.mockEmployees.find(e => String(e._id) === String(employeeId));
      if (!employee) {
        return res.status(404).json({ error: 'Employee profile not found' });
      }
      
      const check = mockDb.mockAttendance.find(a => 
        String(a.employeeId) === String(employeeId) && a.date === dateToday
      );
      if (check) {
        return res.status(400).json({ error: 'Employee already checked in today' });
      }
      
      const status = (employee.shift === 'morning' && new Date().getHours() >= 9) ? 'late' : 'present';
      mockDb.mockAttendance.push({
        _id: `mock_att_${mockDb.mockAttendance.length + 1}`,
        employeeId,
        date: dateToday,
        checkIn: new Date().toLocaleTimeString(),
        checkOut: null,
        status,
        createdAt: new Date()
      });
      return res.json({ success: true, message: 'Check-in logged successfully' });
    }

    // ONLINE MODE (TURSO)
    const empResult = await supabase.execute({
      sql: 'SELECT * FROM employees WHERE id = ?',
      args: [employeeId]
    });
    const employee = empResult.rows[0];
    if (!employee) {
      return res.status(404).json({ error: 'Employee profile not found' });
    }
    
    const checkResult = await supabase.execute({
      sql: 'SELECT * FROM attendance WHERE employee_id = ? AND date = ?',
      args: [employeeId, dateToday]
    });
    if (checkResult.rows.length > 0) {
      return res.status(400).json({ error: 'Employee already checked in today' });
    }
    
    const timeNow = new Date().toLocaleTimeString();
    const status = (employee.shift === 'morning' && new Date().getHours() >= 9) ? 'late' : 'present';
    
    await supabase.execute({
      sql: 'INSERT INTO attendance (employee_id, date, check_in, status) VALUES (?, ?, ?, ?)',
      args: [employeeId, dateToday, timeNow, status]
    });
    
    res.json({ success: true, message: 'Check-in logged successfully' });
  } catch (error) {
    console.error('Manager checkin error:', error);
    res.status(500).json({ error: 'Failed to record check-in' });
  }
});

// 8. Manager check-out for specific employee
router.post('/attendance/checkout', authenticateJWT, restrictTo('manager'), async (req, res) => {
  const { employeeId } = req.body;
  if (!employeeId) {
    return res.status(400).json({ error: 'Employee ID is required' });
  }
  
  try {
    const isOffline = !process.env.TURSO_DATABASE_URL;
    const dateToday = new Date().toISOString().split('T')[0];
    
    if (isOffline) {
      await mockDb.initMockDatabase();
      const check = mockDb.mockAttendance.find(a => 
        String(a.employeeId) === String(employeeId) && a.date === dateToday
      );
      if (!check) {
        return res.status(400).json({ error: 'Employee must clock-in first today' });
      }
      if (check.checkOut) {
        return res.status(400).json({ error: 'Employee already checked out today' });
      }
      
      check.checkOut = new Date().toLocaleTimeString();
      return res.json({ success: true, message: 'Check-out logged successfully' });
    }

    // ONLINE MODE (TURSO)
    const checkResult = await supabase.execute({
      sql: 'SELECT * FROM attendance WHERE employee_id = ? AND date = ?',
      args: [employeeId, dateToday]
    });
    const record = checkResult.rows[0];
    if (!record) {
      return res.status(400).json({ error: 'Employee must clock-in first today' });
    }
    if (record.check_out) {
      return res.status(400).json({ error: 'Employee already checked out today' });
    }
    
    const timeNow = new Date().toLocaleTimeString();
    await supabase.execute({
      sql: 'UPDATE attendance SET check_out = ? WHERE id = ?',
      args: [timeNow, record.id]
    });
    
    res.json({ success: true, message: 'Check-out logged successfully' });
  } catch (error) {
    console.error('Manager checkout error:', error);
    res.status(500).json({ error: 'Failed to record check-out' });
  }
});

module.exports = router;
