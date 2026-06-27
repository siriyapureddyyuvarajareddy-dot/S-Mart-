import React, { useState, useEffect, useContext } from 'react';
import { AppContext, API_BASE } from '../App';
import { 
  Users, Truck, RefreshCw, UserCheck, DollarSign, Trash2, Edit2, BarChart3
} from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Register ChartJS elements for sales trend graphing
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);


export default function ManagerDashboard({ activeTab, setActiveTab }) {
  const { token, user, triggerToast } = useContext(AppContext);
  
  // Dashboard states
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [salesReport, setSalesReport] = useState({ dailySales: [], categorySales: [] });
  const [salesStats, setSalesStats] = useState({ totalRevenue: 0, totalOrders: 0, avgOrderValue: 0 });
  const [loading, setLoading] = useState(true);

  // Modal/Form states
  const [newSupName, setNewSupName] = useState('');
  const [newSupPerson, setNewSupPerson] = useState('');
  const [newSupPhone, setNewSupPhone] = useState('');
  const [newSupGst, setNewSupGst] = useState('');

  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpUser, setNewEmpUser] = useState('');
  const [newEmpEmail, setNewEmpEmail] = useState('');
  const [newEmpRole, setNewEmpRole] = useState('cashier');
  const [newEmpShift, setNewEmpShift] = useState('morning');
  const [newEmpSal, setNewEmpSal] = useState('22000');

  // Expense form states
  const [newExpTitle, setNewExpTitle] = useState('');
  const [newExpCat, setNewExpCat] = useState('Utilities');
  const [newExpAmt, setNewExpAmt] = useState('');
  const [newExpDesc, setNewExpDesc] = useState('');
  const [newExpDate, setNewExpDate] = useState('');
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [expenseSearch, setExpenseSearch] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      // 1. Employees & Attendance
      const resEmp = await fetch(`${API_BASE}/employees`, { headers });
      if (resEmp.ok) setEmployees(await resEmp.json());
      
      const resAtt = await fetch(`${API_BASE}/employees/attendance/report`, { headers });
      if (resAtt.ok) setAttendance(await resAtt.json());

      // 2. Suppliers
      const resSup = await fetch(`${API_BASE}/suppliers`, { headers });
      if (resSup.ok) setSuppliers(await resSup.json());
      
      // 3. Expenses
      const resExp = await fetch(`${API_BASE}/expenses`, { headers });
      if (resExp.ok) setExpenses(await resExp.json());
      
      // 4. Sales Reports
      const resSales = await fetch(`${API_BASE}/analytics/sales-reports`, { headers });
      if (resSales.ok) {
        const salesData = await resSales.json();
        setSalesReport({
          dailySales: salesData.dailySales || [],
          categorySales: salesData.categorySales || []
        });
        setSalesStats(salesData.stats || { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0 });
      }
      
    } catch (err) {
      console.error(err);
      triggerToast('Error updating manager dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // Suppliers insertion
  const handleAddSupplier = async (e) => {
    e.preventDefault();
    if (!newSupName) return;
    
    try {
      const res = await fetch(`${API_BASE}/suppliers`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          name: newSupName,
          contactPerson: newSupPerson,
          phone: newSupPhone,
          gstin: newSupGst
        })
      });
      if (res.ok) {
        triggerToast('Supplier added successfully', 'success');
        setNewSupName('');
        setNewSupPerson('');
        setNewSupPhone('');
        setNewSupGst('');
        fetchData();
      }
    } catch (err) {
      triggerToast('Failed to add supplier', 'error');
    }
  };

  // Employee insertion
  const handleAddEmployee = async (e) => {
    e.preventDefault();
    if (!newEmpName || !newEmpUser || !newEmpEmail) return;

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newEmpName,
          username: newEmpUser,
          email: newEmpEmail,
          password: `${newEmpUser}123`, // default password
          role: newEmpRole,
          shift: newEmpShift,
          salary: parseFloat(newEmpSal)
        })
      });
      if (res.ok) {
        triggerToast(`Employee ${newEmpName} registered! Default password: ${newEmpUser}123`, 'success');
        setNewEmpName('');
        setNewEmpUser('');
        setNewEmpEmail('');
        setNewEmpSal('22000');
        fetchData();
      } else {
        const errorData = await res.json();
        triggerToast(errorData.error || 'Failed to add employee', 'error');
      }
    } catch (err) {
      triggerToast('Server connection failed', 'error');
    }
  };

  const handleMarkCheckin = async (employeeId) => {
    try {
      const res = await fetch(`${API_BASE}/employees/attendance/checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ employeeId })
      });
      const data = await res.json();
      if (res.ok) {
        triggerToast('Check-in logged successfully', 'success');
        fetchData();
      } else {
        triggerToast(data.error || 'Failed to log check-in', 'error');
      }
    } catch (err) {
      triggerToast('Server connection failed', 'error');
    }
  };

  const handleMarkCheckout = async (employeeId) => {
    try {
      const res = await fetch(`${API_BASE}/employees/attendance/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ employeeId })
      });
      const data = await res.json();
      if (res.ok) {
        triggerToast('Check-out logged successfully', 'success');
        fetchData();
      } else {
        triggerToast(data.error || 'Failed to log check-out', 'error');
      }
    } catch (err) {
      triggerToast('Server connection failed', 'error');
    }
  };

  // Expenses handler (Create/Update)
  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (!newExpTitle || !newExpCat || !newExpAmt) return;

    try {
      const url = editingExpenseId 
        ? `${API_BASE}/expenses/${editingExpenseId}`
        : `${API_BASE}/expenses`;
      
      const method = editingExpenseId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newExpTitle,
          category: newExpCat,
          amount: parseFloat(newExpAmt),
          description: newExpDesc,
          date: newExpDate || undefined
        })
      });

      if (res.ok) {
        triggerToast(
          editingExpenseId ? 'Expense record updated successfully' : 'Expense record logged successfully', 
          'success'
        );
        setNewExpTitle('');
        setNewExpCat('Utilities');
        setNewExpAmt('');
        setNewExpDesc('');
        setNewExpDate('');
        setEditingExpenseId(null);
        fetchData();
      } else {
        const errorData = await res.json();
        triggerToast(errorData.error || 'Failed to save expense', 'error');
      }
    } catch (err) {
      triggerToast('Server connection failed', 'error');
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm('Are you sure you want to delete this expense record?')) return;
    try {
      const res = await fetch(`${API_BASE}/expenses/${expenseId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        triggerToast('Expense record deleted successfully', 'success');
        fetchData();
      } else {
        triggerToast('Failed to delete expense', 'error');
      }
    } catch (err) {
      triggerToast('Server connection failed', 'error');
    }
  };

  const startEditExpense = (exp) => {
    setEditingExpenseId(exp.id);
    setNewExpTitle(exp.title);
    setNewExpCat(exp.category);
    setNewExpAmt(exp.amount.toString());
    setNewExpDesc(exp.description);
    setNewExpDate(exp.date ? new Date(exp.date).toISOString().split('T')[0] : '');
  };

  const cancelEditExpense = () => {
    setEditingExpenseId(null);
    setNewExpTitle('');
    setNewExpCat('Utilities');
    setNewExpAmt('');
    setNewExpDesc('');
    setNewExpDate('');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
        <p className="text-sm font-semibold">Loading Dashboard Data...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      
      {/* Tab Navigation header */}
      <nav className="flex items-center bg-slate-50 rounded-2xl p-2 overflow-x-auto gap-1 border border-slate-100 mb-2">
        <button
          onClick={() => setActiveTab('employees')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-xs transition-all flex-shrink-0 cursor-pointer border-none ${
            activeTab === 'employees' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
          }`}
        >
          <Users className="w-4 h-4" />
          Employees
        </button>
        <button
          onClick={() => setActiveTab('attendance')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-xs transition-all flex-shrink-0 cursor-pointer border-none ${
            activeTab === 'attendance' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Daily Attendance
        </button>
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-xs transition-all flex-shrink-0 cursor-pointer border-none ${
            activeTab === 'suppliers' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
          }`}
        >
          <Truck className="w-4 h-4" />
          Suppliers
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-xs transition-all flex-shrink-0 cursor-pointer border-none ${
            activeTab === 'expenses' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Expenses
        </button>
        <button
          onClick={() => setActiveTab('sales')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-xs transition-all flex-shrink-0 cursor-pointer border-none ${
            activeTab === 'sales' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Sales & Reports
        </button>
      </nav>

      {/* RENDER TAB PANELS */}

      {/* 1. EMPLOYEES PANEL */}
      {activeTab === 'employees' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Add Employee Form */}
          <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">Register New Employee</h3>
            <form onSubmit={handleAddEmployee} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Name</label>
                <input 
                  type="text" 
                  value={newEmpName}
                  onChange={e => setNewEmpName(e.target.value)}
                  placeholder="e.g. Vivek Pillai"
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Username (Login ID)</label>
                <input 
                  type="text" 
                  value={newEmpUser}
                  onChange={e => setNewEmpUser(e.target.value)}
                  placeholder="e.g. vivek"
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Email</label>
                <input 
                  type="email" 
                  value={newEmpEmail}
                  onChange={e => setNewEmpEmail(e.target.value)}
                  placeholder="e.g. vivek@smart.com"
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Role</label>
                  <select 
                    value={newEmpRole}
                    onChange={e => setNewEmpRole(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="cashier">Cashier</option>
                    <option value="inventory">Inventory Staff</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Shift</label>
                  <select 
                    value={newEmpShift}
                    onChange={e => setNewEmpShift(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="morning">Morning (9AM - 5PM)</option>
                    <option value="afternoon">Afternoon (1PM - 9PM)</option>
                    <option value="night">Night (9PM - 5AM)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Monthly Salary (₹)</label>
                <input 
                  type="number" 
                  value={newEmpSal}
                  onChange={e => setNewEmpSal(e.target.value)}
                  placeholder="22000"
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <button 
                type="submit" 
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold cursor-pointer border-none"
              >
                Register Employee
              </button>
            </form>
          </div>

          {/* Employees List */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-slate-150 rounded-2xl p-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">Employee Roster</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 font-semibold text-slate-400 uppercase border-b border-slate-100">
                      <th className="px-4 py-2.5">Name</th>
                      <th className="px-4 py-2.5">Role</th>
                      <th className="px-4 py-2.5 text-center">Shift</th>
                      <th className="px-4 py-2.5 text-center">Salary (₹)</th>
                      <th className="px-4 py-2.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {employees.map(emp => (
                      <tr key={emp.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-800">{emp.name}</p>
                          <p className="text-[10px] text-slate-400">{emp.email}</p>
                        </td>
                        <td className="px-4 py-3 capitalize text-slate-500 font-bold">{emp.role}</td>
                        <td className="px-4 py-3 text-center capitalize">{emp.shift}</td>
                        <td className="px-4 py-3 text-center font-bold">₹{parseFloat(emp.salary).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            emp.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
                          }`}>
                            {emp.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. DAILY ATTENDANCE PANEL */}
      {activeTab === 'attendance' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Daily Attendance Control */}
          <div className="bg-white border border-slate-150 rounded-2xl p-5 lg:col-span-2">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Take Today's Attendance</h3>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">Date: {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">
                Live Status
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 font-semibold text-slate-400 uppercase border-b border-slate-100">
                    <th className="px-4 py-2.5">Employee</th>
                    <th className="px-4 py-2.5">Shift</th>
                    <th className="px-4 py-2.5 text-center">Status</th>
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {employees.map(emp => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    const todayRecord = attendance.find(att => String(att.employeeId) === String(emp.id) && att.date === todayStr);

                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-800">{emp.name}</p>
                          <p className="text-[10px] text-slate-400 capitalize">{emp.role}</p>
                        </td>
                        <td className="px-4 py-3 capitalize text-slate-500">{emp.shift}</td>
                        <td className="px-4 py-3 text-center">
                          {todayRecord ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                todayRecord.status === 'present' 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                  : todayRecord.status === 'late' 
                                    ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                                    : 'bg-rose-50 text-rose-700 border border-rose-100'
                              }`}>
                                {todayRecord.status.toUpperCase()}
                              </span>
                              <span className="text-[9px] text-slate-400">
                                In: {todayRecord.check_in || '--'} | Out: {todayRecord.check_out || '--'}
                              </span>
                            </div>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                              ABSENT / UNMARKED
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {!todayRecord ? (
                            <button
                              onClick={() => handleMarkCheckin(emp.id)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold cursor-pointer border-none shadow-sm transition-all"
                            >
                              Mark Check-in
                            </button>
                          ) : !todayRecord.check_out ? (
                            <button
                              onClick={() => handleMarkCheckout(emp.id)}
                              className="px-3 py-1 bg-amber-500 hover:bg-amber-450 text-white rounded-lg text-[10px] font-bold cursor-pointer border-none shadow-sm transition-all"
                            >
                              Mark Check-out
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-bold">Attendance Completed</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Attendance History list */}
          <div className="bg-white border border-slate-150 rounded-2xl p-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">Attendance History</h3>
            <div className="overflow-y-auto max-h-[400px] divide-y divide-slate-100">
              {attendance.map(att => (
                <div key={att.id} className="py-2.5 first:pt-0 last:pb-0 text-xs flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-800">{att.name}</p>
                    <p className="text-[10px] text-slate-400">{att.date} | {att.check_in || '--'} to {att.check_out || '--'}</p>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                    att.status === 'present' 
                      ? 'bg-emerald-50 text-emerald-700' 
                      : att.status === 'late' 
                        ? 'bg-amber-50 text-amber-700' 
                        : 'bg-rose-50 text-rose-700'
                  }`}>
                    {att.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. SUPPLIERS PANEL */}
      {activeTab === 'suppliers' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add Supplier Form */}
          <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">Add Supplier Partner</h3>
            <form onSubmit={handleAddSupplier} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Supplier Name</label>
                <input 
                  type="text" 
                  value={newSupName}
                  onChange={e => setNewSupName(e.target.value)}
                  placeholder="e.g. Heritage Foods Ltd"
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Contact Person</label>
                <input 
                  type="text" 
                  value={newSupPerson}
                  onChange={e => setNewSupPerson(e.target.value)}
                  placeholder="e.g. Ramesh Babu"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Phone Number</label>
                <input 
                  type="text" 
                  value={newSupPhone}
                  onChange={e => setNewSupPhone(e.target.value)}
                  placeholder="+91 9988776655"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">GSTIN (15 Digits)</label>
                <input 
                  type="text" 
                  value={newSupGst}
                  onChange={e => setNewSupGst(e.target.value)}
                  placeholder="29AAAAA1111A1Z1"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <button 
                type="submit" 
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold cursor-pointer border-none"
              >
                Register Supplier
              </button>
            </form>
          </div>

          {/* Suppliers list */}
          <div className="lg:col-span-2 bg-white border border-slate-150 rounded-2xl p-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">Supplier Database</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 font-semibold text-slate-400 uppercase border-b border-slate-100">
                    <th className="px-4 py-2.5">Supplier Partner</th>
                    <th className="px-4 py-2.5">Contact Agent</th>
                    <th className="px-4 py-2.5">Phone</th>
                    <th className="px-4 py-2.5">GSTIN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {suppliers.map(sup => (
                    <tr key={sup.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-bold text-slate-900">{sup.name}</td>
                      <td className="px-4 py-3 text-slate-500">{sup.contact_person || '-'}</td>
                      <td className="px-4 py-3">{sup.phone || '-'}</td>
                      <td className="px-4 py-3 uppercase font-semibold text-slate-500">{sup.gstin || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. EXPENSES PANEL */}
      {activeTab === 'expenses' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add / Edit Expense Form */}
          <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">
              {editingExpenseId ? 'Edit Expense Record' : 'Log Store Expense'}
            </h3>
            <form onSubmit={handleSaveExpense} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Expense Title</label>
                <input 
                  type="text" 
                  value={newExpTitle}
                  onChange={e => setNewExpTitle(e.target.value)}
                  placeholder="e.g. Office Stationery"
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Category</label>
                  <select 
                    value={newExpCat}
                    onChange={e => setNewExpCat(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="Utilities">Utilities</option>
                    <option value="Rent">Rent</option>
                    <option value="Salaries">Salaries</option>
                    <option value="Inventory Procurement">Inventory Procurement</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Others">Others</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Amount (₹)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={newExpAmt}
                    onChange={e => setNewExpAmt(e.target.value)}
                    placeholder="e.g. 500"
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Date</label>
                <input 
                  type="date" 
                  value={newExpDate}
                  onChange={e => setNewExpDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Description</label>
                <textarea 
                  value={newExpDesc}
                  onChange={e => setNewExpDesc(e.target.value)}
                  placeholder="Additional details..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs h-20 resize-none"
                />
              </div>

              <div className="flex gap-2">
                <button 
                  type="submit" 
                  className={`flex-grow py-2.5 text-white rounded-lg text-xs font-bold cursor-pointer border-none ${
                    editingExpenseId ? 'bg-amber-600 hover:bg-amber-500' : 'bg-slate-900 hover:bg-slate-800'
                  }`}
                >
                  {editingExpenseId ? 'Update Record' : 'Save Expense'}
                </button>
                {editingExpenseId && (
                  <button 
                    type="button" 
                    onClick={cancelEditExpense}
                    className="px-4 py-2.5 bg-slate-200 hover:bg-slate-350 text-slate-700 rounded-lg text-xs font-bold cursor-pointer border-none"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Expenses List & Stats */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Quick Stats Banner */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Total Expenses</p>
                <p className="text-lg font-black text-slate-800 mt-1">
                  ₹{expenses.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase">This Month</p>
                <p className="text-lg font-black text-emerald-700 mt-1">
                  ₹{expenses
                    .filter(e => {
                      const d = new Date(e.date);
                      const now = new Date();
                      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                    })
                    .reduce((acc, curr) => acc + curr.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Utilities & Rent</p>
                <p className="text-lg font-black text-amber-700 mt-1">
                  ₹{expenses
                    .filter(e => e.category === 'Utilities' || e.category === 'Rent')
                    .reduce((acc, curr) => acc + curr.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* List Table Card */}
            <div className="bg-white border border-slate-150 rounded-2xl p-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Expense Register</h3>
                <input 
                  type="text"
                  value={expenseSearch}
                  onChange={e => setExpenseSearch(e.target.value)}
                  placeholder="Search title, desc or category..."
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs max-w-xs w-full"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 font-semibold text-slate-400 uppercase border-b border-slate-100">
                      <th className="px-4 py-2.5">Title</th>
                      <th className="px-4 py-2.5">Category</th>
                      <th className="px-4 py-2.5 text-center">Date</th>
                      <th className="px-4 py-2.5 text-center">Amount</th>
                      <th className="px-4 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {expenses
                      .filter(e => {
                        const term = expenseSearch.toLowerCase();
                        return (
                          e.title.toLowerCase().includes(term) ||
                          e.category.toLowerCase().includes(term) ||
                          (e.description && e.description.toLowerCase().includes(term))
                        );
                      })
                      .map(exp => (
                        <tr key={exp.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3">
                            <p className="font-bold text-slate-800">{exp.title}</p>
                            <p className="text-[10px] text-slate-400">{exp.description || 'No description'}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 capitalize">
                              {exp.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-slate-500">
                            {new Date(exp.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-slate-800">
                            ₹{parseFloat(exp.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button 
                                onClick={() => startEditExpense(exp)}
                                className="p-1 bg-slate-100 hover:bg-amber-50 hover:text-amber-700 rounded text-slate-400 transition-all cursor-pointer border-none"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => handleDeleteExpense(exp.id)}
                                className="p-1 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 rounded text-slate-400 transition-all cursor-pointer border-none"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    {expenses.length === 0 && (
                      <tr>
                        <td colSpan="5" className="px-4 py-8 text-center text-slate-400 font-bold">
                          No expense records logged.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. SALES & REPORTS PANEL */}
      {activeTab === 'sales' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Revenue</p>
              <p className="text-2xl font-black text-slate-800 mt-1">
                ₹{parseFloat(salesStats.totalRevenue).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 mt-2 inline-block">
                All Transactions
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Orders Logged</p>
              <p className="text-2xl font-black text-slate-800 mt-1">
                {salesStats.totalOrders}
              </p>
              <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-100 mt-2 inline-block">
                Counter & Online
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Average Order Value</p>
              <p className="text-2xl font-black text-slate-800 mt-1">
                ₹{parseFloat(salesStats.avgOrderValue).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-teal-600 font-bold bg-teal-50 px-2 py-0.5 rounded border border-teal-100 mt-2 inline-block">
                Per Checkout
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sales Trend Chart */}
            <div className="lg:col-span-2 bg-white border border-slate-150 rounded-2xl p-5 shadow-sm">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-3">
                Daily Sales Revenue Trend
              </h3>
              <div className="h-64 flex items-center justify-center">
                {salesReport.dailySales && salesReport.dailySales.length > 0 ? (
                  <Line 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          callbacks: {
                            label: (context) => `Revenue: ₹${context.raw}`
                          }
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            callback: (val) => '₹' + val
                          }
                        }
                      }
                    }}
                    data={{
                      labels: salesReport.dailySales.map(d => d.date),
                      datasets: [
                        {
                          label: 'Daily Revenue',
                          data: salesReport.dailySales.map(d => d.revenue),
                          borderColor: '#059669', // Emerald 600
                          backgroundColor: 'rgba(5, 150, 105, 0.1)',
                          tension: 0.3,
                          fill: true
                        }
                      ]
                    }}
                  />
                ) : (
                  <p className="text-xs text-slate-400 font-bold">No sales data logged to plot trend.</p>
                )}
              </div>
            </div>

            {/* Category distribution */}
            <div className="bg-white border border-slate-150 rounded-2xl p-5 shadow-sm">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 border-b border-slate-100 pb-3">
                Category Sales Breakdown
              </h3>
              <div className="divide-y divide-slate-100 overflow-y-auto max-h-[250px] pr-1">
                {salesReport.categorySales && salesReport.categorySales.length > 0 ? (
                  salesReport.categorySales.map((cat, idx) => (
                    <div key={idx} className="py-3 flex justify-between items-center text-xs font-medium">
                      <div>
                        <p className="font-bold text-slate-800">{cat.category}</p>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">{cat.items_sold} Items Sold</p>
                      </div>
                      <span className="font-extrabold text-slate-700">
                        ₹{parseFloat(cat.category_revenue).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 font-bold py-6 text-center">No category sales metrics available.</p>
                )}
              </div>
            </div>
          </div>

          {/* Day-Wise Sales Table */}
          <div className="bg-white border border-slate-150 rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-3">
              Day-Wise Sales Performance Register
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 font-semibold text-slate-400 uppercase border-b border-slate-100">
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-4 py-2.5 text-center">Total Orders</th>
                    <th className="px-4 py-2.5 text-center">Daily Revenue</th>
                    <th className="px-4 py-2.5 text-right">Average Order Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {salesReport.dailySales && salesReport.dailySales.length > 0 ? (
                    [...salesReport.dailySales].reverse().map((day, idx) => {
                      const avg = day.orders_count > 0 ? day.revenue / day.orders_count : 0;
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-bold text-slate-800">
                            {new Date(day.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-slate-500">{day.orders_count}</td>
                          <td className="px-4 py-3 text-center font-bold text-slate-800">
                            ₹{parseFloat(day.revenue).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right font-extrabold text-slate-600">
                            ₹{parseFloat(avg.toFixed(2)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="4" className="px-4 py-8 text-center text-slate-400 font-bold">
                        No day-wise sales logged.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
