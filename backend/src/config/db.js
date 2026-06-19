const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dns = require('dns');

// Models
const User = require('../models/User');
const Supplier = require('../models/Supplier');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Employee = require('../models/Employee');
const Order = require('../models/Order');
const StockLog = require('../models/StockLog');
const Expense = require('../models/Expense');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart_supermarket';

async function getDatabaseConnection() {
  return mongoose.connection;
}

async function initializeDatabase() {
  try {
    // Enable strictQuery to prevent warnings in newer Mongoose versions
    mongoose.set('strictQuery', false);

    // Set DNS servers to prevent querySrv ECONNREFUSED errors on some local environments
    try {
      dns.setServers(['8.8.8.8', '1.1.1.1']);
    } catch (dnsErr) {
      console.warn('[Database] Failed to override DNS servers, using system defaults.');
    }

    console.log(`[Database] Connecting to MongoDB at ${MONGODB_URI.split('@').pop()}...`);
    await mongoose.connect(MONGODB_URI);
    console.log('[Database] MongoDB connection established successfully.');

    await seedDatabase();
  } catch (error) {
    console.error('[Database] Connection or initialization error:', error);
    throw error;
  }
}

async function seedDatabase() {
  try {
    // 1. Seed Users
    const userCount = await User.countDocuments();
    let seededUsers = [];
    if (userCount === 0) {
      console.log('[Database Seeding] Collections empty. Seeding default user roles...');
      
      const roles = ['manager', 'cashier', 'inventory', 'customer'];
      for (const role of roles) {
        const username = role;
        const passwordHash = await bcrypt.hash(`${role}123`, 10);
        const email = `${role}@smart.com`;
        const name = role.charAt(0).toUpperCase() + role.slice(1) + ' User';
        
        const newUser = await User.create({
          username,
          passwordHash,
          email,
          role,
          name
        });
        seededUsers.push(newUser);
      }
      
      // Seed Customers extension
      const custUser = seededUsers.find(u => u.role === 'customer');
      let seededCustomer = null;
      if (custUser) {
        seededCustomer = await Customer.create({
          userId: custUser._id,
          loyaltyPoints: 120,
          phone: '+91 9876543210',
          address: '123 Customer Lane, Bangalore',
          tier: 'Silver'
        });
      }
      
      // Seed Employees extensions
      const cashierUser = seededUsers.find(u => u.role === 'cashier');
      const inventoryUser = seededUsers.find(u => u.role === 'inventory');
      let seededCashierEmp = null;
      
      if (cashierUser) {
        seededCashierEmp = await Employee.create({
          userId: cashierUser._id,
          salary: 25000.0,
          shift: 'morning',
          status: 'active'
        });
      }
      if (inventoryUser) {
        await Employee.create({
          userId: inventoryUser._id,
          salary: 22000.0,
          shift: 'afternoon',
          status: 'active'
        });
      }

      // 2. Seed Suppliers
      console.log('[Database Seeding] Seeding suppliers...');
      const sups = [
        { name: 'Fresh Farms Ltd.', contactPerson: 'Ramesh Kumar', phone: '+91 9999888877', email: 'ramesh@freshfarms.com', address: 'Village Farms Area, Mandya', gstin: '29AAAAA1111A1Z1' },
        { name: 'Daily Dairy Corp.', contactPerson: 'Suresh Patel', phone: '+91 8888777766', email: 'suresh@dailydairy.com', address: 'Industrial Layout, Mysuru', gstin: '29BBBBB2222B2Z2' },
        { name: 'Global Goods Distributor', contactPerson: 'Anita Sen', phone: '+91 7777666655', email: 'anita@globalgoods.com', address: 'Whitefield Road, Bangalore', gstin: '29CCCCC3333C3Z3' }
      ];
      const seededSups = await Supplier.create(sups);

      // 3. Seed Products
      console.log('[Database Seeding] Seeding default products...');
      const supFarms = seededSups.find(s => s.name === 'Fresh Farms Ltd.');
      const supDairy = seededSups.find(s => s.name === 'Daily Dairy Corp.');
      const supGlobal = seededSups.find(s => s.name === 'Global Goods Distributor.');

      const today = new Date();
      const inTwoWeeks = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const inSixMonths = new Date(today.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const expiredYesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const prods = [
        { name: 'Organic Bananas', barcode: '5901234123457', sku: 'SKU-BAN-001', category: 'Fruits', price: 60.00, quantity: 50, unit: 'kg', lowStockThreshold: 15, expiryDate: inTwoWeeks, supplierId: supFarms?._id },
        { name: 'Fresh Whole Milk 1L', barcode: '5901234123464', sku: 'SKU-MILK-002', category: 'Dairy', price: 45.00, quantity: 8, unit: 'Liters', lowStockThreshold: 15, expiryDate: inTwoWeeks, supplierId: supDairy?._id },
        { name: 'White Sliced Bread', barcode: '5901234123471', sku: 'SKU-BREAD-003', category: 'Bakery', price: 30.00, quantity: 25, unit: 'Pieces', lowStockThreshold: 10, expiryDate: inTwoWeeks, supplierId: seededSups[2]?._id },
        { name: 'Gala Apples', barcode: '5901234123488', sku: 'SKU-APP-004', category: 'Fruits', price: 120.00, quantity: 0, unit: 'Pieces', lowStockThreshold: 15, expiryDate: inSixMonths, supplierId: supFarms?._id },
        { name: 'Greek Yogurt 500g', barcode: '5901234123495', sku: 'SKU-YOG-005', category: 'Dairy', price: 90.00, quantity: 12, unit: 'Pieces', lowStockThreshold: 10, expiryDate: expiredYesterday, supplierId: supDairy?._id },
        { name: 'Chocolate Chip Cookies', barcode: '5901234123501', sku: 'SKU-COOKIE-006', category: 'Bakery', price: 50.00, quantity: 40, unit: 'Pieces', lowStockThreshold: 10, expiryDate: inSixMonths, supplierId: seededSups[2]?._id },
        { name: 'Dove Beauty Soap 100g', barcode: '5901234123518', sku: 'SKU-SOAP-007', category: 'PersonalCare', price: 45.00, quantity: 100, unit: 'Pieces', lowStockThreshold: 20, expiryDate: inSixMonths, supplierId: seededSups[2]?._id },
        { name: 'Herbal Essence Shampoo 200ml', barcode: '5901234123525', sku: 'SKU-SHMP-008', category: 'PersonalCare', price: 120.00, quantity: 60, unit: 'Pieces', lowStockThreshold: 15, expiryDate: inSixMonths, supplierId: seededSups[2]?._id },
        { name: 'Cadbury Dairy Milk Silk', barcode: '5901234123532', sku: 'SKU-CHOC-009', category: 'Pantry', price: 80.00, quantity: 120, unit: 'Pieces', lowStockThreshold: 25, expiryDate: inTwoWeeks, supplierId: seededSups[2]?._id },
        { name: 'Amul Pasteurised Butter 500g', barcode: '5901234123549', sku: 'SKU-BUTR-010', category: 'Dairy', price: 260.00, quantity: 40, unit: 'Pieces', lowStockThreshold: 10, expiryDate: inTwoWeeks, supplierId: supDairy?._id },
        { name: 'Fortune Kachi Ghani Mustard Oil 1L', barcode: '5901234123556', sku: 'SKU-OIL-011', category: 'Pantry', price: 175.00, quantity: 30, unit: 'Liters', lowStockThreshold: 8, expiryDate: inSixMonths, supplierId: seededSups[2]?._id },
        { name: 'Aashirvaad Shudh Chakki Atta 5kg', barcode: '5901234123563', sku: 'SKU-ATTA-012', category: 'Pantry', price: 290.00, quantity: 25, unit: 'kg', lowStockThreshold: 5, expiryDate: inSixMonths, supplierId: seededSups[2]?._id },
        { name: 'Colgate MaxFresh Gel Paste 150g', barcode: '5901234123570', sku: 'SKU-PAST-013', category: 'PersonalCare', price: 95.00, quantity: 80, unit: 'Pieces', lowStockThreshold: 20, expiryDate: inSixMonths, supplierId: seededSups[2]?._id },
        { name: 'Coca Cola Soft Drink 1.25L', barcode: '5901234123587', sku: 'SKU-COKE-014', category: 'Beverages', price: 70.00, quantity: 50, unit: 'Liters', lowStockThreshold: 15, expiryDate: inTwoWeeks, supplierId: seededSups[2]?._id }
      ];

      const calculateEanCheckDigit = (digits) => {
        const sum = digits.split('').reduce((acc, digit, idx) => {
          return acc + parseInt(digit, 10) * (idx % 2 === 1 ? 3 : 1);
        }, 0);
        return (10 - (sum % 10)) % 10;
      };

      const baseSnacks = [
        "Lays Classic Salted", "Kurkure Masala Munch", "Bingo Mad Angles", "Doritos Nacho Cheese", 
        "Pringles Sour Cream", "Haldiram Bhujia Sev", "Haldiram Aloo Bhujia", "ACT II Popcorn Butter", 
        "Britannia Good Day", "Parle-G Gold Biscuits", "Sunfeast Dark Fantasy", "Oreo Original Cookies", 
        "Hide & Seek Chocolate", "Unibic Chocochip Cookies", "Balaji Wafers Simply Salted", 
        "Tedhe Medhe Masala", "Cheetos Puffs", "Munch Chocolate Bar", "KitKat Share Bag", 
        "Snickers Peanut Bar", "5 Star Chocolate", "Dairy Milk Fruit & Nut", "Amul Dark Chocolate", 
        "Galaxy Smooth Milk", "Alpenliebe Candy", "Center Fresh Gum", "Mentos Mint", "Kinder Joy", 
        "Ferrero Rocher T4", "Bournvita Biscuits", "Paper Boat Peanut Chikki", "Kurkure Solid Masti", 
        "Bingo Tedhe Medhe", "Balaji Cream & Onion"
      ];
      
      const baseBeverages = [
        "Pepsi Cola 750ml", "Coca Cola Zero Sugar", "Sprite Lemon Lime", "Thums Up Soda 1L", 
        "Fanta Orange 1L", "Mirinda Citrus 1L", "Limca Lime Soda", "Mountain Dew 750ml", 
        "Red Bull Energy 250ml", "Monster Energy Drink", "Gatorade Blue Bolt", "Paper Boat Mango", 
        "Real Fruit Juice Mixed", "Tropicana Orange 1L", "Frooti Mango Drink", "Maaza Mango 1.2L", 
        "Kinley Water 1L", "Bisleri Mineral Water 1L", "Aquafina Pure Water 1L", "Schweppes Tonic Water", 
        "Appy Fizz 600ml", "Yakult Probiotic Drink", "Nescafé Ready To Drink", "Amul Cool Kesar", 
        "Amul Kool Cafe", "Paper Boat Anardana", "Baskin Robbins Milkshake", "Raw Pressery Sugarcane", 
        "Nestle Nestea Iced Tea", "Fanta Orange Cane", "Red Label Tea 250g", "Tata Tea Gold 250g", 
        "Bru Instant Coffee 100g", "Nescafe Classic 100g"
      ];

      let barcodeSeq = 600;
      baseSnacks.forEach((name, index) => {
        const barcodeBody = `590123412${barcodeSeq++}`;
        const checkDigit = calculateEanCheckDigit(barcodeBody);
        const barcode = `${barcodeBody}${checkDigit}`;
        const skuIdx = String(index + 15).padStart(3, '0');
        prods.push({
          name,
          barcode,
          sku: `SKU-SNAK-${skuIdx}`,
          category: 'Pantry',
          price: 10 + (index * 5) % 150,
          quantity: 20 + (index * 7) % 80,
          unit: 'Pieces',
          lowStockThreshold: 10,
          expiryDate: inSixMonths,
          supplierId: seededSups[2]?._id
        });
      });

      baseBeverages.forEach((name, index) => {
        const barcodeBody = `590123412${barcodeSeq++}`;
        const checkDigit = calculateEanCheckDigit(barcodeBody);
        const barcode = `${barcodeBody}${checkDigit}`;
        const skuIdx = String(index + 15).padStart(3, '0');
        prods.push({
          name,
          barcode,
          sku: `SKU-BEV-${skuIdx}`,
          category: 'Beverages',
          price: 20 + (index * 4) % 120,
          quantity: 15 + (index * 6) % 70,
          unit: 'Pieces',
          lowStockThreshold: 15,
          expiryDate: inTwoWeeks,
          supplierId: seededSups[2]?._id
        });
      });

      const seededProds = await Product.create(prods);

      // Create Stock Logs audit trail
      for (const p of seededProds) {
        await StockLog.create({
          productId: p._id,
          changeQty: p.quantity,
          reason: 'restock',
          userId: seededUsers.find(u => u.role === 'manager')?._id
        });
      }

      // Seed past orders over the last 3 days for analytics
      console.log('[Database Seeding] Seeding default sales orders history...');
      const orderDates = [
        new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000),
        new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000),
        today
      ];

      for (let i = 0; i < orderDates.length; i++) {
        await Order.create({
          customerId: seededCustomer?._id || null,
          cashierId: null,
          orderType: 'online',
          totalAmount: 230.00,
          discountAmount: 20.00,
          gstAmount: 37.80,
          finalAmount: 247.80,
          status: 'completed',
          paymentMethod: 'razorpay',
          paymentStatus: 'completed',
          createdAt: orderDates[i],
          items: [
            {
              productId: seededProds[0]._id,
              quantity: 2,
              price: 60.00,
              gstRate: 18.0,
              gstAmount: 21.60,
              discountAmount: 10.00,
              subtotal: 131.60
            },
            {
              productId: seededProds[5]._id,
              quantity: 2,
              price: 50.00,
              gstRate: 18.0,
              gstAmount: 16.20,
              discountAmount: 10.00,
              subtotal: 116.20
            }
          ]
        });
      }

      // 4. Seed Expenses
      const expenseCount = await Expense.countDocuments();
      if (expenseCount === 0) {
        console.log('[Database Seeding] Seeding default expenses...');
        const managerUser = await User.findOne({ role: 'manager' });
        const managerId = managerUser ? managerUser._id : null;
        if (managerId) {
          await Expense.create([
            { title: 'Monthly Store Rent', category: 'Rent', amount: 15000.00, description: 'Store location monthly lease payment', date: new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000), createdBy: managerId },
            { title: 'Electricity Bill May', category: 'Utilities', amount: 4500.00, description: 'BESCOM electricity invoice', date: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000), createdBy: managerId },
            { title: 'Water & Maintenance', category: 'Utilities', amount: 1200.00, description: 'Monthly building maintenance & water', date: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000), createdBy: managerId }
          ]);
        }
      }

      console.log('[Database Seeding] Seeding completed.');
    }
  } catch (error) {
    console.error('[Database Seeding] Error seeding collections:', error);
  }
}

module.exports = {
  getDatabaseConnection,
  initializeDatabase
};
