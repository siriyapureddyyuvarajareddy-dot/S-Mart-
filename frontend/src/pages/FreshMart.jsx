import React, { useState, useEffect } from 'react';
import { 
  Leaf, Info, ShoppingBag, Tag, Image as ImageIcon, MapPin, Phone, Mail, Clock, 
  MessageSquare, ArrowRight, Menu, X, ExternalLink, ShieldAlert, Check, HelpCircle
} from 'lucide-react';
import heroImage from '../assets/hero.png';
import aisleImage from '../assets/aisle.png';

const categoriesData = [
  {
    id: 'fruits',
    name: 'Fruits & Vegetables',
    desc: 'Fresh, organic farm-to-table produce sourced daily.',
    items: [
      { name: 'Organic Bananas', price: 60, unit: 'kg' },
      { name: 'Gala Apples', price: 120, unit: 'Piece' },
      { name: 'Fresh Potatoes', price: 30, unit: 'kg' },
      { name: 'Roma Tomatoes', price: 40, unit: 'kg' },
    ]
  },
  {
    id: 'dairy',
    name: 'Bakery & Dairy',
    desc: 'Daily dairy essentials and freshly baked goods.',
    items: [
      { name: 'Fresh Whole Milk 1L', price: 45, unit: 'Liter' },
      { name: 'Amul Pasteurised Butter 500g', price: 260, unit: 'Piece' },
      { name: 'White Sliced Bread', price: 30, unit: 'Piece' },
      { name: 'Greek Yogurt 500g', price: 90, unit: 'Piece' },
    ]
  },
  {
    id: 'snacks',
    name: 'Snacks & Branded Foods',
    desc: 'Your favorite munchies, chips, chocolates, and spreads.',
    items: [
      { name: 'Cadbury Dairy Milk Silk', price: 80, unit: 'Piece' },
      { name: 'Lays Classic Salted', price: 20, unit: 'Piece' },
      { name: 'Kurkure Masala Munch', price: 20, unit: 'Piece' },
      { name: 'Chocolate Chip Cookies', price: 50, unit: 'Piece' },
    ]
  },
  {
    id: 'beverages',
    name: 'Beverages',
    desc: 'Juices, soft drinks, energy drinks, and tea/coffee mixes.',
    items: [
      { name: 'Coca Cola Soft Drink 1.25L', price: 70, unit: 'Liter' },
      { name: 'Red Bull Energy 250ml', price: 120, unit: 'Piece' },
      { name: 'Pepsi Cola 750ml', price: 40, unit: 'Piece' },
      { name: 'Real Fruit Juice Mixed', price: 110, unit: 'Piece' },
    ]
  },
  {
    id: 'household',
    name: 'Household Essentials',
    desc: 'Cleaning supplies, detergents, kitchen rolls, and utilities.',
    items: [
      { name: 'Vim Dishwash Gel 500ml', price: 105, unit: 'Piece' },
      { name: 'Ariel Matic Detergent 1kg', price: 220, unit: 'Piece' },
      { name: 'Lizol Floor Cleaner 1L', price: 165, unit: 'Piece' },
      { name: 'Comfort Fabric Conditioner', price: 55, unit: 'Piece' },
    ]
  },
  {
    id: 'personal',
    name: 'Personal Care',
    desc: 'Soaps, shampoos, oral hygiene, and hand sanitizers.',
    items: [
      { name: 'Dove Beauty Soap 100g', price: 45, unit: 'Piece' },
      { name: 'Herbal Essence Shampoo 200ml', price: 120, unit: 'Piece' },
      { name: 'Colgate MaxFresh Gel Paste 150g', price: 95, unit: 'Piece' },
      { name: 'Dettol Liquid Handwash', price: 85, unit: 'Piece' },
    ]
  }
];

export default function FreshMart({ onOpenLogin }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedCategoryTab, setSelectedCategoryTab] = useState('fruits');
  
  // Form state
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [formSubmitted, setFormSubmitted] = useState(false);

  const handleContactSubmit = (e) => {
    e.preventDefault();
    if (!contactName || !contactEmail || !contactMessage) return;
    setFormSubmitted(true);
    setContactName('');
    setContactEmail('');
    setContactMessage('');
    setTimeout(() => setFormSubmitted(false), 5000);
  };

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-stone-50/50 text-slate-800 font-sans flex flex-col scroll-smooth">
      
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => scrollToSection('home')}>
            <div className="p-2 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-sm">
              <Leaf className="w-5 h-5 fill-emerald-100 text-emerald-100" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-emerald-800">FreshMart</span>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-0.5">Your Friendly Neighborhood Store</p>
            </div>
          </div>

          {/* Desktop Nav links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-slate-600">
            <button onClick={() => scrollToSection('home')} className="hover:text-emerald-700 transition-colors border-none bg-transparent cursor-pointer">Home</button>
          </nav>

          {/* Action buttons */}
          <div className="hidden md:flex items-center gap-3">
            <button 
              onClick={onOpenLogin}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-md hover:shadow-lg transition-all cursor-pointer border-none"
            >
              Staff Portal
            </button>
          </div>

          {/* Mobile Menu trigger */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 border-none bg-transparent cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile menu panel */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-100 py-4 px-6 flex flex-col gap-4 shadow-inner">
            <button onClick={() => scrollToSection('home')} className="text-left py-1 text-sm font-semibold text-slate-600 hover:text-emerald-700 border-none bg-transparent cursor-pointer">Home</button>
            <button 
              onClick={onOpenLogin}
              className="mt-2 w-full py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white text-center shadow-md transition-all cursor-pointer border-none"
            >
              Staff Portal
            </button>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section id="home" className="relative py-16 lg:py-24 bg-gradient-to-br from-emerald-50/50 via-white to-stone-50 overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[100px] -mr-40 -mt-40"></div>
        <div className="absolute bottom-0 left-0 w-[350px] h-[350px] bg-teal-500/5 rounded-full blur-[80px] -ml-20 -mb-20"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Hero details */}
          <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-100/70 border border-emerald-200/50 text-emerald-800">
              <Leaf className="w-3.5 h-3.5 fill-emerald-800 text-emerald-800" />
              Welcome to FreshMart Supermarket
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-none">
              Fresh Products. <br />
              <span className="text-emerald-600">Great Prices.</span> <br />
              Better Everyday.
            </h1>
            
            {/* IN-STORE ONLY BANNER */}
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-800 rounded-2xl p-4 text-left inline-flex items-start gap-3 max-w-md shadow-sm">
              <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-amber-700">WE ONLY SERVE IN-STORE</p>
                <p className="text-[11px] font-semibold text-amber-800/90 mt-0.5 leading-relaxed">
                  Walk-in customers only. S Mart / FreshMart is a physical offline store. We do not support online delivery, online orders, or online payment checkouts on this site.
                </p>
              </div>
            </div>

            <p className="text-slate-500 font-medium text-sm sm:text-base max-w-lg leading-relaxed mx-auto lg:mx-0">
              Visit our neighborhood grocery storefront to explore organic fresh veggies, pantry treats, daily dairy essentials, bakery goods, and personal care necessities.
            </p>


          </div>

          {/* Hero image */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="relative max-w-md sm:max-w-lg lg:max-w-full">
              {/* Decorative accent frames */}
              <div className="absolute -inset-2 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-3xl opacity-20 blur-xl"></div>
              <div className="relative bg-white p-3 rounded-[32px] border border-slate-100 shadow-2xl">
                <img 
                  src={heroImage} 
                  alt="Fresh organic vegetables basket" 
                  className="rounded-2xl w-full h-[320px] sm:h-[400px] object-cover animate-float" 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Feature badges list */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {[
              { title: 'Fresh Products', desc: 'Daily fresh & quality items', icon: Leaf },
              { title: 'Best Prices', desc: 'Affordable prices every day', icon: Tag },
              { title: 'Great Offers', desc: 'Exciting offers in store', icon: Tag },
              { title: 'Wide Variety', desc: 'Everything you need', icon: ShoppingBag }
            ].map((f, i) => (
              <div key={i} className="bg-white/80 backdrop-blur border border-slate-100 p-4 sm:p-5 rounded-2xl shadow-sm hover-card-lift transition-all flex items-start gap-3 group">
                <div className="p-2.5 bg-emerald-50 group-hover:bg-emerald-100 rounded-xl text-emerald-600 transition-colors">
                  <f.icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-xs sm:text-sm">{f.title}</h4>
                  <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 leading-tight font-medium">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


    </div>
  );
}
