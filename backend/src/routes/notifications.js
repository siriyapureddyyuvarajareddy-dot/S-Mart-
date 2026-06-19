const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const mockDb = require('../utils/mockDb');
const { authenticateJWT } = require('../middleware/auth');

// 1. Fetch Notifications
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const isOffline = mongoose.connection.readyState !== 1;
    
    if (isOffline) {
      await mockDb.initMockDatabase();
      
      const rolesToCheck = ['staff'];
      if (['manager', 'cashier', 'inventory'].includes(req.user.role)) {
        rolesToCheck.push(req.user.role, 'inventory', 'manager');
      } else {
        rolesToCheck.push(req.user.role);
      }
      
      const list = mockDb.mockNotifications.filter(n => 
        String(n.userId) === String(req.user.id) || rolesToCheck.includes(n.roleTarget)
      );
      
      const formatted = list.map(n => ({
        id: n._id,
        user_id: n.userId,
        role_target: n.roleTarget,
        title: n.title,
        message: n.message,
        type: n.type,
        is_read: n.isRead ? 1 : 0,
        created_at: n.createdAt
      }));
      return res.json(formatted);
    }

    // ONLINE MODE
    const rolesToCheck = ['staff'];
    if (['manager', 'cashier', 'inventory'].includes(req.user.role)) {
      rolesToCheck.push(req.user.role, 'inventory', 'manager');
    } else {
      rolesToCheck.push(req.user.role);
    }
    
    const notifications = await Notification.find({
      $or: [
        { userId: req.user.id },
        { roleTarget: { $in: rolesToCheck } }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(50);
    
    const formatted = notifications.map(n => ({
      id: n._id,
      user_id: n.userId,
      role_target: n.roleTarget,
      title: n.title,
      message: n.message,
      type: n.type,
      is_read: n.isRead ? 1 : 0,
      created_at: n.createdAt
    }));
    
    res.json(formatted);
  } catch (error) {
    console.error('Fetch notifications error:', error);
    res.status(500).json({ error: 'Failed to retrieve notifications' });
  }
});

// 2. Mark Notification as Read
router.put('/:id/read', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  try {
    const isOffline = mongoose.connection.readyState !== 1;
    
    if (isOffline) {
      await mockDb.initMockDatabase();
      const notification = mockDb.mockNotifications.find(n => String(n._id) === String(id));
      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }
      
      notification.isRead = true;
      return res.json({ success: true, message: 'Notification marked as read' });
    }

    // ONLINE MODE
    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    notification.isRead = true;
    await notification.save();
    
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Failed to update notification state' });
  }
});

module.exports = router;
