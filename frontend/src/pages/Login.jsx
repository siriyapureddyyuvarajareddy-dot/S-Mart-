import React, { useState, useContext } from 'react';
import { ShoppingBag, Key, User, ShieldAlert, Mail, Users, Calendar } from 'lucide-react';
import { AppContext, API_BASE } from '../App';

export default function Login() {
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Password Mode States
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Registration States
  const [regName, setRegName] = useState('');
  const [regUser, setRegUser] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regRole, setRegRole] = useState('cashier');
  const [regShift, setRegShift] = useState('morning');

  // Common States
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const { setToken, setUser, triggerToast, setShowLogin } = useContext(AppContext);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) return;
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      
      if (res.ok) {
        setToken(data.token);
        setUser(data.user);
        triggerToast(`Welcome back, ${data.user.name}!`, 'success');
      } else {
        setError(data.error || 'Invalid credentials. Access is restricted.');
      }
    } catch (err) {
      setError('Cannot connect to Node.js backend. Is it running?');
    } finally {
      setLoading(false);
    }
  };



  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!regName || !regUser || !regEmail || !regPass) return;
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName,
          username: regUser,
          email: regEmail,
          password: regPass,
          role: regRole,
          shift: regShift,
          salary: 22000 // default mock salary
        })
      });
      const data = await res.json();
      if (res.ok) {
        triggerToast('Registration successful! You can now log in.', 'success');
        setIsRegistering(false);
        setUsername(regUser); // pre-fill username
        // Reset registration fields
        setRegName('');
        setRegUser('');
        setRegEmail('');
        setRegPass('');
      } else {
        setError(data.error || 'Failed to complete registration.');
      }
    } catch (err) {
      setError('Connection to server failed during registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 text-white relative overflow-hidden py-10 px-4 select-none">
      
      {/* Abstract Glowing Gradients */}
      <div className="absolute w-[350px] h-[350px] md:w-[450px] md:h-[450px] rounded-full bg-emerald-600/25 blur-[90px] md:blur-[120px] -top-20 -left-20 animate-pulse-slow"></div>
      <div className="absolute w-[350px] h-[350px] md:w-[450px] md:h-[450px] rounded-full bg-teal-600/25 blur-[90px] md:blur-[120px] -bottom-20 -right-20 animate-pulse-slow" style={{ animationDelay: '2s' }}></div>

      {/* Login Glassmorphic Container */}
      <div className="w-full max-w-md bg-slate-900/65 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-xl relative z-10 transition-all duration-300 pt-12 md:pt-14 animate-fade-in-up">
        
        {/* Back navigation link */}
        <button 
          onClick={() => { setIsRegistering(false); setShowLogin(false); }}
          className="absolute top-5 left-5 text-[10px] font-bold text-slate-400 hover:text-white transition-colors bg-transparent border-none cursor-pointer flex items-center gap-1"
        >
          <span>← Back to Website</span>
        </button>

        {/* Title Header */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 rounded-2xl mb-4 shadow-inner">
            <ShoppingBag className="w-8 h-8 animate-float" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white">FreshMart Portal</h2>
          <p className="text-slate-400 text-xs mt-1">{isRegistering ? 'Staff Access Enrollment' : 'Staff Access Hub'}</p>
        </div>

        {/* Error Alert Banner */}
        {error && (
          <div className="mb-6 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl p-3.5 text-xs font-semibold flex items-center gap-2 animate-bounce">
            <ShieldAlert className="w-4 h-4 text-rose-500 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isRegistering ? (
          /* REGISTRATION FORM */
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Full Name</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={regName}
                  onChange={e => setRegName(e.target.value)}
                  placeholder="e.g. Vivek Pillai" 
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-white font-medium transition-all"
                />
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-600">
                  <User className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Username (Login ID)</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={regUser}
                  onChange={e => setRegUser(e.target.value)}
                  placeholder="e.g. vivek" 
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-white font-medium transition-all"
                />
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-600">
                  <User className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
              <div className="relative">
                <input 
                  type="email" 
                  value={regEmail}
                  onChange={e => setRegEmail(e.target.value)}
                  placeholder="e.g. vivek@smart.com" 
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-white font-medium transition-all"
                />
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-600">
                  <Mail className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Password</label>
              <div className="relative">
                <input 
                  type="password" 
                  value={regPass}
                  onChange={e => setRegPass(e.target.value)}
                  placeholder="Create password" 
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-white font-medium transition-all"
                />
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-600">
                  <Key className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            {/* Role & Shift Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Role</label>
                <div className="relative">
                  <select
                    value={regRole}
                    onChange={e => setRegRole(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-white font-medium transition-all appearance-none"
                  >
                    <option value="cashier">Cashier</option>
                    <option value="inventory">Inventory Staff</option>
                    <option value="manager">Manager</option>
                  </select>
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-600">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Shift</label>
                <div className="relative">
                  <select
                    value={regShift}
                    onChange={e => setRegShift(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-white font-medium transition-all appearance-none"
                  >
                    <option value="morning">Morning (9AM - 5PM)</option>
                    <option value="afternoon">Afternoon (1PM - 9PM)</option>
                    <option value="night">Night (9PM - 5AM)</option>
                  </select>
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-600">
                    <Calendar className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Register */}
            <button 
              type="submit" 
              disabled={loading}
              className="w-full mt-3 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-md hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer border-none"
            >
              <span>{loading ? 'Registering Account...' : 'Enroll Staff Account'}</span>
            </button>

            {/* Back to Login link */}
            <button
              type="button"
              onClick={() => { setIsRegistering(false); setError(null); }}
              className="w-full text-center text-[10px] text-slate-500 hover:text-slate-450 transition-colors border-none bg-transparent cursor-pointer font-bold mt-2"
            >
              ← Already registered? Sign In
            </button>
          </form>
        ) : (
          /* LOGIN FORM */
          <>
            <form onSubmit={handlePasswordSubmit} className="space-y-5 animate-fade-in">
              {/* Username Input */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Username or Email</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Enter username or email" 
                    required
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm placeholder:text-slate-650 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-white font-medium transition-all"
                  />
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-605">
                    <User className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Password</label>
                <div className="relative">
                  <input 
                    type="password" 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter password" 
                    required
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm placeholder:text-slate-655 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-white font-medium transition-all"
                  />
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-605">
                    <Key className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                disabled={loading}
                className="w-full mt-2 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 group cursor-pointer border-none"
              >
                <span>{loading ? 'Authenticating...' : 'Authenticate'}</span>
                {!loading && (
                  <svg xmlns="http://www.w3.org/2500/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4 transition-transform group-hover:translate-x-0.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                )}
              </button>
            </form>

            {/* Register Option Link */}
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => { setIsRegistering(true); setError(null); }}
                className="text-[10px] text-emerald-400 hover:text-emerald-350 transition-colors border-none bg-transparent cursor-pointer font-bold underline"
              >
                Register New Staff Account
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
