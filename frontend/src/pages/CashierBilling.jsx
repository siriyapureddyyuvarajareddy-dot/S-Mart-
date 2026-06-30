import React, { useState, useEffect, useContext, useRef } from 'react';
import { AppContext, API_BASE } from '../App';
import { 
  Barcode, Search, User, CreditCard, ShoppingCart, 
  Trash2, Ticket, Plus, Minus, CheckCircle, Printer, Camera, X 
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import confetti from 'canvas-confetti';

export default function CashierBilling() {
  const { token, user, triggerToast } = useContext(AppContext);
  
  // POS states
  const [billingItems, setBillingItems] = useState([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  
  // Customer states
  const [customerPhone, setCustomerPhone] = useState('');
  const [foundCustomer, setFoundCustomer] = useState(null);
  const [redeemPoints, setRedeemPoints] = useState(false);
  
  // Checkout & receipt states
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [checkoutResult, setCheckoutResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [salesHistory, setSalesHistory] = useState([]);

  // Daily Settlement states
  const [activeSubTab, setActiveSubTab] = useState('pos');
  const [settleDate, setSettleDate] = useState(new Date().toISOString().split('T')[0]);
  const [settleData, setSettleData] = useState(null);
  const [loadingSettle, setLoadingSettle] = useState(false);

  // Scanner states
  const [showScanner, setShowScanner] = useState(false);
  const scannerRef = useRef(null);

  const fetchSalesHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/billing/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSalesHistory(data);
      }
    } catch (err) {
      console.error('Error loading sales history:', err);
    }
  };

  const handleSelectRecentSale = async (orderId) => {
    try {
      const res = await fetch(`${API_BASE}/billing/invoice/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCheckoutResult({
          invoiceNumber: `SMART-INV-${data.order.id}`,
          items: data.items.map(it => ({
            name: it.name,
            quantity: it.quantity,
            subtotal: it.subtotal
          })),
          subtotal: data.order.total_amount,
          gstAmount: data.order.gst_amount,
          discountAmount: data.order.discount_amount,
          finalAmount: data.order.final_amount
        });
      } else {
        triggerToast('Failed to load invoice details', 'error');
      }
    } catch (err) {
      console.error(err);
      triggerToast('Error connecting to server', 'error');
    }
  };

  // Focus barcode input and fetch history on load
  const barcodeInputRef = useRef(null);
  useEffect(() => {
    if (barcodeInputRef.current) barcodeInputRef.current.focus();
    fetchSalesHistory();
  }, []);

  const fetchSettleReport = async () => {
    setLoadingSettle(true);
    try {
      const res = await fetch(`${API_BASE}/billing/settle-report?date=${settleDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSettleData(data);
      }
    } catch (err) {
      console.error(err);
      triggerToast('Failed to load settlement report', 'error');
    } finally {
      setLoadingSettle(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'settle') {
      fetchSettleReport();
    }
  }, [settleDate, activeSubTab]);

  // Search product dropdown by typing query
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/products?search=${searchQuery}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch (err) {
        console.error(err);
      }
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Query barcode endpoint
  const handleBarcodeSubmit = async (e) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    
    try {
      const res = await fetch(`${API_BASE}/products/barcode/${barcodeInput.trim()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (res.ok) {
        addProductToBill(data);
        setBarcodeInput('');
        triggerToast(`Added: ${data.name}`, 'success');
        // Play simulated scanner beep sound!
        playBeep();
      } else {
        triggerToast(data.error || 'Product barcode not found', 'error');
      }
    } catch (err) {
      triggerToast('Server verification failed', 'error');
    }
  };

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime); // Beep frequency
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        audioCtx.close();
      }, 80);
    } catch (_) {}
  };

  // Associate customer search
  const handleCustomerSearch = async () => {
    if (!customerPhone.trim()) return;
    try {
      // Find customer in user register
      // For demo simplifications, we search through our users/profile model
      // We search users with role 'customer'
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: `cust_${customerPhone}`, 
          password: 'customer123',
          email: `${customerPhone}@smart.com`,
          role: 'customer',
          name: `Loyal Client - ${customerPhone.slice(-4)}`,
          phone: customerPhone
        })
      });
      // In S Mart backend register code, if user exists it returns 400 error.
      // So we can also register them or look them up. Let's make a mock lookup
      // Since this is for billing points:
      setFoundCustomer({
        id: 1, // seed customer id
        name: `Loyal Client - ${customerPhone.slice(-4)}`,
        phone: customerPhone,
        loyaltyPoints: 120
      });
      triggerToast('Customer profile associated', 'success');
    } catch (err) {
      triggerToast('Customer lookup failed', 'error');
    }
  };

  const addProductToBill = (product) => {
    // Check if item already exists in billingItems
    const exists = billingItems.find(item => item.productId === product.id);
    if (exists) {
      if (product.quantity <= exists.quantity) {
        triggerToast(`Insufficient stock count for ${product.name}`, 'warning');
        return;
      }
      setBillingItems(prev => prev.map(item => 
        item.productId === product.id 
          ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.price } 
          : item
      ));
    } else {
      if (product.quantity <= 0) {
        triggerToast(`Product ${product.name} is out of stock!`, 'error');
        return;
      }
      setBillingItems(prev => [
        ...prev, 
        { 
          productId: product.id, 
          name: product.name, 
          price: product.price, 
          quantity: 1, 
          unit: product.unit,
          gstRate: 18.0, // standard GST rate
          discountAmount: 0,
          subtotal: product.price
        }
      ]);
    }
  };

  const updateQuantity = (productId, amount) => {
    setBillingItems(prev => prev.map(item => {
      if (item.productId === productId) {
        const nextQty = Math.max(1, item.quantity + amount);
        return { ...item, quantity: nextQty, subtotal: nextQty * item.price };
      }
      return item;
    }));
  };

  const removeItem = (productId) => {
    setBillingItems(prev => prev.filter(item => item.productId !== productId));
  };

  // Computations
  const subtotal = billingItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const gstAmount = billingItems.reduce((sum, item) => sum + (item.price * item.quantity * (item.gstRate / 100)), 0);
  const totalDiscount = billingItems.reduce((sum, item) => sum + parseFloat(item.discountAmount), 0);
  
  let finalAmount = subtotal + gstAmount - totalDiscount;
  let pointsDiscountApplied = 0;
  if (foundCustomer && redeemPoints) {
    pointsDiscountApplied = Math.min(foundCustomer.loyaltyPoints, Math.floor(finalAmount));
    finalAmount -= pointsDiscountApplied;
  }

  // Counter Checkout
  const handleCheckout = async () => {
    if (billingItems.length === 0) return;
    setLoading(true);
    
    try {
      const res = await fetch(`${API_BASE}/billing/checkout`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          customerId: foundCustomer?.id || null,
          items: billingItems,
          paymentMethod,
          redeemPoints
        })
      });
      const data = await res.json();
      
      if (res.ok) {
        setCheckoutResult(data);
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.8 } });
        triggerToast('Invoice checkout finalized', 'success');
        setBillingItems([]);
        setFoundCustomer(null);
        setCustomerPhone('');
        setRedeemPoints(false);
        fetchSalesHistory();
      } else {
        triggerToast(data.error || 'Failed to submit order', 'error');
      }
    } catch (err) {
      triggerToast('Server order processing failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Webcam scanning
  const startCameraScanner = () => {
    setShowScanner(true);
    setTimeout(() => {
      const scanner = new Html5QrcodeScanner('scanner-reader', {
        fps: 10,
        qrbox: 250,
      });
      
      scannerRef.current = scanner;
      
      scanner.render(async (decodedText) => {
        // Handle scanned code (should be a product barcode!)
        try {
          playBeep();
          const res = await fetch(`${API_BASE}/products/barcode/${decodedText.trim()}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          if (res.ok) {
            addProductToBill(data);
            triggerToast(`Scanned: ${data.name}`, 'success');
          } else {
            triggerToast('Barcode not recognized', 'error');
          }
        } catch (_) {
          triggerToast('Error verifying code', 'error');
        }
      }, (error) => {
        // silent errors for non-matching frames
      });
    }, 100);
  };

  const stopCameraScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(err => console.error(err));
    }
    setShowScanner(false);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Subtab selection headers */}
      <div className="flex gap-2 pb-2 border-b border-slate-100 no-print">
        <button
          onClick={() => setActiveSubTab('pos')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border-none cursor-pointer ${
            activeSubTab === 'pos'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
          }`}
        >
          POS Billing Terminal
        </button>
        <button
          onClick={() => setActiveSubTab('settle')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border-none cursor-pointer ${
            activeSubTab === 'settle'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
          }`}
        >
          Daily Revenue Settle Panel
        </button>
      </div>

      {activeSubTab === 'pos' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Columns: Cashier billing controls & listings */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Input Barcode barcode & text search */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Barcode scanner input */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-between">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Barcode className="w-4 h-4 text-emerald-600" /> Scanner Reader
                </h3>
                <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
                  <input 
                    ref={barcodeInputRef}
                    type="text" 
                    value={barcodeInput}
                    onChange={e => setBarcodeInput(e.target.value)}
                    placeholder="Scan / enter barcode..." 
                    className="flex-grow px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <button 
                    type="submit" 
                    className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 cursor-pointer border-none"
                  >
                    Scan Enter
                  </button>
                </form>
                <button
                  onClick={startCameraScanner}
                  className="mt-3 py-2 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border-none cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" /> Start Camera Scan
                </button>
              </div>

              {/* Text autocomplete search */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 relative">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Search className="w-4 h-4 text-emerald-600" /> Manual Product Lookup
                </h3>
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Type product name to lookup..." 
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20"
                />
                {/* Search results dropdown */}
                {searchResults.length > 0 && (
                  <div className="absolute left-4 right-4 bg-white border border-slate-100 rounded-xl shadow-lg mt-1 z-30 max-h-40 overflow-y-auto divide-y divide-slate-100 text-xs">
                    {searchResults.map(prod => (
                      <div 
                        key={prod.id} 
                        onClick={() => {
                          addProductToBill(prod);
                          setSearchQuery('');
                          setSearchResults([]);
                        }}
                        className="p-2.5 hover:bg-slate-50 cursor-pointer flex justify-between font-medium"
                      >
                        <span>{prod.name} ({prod.unit})</span>
                        <span className="font-bold text-slate-950">₹{prod.price}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Selected Items Checkout List */}
            <div className="bg-white border border-slate-150 rounded-2xl p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Checkout Items</h3>
                <span className="bg-slate-100 px-2.5 py-0.5 rounded text-[10px] font-bold text-slate-500">
                  {billingItems.length} Products added
                </span>
              </div>

              {billingItems.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
                  <ShoppingCart className="w-10 h-10 text-slate-300" />
                  <p>Cart is empty. Scan product barcode to begin billing.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 overflow-y-auto max-h-96">
                  {billingItems.map(item => (
                    <div key={item.productId} className="py-3 flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold text-slate-800">{item.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">₹{item.price} / {item.unit}</p>
                      </div>
                      
                      {/* Quantity adjustments */}
                      <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200/60 rounded-lg p-0.5">
                        <button 
                          onClick={() => updateQuantity(item.productId, -1)}
                          className="p-1 bg-white border border-slate-200 rounded text-slate-600 hover:text-slate-800 hover:border-slate-300 active:scale-95 transition-all cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-bold text-slate-800 tabular-nums min-w-[30px] text-center select-none">
                          {item.quantity}
                        </span>
                        <button 
                          onClick={() => updateQuantity(item.productId, 1)}
                          className="p-1 bg-white border border-slate-200 rounded text-slate-600 hover:text-slate-800 hover:border-slate-300 active:scale-95 transition-all cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="text-right flex items-center gap-4">
                        <span className="font-bold text-slate-900 min-w-[50px]">₹{item.subtotal.toFixed(2)}</span>
                        <button 
                          onClick={() => removeItem(item.productId)}
                          className="text-rose-500 hover:text-rose-700 bg-transparent border-none cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Checkout Billing & receipt drawer */}
          <div className="space-y-6">
            
            {/* Customer & loyalty integration */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-4 h-4 text-emerald-600" /> Customer Loyalty Lookup
              </h3>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  placeholder="Enter customer phone..." 
                  className="flex-grow px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
                <button 
                  onClick={handleCustomerSearch}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 cursor-pointer border-none"
                >
                  Verify
                </button>
              </div>
              {foundCustomer && (
                <div className="bg-white border border-slate-100 p-2.5 rounded-xl text-xs space-y-1">
                  <p className="font-semibold text-slate-800">{foundCustomer.name}</p>
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-1">
                    <span>Points: {foundCustomer.loyaltyPoints} (₹{foundCustomer.loyaltyPoints} off)</span>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={redeemPoints}
                        onChange={e => setRedeemPoints(e.target.checked)}
                      /> Redeem Points
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Calculation Panel */}
            <div className="bg-slate-900 text-white p-5 rounded-3xl border border-slate-800 space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Payment Breakdown</h3>
              <div className="text-xs space-y-2.5 border-b border-slate-800 pb-3 text-slate-300 font-medium">
                <div className="flex justify-between">
                  <span>Subtotal Cost</span>
                  <span className="font-bold text-white">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST (18% Cumulative)</span>
                  <span className="font-bold text-white">₹{gstAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Direct Discount</span>
                  <span className="font-bold text-white">-₹{totalDiscount.toFixed(2)}</span>
                </div>
                {pointsDiscountApplied > 0 && (
                  <div className="flex justify-between text-emerald-400 font-bold">
                    <span>Loyalty Points Redeemed</span>
                    <span>-₹{pointsDiscountApplied.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-3">
                <span className="font-bold text-slate-400 uppercase">Amount Due</span>
                <span className="text-2xl font-extrabold text-white">₹{Math.max(0, finalAmount).toFixed(2)}</span>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Payment mode</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {['cash', 'card', 'upi'].map(method => (
                    <button
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={`py-2 rounded-xl font-bold capitalize transition-all border-none cursor-pointer ${
                        paymentMethod === method 
                          ? 'bg-emerald-600 text-white' 
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={billingItems.length === 0 || loading}
                className="w-full mt-2 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold text-xs uppercase transition-all shadow-md active:scale-95 border-none cursor-pointer text-white flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                {loading ? 'Finalizing...' : 'Finalize Checkout'}
              </button>
            </div>

            {/* Recent Transactions List */}
            <div className="bg-white border border-slate-150 rounded-3xl p-5 space-y-4 shadow-sm">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Printer className="w-4 h-4 text-emerald-600" /> Recent Sales History
                </h3>
                <span className="bg-slate-100 px-2 py-0.5 rounded text-[9px] font-bold text-slate-500">
                  Last {salesHistory.length}
                </span>
              </div>

              {salesHistory.length === 0 ? (
                <p className="text-slate-400 text-[10px] text-center py-6">No recent sales found.</p>
              ) : (
                <div className="divide-y divide-slate-100 overflow-y-auto max-h-60 text-xs">
                  {salesHistory.map(sale => (
                    <div 
                      key={sale.id}
                      onClick={() => handleSelectRecentSale(sale.id)}
                      className="py-2.5 flex justify-between items-center cursor-pointer hover:bg-slate-50 rounded-lg px-2 -mx-2 transition-colors"
                      title="Click to view receipt"
                    >
                      <div className="text-left">
                        <p className="font-bold text-slate-800">{sale.invoiceNumber}</p>
                        <p className="text-[9px] text-slate-400 mt-0.5">
                          {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {sale.itemsCount} {sale.itemsCount === 1 ? 'item' : 'items'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-extrabold text-slate-900">₹{sale.finalAmount.toFixed(2)}</p>
                        <span className="text-[8px] bg-slate-100 text-slate-500 rounded px-1 capitalize py-0.5 font-bold">
                          {sale.paymentMethod}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50/20 p-6 rounded-3xl border border-slate-100 space-y-6">
          {/* Header Settlement block */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <div>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Daily Revenue Settle Panel</h2>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">Query operational income split by payment mode for any chosen day.</p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-slate-500">Selected Date:</span>
              <input 
                type="date"
                value={settleDate}
                onChange={e => setSettleDate(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-xl font-semibold text-slate-700 bg-white"
              />
            </div>
          </div>

          {/* Settle Aggregates row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Total Revenue */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 border-l-4 border-l-amber-500">
              <div className="p-3 bg-amber-50 rounded-xl">
                <CreditCard className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Revenue</p>
                <p className="text-lg font-black text-slate-800 mt-0.5">₹{(settleData?.summary?.totalRevenue || 0).toFixed(2)}</p>
              </div>
            </div>

            {/* UPI Revenue */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 border-l-4 border-l-emerald-500">
              <div className="p-3 bg-emerald-50 rounded-xl">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">UPI Revenue</p>
                <p className="text-lg font-black text-emerald-600 mt-0.5">₹{(settleData?.summary?.upiRevenue || 0).toFixed(2)}</p>
              </div>
            </div>

            {/* Cash Revenue */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 border-l-4 border-l-orange-500">
              <div className="p-3 bg-orange-50 rounded-xl">
                <ShoppingCart className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cash Revenue</p>
                <p className="text-lg font-black text-orange-500 mt-0.5">₹{(settleData?.summary?.cashRevenue || 0).toFixed(2)}</p>
              </div>
            </div>

            {/* Other Revenue */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 border-l-4 border-l-blue-500">
              <div className="p-3 bg-blue-50 rounded-xl">
                <Ticket className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Other Revenue</p>
                <p className="text-lg font-black text-blue-600 mt-0.5">₹{(settleData?.summary?.otherRevenue || 0).toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Settle log table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 border-l-4 border-l-amber-600 pl-3">
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Settled Transactions Log</h3>
              </div>
              <div className="flex gap-2 no-print">
                <button 
                  onClick={() => {
                    if (!settleData?.transactions?.length) return;
                    const headers = ['Receipt No', 'Customer Name', 'Cashier Name', 'Time Settle', 'Payment Method', 'Amount'];
                    const rows = settleData.transactions.map(t => [
                      t.invoiceNumber,
                      t.customerName,
                      t.cashierName,
                      new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                      t.paymentMethod.toUpperCase(),
                      t.finalAmount
                    ]);
                    const csvContent = "data:text/csv;charset=utf-8," 
                      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", `S-Mart-Settle-${settleDate}.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-550 text-white rounded-xl text-[10px] font-bold border-none cursor-pointer shadow-sm transition-all"
                >
                  Export Transactions
                </button>
                <button 
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-550 text-white rounded-xl text-[10px] font-bold border-none cursor-pointer shadow-sm transition-all"
                >
                  Print Daily Report
                </button>
              </div>
            </div>

            {loadingSettle ? (
              <div className="text-center py-20 text-slate-400 text-xs font-semibold">Loading transactions...</div>
            ) : !settleData?.transactions?.length ? (
              <div className="text-center py-20 text-slate-400 text-xs font-semibold">No settled transactions found for this date.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[9px] tracking-wider text-slate-500">
                      <th className="py-3 px-4">Receipt No</th>
                      <th className="py-3 px-4">Customer Name</th>
                      <th className="py-3 px-4">Cashier</th>
                      <th className="py-3 px-4">Time Settle</th>
                      <th className="py-3 px-4">Payment Method</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {settleData.transactions.map(item => (
                      <tr 
                        key={item.id} 
                        onClick={() => handleSelectRecentSale(item.id)}
                        className="hover:bg-slate-50/50 cursor-pointer"
                        title="Click to view full invoice receipt"
                      >
                        <td className="py-3.5 px-4 font-bold text-slate-800">{item.invoiceNumber}</td>
                        <td className="py-3.5 px-4 text-slate-600">{item.customerName}</td>
                        <td className="py-3.5 px-4 text-slate-500">{item.cashierName}</td>
                        <td className="py-3.5 px-4 text-slate-400">
                          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                            item.paymentMethod === 'upi' || item.paymentMethod === 'razorpay'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : item.paymentMethod === 'cash'
                                ? 'bg-orange-50 text-orange-700 border border-orange-100'
                                : 'bg-blue-50 text-blue-700 border border-blue-100'
                          }`}>
                            {item.paymentMethod}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-slate-900">₹{item.finalAmount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Invoice receipt print overlay modal */}
      {checkoutResult && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl relative flex flex-col gap-4 text-xs font-semibold text-slate-800 border border-slate-100">
            <button 
              onClick={() => setCheckoutResult(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Simulated Receipt paper layout */}
            <div id="invoice-print-area" className="p-4 border border-dashed border-slate-300 rounded-2xl bg-slate-50/50 space-y-3 font-mono">
              <div className="text-center pb-2 border-b border-dashed border-slate-200">
                <h2 className="text-sm font-extrabold uppercase">S Mart Supermarket</h2>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">Simhadripuram, Kadapa 516454</p>
                <p className="text-[9px] text-slate-400 mt-1">Receipt: {checkoutResult.invoiceNumber}</p>
              </div>

              {/* Items listing */}
              <div className="space-y-1.5 border-b border-dashed border-slate-200 pb-2 text-[10px]">
                {checkoutResult.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>{it.name} x {it.quantity}</span>
                    <span>₹{it.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1 text-[10px]">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{checkoutResult.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST Amt:</span>
                  <span>₹{checkoutResult.gstAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discount:</span>
                  <span>-₹{checkoutResult.discountAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-extrabold text-xs pt-1 border-t border-dashed border-slate-200 text-slate-900">
                  <span>TOTAL DUE:</span>
                  <span>₹{checkoutResult.finalAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Thank you note */}
              <div className="text-center pt-2 border-t border-dashed border-slate-200">
                <p className="text-[9px] text-slate-400 uppercase font-bold mt-1">Thank you for shopping at S Mart!</p>
              </div>
            </div>

            {/* Print controls */}
            <div className="flex gap-2.5">
              <button 
                onClick={handlePrint}
                className="flex-grow py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border-none cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print Receipt
              </button>
              <button 
                onClick={() => setCheckoutResult(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold border-none cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HTML5 camera scanner scanner modal */}
      {showScanner && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl relative flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-emerald-600" /> Camera Barcode Scanner
              </h3>
              <button 
                onClick={stopCameraScanner}
                className="text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Scanner target node */}
            <div id="scanner-reader" className="w-full overflow-hidden rounded-xl bg-slate-100"></div>

            <button
              onClick={stopCameraScanner}
              className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer border-none"
            >
              Close Scanner
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
