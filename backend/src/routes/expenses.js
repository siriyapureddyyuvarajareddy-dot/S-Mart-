const express = require('express');
const router = express.Router();
const { supabase } = require('../config/db');
const mockDb = require('../utils/mockDb');
const { authenticateJWT, restrictTo } = require('../middleware/auth');

// 1. Get Expenses (Managers and Admins)
router.get('/', authenticateJWT, restrictTo('manager'), async (req, res) => {
  try {
    const isOffline = !process.env.SUPABASE_URL || !process.env.SUPABASE_KEY;
    
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

    // ONLINE MODE (SUPABASE)
    const { data: expenses, error } = await supabase
      .from('expenses')
      .select('*')
      .order('date', { ascending: false });
      
    if (error) throw error;

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
    const isOffline = !process.env.SUPABASE_URL || !process.env.SUPABASE_KEY;
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

    // ONLINE MODE (SUPABASE)
    const { data: expense, error } = await supabase
      .from('expenses')
      .insert({
        title: title.trim(),
        category: category.trim(),
        amount: parseFloat(amount),
        description: description || '',
        date: date ? new Date(date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        created_by: userId
      })
      .select()
      .single();
      
    if (error || !expense) {
      throw error || new Error('Failed to create expense');
    }
    
    res.status(201).json({
      id: expense.id,
      title: expense.title,
      category: expense.category,
      amount: parseFloat(expense.amount),
      description: expense.description,
      date: expense.date,
      created_by: expense.created_by
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
    const isOffline = !process.env.SUPABASE_URL || !process.env.SUPABASE_KEY;
    
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

    // ONLINE MODE (SUPABASE)
    const { data: originalExpense, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !originalExpense) {
      return res.status(404).json({ error: 'Expense record not found' });
    }
    
    const nextTitle = title ? title.trim() : originalExpense.title;
    const nextCategory = category ? category.trim() : originalExpense.category;
    const nextAmount = amount !== undefined ? parseFloat(amount) : originalExpense.amount;
    const nextDescription = description !== undefined ? description : originalExpense.description;
    const nextDate = date ? new Date(date).toISOString().split('T')[0] : originalExpense.date;

    const { error: updErr } = await supabase
      .from('expenses')
      .update({
        title: nextTitle,
        category: nextCategory,
        amount: nextAmount,
        description: nextDescription,
        date: nextDate
      })
      .eq('id', id);

    if (updErr) throw updErr;
    
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
    const isOffline = !process.env.SUPABASE_URL || !process.env.SUPABASE_KEY;
    
    if (isOffline) {
      await mockDb.initMockDatabase();
      const index = mockDb.mockExpenses.findIndex(e => String(e._id) === String(id));
      if (index === -1) {
        return res.status(404).json({ error: 'Expense record not found' });
      }
      mockDb.mockExpenses.splice(index, 1);
      return res.json({ success: true, message: 'Expense record deleted successfully' });
    }

    // ONLINE MODE (SUPABASE)
    const { data: expense, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !expense) {
      return res.status(404).json({ error: 'Expense record not found' });
    }
    
    await supabase.from('expenses').delete().eq('id', id);
    res.json({ success: true, message: 'Expense record deleted successfully' });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

module.exports = router;
