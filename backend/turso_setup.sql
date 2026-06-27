-- S Mart SQL Setup Script for Turso (SQLite/Libsql)
-- Paste this script into your Turso dashboard query editor or Turso CLI shell.

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email TEXT,
    role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'cashier', 'inventory', 'customer')),
    name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    gstin TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Products Table
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    barcode TEXT UNIQUE NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    category TEXT,
    price REAL NOT NULL DEFAULT 0.00,
    quantity INTEGER NOT NULL DEFAULT 0,
    unit TEXT NOT NULL,
    low_stock_threshold INTEGER DEFAULT 10,
    expiry_date TEXT,
    supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Customers Table
CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    loyalty_points INTEGER DEFAULT 0,
    phone TEXT,
    address TEXT,
    tier TEXT DEFAULT 'Bronze' CHECK (tier IN ('Bronze', 'Silver', 'Gold', 'Platinum')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. Employees Table
CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    salary REAL NOT NULL DEFAULT 0.00,
    shift TEXT CHECK (shift IN ('morning', 'afternoon', 'night')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'terminated')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    cashier_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    order_type TEXT NOT NULL CHECK (order_type IN ('counter', 'online')),
    total_amount REAL NOT NULL DEFAULT 0.00,
    discount_amount REAL DEFAULT 0.00,
    gst_amount REAL DEFAULT 0.00,
    final_amount REAL NOT NULL DEFAULT 0.00,
    status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'processing', 'cancelled')),
    payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'upi', 'razorpay')),
    payment_status TEXT DEFAULT 'completed' CHECK (payment_status IN ('completed', 'pending', 'failed')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL,
    price REAL NOT NULL,
    gst_rate REAL DEFAULT 18.00,
    gst_amount REAL DEFAULT 0.00,
    discount_amount REAL DEFAULT 0.00,
    subtotal REAL NOT NULL
);

-- 8. Stock Logs Table (Auditing)
CREATE TABLE IF NOT EXISTS stock_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    change_qty INTEGER NOT NULL,
    reason TEXT NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 9. Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    check_in TEXT,
    check_out TEXT,
    status TEXT NOT NULL CHECK (status IN ('present', 'late', 'absent')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, date)
);

-- 10. Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0.00,
    description TEXT,
    date TEXT NOT NULL,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 11. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'unread' CHECK (status IN ('unread', 'read')),
    type TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
