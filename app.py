# S Mart Portal - Staff Inventory Control Hub Flask Application
import os
import sqlite3
from flask import Flask, render_template, request, redirect, url_for, session, jsonify

app = Flask(__name__)
app.secret_key = 'smart_portal_secret_key_vivek'
DATABASE = 'database.db'

def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            quantity INTEGER NOT NULL CHECK (quantity >= 0),
            price REAL NOT NULL DEFAULT 0.0 CHECK (price >= 0.0),
            unit TEXT NOT NULL
        )
    ''')
    
    # Seed Products
    if conn.execute('SELECT COUNT(*) FROM products').fetchone()[0] == 0:
        initial_products = [
            ('Rice', 50, 60.0, 'kg'),
            ('Milk', 10, 45.0, 'Liters'),
            ('Apples', 0, 120.0, 'Pieces'),
            ('Bread', 25, 30.0, 'Pieces')
        ]
        conn.executemany('INSERT INTO products (name, quantity, price, unit) VALUES (?, ?, ?, ?)', initial_products)
        
    conn.commit()
    conn.close()

# Initialize database
init_db()

# --- Decorator for Authentication ---
def login_required(f):
    from functools import wraps
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('logged_in'):
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# --- Routes ---

@app.route('/')
def index():
    if session.get('logged_in'):
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    error = None
    if request.method == 'POST':
        if request.is_json:
            data = request.get_json()
            username = data.get('username', '').strip()
            password = data.get('password', '')
        else:
            username = request.form.get('username', '').strip()
            password = request.form.get('password', '')

        if username == 'vivek' and password == 'vivek@123':
            session['logged_in'] = True
            session['user'] = 'Vivek'
            if request.is_json:
                return jsonify({'success': True, 'message': 'Welcome Vivek!'})
            return redirect(url_for('dashboard'))
        else:
            error = 'Invalid credentials. Access is restricted.'
            if request.is_json:
                return jsonify({'success': False, 'message': error}), 401

    return render_template('login.html', error=error)

@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html', user=session.get('user'))

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

# --- API Endpoints for Dashboard AJAC Interaction ---

@app.route('/api/products', methods=['GET'])
@login_required
def get_products():
    conn = get_db_connection()
    rows = conn.execute('SELECT * FROM products ORDER BY id DESC').fetchall()
    conn.close()
    
    products = [dict(row) for row in rows]
    return jsonify(products)

@app.route('/api/products/download', methods=['GET'])
@login_required
def download_products():
    import csv
    import io
    from flask import make_response
    
    conn = get_db_connection()
    # SQL query to get all products in stock (quantity >= 1)
    rows = conn.execute('SELECT name, quantity, price, unit FROM products WHERE quantity >= 1 ORDER BY id DESC').fetchall()
    conn.close()
    
    si = io.StringIO()
    cw = csv.writer(si)
    cw.writerow(['Product Name', 'Quantity', 'Price (₹)', 'Unit'])
    for row in rows:
        cw.writerow([row['name'], row['quantity'], row['price'], row['unit']])
        
    output = make_response(si.getvalue())
    output.headers["Content-Disposition"] = "attachment; filename=in_stock_products.csv"
    output.headers["Content-type"] = "text/csv"
    return output

@app.route('/api/products/report', methods=['GET'])
@login_required
def get_products_report():
    from datetime import datetime
    conn = get_db_connection()
    # SQL query: get all products in stock (quantity >= 1)
    rows = conn.execute('SELECT name, quantity, price, unit FROM products WHERE quantity >= 1 ORDER BY name ASC').fetchall()
    conn.close()
    
    products = [dict(row) for row in rows]
    generated_at = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    return render_template('report.html', products=products, generated_at=generated_at)

@app.route('/api/products', methods=['POST'])
@login_required
def register_product():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No input data provided'}), 400
        
    name = data.get('name', '').strip()
    qty = data.get('quantity')
    price = data.get('price')
    unit = data.get('unit', '').strip()

    if not name:
        return jsonify({'error': 'Product name is required'}), 400
    try:
        qty = int(qty)
        if qty < 0:
            return jsonify({'error': 'Quantity must be non-negative'}), 400
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid quantity input'}), 400

    try:
        price = float(price)
        if price < 0:
            return jsonify({'error': 'Price must be non-negative'}), 400
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid price input'}), 400

    conn = get_db_connection()
    try:
        conn.execute('INSERT INTO products (name, quantity, price, unit) VALUES (?, ?, ?, ?)', (name, qty, price, unit))
        conn.commit()
        new_row = conn.execute('SELECT * FROM products WHERE name = ?', (name,)).fetchone()
        product = dict(new_row)
        return jsonify(product), 201
    except sqlite3.IntegrityError:
        return jsonify({'error': f'Product "{name}" already exists.'}), 400
    finally:
        conn.close()

@app.route('/api/products/<int:product_id>/adjust', methods=['POST'])
@login_required
def adjust_quantity(product_id):
    data = request.get_json()
    amount = data.get('amount', 0)
    
    conn = get_db_connection()
    row = conn.execute('SELECT * FROM products WHERE id = ?', (product_id,)).fetchone()
    if not row:
        conn.close()
        return jsonify({'error': 'Product not found'}), 404
        
    current_qty = row['quantity']
    new_qty = max(0, current_qty + amount)
    
    conn.execute('UPDATE products SET quantity = ? WHERE id = ?', (new_qty, product_id))
    conn.commit()
    
    updated_row = conn.execute('SELECT * FROM products WHERE id = ?', (product_id,)).fetchone()
    product = dict(updated_row)
    conn.close()
    
    return jsonify(product)

@app.route('/api/products/<int:product_id>/confirm', methods=['POST'])
@login_required
def confirm_quantity(product_id):
    conn = get_db_connection()
    row = conn.execute('SELECT * FROM products WHERE id = ?', (product_id,)).fetchone()
    conn.close()
    
    if not row:
        return jsonify({'error': 'Product not found'}), 404
        
    return jsonify({'success': True, 'message': f'"{row["name"]}" quantity confirmed.'})

@app.route('/api/products/<int:product_id>', methods=['DELETE'])
@login_required
def delete_product(product_id):
    conn = get_db_connection()
    row = conn.execute('SELECT * FROM products WHERE id = ?', (product_id,)).fetchone()
    if not row:
        conn.close()
        return jsonify({'error': 'Product not found'}), 404
        
    conn.execute('DELETE FROM products WHERE id = ?', (product_id,))
    conn.commit()
    conn.close()
    
    return jsonify({'success': True, 'message': f'"{row["name"]}" successfully deleted.'})

if __name__ == '__main__':
    # Remove old database file if table structure needs cleanup, to avoid DB column mismatches
    conn = sqlite3.connect(DATABASE)
    try:
        # Check if price column exists in products
        conn.execute('SELECT price FROM products LIMIT 1')
        conn.close()
    except sqlite3.OperationalError:
        conn.close()
        try:
            os.remove(DATABASE)
        except OSError:
            pass
        init_db()

    app.run(debug=True, host='127.0.0.1', port=5000)
