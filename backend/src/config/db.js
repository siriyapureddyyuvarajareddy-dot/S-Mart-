const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const dns = require('dns');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('[Database] Warning: SUPABASE_URL or SUPABASE_KEY is missing from environment variables.');
}

const supabase = createClient(SUPABASE_URL || 'https://placeholder.supabase.co', SUPABASE_KEY || 'placeholder');

async function getDatabaseConnection() {
  return supabase;
}

async function initializeDatabase() {
  try {
    // Set DNS servers to prevent connection drops on some environments
    try {
      dns.setServers(['8.8.8.8', '1.1.1.1']);
    } catch (dnsErr) {
      console.warn('[Database] Failed to override DNS servers, using system defaults.');
    }

    console.log(`[Database] Connecting to Supabase at ${SUPABASE_URL ? SUPABASE_URL.split('//').pop() : 'placeholder'}...`);
    
    // Check connection by performing a simple query
    const { count, error } = await supabase.from('users').select('*', { count: 'exact', head: true });
    if (error) {
      throw new Error(`Supabase query failed: ${error.message}`);
    }

    console.log('[Database] Supabase connection established successfully.');
    await seedDatabase();
  } catch (error) {
    console.error('[Database] Connection or initialization error:', error);
    throw error;
  }
}

async function seedDatabase() {
  try {
    // 1. Check if users exist
    const { count: userCount, error: countErr } = await supabase.from('users').select('*', { count: 'exact', head: true });
    if (countErr) throw countErr;

    if (userCount === 0) {
      console.log('[Database Seeding] Tables empty. Seeding default user roles...');
      
      const roles = ['manager', 'cashier', 'inventory', 'customer'];
      const usersToInsert = [];
      for (const role of roles) {
        const username = role;
        const passwordHash = await bcrypt.hash(`${role}123`, 10);
        const email = `${role}@smart.com`;
        const name = role.charAt(0).toUpperCase() + role.slice(1) + ' User';
        
        usersToInsert.push({
          username,
          password_hash: passwordHash,
          email,
          role,
          name
        });
      }
      
      const { data: seededUsers, error: userErr } = await supabase.from('users').insert(usersToInsert).select();
      if (userErr) throw userErr;

      // Seed Customers extension
      const custUser = seededUsers.find(u => u.role === 'customer');
      let seededCustomer = null;
      if (custUser) {
        const { data: customerData, error: custErr } = await supabase.from('customers').insert({
          user_id: custUser.id,
          loyalty_points: 120,
          phone: '+91 9876543210',
          address: '123 Customer Lane, Bangalore',
          tier: 'Silver'
        }).select();
        if (custErr) throw custErr;
        seededCustomer = customerData[0];
      }
      
      // Seed Employees extensions
      const cashierUser = seededUsers.find(u => u.role === 'cashier');
      const inventoryUser = seededUsers.find(u => u.role === 'inventory');
      
      if (cashierUser) {
        const { error: empErr } = await supabase.from('employees').insert({
          user_id: cashierUser.id,
          salary: 25000.0,
          shift: 'morning',
          status: 'active'
        });
        if (empErr) throw empErr;
      }
      if (inventoryUser) {
        const { error: empErr } = await supabase.from('employees').insert({
          user_id: inventoryUser.id,
          salary: 22000.0,
          shift: 'afternoon',
          status: 'active'
        });
        if (empErr) throw empErr;
      }

      // 2. Seed Suppliers
      console.log('[Database Seeding] Seeding suppliers...');
      const sups = [
        { name: 'Fresh Farms Ltd.', contact_person: 'Ramesh Kumar', phone: '+91 9999888877', email: 'ramesh@freshfarms.com', address: 'Village Farms Area, Mandya', gstin: '29AAAAA1111A1Z1' },
        { name: 'Daily Dairy Corp.', contact_person: 'Suresh Patel', phone: '+91 8888777766', email: 'suresh@dailydairy.com', address: 'Industrial Layout, Mysuru', gstin: '29BBBBB2222B2Z2' },
        { name: 'Global Goods Distributor', contact_person: 'Anita Sen', phone: '+91 7777666655', email: 'anita@globalgoods.com', address: 'Whitefield Road, Bangalore', gstin: '29CCCCC3333C3Z3' }
      ];
      const { data: seededSups, error: supErr } = await supabase.from('suppliers').insert(sups).select();
      if (supErr) throw supErr;

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
        { name: 'Organic Bananas', barcode: '5901234123457', sku: 'SKU-BAN-001', category: 'Fruits', price: 60.00, quantity: 50, unit: 'kg', low_stock_threshold: 15, expiry_date: inTwoWeeks, supplier_id: supFarms?.id },
        { name: 'Fresh Whole Milk 1L', barcode: '5901234123464', sku: 'SKU-MILK-002', category: 'Dairy', price: 45.00, quantity: 8, unit: 'Liters', low_stock_threshold: 15, expiry_date: inTwoWeeks, supplier_id: supDairy?.id },
        { name: 'White Sliced Bread', barcode: '5901234123471', sku: 'SKU-BREAD-003', category: 'Bakery', price: 30.00, quantity: 25, unit: 'Pieces', low_stock_threshold: 10, expiry_date: inTwoWeeks, supplier_id: supGlobal?.id },
        { name: 'Gala Apples', barcode: '5901234123488', sku: 'SKU-APP-004', category: 'Fruits', price: 120.00, quantity: 0, unit: 'Pieces', low_stock_threshold: 15, expiry_date: inSixMonths, supplier_id: supFarms?.id },
        { name: 'Greek Yogurt 500g', barcode: '5901234123495', sku: 'SKU-YOG-005', category: 'Dairy', price: 90.00, quantity: 12, unit: 'Pieces', low_stock_threshold: 10, expiry_date: expiredYesterday, supplier_id: supDairy?.id },
        { name: 'Chocolate Chip Cookies', barcode: '5901234123501', sku: 'SKU-COOKIE-006', category: 'Bakery', price: 50.00, quantity: 40, unit: 'Pieces', low_stock_threshold: 10, expiry_date: inSixMonths, supplier_id: supGlobal?.id },
        { name: 'Dove Beauty Soap 100g', barcode: '5901234123518', sku: 'SKU-SOAP-007', category: 'PersonalCare', price: 45.00, quantity: 100, unit: 'Pieces', low_stock_threshold: 20, expiry_date: inSixMonths, supplier_id: supGlobal?.id },
        { name: 'Herbal Essence Shampoo 200ml', barcode: '5901234123525', sku: 'SKU-SHMP-008', category: 'PersonalCare', price: 120.00, quantity: 60, unit: 'Pieces', low_stock_threshold: 15, expiry_date: inSixMonths, supplier_id: supGlobal?.id },
        { name: 'Cadbury Dairy Milk Silk', barcode: '5901234123532', sku: 'SKU-CHOC-009', category: 'Pantry', price: 80.00, quantity: 120, unit: 'Pieces', low_stock_threshold: 25, expiry_date: inTwoWeeks, supplier_id: supGlobal?.id },
        { name: 'Amul Pasteurised Butter 500g', barcode: '5901234123549', sku: 'SKU-BUTR-010', category: 'Dairy', price: 260.00, quantity: 40, unit: 'Pieces', low_stock_threshold: 10, expiry_date: inTwoWeeks, supplier_id: supDairy?.id },
        { name: 'Fortune Kachi Ghani Mustard Oil 1L', barcode: '5901234123556', sku: 'SKU-OIL-011', category: 'Pantry', price: 175.00, quantity: 30, unit: 'Liters', low_stock_threshold: 8, expiry_date: inSixMonths, supplier_id: supGlobal?.id },
        { name: 'Aashirvaad Shudh Chakki Atta 5kg', barcode: '5901234123563', sku: 'SKU-ATTA-012', category: 'Pantry', price: 290.00, quantity: 25, unit: 'kg', low_stock_threshold: 5, expiry_date: inSixMonths, supplier_id: supGlobal?.id },
        { name: 'Colgate MaxFresh Gel Paste 150g', barcode: '5901234123570', sku: 'SKU-PAST-013', category: 'PersonalCare', price: 95.00, quantity: 80, unit: 'Pieces', low_stock_threshold: 20, expiry_date: inSixMonths, supplier_id: supGlobal?.id },
        { name: 'Coca Cola Soft Drink 1.25L', barcode: '5901234123587', sku: 'SKU-COKE-014', category: 'Beverages', price: 70.00, quantity: 50, unit: 'Liters', low_stock_threshold: 15, expiry_date: inTwoWeeks, supplier_id: supGlobal?.id }
      ];

      const { data: seededProds, error: prodErr } = await supabase.from('products').insert(prods).select();
      if (prodErr) throw prodErr;

      // Create Stock Logs audit trail
      const logs = seededProds.map(p => ({
        product_id: p.id,
        change_qty: p.quantity,
        reason: 'restock',
        user_id: seededUsers.find(u => u.role === 'manager')?.id
      }));
      const { error: logErr } = await supabase.from('stock_logs').insert(logs);
      if (logErr) throw logErr;

      // Seed past orders over the last 3 days for analytics
      console.log('[Database Seeding] Seeding default sales orders history...');
      const orderDates = [
        new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        today.toISOString()
      ];

      for (let i = 0; i < orderDates.length; i++) {
        const { data: orderData, error: oErr } = await supabase.from('orders').insert({
          customer_id: seededCustomer?.id || null,
          cashier_id: null,
          order_type: 'online',
          total_amount: 230.00,
          discount_amount: 20.00,
          gst_amount: 37.80,
          final_amount: 247.80,
          status: 'completed',
          payment_method: 'razorpay',
          payment_status: 'completed',
          created_at: orderDates[i]
        }).select();
        
        if (oErr) throw oErr;
        
        const insertedOrder = orderData[0];
        
        // Insert order items
        await supabase.from('order_items').insert([
          {
            order_id: insertedOrder.id,
            product_id: seededProds[0].id,
            quantity: 2,
            price: 60.00,
            gst_rate: 18.0,
            gst_amount: 21.60,
            discount_amount: 10.00,
            subtotal: 131.60
          },
          {
            order_id: insertedOrder.id,
            product_id: seededProds[2].id,
            quantity: 2,
            price: 50.00,
            gst_rate: 18.0,
            gst_amount: 16.20,
            discount_amount: 10.00,
            subtotal: 116.20
          }
        ]);
      }

      // 4. Seed Expenses
      console.log('[Database Seeding] Seeding default expenses...');
      const managerUser = seededUsers.find(u => u.role === 'manager');
      const managerId = managerUser ? managerUser.id : null;
      if (managerId) {
        await supabase.from('expenses').insert([
          { title: 'Monthly Store Rent', category: 'Rent', amount: 15000.00, description: 'Store location monthly lease payment', date: new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], created_by: managerId },
          { title: 'Electricity Bill May', category: 'Utilities', amount: 4500.00, description: 'BESCOM electricity invoice', date: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], created_by: managerId },
          { title: 'Water & Maintenance', category: 'Utilities', amount: 1200.00, description: 'Monthly building maintenance & water', date: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], created_by: managerId }
        ]);
      }

      console.log('[Database Seeding] Seeding completed.');
    }
  } catch (error) {
    console.error('[Database Seeding] Error seeding collections:', error);
  }
}

module.exports = {
  getDatabaseConnection,
  initializeDatabase,
  supabase
};
