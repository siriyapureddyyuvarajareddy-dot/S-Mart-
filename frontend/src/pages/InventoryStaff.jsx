import React, { useState, useEffect, useContext, useRef } from 'react';
import { AppContext, API_BASE } from '../App';
import { 
  Barcode, Plus, Minus, Search, Trash2, Download, 
  AlertTriangle, ShieldAlert, Sparkles, X, Printer 
} from 'lucide-react';
import JsBarcode from 'jsbarcode';

export default function InventoryStaff() {
  const { token, user, triggerToast } = useContext(AppContext);
  
  // Product state lists
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [stockFilter, setStockFilter] = useState('all'); // all, low, expired
  
  // Form input states
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('kg');
  const [prodCategory, setProdCategory] = useState('Fruits');
  const [lowThreshold, setLowThreshold] = useState('15');
  const [expiry, setExpiry] = useState('');
  const [supplierId, setSupplierId] = useState('');

  // Barcode sheet printing modal
  const [barcodeProduct, setBarcodeProduct] = useState(null);
  const barcodeCanvasRef = useRef(null);

  const fetchInventory = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      let url = `${API_BASE}/products?search=${search}`;
      if (category) url += `&category=${category}`;
      if (stockFilter === 'low') url += `&lowStock=true`;
      if (stockFilter === 'expired') url += `&expired=true`;

      const resProds = await fetch(url, { headers });
      if (resProds.ok) setProducts(await resProds.json());

      const resSups = await fetch(`${API_BASE}/suppliers`, { headers });
      if (resSups.ok) setSuppliers(await resSups.json());
    } catch (err) {
      console.error(err);
      triggerToast('Failed to sync inventory database', 'error');
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [token, search, category, stockFilter]);

  // Render Barcode dynamically in modal
  useEffect(() => {
    if (barcodeProduct && barcodeCanvasRef.current) {
      try {
        JsBarcode(barcodeCanvasRef.current, barcodeProduct.barcode, {
          format: 'EAN13',
          lineColor: '#0f172a',
          width: 2.2,
          height: 80,
          displayValue: true
        });
      } catch (err) {
        // Fallback for code128 if EAN checksum format is custom/invalid
        try {
          JsBarcode(barcodeCanvasRef.current, barcodeProduct.barcode, {
            format: 'CODE128',
            lineColor: '#0f172a',
            width: 2.0,
            height: 80,
            displayValue: true
          });
        } catch (_) {}
      }
    }
  }, [barcodeProduct]);

  // Create Product
  const handleRegisterProduct = async (e) => {
    e.preventDefault();
    if (!name || !price || !qty) return;

    try {
      const res = await fetch(`${API_BASE}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          category: prodCategory,
          price: parseFloat(price),
          quantity: parseInt(qty),
          unit,
          lowStockThreshold: parseInt(lowThreshold),
          expiryDate: expiry || null,
          supplierId: supplierId ? parseInt(supplierId) : null
        })
      });
      
      if (res.ok) {
        triggerToast('Product registered successfully', 'success');
        setName('');
        setPrice('');
        setQty('');
        setExpiry('');
        setSupplierId('');
        fetchInventory();
      } else {
        const errData = await res.json();
        triggerToast(errData.error || 'Registration failed', 'error');
      }
    } catch (err) {
      triggerToast('Connection error', 'error');
    }
  };

  // Adjust stock levels
  const adjustStock = async (id, amount, name) => {
    try {
      const res = await fetch(`${API_BASE}/products/${id}/adjust`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ amount, reason: 'adjustment' })
      });
      if (res.ok) {
        triggerToast(`Stock adjusted for "${name}"`, 'success');
        fetchInventory();
      }
    } catch (err) {
      triggerToast('Stock adjust transaction failed', 'error');
    }
  };

  // Delete product
  const handleDeleteProduct = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete product "${name}"?`)) return;
    try {
      const res = await fetch(`${API_BASE}/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        triggerToast('Product deleted from inventory', 'success');
        fetchInventory();
      }
    } catch (err) {
      triggerToast('Delete request failed', 'error');
    }
  };

  // CSV Exporter
  const handleExportCSV = () => {
    if (products.length === 0) return;
    const exportData = products.map(p => ({
      ID: p.id,
      Name: p.name,
      Barcode: p.barcode,
      SKU: p.sku,
      Category: p.category,
      'Price (INR)': p.price,
      Quantity: p.quantity,
      Unit: p.unit,
      'Expiry Date': p.expiry_date || 'N/A'
    }));
    
    const headers = Object.keys(exportData[0]).join(',');
    const rows = exportData.map(row => 
      Object.values(row).map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SMART_Inventory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadBarcodePng = () => {
    if (!barcodeCanvasRef.current || !barcodeProduct) return;
    const canvas = barcodeCanvasRef.current;
    const imageUri = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.setAttribute("href", imageUri);
    link.setAttribute("download", `BARCODE_${barcodeProduct.name.replace(/\s+/g, '_')}.png`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Statistics
  const totalItems = products.length;
  const lowStockCount = products.filter(p => p.quantity <= p.low_stock_threshold).length;
  const expiredCount = products.filter(p => {
    if (!p.expiry_date) return false;
    const today = new Date().toISOString().split('T')[0];
    return p.expiry_date < today;
  }).length;

  return (
    <div className="space-y-6">
      
      {/* Metrics Row summaries */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Products</p>
            <p className="text-xl font-extrabold text-slate-900 mt-0.5">{totalItems}</p>
          </div>
          <span className="text-xs font-semibold bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg">Database Active</span>
        </div>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Low Stock Warnings</p>
            <p className="text-xl font-extrabold text-slate-900 mt-0.5">{lowStockCount}</p>
          </div>
          {lowStockCount > 0 ? (
            <span className="text-xs font-semibold bg-amber-50 text-amber-600 px-2 py-1 rounded-lg flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Warning
            </span>
          ) : (
            <span className="text-xs font-semibold bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg">Optimal</span>
          )}
        </div>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Expired Products</p>
            <p className="text-xl font-extrabold text-slate-900 mt-0.5">{expiredCount}</p>
          </div>
          {expiredCount > 0 ? (
            <span className="text-xs font-semibold bg-rose-50 text-rose-600 px-2 py-1 rounded-lg flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" /> Risk
            </span>
          ) : (
            <span className="text-xs font-semibold bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg">Cleared</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Column: Register Product Form */}
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-1">
            <Barcode className="w-4 h-4 text-emerald-600" /> New Product Registration
          </h3>
          <form onSubmit={handleRegisterProduct} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Product Name</label>
              <input 
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Fuji Apples"
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Price (₹)</label>
                <input 
                  type="number" 
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder="e.g. 150"
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Category</label>
                <select 
                  value={prodCategory}
                  onChange={e => setProdCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="Fruits">Fruits & Vegetables</option>
                  <option value="Dairy">Dairy</option>
                  <option value="Bakery">Bakery</option>
                  <option value="Beverages">Beverages</option>
                  <option value="Pantry">Pantry Items</option>
                  <option value="PersonalCare">Personal Care</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Initial Qty</label>
                <input 
                  type="number" 
                  value={qty}
                  onChange={e => setQty(e.target.value)}
                  placeholder="e.g. 40"
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">SI Unit</label>
                <select 
                  value={unit}
                  onChange={e => setUnit(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="kg">kg</option>
                  <option value="Liters">Liters</option>
                  <option value="Pieces">Pieces (pcs)</option>
                  <option value="Dozens">Dozens (dz)</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Low Threshold</label>
                <input 
                  type="number" 
                  value={lowThreshold}
                  onChange={e => setLowThreshold(e.target.value)}
                  placeholder="15"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Expiry Date</label>
                <input 
                  type="date" 
                  value={expiry}
                  onChange={e => setExpiry(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Supplier Partner</label>
              <select 
                value={supplierId}
                onChange={e => setSupplierId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
              >
                <option value="">No Supplier Link</option>
                {suppliers.map(sup => (
                  <option key={sup.id} value={sup.id}>{sup.name}</option>
                ))}
              </select>
            </div>
            <button 
              type="submit" 
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold cursor-pointer border-none"
            >
              Register Product
            </button>
          </form>
        </div>

        {/* Right Column: Inventory Table list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            
            {/* Search Filters bar */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-48">
                <input 
                  type="text" 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Filter stock..." 
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>

              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
              >
                <option value="">All Categories</option>
                <option value="Fruits">Fruits</option>
                <option value="Dairy">Dairy</option>
                <option value="Bakery">Bakery</option>
                <option value="Beverages">Beverages</option>
                <option value="Pantry">Pantry</option>
                <option value="PersonalCare">Personal Care</option>
              </select>

              <select
                value={stockFilter}
                onChange={e => setStockFilter(e.target.value)}
                className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
              >
                <option value="all">All Stocks</option>
                <option value="low">Low Stocks</option>
                <option value="expired">Expired Stocks</option>
              </select>
            </div>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 border-none cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>

          {/* Product stock table */}
          <div className="bg-white border border-slate-150 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto max-h-[450px]">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 font-semibold text-slate-400 uppercase">
                    <th className="px-5 py-3">Product details</th>
                    <th className="px-5 py-3 text-center">Unit Price</th>
                    <th className="px-5 py-3 text-center">Quantity Control</th>
                    <th className="px-5 py-3 text-center">Expiry</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {products.map(prod => {
                    const today = new Date().toISOString().split('T')[0];
                    const isExpired = prod.expiry_date && prod.expiry_date < today;
                    const isLow = prod.quantity <= prod.low_stock_threshold;
                    
                    return (
                      <tr key={prod.id} className="hover:bg-slate-50/50">
                        <td className="px-5 py-3">
                          <p className="font-bold text-slate-800 flex items-center gap-1.5">
                            {prod.name}
                            {isExpired && (
                              <span className="px-1.5 py-0.5 bg-rose-50 text-rose-600 rounded text-[9px] border border-rose-100">Expired</span>
                            )}
                            {isLow && prod.quantity > 0 && (
                              <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded text-[9px] border border-amber-100">Low</span>
                            )}
                          </p>
                          <div className="flex gap-2 text-[9px] text-slate-400 font-bold uppercase mt-0.5">
                            <span>SKU: {prod.sku}</span>
                            <span>Barcode: {prod.barcode}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-center font-bold text-slate-800">₹{parseFloat(prod.price).toFixed(2)}</td>
                        <td className="px-5 py-3 text-center">
                          <div className="flex items-center gap-2 justify-center bg-slate-50 border border-slate-200/50 rounded-lg p-0.5 w-fit mx-auto">
                            <button
                              onClick={() => adjustStock(prod.id, -1, prod.name)}
                              className="p-1 bg-white border border-slate-200 rounded hover:border-slate-300 cursor-pointer"
                            >
                              <Minus className="w-2.5 h-2.5" />
                            </button>
                            <span className="font-bold tabular-nums min-w-[50px]">{prod.quantity} {prod.unit}</span>
                            <button
                              onClick={() => adjustStock(prod.id, 1, prod.name)}
                              className="p-1 bg-white border border-slate-200 rounded hover:border-slate-300 cursor-pointer"
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </td>
                        <td className={`px-5 py-3 text-center font-bold ${isExpired ? 'text-rose-500' : 'text-slate-400'}`}>
                          {prod.expiry_date || 'N/A'}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => handleDeleteProduct(prod.id, prod.name)}
                            className="p-1.5 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-100 cursor-pointer border-none"
                            title="Remove Product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

      {/* Barcode display print modal */}
      {barcodeProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl relative flex flex-col gap-4 text-center text-xs font-semibold text-slate-800">
            <button 
              onClick={() => setBarcodeProduct(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">EAN-13 Product Barcode</h3>
            <p className="text-slate-400 -mt-2">{barcodeProduct.name}</p>

            <div className="py-6 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100">
              <canvas ref={barcodeCanvasRef} className="bg-white p-2 rounded-lg shadow-inner"></canvas>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={downloadBarcodePng}
                className="flex-grow py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold border-none cursor-pointer"
              >
                Download Label (PNG)
              </button>
              <button 
                onClick={() => setBarcodeProduct(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold border-none cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
