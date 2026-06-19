const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Expense = require('../models/Expense');
const mockDb = require('../utils/mockDb');
const { authenticateJWT, restrictTo } = require('../middleware/auth');

// 1. Get Expenses (Managers and Admins)
router.get('/', authenticateJWT, restrictTo('manager'), async (req, res) => {
  try {
    const isOffline = mongoose.connection.readyState !== 1;
    
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

    // ONLINE MODE
    const expenses = await Expense.find().sort({ date: -1 });
    const formatted = expenses.map(e => ({
      id: e._id,
      title: e.title,
      category: e.category,
      amount: e.amount,
      description: e.description,
      date: e.date,
      created_by: e.createdBy
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
    const isOffline = mongoose.connection.readyState !== 1;
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

    // ONLINE MODE
    const expense = await Expense.create({
      title: title.trim(),
      category: category.trim(),
      amount: Number(amount),
      description: description || '',
      date: date ? new Date(date) : new Date(),
      createdBy: userId
    });
    
    res.status(201).json({
      id: expense._id,
      title: expense.title,
      category: expense.category,
      amount: expense.amount,
      description: expense.description,
      date: expense.date,
      created_by: expense.createdBy
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
    const isOffline = mongoose.connection.readyState !== 1;
    
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

    // ONLINE MODE
    const expense = await Expense.findById(id);
    if (!expense) {
      return res.status(404).json({ error: 'Expense record not found' });
    }
    
    expense.title = title ? title.trim() : expense.title;
    expense.category = category ? category.trim() : expense.category;
    expense.amount = amount !== undefined ? Number(amount) : expense.amount;
    expense.description = description !== undefined ? description : expense.description;
    expense.date = date ? new Date(date) : expense.date;
    
    await expense.save();
    
    res.json({
      id: expense._id,
      title: expense.title,
      category: expense.category,
      amount: expense.amount,
      description: expense.description,
      date: expense.date,
      created_by: expense.createdBy
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
    const isOffline = mongoose.connection.readyState !== 1;
    
    if (isOffline) {
      await mockDb.initMockDatabase();
      const index = mockDb.mockExpenses.findIndex(e => String(e._id) === String(id));
      if (index === -1) {
        return res.status(404).json({ error: 'Expense record not found' });
      }
      mockDb.mockExpenses.splice(index, 1);
      return res.json({ success: true, message: 'Expense record deleted successfully' });
    }

    // ONLINE MODE
    const expense = await Expense.findById(id);
    if (!expense) {
      return res.status(404).json({ error: 'Expense record not found' });
    }
    await Expense.findByIdAndDelete(id);
    res.json({ success: true, message: 'Expense record deleted successfully' });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

module.exports = router;
