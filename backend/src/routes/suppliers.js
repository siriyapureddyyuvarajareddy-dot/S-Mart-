const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Supplier = require('../models/Supplier');
const mockDb = require('../utils/mockDb');
const { authenticateJWT, restrictTo } = require('../middleware/auth');

// 1. Get Suppliers
router.get('/', authenticateJWT, restrictTo('manager', 'inventory'), async (req, res) => {
  try {
    const isOffline = mongoose.connection.readyState !== 1;
    
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

    // ONLINE MODE
    const suppliers = await Supplier.find().sort({ createdAt: -1 });
    const formatted = suppliers.map(s => ({
      id: s._id,
      name: s.name,
      contact_person: s.contactPerson,
      phone: s.phone,
      email: s.email,
      address: s.address,
      gstin: s.gstin,
      created_at: s.createdAt
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
    const isOffline = mongoose.connection.readyState !== 1;
    
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

    // ONLINE MODE
    const duplicate = await Supplier.findOne({ name: name.trim() });
    if (duplicate) {
      return res.status(400).json({ error: 'Supplier name already exists' });
    }

    const supplier = await Supplier.create({
      name: name.trim(),
      contactPerson: contactPerson || '',
      phone: phone || '',
      email: email || '',
      address: address || '',
      gstin: gstin || ''
    });
    
    res.status(201).json({
      id: supplier._id,
      name: supplier.name,
      contact_person: supplier.contactPerson,
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
    const isOffline = mongoose.connection.readyState !== 1;
    
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

    // ONLINE MODE
    const supplier = await Supplier.findById(id);
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }
    
    supplier.name = name ? name.trim() : supplier.name;
    supplier.contactPerson = contactPerson !== undefined ? contactPerson : supplier.contactPerson;
    supplier.phone = phone !== undefined ? phone : supplier.phone;
    supplier.email = email !== undefined ? email : supplier.email;
    supplier.address = address !== undefined ? address : supplier.address;
    supplier.gstin = gstin !== undefined ? gstin : supplier.gstin;
    
    await supplier.save();
    
    res.json({
      id: supplier._id,
      name: supplier.name,
      contact_person: supplier.contactPerson,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      gstin: supplier.gstin
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
    const isOffline = mongoose.connection.readyState !== 1;
    
    if (isOffline) {
      await mockDb.initMockDatabase();
      const index = mockDb.mockSuppliers.findIndex(s => String(s._id) === String(id));
      if (index === -1) {
        return res.status(404).json({ error: 'Supplier not found' });
      }
      mockDb.mockSuppliers.splice(index, 1);
      return res.json({ success: true, message: 'Supplier deleted successfully' });
    }

    // ONLINE MODE
    const supplier = await Supplier.findById(id);
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }
    await Supplier.findByIdAndDelete(id);
    res.json({ success: true, message: 'Supplier deleted successfully' });
  } catch (error) {
    console.error('Delete supplier error:', error);
    res.status(500).json({ error: 'Failed to delete supplier' });
  }
});

module.exports = router;
