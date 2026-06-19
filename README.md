# S Mart - Enterprise Supermarket Management System (MongoDB & Cloud Ready)

S Mart is a complete, enterprise-level full-stack Supermarket Management System ready for production cloud deployment. It features role-based access control (RBAC), a cashier terminal (POS), inventory alerts, supplier logs, employee attendance, printable receipt invoices, and AI-powered statistical forecasting modules.

---

## 🛠️ Technology Stack

* **Frontend:** React.js, Tailwind CSS (v3), Lucide React, Chart.js, HTML5 QRcode scanner, JsBarcode.
* **Backend:** Node.js, Express.js, JWT Authentication, QRCode generator.
* **Database:** MongoDB (via Mongoose ODM).
* **Payment Integration:** Razorpay (Mock simulation wrapper).

---

## ☁️ Deployment Instructions

S Mart is configured out-of-the-box for seamless hosting on **Render** (Backend API) and **Vercel** (Frontend UI):

### 1. MongoDB Database Setup
1. Create a free shared cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a database user and whitelist IP access (`0.0.0.0/0` for Render cloud access).
3. Copy your MongoDB connection string (e.g. `mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/smart_supermarket?retryWrites=true&w=majority`).

### 2. Backend Deployment on Render
1. Sign up on [Render](https://render.com) and create a **Web Service**.
2. Connect your repository containing the `backend/` folder.
3. Configure the following build & start parameters:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. Add the following **Environment Variables** in Render settings:
   - `MONGODB_URI`: *Your MongoDB Atlas connection string (copied above).*
   - `JWT_SECRET`: *A secure random string (e.g. `smart_portal_jwt_secret_vivek_2026`).*
   - `PORT`: `5000` *(optional, Render sets this dynamically).*
5. Render will build and launch your service. Copy the generated Web Service URL (e.g. `https://s-mart-api.onrender.com`).

### 3. Frontend Deployment on Vercel
1. Sign up on [Vercel](https://vercel.com) and create a **New Project**.
2. Connect your repository.
3. Configure the following project parameters:
   - **Root Directory:** `frontend`
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Add the following **Environment Variable** in Vercel settings:
   - `VITE_API_BASE`: `https://s-mart-api.onrender.com/api` *(replace with your actual Render Web Service URL with `/api` appended).*
5. Click **Deploy**. Vercel will build your static files and generate your frontend URL (e.g. `https://s-mart-portal.vercel.app`).
6. *Note: [vercel.json](file:///C:/term-4/S%20Mart/frontend/vercel.json) is already included to automatically manage single-page application routing rewrites on client-side requests.*

---

## 🔑 Demo Accounts (User Role access)

S Mart automatically seeds your MongoDB cluster on startup if it contains 0 products. You can log in using these pre-seeded accounts:

| Role | Username | Password | Access Rights & Views |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` | Full dashboard access, HR logs, AI forecasts, supplier data, reports |
| **Manager** | `manager` | `manager123` | Analytics, AI forecasting, restocking recommendations, supplier CRUD |
| **Cashier** | `cashier` | `cashier123` | High-efficiency POS billing terminal, customer search, receipt printer |
| **Inventory Staff** | `inventory` | `inventory123` | Stock tables, adjustments log, barcode generator, expiry warning banners |
| **Customer** | `customer` | `customer123` | Online catalog ordering, cart, mock Razorpay payment checkout, order tracker |

---

## 📡 REST API Documentation

Pass `Authorization: Bearer <JWT_Token>` in header for protected routes.

### Authentication
* `POST /api/auth/login` - Verify credentials and return signed JWT.
  * *Request Body:* `{ "username": "admin", "password": "admin123" }`
* `POST /api/auth/register` - Create new user profile.
* `GET /api/auth/me` - Retrieve authenticated user metadata.

### Products & Inventory
* `GET /api/products` - List all products with optional filters (`search`, `category`, `lowStock`, `expired`).
* `GET /api/products/barcode/:barcode` - Fetch item by barcode.
* `POST /api/products` - Register new product (auto-generates barcode & SKU).
* `PUT /api/products/:id` - Update product fields.
* `POST /api/products/:id/adjust` - Manual stock adjustment.
* `DELETE /api/products/:id` - Delete product from system.

### POS & Checkout Billing
* `POST /api/billing/checkout` - finalizes counter cashier checkout (validates stock, deducts counts, credits loyalty points, returns qr code).
* `POST /api/billing/create-razorpay-order` - Creates Razorpay checkout orders.
* `POST /api/billing/verify-payment` - Verifies online order payment signatures and registers orders.
* `GET /api/billing/invoice/:orderId` - Fetches single invoice transaction details.
