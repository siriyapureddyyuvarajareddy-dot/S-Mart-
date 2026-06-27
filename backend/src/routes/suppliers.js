const express = require('express');
const router = express.Router();
const { supabase } = require('../config/db');
const mockDb = require('../utils/mockDb');
const { authenticateJWT, restrictTo } = require('../middleware/auth');

// 1. Get Suppliers
router.get('/', authenticateJWT, restrictTo('manager', 'inventory'), async (req, res) => {
  try {
    const isOffline = !process.env.TURSO_DATABASE_URL;
    
    if (isOffline) {
      await mockDb.initMockDatabase();
      const formatted = mockDb.mockSuppliers.map(s => ({
        id: s._id,
        name: s.name,
        contact_person: s.contactPerson,
        phone: s.phone,
        email: s.email,
        address: s.address,
        gstin: s.gstin,
        created_at: s.createdAt
      }));
      return res.json(formatted);
    }

    // ONLINE MODE (TURSO)
    const result = await supabase.execute({
      sql: 'SELECT * FROM suppliers ORDER BY created_at DESC'
    });
    const suppliers = result.rows;
    
    const formatted = suppliers.map(s => ({
      id: s.id,
      name: s.name,
      contact_person: s.contact_person,
      phone: s.phone,
      email: s.email,
      address: s.address,
      gstin: s.gstin,
      created_at: s.created_at
    }));
    res.json(formatted);
  } catch (error) {
    console.error('Fetch suppliers error:', error);
    res.status(500).json({ error: 'Failed to retrieve suppliers list' });
  }
});

// 2. Add Supplier
router.post('/', authenticateJWT, restrictTo('manager'), async (req, res) => {
  const { name, contactPerson, phone, email, address, gstin } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Supplier name is required' });
  }
  
  try {
    const isOffline = !process.env.TURSO_DATABASE_URL;
    
    if (isOffline) {
      await mockDb.initMockDatabase();
      const duplicate = mockDb.mockSuppliers.find(s => s.name.toLowerCase() === name.trim().toLowerCase());
      if (duplicate) {
        return res.status(400).json({ error: 'Supplier name already exists' });
      }
      
      const supplier = {
        _id: `mock_sup_${mockDb.mockSuppliers.length + 1}`,
        name: name.trim(),
        contactPerson: contactPerson || '',
        phone: phone || '',
        email: email || '',
        address: address || '',
        gstin: gstin || '',
        createdAt: new Date()
      };
      
      mockDb.mockSuppliers.push(supplier);
      
      return res.status(201).json({
        id: supplier._id,
        name: supplier.name,
        contact_person: supplier.contactPerson,
        phone: supplier.phone,
        email: supplier.email,
        address: supplier.address,
        gstin: supplier.gstin
      });
    }

    // ONLINE MODE (TURSO)
    const dupResult = await supabase.execute({
      sql: 'SELECT * FROM suppliers WHERE name = ?',
      args: [name.trim()]
    });
    if (dupResult.rows.length > 0) {
      return res.status(400).json({ error: 'Supplier name already exists' });
    }

    const insertResult = await supabase.execute({
      sql: 'INSERT INTO suppliers (name, contact_person, phone, email, address, gstin) VALUES (?, ?, ?, ?, ?, ?)',
      args: [name.trim(), contactPerson || '', phone || '', email || '', address || '', gstin || '']
    });
    const newId = Number(insertResult.lastInsertRowid);
    
    res.status(201).json({
      id: newId,
      name: name.trim(),
      contact_person: contactPerson || '',
      phone: phone || '',
      email: email || '',
      address: address || '',
      gstin: gstin || ''
    });
  } catch (error) {
    console.error('Create supplier error:', error);
    res.status(500).json({ error: 'Failed to register supplier' });
  }
});

// 3. Update Supplier
router.put('/:id', authenticateJWT, restrictTo('manager'), async (req, res) => {
  const { id } = req.params;
  const { name, contactPerson, phone, email, address, gstin } = req.body;
  
  try {
    const isOffline = !process.env.TURSO_DATABASE_URL;
    
    if (isOffline) {
      await mockDb.initMockDatabase();
      const supplier = mockDb.mockSuppliers.find(s => String(s._id) === String(id));
      if (!supplier) {
        return res.status(404).json({ error: 'Supplier not found' });
      }
      
      supplier.name = name ? name.trim() : supplier.name;
      supplier.contactPerson = contactPerson !== undefined ? contactPerson : supplier.contactPerson;
      supplier.phone = phone !== undefined ? phone : supplier.phone;
      supplier.email = email !== undefined ? email : supplier.email;
      supplier.address = address !== undefined ? address : supplier.address;
      supplier.gstin = gstin !== undefined ? gstin : supplier.gstin;
      
      return res.json({
        id: supplier._id,
        name: supplier.name,
        contact_person: supplier.contactPerson,
        phone: supplier.phone,
        email: supplier.email,
        address: supplier.address,
        gstin: supplier.gstin
      });
    }

    // ONLINE MODE (TURSO)
    const result = await supabase.execute({
      sql: 'SELECT * FROM suppliers WHERE id = ?',
      args: [id]
    });
    const originalSupplier = result.rows[0];

    if (!originalSupplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }
    
    const nextName = name ? name.trim() : originalSupplier.name;
    const nextPerson = contactPerson !== undefined ? contactPerson : originalSupplier.contact_person;
    const nextPhone = phone !== undefined ? phone : originalSupplier.phone;
    const nextEmail = email !== undefined ? email : originalSupplier.email;
    const nextAddress = address !== undefined ? address : originalSupplier.address;
    const nextGstin = gstin !== undefined ? gstin : originalSupplier.gstin;

    await supabase.execute({
      sql: 'UPDATE suppliers SET name = ?, contact_person = ?, phone = ?, email = ?, address = ?, gstin = ? WHERE id = ?',
      args: [nextName, nextPerson, nextPhone, nextEmail, nextAddress, nextGstin, id]
    });
    
    res.json({
      id: originalSupplier.id,
      name: nextName,
      contact_person: nextPerson,
      phone: nextPhone,
      email: nextEmail,
      address: nextAddress,
      gstin: nextGstin
    });
  } catch (error) {
    console.error('Update supplier error:', error);
    res.status(500).json({ error: 'Failed to update supplier details' });
  }
});

// 4. Delete Supplier
router.delete('/:id', authenticateJWT, restrictTo('manager'), async (req, res) => {
  const { id } = req.params;
  
  try {
    const isOffline = !process.env.TURSO_DATABASE_URL;
    
    if (isOffline) {
      await mockDb.initMockDatabase();
      const index = mockDb.mockSuppliers.findIndex(s => String(s._id) === String(id));
      if (index === -1) {
        return res.status(404).json({ error: 'Supplier not found' });
      }
      mockDb.mockSuppliers.splice(index, 1);
      return res.json({ success: true, message: 'Supplier deleted successfully' });
    }

    // ONLINE MODE (TURSO)
    const result = await supabase.execute({
      sql: 'SELECT * FROM suppliers WHERE id = ?',
      args: [id]
    });
    const supplier = result.rows[0];

    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }
    
    await supabase.execute({
      sql: 'DELETE FROM suppliers WHERE id = ?',
      args: [id]
    });
    res.json({ success: true, message: 'Supplier deleted successfully' });
  } catch (error) {
    console.error('Delete supplier error:', error);
    res.status(500).json({ error: 'Failed to delete supplier' });
  }
});

module.exports = router;
