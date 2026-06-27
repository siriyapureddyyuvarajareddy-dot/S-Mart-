-- S Mart SQL Setup Script for Supabase (PostgreSQL)
-- Paste this script into the Supabase SQL Editor and click RUN to create the tables.

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email TEXT,
    role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'cashier', 'inventory', 'customer')),
    name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    gstin TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Products Table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    barcode TEXT UNIQUE NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    category TEXT,
    price NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (price >= 0.00),
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    unit TEXT NOT NULL,
    low_stock_threshold INTEGER DEFAULT 10,
    expiry_date DATE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Customers Table
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    loyalty_points INTEGER DEFAULT 0 CHECK (loyalty_points >= 0),
    phone TEXT,
    address TEXT,
    tier TEXT DEFAULT 'Bronze' CHECK (tier IN ('Bronze', 'Silver', 'Gold', 'Platinum')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Employees Table
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    salary NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    shift TEXT CHECK (shift IN ('morning', 'afternoon', 'night')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'terminated')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    cashier_id UUID REFERENCES users(id) ON DELETE SET NULL,
    order_type TEXT NOT NULL CHECK (order_type IN ('counter', 'online')),
    total_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(10,2) DEFAULT 0.00,
    gst_amount NUMERIC(10,2) DEFAULT 0.00,
    final_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'processing', 'cancelled')),
    payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'upi', 'razorpay')),
    payment_status TEXT DEFAULT 'completed' CHECK (payment_status IN ('completed', 'pending', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price NUMERIC(10,2) NOT NULL,
    gst_rate NUMERIC(5,2) DEFAULT 18.00,
    gst_amount NUMERIC(10,2) DEFAULT 0.00,
    discount_amount NUMERIC(10,2) DEFAULT 0.00,
    subtotal NUMERIC(10,2) NOT NULL
);

-- 8. Stock Logs Table (Auditing)
CREATE TABLE IF NOT EXISTS stock_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    change_qty INTEGER NOT NULL,
    reason TEXT NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 9. Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in TEXT,
    check_out TEXT,
    status TEXT NOT NULL CHECK (status IN ('present', 'late', 'absent')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(employee_id, date)
);

-- 10. Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (amount >= 0.00),
    description TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 11. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'unread' CHECK (status IN ('unread', 'read')),
    type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
