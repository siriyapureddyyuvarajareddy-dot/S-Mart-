const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const Customer = require('../models/Customer');
const Employee = require('../models/Employee');
const mockDb = require('../utils/mockDb');
const { authenticateJWT, JWT_SECRET } = require('../middleware/auth');

// In-memory OTP store
const otpStore = new Map();

// 1. User Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const isOffline = mongoose.connection.readyState !== 1;
    
    if (isOffline) {
      await mockDb.initMockDatabase();
      const user = mockDb.mockUsers.find(u => u.username === username.trim() || u.email === username.trim());
      if (!user) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }
      if (user.role === 'customer') {
        return res.status(403).json({ error: 'Customer portal is disabled.' });
      }
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }
      
      const token = jwt.sign(
        { id: user._id, username: user.username, role: user.role, name: user.name },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      let details = {};
      if (user.role === 'customer') {
        const customer = mockDb.mockCustomers.find(c => String(c.userId) === String(user._id));
        if (customer) {
          details = { loyaltyPoints: customer.loyaltyPoints, phone: customer.phone, tier: customer.tier };
        }
      } else if (['cashier', 'inventory'].includes(user.role)) {
        const employee = mockDb.mockEmployees.find(e => String(e.userId) === String(user._id));
        if (employee) {
          details = { shift: employee.shift, salary: employee.salary };
        }
      }
      
      return res.json({
        token,
        user: {
          id: user._id,
          username: user.username,
          role: user.role,
          name: user.name,
          email: user.email,
          ...details
        }
      });
    }

    const user = await User.findOne({ 
      $or: [{ username: username.trim() }, { email: username.trim() }] 
    });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    if (user.role === 'customer') {
      return res.status(403).json({ error: 'Customer portal is disabled.' });
    }
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    let details = {};
    if (user.role === 'customer') {
      const customer = await Customer.findOne({ userId: user._id });
      if (customer) {
        details = { loyaltyPoints: customer.loyaltyPoints, phone: customer.phone, tier: customer.tier };
      }
    } else if (['cashier', 'inventory'].includes(user.role)) {
      const employee = await Employee.findOne({ userId: user._id });
      if (employee) {
        details = { shift: employee.shift, salary: employee.salary };
      }
    }
    
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        name: user.name,
        email: user.email,
        ...details
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
});

// 1.5 Send Email OTP
router.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email address is required' });
  }

  try {
    const isOffline = mongoose.connection.readyState !== 1;
    let user;

    if (isOffline) {
      await mockDb.initMockDatabase();
      user = mockDb.mockUsers.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
    } else {
      user = await User.findOne({ email: email.trim().toLowerCase() });
    }

    if (!user) {
      return res.status(404).json({ error: 'No staff account found with this email address' });
    }

    if (user.role === 'customer') {
      return res.status(403).json({ error: 'Customer portal is disabled.' });
    }

    // Generate random 6 digit code
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expires = Date.now() + 5 * 60 * 1000; // 5 min expiry
    otpStore.set(email.trim().toLowerCase(), { otp, expires });

    console.log(`===================================================`);
    console.log(`[MAIL CLIENT MOCK] sending login OTP to: ${email}`);
    console.log(`Your FreshMart OTP Code is: ${otp}`);
    console.log(`===================================================`);

    res.json({ success: true, message: 'OTP sent to email successfully', mockOtp: otp });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: 'Failed to generate OTP' });
  }
});

// 1.6 Verify Email OTP
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP code are required' });
  }

  try {
    const key = email.trim().toLowerCase();
    const stored = otpStore.get(key);

    if (!stored || stored.otp !== otp || Date.now() > stored.expires) {
      return res.status(400).json({ error: 'Invalid or expired OTP code' });
    }

    // OTP is valid, remove it
    otpStore.delete(key);

    const isOffline = mongoose.connection.readyState !== 1;
    let user;

    if (isOffline) {
      await mockDb.initMockDatabase();
      user = mockDb.mockUsers.find(u => u.email.toLowerCase() === key);
      if (!user) {
        return res.status(404).json({ error: 'User record not found' });
      }
      
      const token = jwt.sign(
        { id: user._id, username: user.username, role: user.role, name: user.name },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      let details = {};
      if (['cashier', 'inventory'].includes(user.role)) {
        const employee = mockDb.mockEmployees.find(e => String(e.userId) === String(user._id));
        if (employee) {
          details = { shift: employee.shift, salary: employee.salary };
        }
      }

      return res.json({
        token,
        user: {
          id: user._id,
          username: user.username,
          role: user.role,
          name: user.name,
          email: user.email,
          ...details
        }
      });
    }

    // ONLINE MODE
    user = await User.findOne({ email: key });
    if (!user) {
      return res.status(404).json({ error: 'User record not found' });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    let details = {};
    if (['cashier', 'inventory'].includes(user.role)) {
      const employee = await Employee.findOne({ userId: user._id });
      if (employee) {
        details = { shift: employee.shift, salary: employee.salary };
      }
    }

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        name: user.name,
        email: user.email,
        ...details
      }
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Internal server error during verification' });
  }
});

// 2. Register New User
router.post('/register', async (req, res) => {
  const { username, password, email, role, name, phone, address, salary, shift } = req.body;
  
  if (!username || !password || !email || !role || !name) {
    return res.status(400).json({ error: 'Missing required registration details' });
  }
  
  try {
    const isOffline = mongoose.connection.readyState !== 1;
    
    if (isOffline) {
      await mockDb.initMockDatabase();
      const existing = mockDb.mockUsers.find(u => u.username === username.trim() || u.email === email.trim());
      if (existing) {
        return res.status(400).json({ error: 'Username or email already registered' });
      }
      
      const passwordHash = await bcrypt.hash(password, 10);
      const newUserId = `mock_user_${mockDb.mockUsers.length + 1}`;
      
      const newUser = {
        _id: newUserId,
        username: username.trim(),
        passwordHash,
        email: email.trim(),
        role,
        name,
        createdAt: new Date()
      };
      
      mockDb.mockUsers.push(newUser);
      
      if (role === 'customer') {
        mockDb.mockCustomers.push({
          _id: `mock_cust_${mockDb.mockCustomers.length + 1}`,
          userId: newUserId,
          loyaltyPoints: 0,
          phone: phone || '',
          address: address || '',
          tier: 'Silver'
        });
      } else if (['cashier', 'inventory', 'manager'].includes(role)) {
        mockDb.mockEmployees.push({
          _id: `mock_emp_${mockDb.mockEmployees.length + 1}`,
          userId: newUserId,
          salary: parseFloat(salary || 18000),
          shift: shift || 'morning',
          status: 'active'
        });
      }
      
      return res.status(201).json({ success: true, message: 'User registered successfully', userId: newUserId });
    }

    // ONLINE MODE
    const existingUser = await User.findOne({ 
      $or: [{ username: username.trim() }, { email: email.trim() }] 
    });
    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already registered' });
    }
    
    const passwordHash = await bcrypt.hash(password, 10);
    
    const newUser = await User.create({
      username: username.trim(),
      passwordHash,
      email: email.trim(),
      role,
      name
    });
    
    if (role === 'customer') {
      await Customer.create({
        userId: newUser._id,
        loyaltyPoints: 0,
        phone: phone || '',
        address: address || '',
        tier: 'Silver'
      });
    } else if (['cashier', 'inventory', 'manager'].includes(role)) {
      await Employee.create({
        userId: newUser._id,
        salary: parseFloat(salary || 18000),
        shift: shift || 'morning',
        status: 'active'
      });
    }
    
    res.status(201).json({ success: true, message: 'User registered successfully', userId: newUser._id });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// 3. Get Current Profile
router.get('/me', authenticateJWT, async (req, res) => {
  try {
    const isOffline = mongoose.connection.readyState !== 1;
    
    if (isOffline) {
      await mockDb.initMockDatabase();
      const user = mockDb.mockUsers.find(u => String(u._id) === String(req.user.id));
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      let details = {};
      if (user.role === 'customer') {
        const customer = mockDb.mockCustomers.find(c => String(c.userId) === String(user._id));
        if (customer) {
          details = { loyaltyPoints: customer.loyaltyPoints, phone: customer.phone, address: customer.address, tier: customer.tier };
        }
      } else if (['cashier', 'inventory'].includes(user.role)) {
        const employee = mockDb.mockEmployees.find(e => String(e.userId) === String(user._id));
        if (employee) {
          details = { shift: employee.shift, salary: employee.salary, status: employee.status };
        }
      }
      
      return res.json({
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        name: user.name,
        createdAt: user.createdAt,
        ...details
      });
    }

    // ONLINE MODE
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    let details = {};
    if (user.role === 'customer') {
      const customer = await Customer.findOne({ userId: user._id });
      if (customer) {
        details = { loyaltyPoints: customer.loyaltyPoints, phone: customer.phone, address: customer.address, tier: customer.tier };
      }
    } else if (['cashier', 'inventory'].includes(user.role)) {
      const employee = await Employee.findOne({ userId: user._id });
      if (employee) {
        details = { shift: employee.shift, salary: employee.salary, status: employee.status };
      }
    }
    
    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      name: user.name,
      createdAt: user.createdAt,
      ...details
    });
  } catch (error) {
    console.error('Fetch me error:', error);
    res.status(500).json({ error: 'Failed to retrieve profile details' });
  }
});

module.exports = router;
