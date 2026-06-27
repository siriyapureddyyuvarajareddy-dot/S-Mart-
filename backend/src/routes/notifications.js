const express = require('express');
const router = express.Router();
const { supabase } = require('../config/db');
const mockDb = require('../utils/mockDb');
const { authenticateJWT } = require('../middleware/auth');

// 1. Fetch Notifications
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const isOffline = !process.env.SUPABASE_URL || !process.env.SUPABASE_KEY;
    
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

    // ONLINE MODE (SUPABASE)
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (error) throw error;
    
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
    const isOffline = !process.env.SUPABASE_URL || !process.env.SUPABASE_KEY;
    
    if (isOffline) {
      await mockDb.initMockDatabase();
      const notification = mockDb.mockNotifications.find(n => String(n._id) === String(id));
      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }
      
      notification.isRead = true;
      return res.json({ success: true, message: 'Notification marked as read' });
    }

    // ONLINE MODE (SUPABASE)
    const { data: notification, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    const { error: updErr } = await supabase
      .from('notifications')
      .update({ status: 'read' })
      .eq('id', id);

    if (updErr) throw updErr;
    
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Failed to update notification state' });
  }
});

module.exports = router;
