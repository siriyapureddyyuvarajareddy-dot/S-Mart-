const express = require('express');
const router = express.Router();
const { supabase } = require('../config/db');
const mockDb = require('../utils/mockDb');
const { authenticateJWT, restrictTo } = require('../middleware/auth');

// Helper to generate EAN-13 checksum digit
function generateEAN13Checksum(code12) {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(code12[i], 10);
    if (i % 2 === 0) {
      sum += digit * 1;
    } else {
      sum += digit * 3;
    }
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit;
}

// Helper to generate a new unique EAN-13 barcode
function generateNewBarcode(seedId) {
  const prefix = '5901234'; // S Mart prefix
  const productPart = String(seedId).padStart(5, '0');
  const tempCode = prefix + productPart;
  const checksum = generateEAN13Checksum(tempCode);
  return tempCode + checksum;
}

// 1. Get Products with search and filters
router.get('/', authenticateJWT, async (req, res) => {
  const { search, category, lowStock, expired } = req.query;
  
  try {
    const isOffline = !process.env.TURSO_DATABASE_URL;
    
    if (isOffline) {
      await mockDb.initMockDatabase();
      let list = [...mockDb.mockProducts];
      
      if (search) {
        const s = search.toLowerCase();
        list = list.filter(p => 
          p.name.toLowerCase().includes(s) || 
          p.barcode === search || 
          p.sku === search
        );
      }
      
      if (category) {
        list = list.filter(p => p.category === category);
      }
      
      if (lowStock === 'true') {
        list = list.filter(p => p.quantity <= p.lowStockThreshold);
      }
      
      if (expired === 'true') {
        const today = new Date().toISOString().split('T')[0];
        list = list.filter(p => p.expiryDate && p.expiryDate < today);
      }
      
      // format response
      const formatted = list.map(p => {
        const supplier = mockDb.mockSuppliers.find(s => String(s._id) === String(p.supplierId));
        return {
          id: p._id,
          name: p.name,
          barcode: p.barcode,
          sku: p.sku,
          category: p.category,
          price: p.price,
          quantity: p.quantity,
          unit: p.unit,
          low_stock_threshold: p.lowStockThreshold,
          expiry_date: p.expiryDate,
          supplier_id: p.supplierId,
          supplier_name: supplier ? supplier.name : 'N/A',
          created_at: p.createdAt
        };
      });
      return res.json(formatted);
    }

    // ONLINE MODE (TURSO)
    let sql = 'SELECT p.*, s.name AS supplier_name FROM products p LEFT JOIN suppliers s ON p.supplier_id = s.id';
    const args = [];
    const conditions = [];
    
    if (category) {
      conditions.push('p.category = ?');
      args.push(category);
    }
    
    if (expired === 'true') {
      const today = new Date().toISOString().split('T')[0];
      conditions.push('p.expiry_date IS NOT NULL AND p.expiry_date < ?');
      args.push(today);
    }
    
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    
    sql += ' ORDER BY p.created_at DESC';
    
    const result = await supabase.execute({ sql, args });
    let products = result.rows;
    
    // JS Filtering for search query and low stock check
    if (search) {
      const s = search.toLowerCase();
      products = products.filter(p => 
        p.name.toLowerCase().includes(s) || 
        p.barcode === search || 
        p.sku === search
      );
    }
    
    if (lowStock === 'true') {
      products = products.filter(p => p.quantity <= (p.low_stock_threshold || 10));
    }
    
    const formatted = products.map(p => ({
      id: p.id,
      name: p.name,
      barcode: p.barcode,
      sku: p.sku,
      category: p.category,
      price: parseFloat(p.price),
      quantity: p.quantity,
      unit: p.unit,
      low_stock_threshold: p.low_stock_threshold,
      expiry_date: p.expiry_date,
      supplier_id: p.supplier_id,
      supplier_name: p.supplier_name || 'N/A',
      created_at: p.created_at
    }));
    
    res.json(formatted);
  } catch (error) {
    console.error('Fetch products error:', error);
    res.status(500).json({ error: 'Failed to load products list' });
  }
});

// 2. Get Product by Barcode
router.get('/barcode/:barcode', authenticateJWT, async (req, res) => {
  const { barcode } = req.params;
  
  try {
    const isOffline = !process.env.TURSO_DATABASE_URL;
    
    if (isOffline) {
      await mockDb.initMockDatabase();
      const product = mockDb.mockProducts.find(p => p.barcode === barcode.trim());
      if (!product) {
        return res.status(404).json({ error: `Product with barcode ${barcode} not found` });
      }
      return res.json({
        id: product._id,
        name: product.name,
        barcode: product.barcode,
        sku: product.sku,
        category: product.category,
        price: product.price,
        quantity: product.quantity,
        unit: product.unit,
        low_stock_threshold: product.lowStockThreshold,
        expiry_date: product.expiryDate,
        supplier_id: product.supplierId,
        created_at: product.createdAt
      });
    }

    // ONLINE MODE (TURSO)
    const result = await supabase.execute({
      sql: 'SELECT * FROM products WHERE barcode = ?',
      args: [barcode.trim()]
    });
    const product = result.rows[0];

    if (!product) {
      return res.status(404).json({ error: `Product with barcode ${barcode} not found` });
    }
    
    res.json({
      id: product.id,
      name: product.name,
      barcode: product.barcode,
      sku: product.sku,
      category: product.category,
      price: parseFloat(product.price),
      quantity: product.quantity,
      unit: product.unit,
      low_stock_threshold: product.low_stock_threshold,
      expiry_date: product.expiry_date,
      supplier_id: product.supplier_id,
      created_at: product.created_at
    });
  } catch (error) {
    console.error('Fetch by barcode error:', error);
    res.status(500).json({ error: 'Failed to search product by barcode' });
  }
});

// 3. Register Product
router.post('/', authenticateJWT, restrictTo('manager', 'inventory'), async (req, res) => {
  const { name, category, price, quantity, unit, lowStockThreshold, expiryDate, supplierId } = req.body;
  
  if (!name || !category || price === undefined || quantity === undefined || !unit) {
    return res.status(400).json({ error: 'Missing mandatory product attributes' });
  }

  try {
    const isOffline = !process.env.TURSO_DATABASE_URL;
    
    if (isOffline) {
      await mockDb.initMockDatabase();
      const duplicate = mockDb.mockProducts.find(p => p.name.toLowerCase() === name.trim().toLowerCase());
      if (duplicate) {
        return res.status(400).json({ error: `Product with name "${name}" already registered` });
      }
      
      const seed = Math.floor(10000 + Math.random() * 90000);
      const barcode = generateNewBarcode(seed);
      const sku = `SKU-${category.slice(0, 3).toUpperCase()}-${seed}`;
      const newProductId = `mock_prod_${mockDb.mockProducts.length + 1}`;
      
      const newProduct = {
        _id: newProductId,
        name: name.trim(),
        barcode,
        sku,
        category,
        price: parseFloat(price),
        quantity: parseInt(quantity),
        unit,
        lowStockThreshold: parseInt(lowStockThreshold || 15),
        expiryDate: expiryDate || null,
        supplierId: supplierId || null,
        createdAt: new Date()
      };
      
      mockDb.mockProducts.push(newProduct);
      
      mockDb.mockStockLogs.push({
        _id: `mock_log_${Date.now()}`,
        productId: newProductId,
        changeQty: parseInt(quantity),
        reason: 'restock',
        userId: req.user.id,
        createdAt: new Date()
      });
      
      return res.status(201).json({
        id: newProduct._id,
        name: newProduct.name,
        barcode: newProduct.barcode,
        sku: newProduct.sku,
        category: newProduct.category,
        price: newProduct.price,
        quantity: newProduct.quantity,
        unit: newProduct.unit,
        low_stock_threshold: newProduct.lowStockThreshold,
        expiry_date: newProduct.expiryDate,
        created_at: newProduct.createdAt
      });
    }

    // ONLINE MODE (TURSO)
    const dupResult = await supabase.execute({
      sql: 'SELECT * FROM products WHERE name = ?',
      args: [name.trim()]
    });
    if (dupResult.rows.length > 0) {
      return res.status(400).json({ error: `Product with name "${name}" already registered` });
    }
    
    const seed = Math.floor(10000 + Math.random() * 90000);
    const barcode = generateNewBarcode(seed);
    const sku = `SKU-${category.slice(0, 3).toUpperCase()}-${seed}`;
    
    const prodResult = await supabase.execute({
      sql: 'INSERT INTO products (name, barcode, sku, category, price, quantity, unit, low_stock_threshold, expiry_date, supplier_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      args: [name.trim(), barcode, sku, category, parseFloat(price), parseInt(quantity), unit, parseInt(lowStockThreshold || 15), expiryDate || null, supplierId || null]
    });
    const newProductId = Number(prodResult.lastInsertRowid);
    
    await supabase.execute({
      sql: 'INSERT INTO stock_logs (product_id, change_qty, reason, user_id) VALUES (?, ?, ?, ?)',
      args: [newProductId, parseInt(quantity), 'restock', req.user.id]
    });
    
    res.status(201).json({
      id: newProductId,
      name: name.trim(),
      barcode,
      sku,
      category,
      price: parseFloat(price),
      quantity: parseInt(quantity),
      unit,
      low_stock_threshold: parseInt(lowStockThreshold || 15),
      expiry_date: expiryDate || null,
      created_at: new Date()
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to register new product' });
  }
});

// 4. Update Product
router.put('/:id', authenticateJWT, restrictTo('manager', 'inventory'), async (req, res) => {
  const { id } = req.params;
  const { name, price, quantity, unit, lowStockThreshold, expiryDate, supplierId, category } = req.body;
  
  try {
    const isOffline = !process.env.TURSO_DATABASE_URL;
    
    if (isOffline) {
      await mockDb.initMockDatabase();
      const product = mockDb.mockProducts.find(p => String(p._id) === String(id));
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      const oldQty = product.quantity;
      const newQty = quantity !== undefined ? parseInt(quantity) : oldQty;
      const qtyChange = newQty - oldQty;
      
      product.name = name ? name.trim() : product.name;
      product.category = category || product.category;
      product.price = price !== undefined ? parseFloat(price) : product.price;
      product.quantity = newQty;
      product.unit = unit || product.unit;
      product.lowStockThreshold = lowStockThreshold !== undefined ? parseInt(lowStockThreshold) : product.lowStockThreshold;
      product.expiryDate = expiryDate !== undefined ? expiryDate : product.expiryDate;
      product.supplierId = supplierId !== undefined ? supplierId : product.supplierId;
      
      if (qtyChange !== 0) {
        const reason = qtyChange > 0 ? 'restock' : 'adjustment';
        mockDb.mockStockLogs.push({
          _id: `mock_log_${Date.now()}`,
          productId: product._id,
          changeQty: qtyChange,
          reason,
          userId: req.user.id,
          createdAt: new Date()
        });
      }
      
      return res.json({
        id: product._id,
        name: product.name,
        barcode: product.barcode,
        sku: product.sku,
        category: product.category,
        price: product.price,
        quantity: product.quantity,
        unit: product.unit,
        low_stock_threshold: product.lowStockThreshold,
        expiry_date: product.expiryDate,
        created_at: product.createdAt
      });
    }

    // ONLINE MODE (TURSO)
    const productResult = await supabase.execute({
      sql: 'SELECT * FROM products WHERE id = ?',
      args: [id]
    });
    const product = productResult.rows[0];

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const oldQty = product.quantity;
    const newQty = quantity !== undefined ? parseInt(quantity) : oldQty;
    const qtyChange = newQty - oldQty;
    
    const nextName = name ? name.trim() : product.name;
    const nextCategory = category || product.category;
    const nextPrice = price !== undefined ? parseFloat(price) : product.price;
    const nextUnit = unit || product.unit;
    const nextThreshold = lowStockThreshold !== undefined ? parseInt(lowStockThreshold) : product.low_stock_threshold;
    const nextExpiry = expiryDate !== undefined ? expiryDate : product.expiry_date;
    const nextSupplier = supplierId !== undefined ? supplierId : product.supplier_id;

    await supabase.execute({
      sql: 'UPDATE products SET name = ?, category = ?, price = ?, quantity = ?, unit = ?, low_stock_threshold = ?, expiry_date = ?, supplier_id = ? WHERE id = ?',
      args: [nextName, nextCategory, nextPrice, newQty, nextUnit, nextThreshold, nextExpiry, nextSupplier, id]
    });
    
    if (qtyChange !== 0) {
      const reason = qtyChange > 0 ? 'restock' : 'adjustment';
      await supabase.execute({
        sql: 'INSERT INTO stock_logs (product_id, change_qty, reason, user_id) VALUES (?, ?, ?, ?)',
        args: [id, qtyChange, reason, req.user.id]
      });
    }
    
    res.json({
      id: product.id,
      name: nextName,
      barcode: product.barcode,
      sku: product.sku,
      category: nextCategory,
      price: parseFloat(nextPrice),
      quantity: newQty,
      unit: nextUnit,
      low_stock_threshold: nextThreshold,
      expiry_date: nextExpiry,
      created_at: product.created_at
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Failed to update product details' });
  }
});

// 5. Adjust Stock Quantity Directly
router.post('/:id/adjust', authenticateJWT, restrictTo('manager', 'inventory', 'cashier'), async (req, res) => {
  const { id } = req.params;
  const { amount, reason } = req.body;
  
  if (amount === undefined || !reason) {
    return res.status(400).json({ error: 'Adjustment amount and reason are required' });
  }
  
  try {
    const isOffline = !process.env.TURSO_DATABASE_URL;
    
    if (isOffline) {
      await mockDb.initMockDatabase();
      const product = mockDb.mockProducts.find(p => String(p._id) === String(id));
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      const newQty = Math.max(0, product.quantity + parseInt(amount));
      const realChange = newQty - product.quantity;
      
      product.quantity = newQty;
      
      if (realChange !== 0) {
        mockDb.mockStockLogs.push({
          _id: `mock_log_${Date.now()}`,
          productId: product._id,
          changeQty: realChange,
          reason,
          userId: req.user.id,
          createdAt: new Date()
        });
        
        if (newQty <= product.lowStockThreshold) {
          mockDb.mockNotifications.push({
            _id: `mock_notif_${Date.now()}`,
            roleTarget: 'inventory',
            title: 'Low Stock Alert',
            message: `Product "${product.name}" is low on stock (${newQty} ${product.unit} remaining)`,
            type: 'low_stock',
            isRead: false,
            createdAt: new Date()
          });
        }
      }
      
      return res.json({
        id: product._id,
        name: product.name,
        price: product.price,
        quantity: product.quantity,
        unit: product.unit
      });
    }

    // ONLINE MODE (TURSO)
    const productResult = await supabase.execute({
      sql: 'SELECT * FROM products WHERE id = ?',
      args: [id]
    });
    const product = productResult.rows[0];

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const newQty = Math.max(0, product.quantity + parseInt(amount));
    const realChange = newQty - product.quantity;
    
    await supabase.execute({
      sql: 'UPDATE products SET quantity = ? WHERE id = ?',
      args: [newQty, id]
    });
    
    if (realChange !== 0) {
      await supabase.execute({
        sql: 'INSERT INTO stock_logs (product_id, change_qty, reason, user_id) VALUES (?, ?, ?, ?)',
        args: [id, realChange, reason, req.user.id]
      });
      
      if (newQty <= (product.low_stock_threshold || 10)) {
        await supabase.execute({
          sql: 'INSERT INTO notifications (title, message, type) VALUES (?, ?, ?)',
          args: ['Low Stock Alert', `Product "${product.name}" is low on stock (${newQty} ${product.unit} remaining)`, 'low_stock']
        });
      }
    }
    
    res.json({
      id: product.id,
      name: product.name,
      price: parseFloat(product.price),
      quantity: newQty,
      unit: product.unit
    });
  } catch (error) {
    console.error('Adjust product stock error:', error);
    res.status(500).json({ error: 'Failed to adjust stock' });
  }
});

// 6. Delete Product
router.delete('/:id', authenticateJWT, restrictTo('manager', 'inventory'), async (req, res) => {
  const { id } = req.params;
  
  try {
    const isOffline = !process.env.TURSO_DATABASE_URL;
    
    if (isOffline) {
      await mockDb.initMockDatabase();
      const index = mockDb.mockProducts.findIndex(p => String(p._id) === String(id));
      if (index === -1) {
        return res.status(404).json({ error: 'Product not found' });
      }
      const p = mockDb.mockProducts[index];
      mockDb.mockProducts.splice(index, 1);
      return res.json({ success: true, message: `Product "${p.name}" successfully deleted.` });
    }

    // ONLINE MODE (TURSO)
    const productResult = await supabase.execute({
      sql: 'SELECT * FROM products WHERE id = ?',
      args: [id]
    });
    const product = productResult.rows[0];

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    await supabase.execute({
      sql: 'DELETE FROM products WHERE id = ?',
      args: [id]
    });
    res.json({ success: true, message: `Product "${product.name}" successfully deleted.` });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

module.exports = router;
