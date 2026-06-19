-- S Mart Portal Database Schema
-- Standard SQLite DDL (convertible to MySQL)

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'manager', 'cashier', 'inventory', 'customer')),
  name TEXT NOT NULL,
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
  category TEXT NOT NULL,
  price REAL NOT NULL CHECK(price >= 0.0),
  quantity INTEGER NOT NULL CHECK(quantity >= 0),
  unit TEXT NOT NULL CHECK(unit IN ('kg', 'Liters', 'Pieces', 'Dozens')),
  low_stock_threshold INTEGER DEFAULT 15,
  expiry_date TEXT, -- YYYY-MM-DD format
  supplier_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
);

-- 4. Customers Table (Extends users table for Loyalty system)
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE,
  loyalty_points INTEGER DEFAULT 0 CHECK(loyalty_points >= 0),
  phone TEXT,
  address TEXT,
  tier TEXT DEFAULT 'Silver', -- Silver, Gold, Platinum
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. Employees Table (Extends users table for HR and shift tracking)
CREATE TABLE IF NOT EXISTS employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE,
  salary REAL NOT NULL DEFAULT 0.0 CHECK(salary >= 0.0),
  shift TEXT NOT NULL CHECK(shift IN ('morning', 'afternoon', 'night')),
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 6. Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL,
  date TEXT NOT NULL, -- YYYY-MM-DD
  check_in TEXT, -- HH:MM:SS
  check_out TEXT, -- HH:MM:SS
  status TEXT NOT NULL DEFAULT 'absent' CHECK(status IN ('present', 'absent', 'late', 'half-day')),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  UNIQUE(employee_id, date)
);

-- 7. Orders Table (Offline counter billing and online retail purchases)
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER, -- Nullable for anonymous checkout
  cashier_id INTEGER, -- Nullable for online client checkout
  order_type TEXT NOT NULL CHECK(order_type IN ('online', 'counter')),
  total_amount REAL NOT NULL CHECK(total_amount >= 0.0),
  discount_amount REAL DEFAULT 0.0 CHECK(discount_amount >= 0.0),
  gst_amount REAL DEFAULT 0.0 CHECK(gst_amount >= 0.0),
  final_amount REAL NOT NULL CHECK(final_amount >= 0.0),
  status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('pending', 'processing', 'completed', 'cancelled', 'out_for_delivery')),
  payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'card', 'upi', 'razorpay')),
  payment_status TEXT NOT NULL DEFAULT 'completed' CHECK(payment_status IN ('pending', 'completed', 'failed')),
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY (cashier_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 8. Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  price REAL NOT NULL CHECK(price >= 0.0),
  gst_rate REAL DEFAULT 18.0, -- Percentage, e.g. 18.0 for 18%
  gst_amount REAL DEFAULT 0.0,
  discount_amount REAL DEFAULT 0.0,
  subtotal REAL NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

-- 9. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER, -- If specific user, else NULL for general staff
  role_target TEXT CHECK(role_target IN ('admin', 'manager', 'cashier', 'inventory', 'customer', 'staff')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'system' CHECK(type IN ('low_stock', 'expiry', 'system', 'order')),
  is_read INTEGER DEFAULT 0 CHECK(is_read IN (0, 1)),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 10. Stock Logs Table (Trace audit trail of stock adjustments)
CREATE TABLE IF NOT EXISTS stock_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  change_qty INTEGER NOT NULL,
  reason TEXT NOT NULL CHECK(reason IN ('sale', 'restock', 'expired', 'adjustment')),
  user_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
