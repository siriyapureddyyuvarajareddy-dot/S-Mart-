const express = require('express');
const router = express.Router();
const { supabase } = require('../config/db');
const mockDb = require('../utils/mockDb');
const { authenticateJWT, restrictTo } = require('../middleware/auth');

// 1. Get Expenses (Managers and Admins)
router.get('/', authenticateJWT, restrictTo('manager'), async (req, res) => {
  try {
    const isOffline = !process.env.TURSO_DATABASE_URL;
    
    if (isOffline) {
      await mockDb.initMockDatabase();
      const formatted = mockDb.mockExpenses.map(e => ({
        id: e._id,
        title: e.title,
        category: e.category,
        amount: e.amount,
        description: e.description,
        date: e.date,
        created_by: e.createdBy
      }));
      return res.json(formatted);
    }

    // ONLINE MODE (TURSO)
    const result = await supabase.execute({
      sql: 'SELECT * FROM expenses ORDER BY date DESC'
    });
    const expenses = result.rows;

    const formatted = expenses.map(e => ({
      id: e.id,
      title: e.title,
      category: e.category,
      amount: parseFloat(e.amount),
      description: e.description,
      date: e.date,
      created_by: e.created_by
    }));
    res.json(formatted);
  } catch (error) {
    console.error('Fetch expenses error:', error);
    res.status(500).json({ error: 'Failed to retrieve expenses list' });
  }
});

// 2. Add Expense
router.post('/', authenticateJWT, restrictTo('manager'), async (req, res) => {
  const { title, category, amount, description, date } = req.body;
  
  if (!title || !category || amount === undefined) {
    return res.status(400).json({ error: 'Title, category and amount are required' });
  }
  
  try {
    const isOffline = !process.env.TURSO_DATABASE_URL;
    const userId = req.user.id || 'mock_user_1';
    
    if (isOffline) {
      await mockDb.initMockDatabase();
      
      const expense = {
        _id: `mock_exp_${mockDb.mockExpenses.length + 1}`,
        title: title.trim(),
        category: category.trim(),
        amount: Number(amount),
        description: description || '',
        date: date ? new Date(date) : new Date(),
        createdBy: userId,
        createdAt: new Date()
      };
      
      mockDb.mockExpenses.push(expense);
      
      return res.status(201).json({
        id: expense._id,
        title: expense.title,
        category: expense.category,
        amount: expense.amount,
        description: expense.description,
        date: expense.date,
        created_by: expense.createdBy
      });
    }

    // ONLINE MODE (TURSO)
    const formattedDate = date ? new Date(date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    const insertRes = await supabase.execute({
      sql: 'INSERT INTO expenses (title, category, amount, description, date, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      args: [title.trim(), category.trim(), parseFloat(amount), description || '', formattedDate, userId]
    });
    
    res.status(201).json({
      id: Number(insertRes.lastInsertRowid),
      title: title.trim(),
      category: category.trim(),
      amount: parseFloat(amount),
      description: description || '',
      date: formattedDate,
      created_by: userId
    });
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ error: 'Failed to log expense' });
  }
});

// 3. Update Expense
router.put('/:id', authenticateJWT, restrictTo('manager'), async (req, res) => {
  const { id } = req.params;
  const { title, category, amount, description, date } = req.body;
  
  try {
    const isOffline = !process.env.TURSO_DATABASE_URL;
    
    if (isOffline) {
      await mockDb.initMockDatabase();
      const expense = mockDb.mockExpenses.find(e => String(e._id) === String(id));
      if (!expense) {
        return res.status(404).json({ error: 'Expense record not found' });
      }
      
      expense.title = title ? title.trim() : expense.title;
      expense.category = category ? category.trim() : expense.category;
      expense.amount = amount !== undefined ? Number(amount) : expense.amount;
      expense.description = description !== undefined ? description : expense.description;
      expense.date = date ? new Date(date) : expense.date;
      
      return res.json({
        id: expense._id,
        title: expense.title,
        category: expense.category,
        amount: expense.amount,
        description: expense.description,
        date: expense.date,
        created_by: expense.createdBy
      });
    }

    // ONLINE MODE (TURSO)
    const result = await supabase.execute({
      sql: 'SELECT * FROM expenses WHERE id = ?',
      args: [id]
    });
    const originalExpense = result.rows[0];

    if (!originalExpense) {
      return res.status(404).json({ error: 'Expense record not found' });
    }
    
    const nextTitle = title ? title.trim() : originalExpense.title;
    const nextCategory = category ? category.trim() : originalExpense.category;
    const nextAmount = amount !== undefined ? parseFloat(amount) : originalExpense.amount;
    const nextDescription = description !== undefined ? description : originalExpense.description;
    const nextDate = date ? new Date(date).toISOString().split('T')[0] : originalExpense.date;

    await supabase.execute({
      sql: 'UPDATE expenses SET title = ?, category = ?, amount = ?, description = ?, date = ? WHERE id = ?',
      args: [nextTitle, nextCategory, nextAmount, nextDescription, nextDate, id]
    });
    
    res.json({
      id: originalExpense.id,
      title: nextTitle,
      category: nextCategory,
      amount: nextAmount,
      description: nextDescription,
      date: nextDate,
      created_by: originalExpense.created_by
    });
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({ error: 'Failed to update expense details' });
  }
});

// 4. Delete Expense
router.delete('/:id', authenticateJWT, restrictTo('manager'), async (req, res) => {
  const { id } = req.params;
  
  try {
    const isOffline = !process.env.TURSO_DATABASE_URL;
    
    if (isOffline) {
      await mockDb.initMockDatabase();
      const index = mockDb.mockExpenses.findIndex(e => String(e._id) === String(id));
      if (index === -1) {
        return res.status(404).json({ error: 'Expense record not found' });
      }
      mockDb.mockExpenses.splice(index, 1);
      return res.json({ success: true, message: 'Expense record deleted successfully' });
    }

    // ONLINE MODE (TURSO)
    const result = await supabase.execute({
      sql: 'SELECT * FROM expenses WHERE id = ?',
      args: [id]
    });
    const expense = result.rows[0];

    if (!expense) {
      return res.status(404).json({ error: 'Expense record not found' });
    }
    
    await supabase.execute({
      sql: 'DELETE FROM expenses WHERE id = ?',
      args: [id]
    });
    res.json({ success: true, message: 'Expense record deleted successfully' });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

module.exports = router;
