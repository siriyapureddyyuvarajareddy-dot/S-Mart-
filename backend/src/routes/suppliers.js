const express = require('express');
const router = express.Router();
const { supabase } = require('../config/db');
const mockDb = require('../utils/mockDb');
const { authenticateJWT, restrictTo } = require('../middleware/auth');

// 1. Get Suppliers
router.get('/', authenticateJWT, restrictTo('manager', 'inventory'), async (req, res) => {
  try {
    const isOffline = !process.env.SUPABASE_URL || !process.env.SUPABASE_KEY;
    
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

    // ONLINE MODE (SUPABASE)
    const { data: suppliers, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
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
    const isOffline = !process.env.SUPABASE_URL || !process.env.SUPABASE_KEY;
    
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

    // ONLINE MODE (SUPABASE)
    const { data: duplicate } = await supabase
      .from('suppliers')
      .select('*')
      .eq('name', name.trim())
      .maybeSingle();

    if (duplicate) {
      return res.status(400).json({ error: 'Supplier name already exists' });
    }

    const { data: supplier, error } = await supabase
      .from('suppliers')
      .insert({
        name: name.trim(),
        contact_person: contactPerson || '',
        phone: phone || '',
        email: email || '',
        address: address || '',
        gstin: gstin || ''
      })
      .select()
      .single();
      
    if (error || !supplier) {
      throw error || new Error('Failed to register supplier');
    }
    
    res.status(201).json({
      id: supplier.id,
      name: supplier.name,
      contact_person: supplier.contact_person,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      gstin: supplier.gstin
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
    const isOffline = !process.env.SUPABASE_URL || !process.env.SUPABASE_KEY;
    
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

    // ONLINE MODE (SUPABASE)
    const { data: originalSupplier, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !originalSupplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }
    
    const nextName = name ? name.trim() : originalSupplier.name;
    const nextPerson = contactPerson !== undefined ? contactPerson : originalSupplier.contact_person;
    const nextPhone = phone !== undefined ? phone : originalSupplier.phone;
    const nextEmail = email !== undefined ? email : originalSupplier.email;
    const nextAddress = address !== undefined ? address : originalSupplier.address;
    const nextGstin = gstin !== undefined ? gstin : originalSupplier.gstin;

    const { error: updErr } = await supabase
      .from('suppliers')
      .update({
        name: nextName,
        contact_person: nextPerson,
        phone: nextPhone,
        email: nextEmail,
        address: nextAddress,
        gstin: nextGstin
      })
      .eq('id', id);

    if (updErr) throw updErr;
    
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
    const isOffline = !process.env.SUPABASE_URL || !process.env.SUPABASE_KEY;
    
    if (isOffline) {
      await mockDb.initMockDatabase();
      const index = mockDb.mockSuppliers.findIndex(s => String(s._id) === String(id));
      if (index === -1) {
        return res.status(404).json({ error: 'Supplier not found' });
      }
      mockDb.mockSuppliers.splice(index, 1);
      return res.json({ success: true, message: 'Supplier deleted successfully' });
    }

    // ONLINE MODE (SUPABASE)
    const { data: supplier, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }
    
    await supabase.from('suppliers').delete().eq('id', id);
    res.json({ success: true, message: 'Supplier deleted successfully' });
  } catch (error) {
    console.error('Delete supplier error:', error);
    res.status(500).json({ error: 'Failed to delete supplier' });
  }
});

module.exports = router;
