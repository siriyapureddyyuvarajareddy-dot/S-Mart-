const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL;
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!TURSO_DATABASE_URL) {
  console.warn('[Database] Warning: TURSO_DATABASE_URL is missing from environment variables.');
}

const db = createClient({
  url: TURSO_DATABASE_URL || 'file:local.db',
  authToken: TURSO_AUTH_TOKEN || ''
});

async function getDatabaseConnection() {
  return db;
}

async function createTablesIfNotExist() {
  try {
    const sqlPath = path.join(__dirname, '../../turso_setup.sql');
    if (!fs.existsSync(sqlPath)) {
      console.warn('[Database] turso_setup.sql file not found. Skipping table auto-creation.');
      return;
    }
    
    const ddl = fs.readFileSync(sqlPath, 'utf8');
    // Split by semicolons, filtering out comments and empty commands
    const statements = ddl
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const stmt of statements) {
      await db.execute(stmt);
    }
    console.log('[Database] SQLite/Libsql tables verified/created successfully.');
  } catch (err) {
    console.error('[Database] Error checking/creating tables:', err);
  }
}

async function initializeDatabase() {
  try {
    console.log(`[Database] Connecting to Turso at ${TURSO_DATABASE_URL ? TURSO_DATABASE_URL.split('//').pop().split(':')[0] : 'local file'}...`);
    
    // Auto-create tables if they don't exist
    await createTablesIfNotExist();

    // Check connectivity
    const result = await db.execute('SELECT COUNT(*) AS count FROM users');
    console.log('[Database] Turso connection established successfully.');
    
    await seedDatabase();
  } catch (error) {
    console.error('[Database] Connection or initialization error:', error);
    throw error;
  }
}

async function seedDatabase() {
  try {
    // 1. Check if users exist
    const userRes = await db.execute('SELECT COUNT(*) AS count FROM users');
    const userCount = userRes.rows[0].count;

    if (userCount === 0) {
      console.log('[Database Seeding] Tables empty. Seeding default user roles...');
      
      const roles = ['manager', 'cashier', 'inventory', 'customer'];
      for (const role of roles) {
        const username = role;
        const passwordHash = await bcrypt.hash(`${role}123`, 10);
        const email = `${role}@smart.com`;
        const name = role.charAt(0).toUpperCase() + role.slice(1) + ' User';
        
        await db.execute({
          sql: 'INSERT INTO users (username, password_hash, email, role, name) VALUES (?, ?, ?, ?, ?)',
          args: [username, passwordHash, email, role, name]
        });
      }
      
      const seededUsersRes = await db.execute('SELECT * FROM users');
      const seededUsers = seededUsersRes.rows;

      // Seed Customers profile
      const custUser = seededUsers.find(u => u.role === 'customer');
      if (custUser) {
        await db.execute({
          sql: 'INSERT INTO customers (user_id, loyalty_points, phone, address, tier) VALUES (?, ?, ?, ?, ?)',
          args: [custUser.id, 120, '+91 9876543210', '123 Customer Lane, Bangalore', 'Silver']
        });
      }
      
      // Seed Employees profiles
      const cashierUser = seededUsers.find(u => u.role === 'cashier');
      const inventoryUser = seededUsers.find(u => u.role === 'inventory');
      
      if (cashierUser) {
        await db.execute({
          sql: 'INSERT INTO employees (user_id, salary, shift, status) VALUES (?, ?, ?, ?)',
          args: [cashierUser.id, 25000.0, 'morning', 'active']
        });
      }
      if (inventoryUser) {
        await db.execute({
          sql: 'INSERT INTO employees (user_id, salary, shift, status) VALUES (?, ?, ?, ?)',
          args: [inventoryUser.id, 22000.0, 'afternoon', 'active']
        });
      }

      // 2. Seed Suppliers
      console.log('[Database Seeding] Seeding suppliers...');
      const sups = [
        { name: 'Fresh Farms Ltd.', contact: 'Ramesh Kumar', phone: '+91 9999888877', email: 'ramesh@freshfarms.com', address: 'Village Farms Area, Mandya', gstin: '29AAAAA1111A1Z1' },
        { name: 'Daily Dairy Corp.', contact: 'Suresh Patel', phone: '+91 8888777766', email: 'suresh@dailydairy.com', address: 'Industrial Layout, Mysuru', gstin: '29BBBBB2222B2Z2' },
        { name: 'Global Goods Distributor', contact: 'Anita Sen', phone: '+91 7777666655', email: 'anita@globalgoods.com', address: 'Whitefield Road, Bangalore', gstin: '29CCCCC3333C3Z3' }
      ];
      for (const s of sups) {
        await db.execute({
          sql: 'INSERT INTO suppliers (name, contact_person, phone, email, address, gstin) VALUES (?, ?, ?, ?, ?, ?)',
          args: [s.name, s.contact, s.phone, s.email, s.address, s.gstin]
        });
      }

      const seededSupsRes = await db.execute('SELECT * FROM suppliers');
      const seededSups = seededSupsRes.rows;

      // 3. Seed Products
      console.log('[Database Seeding] Seeding default products...');
      const supFarms = seededSups.find(s => s.name === 'Fresh Farms Ltd.');
      const supDairy = seededSups.find(s => s.name === 'Daily Dairy Corp.');
      const supGlobal = seededSups.find(s => s.name === 'Global Goods Distributor');

      const today = new Date();
      const inTwoWeeks = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const inSixMonths = new Date(today.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const expiredYesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const prods = [
        { name: 'Organic Bananas', barcode: '5901234123457', sku: 'SKU-BAN-001', category: 'Fruits', price: 60.00, quantity: 50, unit: 'kg', low_stock: 15, expiry: inTwoWeeks, supplier: supFarms?.id },
        { name: 'Fresh Whole Milk 1L', barcode: '5901234123464', sku: 'SKU-MILK-002', category: 'Dairy', price: 45.00, quantity: 8, unit: 'Liters', low_stock: 15, expiry: inTwoWeeks, supplier: supDairy?.id },
        { name: 'White Sliced Bread', barcode: '5901234123471', sku: 'SKU-BREAD-003', category: 'Bakery', price: 30.00, quantity: 25, unit: 'Pieces', low_stock: 10, expiry: inTwoWeeks, supplier: supGlobal?.id },
        { name: 'Gala Apples', barcode: '5901234123488', sku: 'SKU-APP-004', category: 'Fruits', price: 120.00, quantity: 0, unit: 'Pieces', low_stock: 15, expiry: inSixMonths, supplier: supFarms?.id },
        { name: 'Greek Yogurt 500g', barcode: '5901234123495', sku: 'SKU-YOG-005', category: 'Dairy', price: 90.00, quantity: 12, unit: 'Pieces', low_stock: 10, expiry: expiredYesterday, supplier: supDairy?.id },
        { name: 'Chocolate Chip Cookies', barcode: '5901234123501', sku: 'SKU-COOKIE-006', category: 'Bakery', price: 50.00, quantity: 40, unit: 'Pieces', low_stock: 10, expiry: inSixMonths, supplier: supGlobal?.id },
        { name: 'Dove Beauty Soap 100g', barcode: '5901234123518', sku: 'SKU-SOAP-007', category: 'PersonalCare', price: 45.00, quantity: 100, unit: 'Pieces', low_stock: 20, expiry: inSixMonths, supplier: supGlobal?.id },
        { name: 'Herbal Essence Shampoo 200ml', barcode: '5901234123525', sku: 'SKU-SHMP-008', category: 'PersonalCare', price: 120.00, quantity: 60, unit: 'Pieces', low_stock: 15, expiry: inSixMonths, supplier: supGlobal?.id },
        { name: 'Cadbury Dairy Milk Silk', barcode: '5901234123532', sku: 'SKU-CHOC-009', category: 'Pantry', price: 80.00, quantity: 120, unit: 'Pieces', low_stock: 25, expiry: inTwoWeeks, supplier: supGlobal?.id },
        { name: 'Amul Pasteurised Butter 500g', barcode: '5901234123549', sku: 'SKU-BUTR-010', category: 'Dairy', price: 260.00, quantity: 40, unit: 'Pieces', low_stock: 10, expiry: inTwoWeeks, supplier: supDairy?.id },
        { name: 'Fortune Kachi Ghani Mustard Oil 1L', barcode: '5901234123556', sku: 'SKU-OIL-011', category: 'Pantry', price: 175.00, quantity: 30, unit: 'Liters', low_stock: 8, expiry: inSixMonths, supplier: supGlobal?.id },
        { name: 'Aashirvaad Shudh Chakki Atta 5kg', barcode: '5901234123563', sku: 'SKU-ATTA-012', category: 'Pantry', price: 290.00, quantity: 25, unit: 'kg', low_stock: 5, expiry: inSixMonths, supplier: supGlobal?.id },
        { name: 'Colgate MaxFresh Gel Paste 150g', barcode: '5901234123570', sku: 'SKU-PAST-013', category: 'PersonalCare', price: 95.00, quantity: 80, unit: 'Pieces', low_stock: 20, expiry: inSixMonths, supplier: supGlobal?.id },
        { name: 'Coca Cola Soft Drink 1.25L', barcode: '5901234123587', sku: 'SKU-COKE-014', category: 'Beverages', price: 70.00, quantity: 50, unit: 'Liters', low_stock: 15, expiry: inTwoWeeks, supplier: supGlobal?.id }
      ];

      for (const p of prods) {
        await db.execute({
          sql: 'INSERT INTO products (name, barcode, sku, category, price, quantity, unit, low_stock_threshold, expiry_date, supplier_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          args: [p.name, p.barcode, p.sku, p.category, p.price, p.quantity, p.unit, p.low_stock, p.expiry, p.supplier || null]
        });
      }

      const seededProdsRes = await db.execute('SELECT * FROM products');
      const seededProds = seededProdsRes.rows;

      // Create Stock Logs
      const managerId = seededUsers.find(u => u.role === 'manager')?.id || null;
      for (const p of seededProds) {
        await db.execute({
          sql: 'INSERT INTO stock_logs (product_id, change_qty, reason, user_id) VALUES (?, ?, ?, ?)',
          args: [p.id, p.quantity, 'restock', managerId]
        });
      }

      // Seed past orders over the last 3 days
      console.log('[Database Seeding] Seeding default sales orders history...');
      const orderDates = [
        new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        today.toISOString()
      ];

      const customerProfile = await db.execute('SELECT * FROM customers LIMIT 1');
      const custId = customerProfile.rows[0]?.id || null;

      for (let i = 0; i < orderDates.length; i++) {
        const orderResult = await db.execute({
          sql: 'INSERT INTO orders (customer_id, cashier_id, order_type, total_amount, discount_amount, gst_amount, final_amount, status, payment_method, payment_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          args: [custId, null, 'online', 230.00, 20.00, 37.80, 247.80, 'completed', 'razorpay', 'completed', orderDates[i]]
        });
        
        const orderId = orderResult.lastInsertRowid;
        
        // Insert order items
        await db.execute({
          sql: 'INSERT INTO order_items (order_id, product_id, quantity, price, gst_rate, gst_amount, discount_amount, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          args: [Number(orderId), seededProds[0].id, 2, 60.00, 18.0, 21.60, 10.00, 131.60]
        });
        await db.execute({
          sql: 'INSERT INTO order_items (order_id, product_id, quantity, price, gst_rate, gst_amount, discount_amount, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          args: [Number(orderId), seededProds[2].id, 2, 50.00, 18.0, 16.20, 10.00, 116.20]
        });
      }

      // 4. Seed Expenses
      console.log('[Database Seeding] Seeding default expenses...');
      if (managerId) {
        await db.execute({
          sql: 'INSERT INTO expenses (title, category, amount, description, date, created_by) VALUES (?, ?, ?, ?, ?, ?)',
          args: ['Monthly Store Rent', 'Rent', 15000.00, 'Store location monthly lease payment', new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], managerId]
        });
        await db.execute({
          sql: 'INSERT INTO expenses (title, category, amount, description, date, created_by) VALUES (?, ?, ?, ?, ?, ?)',
          args: ['Electricity Bill May', 'Utilities', 4500.00, 'BESCOM electricity invoice', new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], managerId]
        });
        await db.execute({
          sql: 'INSERT INTO expenses (title, category, amount, description, date, created_by) VALUES (?, ?, ?, ?, ?, ?)',
          args: ['Water & Maintenance', 'Utilities', 1200.00, 'Monthly building maintenance & water', new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], managerId]
        });
      }

      console.log('[Database Seeding] Seeding completed.');
    }
  } catch (error) {
    console.error('[Database Seeding] Error seeding SQLite collections:', error);
  }
}

module.exports = {
  getDatabaseConnection,
  initializeDatabase,
  db,
  supabase: db // alias for backward compatibility
};
