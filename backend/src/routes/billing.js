const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const { supabase } = require('../config/db');
const mockDb = require('../utils/mockDb');
const { authenticateJWT, restrictTo } = require('../middleware/auth');

// 1. Counter Checkout (POS billing terminal)
router.post('/checkout', authenticateJWT, restrictTo('manager', 'cashier'), async (req, res) => {
  const { customerId, items, paymentMethod, redeemPoints } = req.body;
  
  if (!items || items.length === 0 || !paymentMethod) {
    return res.status(400).json({ error: 'Items list and payment method are required' });
  }
  
  try {
    const isOffline = !process.env.TURSO_DATABASE_URL;
    
    if (isOffline) {
      await mockDb.initMockDatabase();
      
      let subtotal = 0;
      let totalGst = 0;
      let totalDiscount = 0;
      const processedItems = [];
      
      // Stock checks
      for (const item of items) {
        const product = mockDb.mockProducts.find(p => String(p._id) === String(item.productId));
        if (!product) {
          return res.status(404).json({ error: `Product ID ${item.productId} not found` });
        }
        
        if (product.quantity < item.quantity) {
          return res.status(400).json({ 
            error: `Insufficient stock for "${product.name}". Available: ${product.quantity} ${product.unit}, Requested: ${item.quantity}` 
          });
        }
        
        const itemPrice = parseFloat(item.price || product.price);
        const itemGstRate = parseFloat(item.gstRate || 18.0);
        const itemDiscount = parseFloat(item.discountAmount || 0.0);
        
        const rawSubtotal = itemPrice * item.quantity;
        const calculatedGst = (rawSubtotal - itemDiscount) * (itemGstRate / 100);
        
        subtotal += rawSubtotal;
        totalGst += calculatedGst;
        totalDiscount += itemDiscount;
        
        processedItems.push({
          productId: product._id,
          name: product.name,
          quantity: item.quantity,
          price: itemPrice,
          gstRate: itemGstRate,
          gstAmount: calculatedGst,
          discountAmount: itemDiscount,
          subtotal: rawSubtotal + calculatedGst - itemDiscount
        });
      }
      
      let finalAmount = subtotal + totalGst - totalDiscount;
      let loyaltyDiscount = 0;
      
      // Points adjustments
      if (customerId) {
        const customerRow = mockDb.mockCustomers.find(c => String(c._id) === String(customerId) || String(c.userId) === String(customerId));
        if (customerRow) {
          if (redeemPoints === true && customerRow.loyaltyPoints > 0) {
            const redeemable = Math.min(customerRow.loyaltyPoints, Math.floor(finalAmount));
            loyaltyDiscount = redeemable;
            finalAmount -= loyaltyDiscount;
            
            customerRow.loyaltyPoints -= redeemable;
          }
          
          const pointsEarned = Math.floor(finalAmount / 100);
          if (pointsEarned > 0) {
            customerRow.loyaltyPoints += pointsEarned;
          }
          
          if (customerRow.loyaltyPoints > 500) customerRow.tier = 'Platinum';
          else if (customerRow.loyaltyPoints > 200) customerRow.tier = 'Gold';
          else customerRow.tier = 'Silver';
        }
      }
      
      // Stock deducts & logs
      for (const item of processedItems) {
        const product = mockDb.mockProducts.find(p => String(p._id) === String(item.productId));
        product.quantity -= item.quantity;
        
        mockDb.mockStockLogs.push({
          _id: `mock_log_${Date.now()}`,
          productId: item.productId,
          changeQty: -item.quantity,
          reason: 'sale',
          userId: req.user.id,
          createdAt: new Date()
        });
        
        if (product.quantity <= product.lowStockThreshold) {
          mockDb.mockNotifications.push({
            _id: `mock_notif_${Date.now()}`,
            roleTarget: 'inventory',
            title: 'Low Stock Alert',
            message: `Product "${product.name}" is low on stock (${product.quantity} ${product.unit} remaining)`,
            type: 'low_stock',
            isRead: false,
            createdAt: new Date()
          });
        }
      }
      
      const newOrderId = `mock_order_${mockDb.mockOrders.length + 1}`;
      const totalDiscountApplied = totalDiscount + loyaltyDiscount;
      
      const newOrder = {
        _id: newOrderId,
        customerId: customerId || null,
        cashierId: req.user.id,
        orderType: 'counter',
        totalAmount: subtotal,
        discountAmount: totalDiscountApplied,
        gstAmount: totalGst,
        finalAmount: Math.max(0, finalAmount),
        status: 'completed',
        paymentMethod,
        paymentStatus: 'completed',
        items: processedItems,
        createdAt: new Date()
      };
      
      mockDb.mockOrders.push(newOrder);
      
      const invoiceUrl = `http://localhost:5000/api/billing/invoice/${newOrderId}`;
      const qrCodeBase64 = await QRCode.toDataURL(invoiceUrl);
      
      return res.status(201).json({
        success: true,
        message: 'Transaction completed successfully',
        orderId: newOrderId,
        invoiceNumber: `SMART-INV-${newOrderId.slice(-6).toUpperCase()}`,
        subtotal,
        gstAmount: totalGst,
        discountAmount: totalDiscountApplied,
        finalAmount: Math.max(0, finalAmount),
        paymentMethod,
        qrCode: qrCodeBase64,
        items: processedItems
      });
    }

    // ONLINE MODE (TURSO)
    let subtotal = 0;
    let totalGst = 0;
    let totalDiscount = 0;
    const processedItems = [];
    
    for (const item of items) {
      const prodResult = await supabase.execute({
        sql: 'SELECT * FROM products WHERE id = ?',
        args: [item.productId]
      });
      const product = prodResult.rows[0];

      if (!product) {
        return res.status(404).json({ error: `Product ID ${item.productId} not found` });
      }
      if (product.quantity < item.quantity) {
        return res.status(400).json({ 
          error: `Insufficient stock for "${product.name}". Available: ${product.quantity} ${product.unit}, Requested: ${item.quantity}` 
        });
      }
      
      const itemPrice = parseFloat(item.price || product.price);
      const itemGstRate = parseFloat(item.gstRate || 18.0);
      const itemDiscount = parseFloat(item.discountAmount || 0.0);
      
      const rawSubtotal = itemPrice * item.quantity;
      const calculatedGst = (rawSubtotal - itemDiscount) * (itemGstRate / 100);
      
      subtotal += rawSubtotal;
      totalGst += calculatedGst;
      totalDiscount += itemDiscount;
      
      processedItems.push({
        productId: product.id,
        name: product.name,
        quantity: item.quantity,
        price: itemPrice,
        gstRate: itemGstRate,
        gstAmount: calculatedGst,
        discountAmount: itemDiscount,
        subtotal: rawSubtotal + calculatedGst - itemDiscount
      });
    }
    
    let finalAmount = subtotal + totalGst - totalDiscount;
    let loyaltyDiscount = 0;
    
    if (customerId) {
      const custResult = await supabase.execute({
        sql: 'SELECT * FROM customers WHERE id = ?',
        args: [customerId]
      });
      const customerRow = custResult.rows[0];

      if (customerRow) {
        let currentPoints = customerRow.loyalty_points || 0;
        if (redeemPoints === true && currentPoints > 0) {
          const redeemable = Math.min(currentPoints, Math.floor(finalAmount));
          loyaltyDiscount = redeemable;
          finalAmount -= loyaltyDiscount;
          currentPoints -= redeemable;
        }
        const pointsEarned = Math.floor(finalAmount / 100);
        if (pointsEarned > 0) {
          currentPoints += pointsEarned;
        }
        let tier = 'Silver';
        if (currentPoints > 500) tier = 'Platinum';
        else if (currentPoints > 200) tier = 'Gold';
        
        await supabase.execute({
          sql: 'UPDATE customers SET loyalty_points = ?, tier = ? WHERE id = ?',
          args: [currentPoints, tier, customerId]
        });
      }
    }
    
    for (const item of processedItems) {
      // Deduct stock
      const prodResult = await supabase.execute({
        sql: 'SELECT * FROM products WHERE id = ?',
        args: [item.productId]
      });
      const prod = prodResult.rows[0];

      const newQty = Math.max(0, prod.quantity - item.quantity);
      await supabase.execute({
        sql: 'UPDATE products SET quantity = ? WHERE id = ?',
        args: [newQty, item.productId]
      });
      
      // Log stock log
      await supabase.execute({
        sql: 'INSERT INTO stock_logs (product_id, change_qty, reason, user_id) VALUES (?, ?, ?, ?)',
        args: [item.productId, -item.quantity, 'sale', req.user.id]
      });
      
      if (newQty <= (prod.low_stock_threshold || 10)) {
        await supabase.execute({
          sql: 'INSERT INTO notifications (title, message, type) VALUES (?, ?, ?)',
          args: ['Low Stock Alert', `Product "${prod.name}" is low on stock (${newQty} ${prod.unit} remaining)`, 'low_stock']
        });
      }
    }
    
    const totalDiscountApplied = totalDiscount + loyaltyDiscount;
    const orderResult = await supabase.execute({
      sql: 'INSERT INTO orders (customer_id, cashier_id, order_type, total_amount, discount_amount, gst_amount, final_amount, status, payment_method, payment_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      args: [customerId || null, req.user.id, 'counter', subtotal, totalDiscountApplied, totalGst, Math.max(0, finalAmount), 'completed', paymentMethod, 'completed']
    });
    const newOrderId = Number(orderResult.lastInsertRowid);

    for (const item of processedItems) {
      await supabase.execute({
        sql: 'INSERT INTO order_items (order_id, product_id, quantity, price, gst_rate, gst_amount, discount_amount, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        args: [newOrderId, item.productId, item.quantity, item.price, item.gstRate, item.gstAmount, item.discountAmount, item.subtotal]
      });
    }
    
    const invoiceUrl = `http://localhost:5000/api/billing/invoice/${newOrderId}`;
    const qrCodeBase64 = await QRCode.toDataURL(invoiceUrl);
    
    res.status(201).json({
      success: true,
      message: 'Transaction completed successfully',
      orderId: newOrderId,
      invoiceNumber: `SMART-INV-${String(newOrderId).slice(-6).toUpperCase()}`,
      subtotal,
      gstAmount: totalGst,
      discountAmount: totalDiscountApplied,
      finalAmount: Math.max(0, finalAmount),
      paymentMethod,
      qrCode: qrCodeBase64,
      items: processedItems
    });
  } catch (error) {
    console.error('Counter checkout error:', error);
    res.status(500).json({ error: 'Failed to process checkout transaction' });
  }
});

// 2. Create Razorpay Order
router.post('/create-razorpay-order', authenticateJWT, async (req, res) => {
  const { amount } = req.body;
  if (!amount) {
    return res.status(400).json({ error: 'Order amount is required' });
  }
  
  try {
    const mockOrderId = `order_mock_${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
    res.json({
      id: mockOrderId,
      amount: Math.round(parseFloat(amount) * 100),
      currency: 'INR',
      key: process.env.RAZORPAY_KEY_ID || 'rzp_test_mockkey12345'
    });
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    res.status(500).json({ error: 'Failed to create payment gateway order' });
  }
});

// 3. Confirm Online Order Payment
router.post('/verify-payment', authenticateJWT, async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, items, customerId, totalAmount, discountAmount, gstAmount, finalAmount } = req.body;
  
  if (!items || items.length === 0 || !razorpayPaymentId) {
    return res.status(400).json({ error: 'Invalid payment parameters' });
  }
  
  try {
    const isOffline = !process.env.TURSO_DATABASE_URL;
    
    if (isOffline) {
      await mockDb.initMockDatabase();
      const processedItems = [];
      
      for (const item of items) {
        const product = mockDb.mockProducts.find(p => String(p._id) === String(item.productId));
        if (!product || product.quantity < item.quantity) {
          return res.status(400).json({ error: `Product "${item.name}" is out of stock.` });
        }
        
        product.quantity -= item.quantity;
        
        mockDb.mockStockLogs.push({
          _id: `mock_log_${Date.now()}`,
          productId: item.productId,
          changeQty: -item.quantity,
          reason: 'sale',
          userId: req.user.id,
          createdAt: new Date()
        });
        
        processedItems.push({
          productId: product._id,
          quantity: item.quantity,
          price: parseFloat(item.price),
          gstRate: parseFloat(item.gstRate || 18.0),
          gstAmount: parseFloat(item.gstAmount || 0.0),
          discountAmount: parseFloat(item.discountAmount || 0.0),
          subtotal: parseFloat(item.subtotal)
        });
      }
      
      if (customerId) {
        const customer = mockDb.mockCustomers.find(c => String(c._id) === String(customerId) || String(c.userId) === String(customerId));
        if (customer) {
          customer.loyaltyPoints += Math.floor(parseFloat(finalAmount) / 100);
        }
      }
      
      const newOrderId = `mock_order_${mockDb.mockOrders.length + 1}`;
      mockDb.mockOrders.push({
        _id: newOrderId,
        customerId: customerId || null,
        orderType: 'online',
        totalAmount: parseFloat(totalAmount),
        discountAmount: parseFloat(discountAmount || 0.0),
        gstAmount: parseFloat(gstAmount || 0.0),
        finalAmount: parseFloat(finalAmount),
        status: 'processing',
        paymentMethod: 'razorpay',
        paymentStatus: 'completed',
        razorpayOrderId,
        razorpayPaymentId,
        items: processedItems,
        createdAt: new Date()
      });
      
      return res.json({ success: true, message: 'Online order processed successfully', orderId: newOrderId });
    }

    // ONLINE MODE (TURSO)
    const processedItems = [];
    for (const item of items) {
      const prodResult = await supabase.execute({
        sql: 'SELECT * FROM products WHERE id = ?',
        args: [item.productId]
      });
      const product = prodResult.rows[0];

      if (!product || product.quantity < item.quantity) {
        return res.status(400).json({ error: `Product "${item.name}" is out of stock or insufficient.` });
      }
      
      const newQty = Math.max(0, product.quantity - item.quantity);
      await supabase.execute({
        sql: 'UPDATE products SET quantity = ? WHERE id = ?',
        args: [newQty, item.productId]
      });
      
      await supabase.execute({
        sql: 'INSERT INTO stock_logs (product_id, change_qty, reason, user_id) VALUES (?, ?, ?, ?)',
        args: [item.productId, -item.quantity, 'sale', req.user.id]
      });
      
      processedItems.push({
        productId: product.id,
        quantity: item.quantity,
        price: parseFloat(item.price),
        gstRate: parseFloat(item.gstRate || 18.0),
        gstAmount: parseFloat(item.gstAmount || 0.0),
        discountAmount: parseFloat(item.discountAmount || 0.0),
        subtotal: parseFloat(item.subtotal)
      });
    }
    
    if (customerId) {
      const custResult = await supabase.execute({
        sql: 'SELECT * FROM customers WHERE id = ?',
        args: [customerId]
      });
      const customer = custResult.rows[0];

      if (customer) {
        const extraPoints = Math.floor(parseFloat(finalAmount) / 100);
        await supabase.execute({
          sql: 'UPDATE customers SET loyalty_points = ? WHERE id = ?',
          args: [(customer.loyalty_points || 0) + extraPoints, customerId]
        });
      }
    }
    
    const orderResult = await supabase.execute({
      sql: 'INSERT INTO orders (customer_id, order_type, total_amount, discount_amount, gst_amount, final_amount, status, payment_method, payment_status, razorpay_order_id, razorpay_payment_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      args: [customerId || null, 'online', parseFloat(totalAmount), parseFloat(discountAmount || 0.0), parseFloat(gstAmount || 0.0), parseFloat(finalAmount), 'processing', 'razorpay', 'completed', razorpayOrderId || null, razorpayPaymentId || null]
    });
    const newOrderId = Number(orderResult.lastInsertRowid);

    for (const it of processedItems) {
      await supabase.execute({
        sql: 'INSERT INTO order_items (order_id, product_id, quantity, price, gst_rate, gst_amount, discount_amount, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        args: [newOrderId, it.productId, it.quantity, it.price, it.gstRate, it.gstAmount, it.discountAmount, it.subtotal]
      });
    }
    
    res.json({ success: true, message: 'Online order processed successfully', orderId: newOrderId });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

// 3. Get recent orders history
router.get('/history', authenticateJWT, async (req, res) => {
  try {
    const isOffline = !process.env.TURSO_DATABASE_URL;
    if (isOffline) {
      await mockDb.initMockDatabase();
      const list = mockDb.mockOrders.map(o => ({
        id: o._id,
        invoiceNumber: `SMART-INV-${o._id}`,
        finalAmount: o.finalAmount || o.totalAmount,
        paymentMethod: o.paymentMethod || 'cash',
        createdAt: o.createdAt || new Date(),
        itemsCount: o.items ? o.items.length : 1
      }));
      return res.json(list.reverse().slice(0, 15));
    }

    // ONLINE MODE (TURSO)
    const result = await supabase.execute({
      sql: `SELECT o.id, o.final_amount, o.payment_method, o.created_at, 
            (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as items_count
            FROM orders o 
            ORDER BY o.created_at DESC LIMIT 15`
    });

    const list = result.rows.map(o => ({
      id: o.id,
      invoiceNumber: `SMART-INV-${o.id}`,
      finalAmount: parseFloat(o.final_amount),
      paymentMethod: o.payment_method,
      createdAt: o.created_at,
      itemsCount: Number(o.items_count)
    }));

    res.json(list);
  } catch (error) {
    console.error('Fetch orders history error:', error);
    res.status(500).json({ error: 'Failed to retrieve transaction history' });
  }
});

// 4. Retrieve single Invoice details
router.get('/invoice/:orderId', authenticateJWT, async (req, res) => {
  const { orderId } = req.params;
  
  try {
    const isOffline = !process.env.TURSO_DATABASE_URL;
    
    if (isOffline) {
      await mockDb.initMockDatabase();
      const order = mockDb.mockOrders.find(o => String(o._id) === String(orderId));
      if (!order) {
        return res.status(404).json({ error: 'Order / Invoice not found' });
      }
      
      // format items
      const formattedItems = order.items.map(it => {
        const prod = mockDb.mockProducts.find(p => String(p._id) === String(it.productId));
        return {
          productId: it.productId,
          name: prod ? prod.name : 'N/A',
          unit: prod ? prod.unit : 'Pieces',
          quantity: it.quantity,
          price: it.price,
          gst_rate: it.gstRate,
          gst_amount: it.gstAmount,
          discount_amount: it.discountAmount,
          subtotal: it.subtotal
        };
      });
      
      // get customer info
      let customerPhone = '';
      let customerName = '';
      if (order.customerId) {
        const customer = mockDb.mockCustomers.find(c => String(c._id) === String(order.customerId) || String(c.userId) === String(order.customerId));
        if (customer) {
          customerPhone = customer.phone;
          const userObj = mockDb.mockUsers.find(u => String(u._id) === String(customer.userId));
          if (userObj) customerName = userObj.name;
        }
      }
      
      return res.json({
        order: {
          id: order._id,
          order_type: order.orderType,
          total_amount: order.totalAmount,
          discount_amount: order.discountAmount,
          gst_amount: order.gstAmount,
          final_amount: order.finalAmount,
          status: order.status,
          payment_method: order.paymentMethod,
          payment_status: order.paymentStatus,
          razorpay_order_id: order.razorpayOrderId,
          razorpay_payment_id: order.razorpayPaymentId,
          created_at: order.createdAt,
          customer_phone: customerPhone,
          customer_name: customerName
        },
        items: formattedItems
      });
    }

    // ONLINE MODE (TURSO)
    const orderResult = await supabase.execute({
      sql: `SELECT o.*, c.phone AS customer_phone, u.name AS customer_name 
            FROM orders o 
            LEFT JOIN customers c ON o.customer_id = c.id 
            LEFT JOIN users u ON c.user_id = u.id 
            WHERE o.id = ?`,
      args: [orderId]
    });
    const order = orderResult.rows[0];
      
    if (!order) {
      return res.status(404).json({ error: 'Order / Invoice not found' });
    }
    
    const itemsResult = await supabase.execute({
      sql: `SELECT oi.*, p.name, p.unit 
            FROM order_items oi 
            LEFT JOIN products p ON oi.product_id = p.id 
            WHERE oi.order_id = ?`,
      args: [orderId]
    });
    const orderItems = itemsResult.rows;
    
    const formattedItems = orderItems.map(it => ({
      productId: it.product_id,
      name: it.name || 'N/A',
      unit: it.unit || 'Pieces',
      quantity: it.quantity,
      price: parseFloat(it.price),
      gst_rate: parseFloat(it.gst_rate),
      gst_amount: parseFloat(it.gst_amount),
      discount_amount: parseFloat(it.discount_amount),
      subtotal: parseFloat(it.subtotal)
    }));
    
    res.json({
      order: {
        id: order.id,
        order_type: order.order_type,
        total_amount: parseFloat(order.total_amount),
        discount_amount: parseFloat(order.discount_amount || 0),
        gst_amount: parseFloat(order.gst_amount || 0),
        final_amount: parseFloat(order.final_amount),
        status: order.status,
        payment_method: order.payment_method,
        payment_status: order.payment_status,
        razorpay_order_id: order.razorpay_order_id,
        razorpay_payment_id: order.razorpay_payment_id,
        created_at: order.created_at,
        customer_phone: order.customer_phone || '',
        customer_name: order.customer_name || ''
      },
      items: formattedItems
    });
  } catch (error) {
    console.error('Fetch invoice error:', error);
    res.status(500).json({ error: 'Failed to fetch invoice details' });
  }
});

// 5. Daily Revenue Settle Report
router.get('/settle-report', authenticateJWT, async (req, res) => {
  const targetDate = req.query.date || new Date().toISOString().split('T')[0];
  
  try {
    const isOffline = !process.env.TURSO_DATABASE_URL;
    
    if (isOffline) {
      await mockDb.initMockDatabase();
      const matchedOrders = mockDb.mockOrders.filter(o => {
        const oDate = new Date(o.createdAt).toISOString().split('T')[0];
        return oDate === targetDate;
      });

      const list = matchedOrders.map(o => {
        let customerName = 'Walk-in Customer';
        if (o.customerId) {
          const cust = mockDb.mockCustomers.find(c => String(c._id) === String(o.customerId) || String(c.userId) === String(o.customerId));
          if (cust) {
            const userObj = mockDb.mockUsers.find(u => String(u._id) === String(cust.userId));
            if (userObj) customerName = userObj.name;
          }
        }
        
        const cashierObj = mockDb.mockUsers.find(u => String(u._id) === String(o.cashierId));
        
        return {
          id: o._id,
          invoiceNumber: `SMART-INV-${o._id}`,
          customerName,
          cashierName: cashierObj ? cashierObj.name : 'System',
          finalAmount: o.finalAmount || o.totalAmount,
          paymentMethod: o.paymentMethod || 'cash',
          createdAt: o.createdAt || new Date()
        };
      });

      // Calculate aggregates
      let totalRevenue = 0;
      let upiRevenue = 0;
      let cashRevenue = 0;
      let otherRevenue = 0;

      list.forEach(o => {
        totalRevenue += o.finalAmount;
        if (o.paymentMethod === 'upi' || o.paymentMethod === 'razorpay') {
          upiRevenue += o.finalAmount;
        } else if (o.paymentMethod === 'cash') {
          cashRevenue += o.finalAmount;
        } else {
          otherRevenue += o.finalAmount;
        }
      });

      return res.json({
        date: targetDate,
        summary: {
          totalRevenue,
          upiRevenue,
          cashRevenue,
          otherRevenue
        },
        transactions: list
      });
    }

    // ONLINE MODE (TURSO)
    const result = await supabase.execute({
      sql: `SELECT o.id, o.final_amount, o.payment_method, o.created_at, 
            u.name AS customer_name, cu.name AS cashier_name
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.id
            LEFT JOIN users u ON c.user_id = u.id
            LEFT JOIN users cu ON o.cashier_id = cu.id
            WHERE date(o.created_at) = date(?) 
               OR strftime('%Y-%m-%d', o.created_at) = ?`,
      args: [targetDate, targetDate]
    });

    const list = result.rows.map(o => ({
      id: o.id,
      invoiceNumber: `SMART-INV-${o.id}`,
      customerName: o.customer_name || 'Walk-in Customer',
      cashierName: o.cashier_name || 'System',
      finalAmount: parseFloat(o.final_amount),
      paymentMethod: o.payment_method || 'cash',
      createdAt: o.created_at
    }));

    // Calculate aggregates
    let totalRevenue = 0;
    let upiRevenue = 0;
    let cashRevenue = 0;
    let otherRevenue = 0;

    list.forEach(o => {
      totalRevenue += o.finalAmount;
      if (o.paymentMethod === 'upi' || o.paymentMethod === 'razorpay') {
        upiRevenue += o.finalAmount;
      } else if (o.paymentMethod === 'cash') {
        cashRevenue += o.finalAmount;
      } else {
        otherRevenue += o.finalAmount;
      }
    });

    res.json({
      date: targetDate,
      summary: {
        totalRevenue,
        upiRevenue,
        cashRevenue,
        otherRevenue
      },
      transactions: list
    });
  } catch (error) {
    console.error('Fetch settle report error:', error);
    res.status(500).json({ error: 'Failed to retrieve daily settlement report' });
  }
});

module.exports = router;
