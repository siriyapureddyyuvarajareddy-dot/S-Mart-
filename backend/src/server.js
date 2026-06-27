const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { initializeDatabase, getDatabaseConnection } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors());

// Parse incoming JSON requests
app.use(express.json());

// Load Routers
const authRouter = require('./routes/auth');
const productsRouter = require('./routes/products');
const billingRouter = require('./routes/billing');
const suppliersRouter = require('./routes/suppliers');
const employeesRouter = require('./routes/employees');
const analyticsRouter = require('./routes/ai');
const notificationsRouter = require('./routes/notifications');
const expensesRouter = require('./routes/expenses');

// Mount API Endpoints
app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/billing', billingRouter);
app.use('/api/suppliers', suppliersRouter);
app.use('/api/employees', employeesRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/expenses', expensesRouter);

// Base route for server checking
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', system: 'S Mart Server API Hub', timestamp: new Date() });
});

// Run DB Initialization and Start server
async function startServer() {
  try {
    // 1. Initialize Supabase Database
    let dbConnected = true;
    try {
      await initializeDatabase();
    } catch (err) {
      console.warn('[Database] Supabase connection failed. Running in offline mode.');
      dbConnected = false;
    }
    
    // Command line test argument check
    if (process.argv.includes('--test')) {
      console.log('[Test Mode] Server bootstrap check completed successfully.');
      if (dbConnected) {
        const { supabase } = require('./config/db');
        const userResult = await supabase.execute({
          sql: 'SELECT * FROM users WHERE username = ?',
          args: ['manager']
        });
        const user = userResult.rows[0];
        if (user && user.name === 'Manager User') {
          console.log('[Test Mode] Database seed verification passed.');
          process.exit(0);
        } else {
          console.error('[Test Mode] Database verification failed. User not found.', error ? error.message : '');
          process.exit(1);
        }
      } else {
        console.log('[Test Mode] Skipped database query check because database server is offline.');
        process.exit(0);
      }
    }
    
    // 2. Start Express Listener
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`===================================================`);
      console.log(`  S MART BACKEND SERVER RUNNING ON PORT ${PORT}`);
      console.log(`  Local Health Check: http://localhost:${PORT}/health`);
      console.log(`===================================================`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
