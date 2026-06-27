const express = require('express');
const router = express.Router();
const { supabase } = require('../config/db');
const mockDb = require('../utils/mockDb');
const { authenticateJWT } = require('../middleware/auth');

// 1. Fetch Notifications
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const isOffline = !process.env.TURSO_DATABASE_URL;
    
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

    // ONLINE MODE (TURSO)
    const result = await supabase.execute({
      sql: 'SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50'
    });
    const notifications = result.rows;
    
    const formatted = notifications.map(n => ({
      id: n.id,
      user_id: null,
      role_target: 'staff',
      title: n.title,
      message: n.message,
      type: n.type,
      is_read: n.status === 'read' ? 1 : 0,
      created_at: n.created_at
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
    const isOffline = !process.env.TURSO_DATABASE_URL;
    
    if (isOffline) {
      await mockDb.initMockDatabase();
      const notification = mockDb.mockNotifications.find(n => String(n._id) === String(id));
      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }
      
      notification.isRead = true;
      return res.json({ success: true, message: 'Notification marked as read' });
    }

    // ONLINE MODE (TURSO)
    const result = await supabase.execute({
      sql: 'SELECT * FROM notifications WHERE id = ?',
      args: [id]
    });
    const notification = result.rows[0];

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    await supabase.execute({
      sql: 'UPDATE notifications SET status = ? WHERE id = ?',
      args: ['read', id]
    });
    
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Failed to update notification state' });
  }
});

module.exports = router;
