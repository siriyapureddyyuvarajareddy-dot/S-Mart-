import React, { useState, useEffect, createContext, useContext } from 'react';
import { ShoppingBag, Users, AlertTriangle, ShieldCheck, LogOut, ChevronDown, Bell, HelpCircle } from 'lucide-react';
import Login from './pages/Login';
import ManagerDashboard from './pages/ManagerDashboard';
import CashierBilling from './pages/CashierBilling';
import InventoryStaff from './pages/InventoryStaff';
import FreshMart from './pages/FreshMart';

// API Context for global state
export const AppContext = createContext();

const getAPI_BASE = () => {
  if (import.meta.env.VITE_API_BASE) return import.meta.env.VITE_API_BASE;
  if (typeof window !== 'undefined') {
    if (window.location.port && window.location.port !== '5173') {
      return `${window.location.protocol}//${window.location.host}/api`;
    }
    if (!window.location.port && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return `${window.location.protocol}//${window.location.host}/api`;
    }
    return `http://${window.location.hostname}:5000/api`;
  }
  return 'http://127.0.0.1:5000/api';
};
export const API_BASE = getAPI_BASE();

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('smart_token') || null);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('smart_user')) || null);
  const [toasts, setToasts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState('');
  const [showLogin, setShowLogin] = useState(false);

  // Toast helper
  const triggerToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Sync token to storage
  useEffect(() => {
    if (token) {
      localStorage.setItem('smart_token', token);
    } else {
      localStorage.removeItem('smart_token');
      localStorage.removeItem('smart_user');
      setUser(null);
    }
  }, [token]);

  // Sync user object
  useEffect(() => {
    if (user) {
      localStorage.setItem('smart_user', JSON.stringify(user));
      // Set default tab based on role
      if (user.role === 'manager') setActiveTab('employees');
      else if (user.role === 'cashier') setActiveTab('billing');
      else if (user.role === 'inventory') setActiveTab('inventory');
    }
  }, [user]);

  // Fetch notifications if logged in
  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, [token]);

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setShowLogin(false);
    triggerToast('Successfully logged out', 'info');
  };

  if (!token) {
    return (
      <AppContext.Provider value={{ token, setToken, user, setUser, triggerToast, notifications, fetchNotifications, setShowLogin }}>
        {showLogin ? (
          <Login />
        ) : (
          <FreshMart onOpenLogin={() => setShowLogin(true)} />
        )}
        {/* Simple Toast popup container */}
        <ToastContainer toasts={toasts} setToasts={setToasts} />
      </AppContext.Provider>
    );
  }

  return (
    <AppContext.Provider value={{ token, setToken, user, setUser, triggerToast, notifications, fetchNotifications }}>
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans select-none">

        {/* Global Navigation header */}
        <header className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white pt-6 pb-12 px-4 md:px-8 relative shadow-lg">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/10 rounded-xl glass-effect flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">S Mart Portal</h1>
                <p className="text-emerald-100/90 text-sm font-medium tracking-wide">Enterprise Supermarket Management System</p>
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-semibold text-emerald-100 bg-white/15 px-3 py-1.5 rounded-xl border border-white/5 uppercase">
                Role: {user.role} | {user.name}
              </span>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-white/95 bg-white/10 border border-white/10 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Active Session
              </div>

              <button 
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 active:scale-95 text-white transition-all shadow-sm cursor-pointer border-none"
              >
                <LogOut className="w-3.5 h-3.5" />
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Tabbed view router according to user role permissions */}
        <main className="max-w-7xl w-full mx-auto px-4 md:px-8 -mt-6 mb-16 flex-grow flex flex-col gap-6 relative z-10">
          
          {/* Main workspace role renders */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xl min-h-[500px]">
            {user.role === 'manager' ? (
              <ManagerDashboard activeTab={activeTab} setActiveTab={setActiveTab} />
            ) : user.role === 'cashier' ? (
              <CashierBilling />
            ) : (
              <InventoryStaff />
            )}
          </div>
        </main>

        {/* Sticky footer */}
        <footer className="bg-white border-t border-slate-100 py-6 text-center text-xs font-semibold text-slate-400">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
            <p>&copy; 2026 S Mart Supermarket Solutions. All rights reserved.</p>
            <p className="flex items-center gap-1.5">
              Designed for Enterprise Scale
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Secure JWT Node Backend
            </p>
          </div>
        </footer>

        {/* Toast Notification Popups */}
        <ToastContainer toasts={toasts} setToasts={setToasts} />
      </div>
    </AppContext.Provider>
  );
}

// Subcomponent: Toast container
function ToastContainer({ toasts, setToasts }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => {
        let borderClass = 'border-emerald-500';
        let bgIcon = 'bg-emerald-50 text-emerald-500';
        if (toast.type === 'error') {
          borderClass = 'border-rose-500';
          bgIcon = 'bg-rose-50 text-rose-500';
        } else if (toast.type === 'warning') {
          borderClass = 'border-amber-500';
          bgIcon = 'bg-amber-50 text-amber-500';
        } else if (toast.type === 'info') {
          borderClass = 'border-blue-500';
          bgIcon = 'bg-blue-50 text-blue-500';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 w-full bg-white border-l-4 ${borderClass} rounded-xl p-4 shadow-xl border border-slate-100 transition-all duration-300 animate-slide-in`}
          >
            <div className={`p-1.5 rounded-lg ${bgIcon}`}>
              {toast.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
            </div>
            <div className="flex-grow">
              <p className="text-xs font-semibold text-slate-800">{toast.message}</p>
            </div>
            <button
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="text-slate-400 hover:text-slate-600 cursor-pointer border-none bg-transparent"
            >
              &times;
            </button>
          </div>
        );
      })}
    </div>
  );
}
