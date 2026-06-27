const express = require('express');
const router = express.Router();
const { supabase } = require('../config/db');
const mockDb = require('../utils/mockDb');
const { authenticateJWT, restrictTo } = require('../middleware/auth');

// 1. Get Employees List
router.get('/', authenticateJWT, restrictTo('manager'), async (req, res) => {
  try {
    const isOffline = !process.env.SUPABASE_URL || !process.env.SUPABASE_KEY;
    
    if (isOffline) {
      await mockDb.initMockDatabase();
      const formatted = mockDb.mockEmployees.map(emp => {
        const userObj = mockDb.mockUsers.find(u => String(u._id) === String(emp.userId));
        return {
          id: emp._id,
          salary: emp.salary,
          shift: emp.shift,
          status: emp.status,
          username: userObj ? userObj.username : 'N/A',
          email: userObj ? userObj.email : 'N/A',
          name: userObj ? userObj.name : 'N/A',
          role: userObj ? userObj.role : 'N/A'
        };
      });
      return res.json(formatted);
    }

    // ONLINE MODE (SUPABASE)
    const { data: employees, error } = await supabase
      .from('employees')
      .select('*, users(username, email, name, role)');
      
    if (error) throw error;
      
    const formatted = employees.map(emp => ({
      id: emp.id,
      salary: parseFloat(emp.salary),
      shift: emp.shift,
      status: emp.status,
      username: emp.users ? emp.users.username : 'N/A',
      email: emp.users ? emp.users.email : 'N/A',
      name: emp.users ? emp.users.name : 'N/A',
      role: emp.users ? emp.users.role : 'N/A'
    }));
    
    res.json(formatted);
  } catch (error) {
    console.error('Fetch employees error:', error);
    res.status(500).json({ error: 'Failed to retrieve employee roster' });
  }
});

// 2. Clock In
router.post('/attendance/checkin', authenticateJWT, async (req, res) => {
  const { employeeId } = req.body;
  
  if (!employeeId) {
    return res.status(400).json({ error: 'Employee ID is required for checking in' });
  }
  
  const today = new Date().toISOString().split('T')[0];
  const nowTime = new Date().toTimeString().split(' ')[0]; // HH:MM:SS
  
  try {
    const isOffline = !process.env.SUPABASE_URL || !process.env.SUPABASE_KEY;
    
    if (isOffline) {
      await mockDb.initMockDatabase();
      const existing = mockDb.mockAttendance.find(a => String(a.employeeId) === String(employeeId) && a.date === today);
      if (existing) {
        return res.status(400).json({ error: 'Employee already checked in for today' });
      }
      
      const hour = parseInt(nowTime.split(':')[0], 10);
      const minute = parseInt(nowTime.split(':')[1], 10);
      let status = 'present';
      if (hour > 9 || (hour === 9 && minute > 30)) {
        status = 'late';
      }
      
      mockDb.mockAttendance.push({
        _id: `mock_att_${mockDb.mockAttendance.length + 1}`,
        employeeId,
        date: today,
        checkIn: nowTime,
        checkOut: null,
        status
      });
      
      return res.status(201).json({ success: true, message: 'Check-in recorded', time: nowTime, status });
    }

    // ONLINE MODE (SUPABASE)
    const { data: existing, error: checkErr } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('date', today)
      .maybeSingle();
      
    if (existing) {
      return res.status(400).json({ error: 'Employee already checked in for today' });
    }
    
    const hour = parseInt(nowTime.split(':')[0], 10);
    const minute = parseInt(nowTime.split(':')[1], 10);
    let status = 'present';
    if (hour > 9 || (hour === 9 && minute > 30)) {
      status = 'late';
    }
    
    const { error: insErr } = await supabase
      .from('attendance')
      .insert({
        employee_id: employeeId,
        date: today,
        check_in: nowTime,
        status
      });

    if (insErr) throw insErr;
    
    res.status(201).json({ success: true, message: 'Check-in recorded', time: nowTime, status });
  } catch (error) {
    console.error('Attendance check-in error:', error);
    res.status(500).json({ error: 'Failed to log check-in' });
  }
});

// 3. Clock Out
router.post('/attendance/checkout', authenticateJWT, async (req, res) => {
  const { employeeId } = req.body;
  
  if (!employeeId) {
    return res.status(400).json({ error: 'Employee ID is required for checking out' });
  }
  
  const today = new Date().toISOString().split('T')[0];
  const nowTime = new Date().toTimeString().split(' ')[0]; // HH:MM:SS
  
  try {
    const isOffline = !process.env.SUPABASE_URL || !process.env.SUPABASE_KEY;
    
    if (isOffline) {
      await mockDb.initMockDatabase();
      const record = mockDb.mockAttendance.find(a => String(a.employeeId) === String(employeeId) && a.date === today);
      if (!record) {
        return res.status(400).json({ error: 'No check-in record found for today.' });
      }
      
      record.checkOut = nowTime;
      return res.json({ success: true, message: 'Check-out recorded', time: nowTime });
    }

    // ONLINE MODE (SUPABASE)
    const { data: record, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('date', today)
      .maybeSingle();

    if (error || !record) {
      return res.status(400).json({ error: 'No check-in record found for today. Please check in first.' });
    }
    
    const { error: updErr } = await supabase
      .from('attendance')
      .update({ check_out: nowTime })
      .eq('id', record.id);
      
    if (updErr) throw updErr;
    
    res.json({ success: true, message: 'Check-out recorded', time: nowTime });
  } catch (error) {
    console.error('Attendance check-out error:', error);
    res.status(500).json({ error: 'Failed to log check-out' });
  }
});

// 4. Retrieve Attendance Log report
router.get('/attendance/report', authenticateJWT, restrictTo('manager'), async (req, res) => {
  try {
    const isOffline = !process.env.SUPABASE_URL || !process.env.SUPABASE_KEY;
    
    if (isOffline) {
      await mockDb.initMockDatabase();
      const formatted = mockDb.mockAttendance.map(att => {
        const emp = mockDb.mockEmployees.find(e => String(e._id) === String(att.employeeId));
        const userObj = emp ? mockDb.mockUsers.find(u => String(u._id) === String(emp.userId)) : null;
        return {
          id: att._id,
          employeeId: att.employeeId,
          date: att.date,
          check_in: att.checkIn,
          check_out: att.checkOut,
          status: att.status,
          name: userObj ? userObj.name : 'N/A',
          role: userObj ? userObj.role : 'N/A',
          shift: emp ? emp.shift : 'morning'
        };
      });
      return res.json(formatted);
    }

    // ONLINE MODE (SUPABASE)
    const { data: report, error } = await supabase
      .from('attendance')
      .select('*, employees(*, users(name, role))')
      .order('date', { ascending: false });
      
    if (error) throw error;
      
    const formatted = report.map(att => ({
      id: att.id,
      employeeId: att.employee_id,
      date: att.date,
      check_in: att.check_in,
      check_out: att.check_out,
      status: att.status,
      name: att.employees && att.employees.users ? att.employees.users.name : 'N/A',
      role: att.employees && att.employees.users ? att.employees.users.role : 'N/A',
      shift: att.employees ? att.employees.shift : 'morning'
    }));
    
    res.json(formatted);
  } catch (error) {
    console.error('Fetch attendance report error:', error);
    res.status(500).json({ error: 'Failed to retrieve attendance logs' });
  }
});

module.exports = router;
