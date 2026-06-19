const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const QRCode = require('qrcode');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const User = require('../models/User');
const StockLog = require('../models/StockLog');
const Notification = require('../models/Notification');
const mockDb = require('../utils/mockDb');
const { authenticateJWT, restrictTo } = require('../middleware/auth');

// 1. Counter Checkout (POS billing terminal)
router.post('/checkout', authenticateJWT, restrictTo('manager', 'cashier'), async (req, res) => {
  const { customerId, items, paymentMethod, redeemPoints } = req.body;
  
  if (!items || items.length === 0 || !paymentMethod) {
    return res.status(400).json({ error: 'Items list and payment method are required' });
  }
  
  try {
    const isOffline = mongoose.connection.readyState !== 1;
    
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

    // ONLINE MODE
    let subtotal = 0;
    let totalGst = 0;
    let totalDiscount = 0;
    const processedItems = [];
    
    for (const item of items) {
      const product = await Product.findById(item.productId);
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
    
    if (customerId) {
      const customerRow = await Customer.findById(customerId);
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
        await customerRow.save();
      }
    }
    
    for (const item of processedItems) {
      const product = await Product.findById(item.productId);
      product.quantity -= item.quantity;
      await product.save();
      
      await StockLog.create({
        productId: item.productId,
        changeQty: -item.quantity,
        reason: 'sale',
        userId: req.user.id
      });
      
      if (product.quantity <= product.lowStockThreshold) {
        await Notification.create({
          roleTarget: 'inventory',
          title: 'Low Stock Alert',
          message: `Product "${product.name}" is low on stock (${product.quantity} ${product.unit} remaining)`,
          type: 'low_stock'
        });
      }
    }
    
    const totalDiscountApplied = totalDiscount + loyaltyDiscount;
    const newOrder = await Order.create({
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
      items: processedItems
    });
    
    const invoiceUrl = `http://localhost:5000/api/billing/invoice/${newOrder._id}`;
    const qrCodeBase64 = await QRCode.toDataURL(invoiceUrl);
    
    res.status(201).json({
      success: true,
      message: 'Transaction completed successfully',
      orderId: newOrder._id,
      invoiceNumber: `SMART-INV-${String(newOrder._id).slice(-6).toUpperCase()}`,
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
    const isOffline = mongoose.connection.readyState !== 1;
    
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

    // ONLINE MODE
    const processedItems = [];
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product || product.quantity < item.quantity) {
        return res.status(400).json({ error: `Product "${item.name}" is out of stock or insufficient.` });
      }
      product.quantity -= item.quantity;
      await product.save();
      
      await StockLog.create({
        productId: item.productId,
        changeQty: -item.quantity,
        reason: 'sale',
        userId: req.user.id
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
      const customer = await Customer.findById(customerId);
      if (customer) {
        customer.loyaltyPoints += Math.floor(parseFloat(finalAmount) / 100);
        await customer.save();
      }
    }
    const newOrder = await Order.create({
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
      items: processedItems
    });
    res.json({ success: true, message: 'Online order processed successfully', orderId: newOrder._id });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

// 4. Retrieve single Invoice details
router.get('/invoice/:orderId', authenticateJWT, async (req, res) => {
  const { orderId } = req.params;
  
  try {
    const isOffline = mongoose.connection.readyState !== 1;
    
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

    // ONLINE MODE
    const order = await Order.findById(orderId)
      .populate({
        path: 'customerId',
        populate: { path: 'userId', select: 'name' }
      })
      .populate('items.productId', 'name unit');
      
    if (!order) {
      return res.status(404).json({ error: 'Order / Invoice not found' });
    }
    
    const formattedItems = order.items.map(it => ({
      productId: it.productId?._id,
      name: it.productId?.name || 'N/A',
      unit: it.productId?.unit || 'Pieces',
      quantity: it.quantity,
      price: it.price,
      gst_rate: it.gstRate,
      gst_amount: it.gstAmount,
      discount_amount: it.discountAmount,
      subtotal: it.subtotal
    }));
    
    res.json({
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
        customer_phone: order.customerId?.phone || '',
        customer_name: order.customerId?.userId?.name || ''
      },
      items: formattedItems
    });
  } catch (error) {
    console.error('Fetch invoice error:', error);
    res.status(500).json({ error: 'Failed to fetch invoice details' });
  }
});

module.exports = router;
