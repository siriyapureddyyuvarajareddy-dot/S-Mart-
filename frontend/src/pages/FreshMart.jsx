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
            <button onClick={() => scrollToSection('about')} className="hover:text-emerald-700 transition-colors border-none bg-transparent cursor-pointer">About Us</button>
            <button onClick={() => scrollToSection('categories')} className="hover:text-emerald-700 transition-colors border-none bg-transparent cursor-pointer">Categories</button>
            <button onClick={() => scrollToSection('offers')} className="hover:text-emerald-700 transition-colors border-none bg-transparent cursor-pointer">Offers</button>
            <button onClick={() => scrollToSection('gallery')} className="hover:text-emerald-700 transition-colors border-none bg-transparent cursor-pointer">Gallery</button>
            <button onClick={() => scrollToSection('location')} className="hover:text-emerald-700 transition-colors border-none bg-transparent cursor-pointer">Location</button>
            <button onClick={() => scrollToSection('contact')} className="hover:text-emerald-700 transition-colors border-none bg-transparent cursor-pointer">Contact Us</button>
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
            <button onClick={() => scrollToSection('about')} className="text-left py-1 text-sm font-semibold text-slate-600 hover:text-emerald-700 border-none bg-transparent cursor-pointer">About Us</button>
            <button onClick={() => scrollToSection('categories')} className="text-left py-1 text-sm font-semibold text-slate-600 hover:text-emerald-700 border-none bg-transparent cursor-pointer">Categories</button>
            <button onClick={() => scrollToSection('offers')} className="text-left py-1 text-sm font-semibold text-slate-600 hover:text-emerald-700 border-none bg-transparent cursor-pointer">Offers</button>
            <button onClick={() => scrollToSection('gallery')} className="text-left py-1 text-sm font-semibold text-slate-600 hover:text-emerald-700 border-none bg-transparent cursor-pointer">Gallery</button>
            <button onClick={() => scrollToSection('location')} className="text-left py-1 text-sm font-semibold text-slate-600 hover:text-emerald-700 border-none bg-transparent cursor-pointer">Location</button>
            <button onClick={() => scrollToSection('contact')} className="text-left py-1 text-sm font-semibold text-slate-600 hover:text-emerald-700 border-none bg-transparent cursor-pointer">Contact Us</button>
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

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <button 
                onClick={() => scrollToSection('location')}
                className="w-full sm:w-auto px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group cursor-pointer border-none"
              >
                <span>Visit Our Store</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
              <button 
                onClick={() => scrollToSection('categories')}
                className="w-full sm:w-auto px-8 py-3.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-2xl font-bold text-sm shadow-sm transition-all cursor-pointer"
              >
                Browse Categories
              </button>
            </div>
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

      {/* About Us Section */}
      <section id="about" className="py-16 bg-white border-y border-slate-100 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* About us Image */}
          <div className="lg:col-span-5 order-last lg:order-first flex justify-center">
            <div className="relative w-full max-w-md lg:max-w-full">
              <div className="absolute -inset-1.5 bg-emerald-500 rounded-[28px] opacity-15 blur-lg"></div>
              <div className="relative bg-white p-2.5 rounded-[28px] border border-slate-100 shadow-xl">
                <img 
                  src={aisleImage} 
                  alt="Supermarket aisle shelves" 
                  className="rounded-2xl w-full h-[280px] sm:h-[350px] object-cover animate-float" 
                  style={{ animationDelay: '1.5s' }}
                />
              </div>
            </div>
          </div>

          {/* About us details */}
          <div className="lg:col-span-7 space-y-6">
            <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
              About Our Store
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              S Serving Freshness for Over a Decade
            </h2>
            <p className="text-slate-500 font-medium text-sm leading-relaxed">
              FreshMart is your committed neighborhood supermarket. We are dedicated to providing the freshest vegetables, milk, bakery supplies, daily pantry staples, personal care products, and household items. Our primary focus is visual freshness, quality control, transparent local pricing, and helpful customer assistance.
            </p>

            {/* Offline caution banner */}
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl p-4 flex items-start gap-3 shadow-inner">
              <Info className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">PHYSICAL WALKIN ONLY</p>
                <p className="text-[11px] font-semibold text-emerald-700/90 mt-0.5 leading-relaxed">
                  We believe in direct community connections. Walk in to inspect products, check ingredients, and receive instant cashier checkout. S Mart / FreshMart does not support home delivery or online payments.
                </p>
              </div>
            </div>

            {/* Counter stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
              {[
                { count: '10+', label: 'Years of Trust' },
                { count: '5000+', label: 'Happy Customers' },
                { count: '1000+', label: 'Products In Stock' },
                { count: '1', label: 'Close Relation' }
              ].map((stat, i) => (
                <div key={i} className="bg-stone-50 border border-slate-100 p-4 rounded-2xl text-center">
                  <p className="text-2xl font-black text-emerald-700">{stat.count}</p>
                  <p className="text-[10px] font-extrabold uppercase text-slate-400 mt-1 tracking-wider">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section id="categories" className="py-16 bg-stone-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto space-y-3 mb-12">
            <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
              Shop by Category
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">All Categories</h2>
            <p className="text-slate-400 text-xs font-semibold">Explore our wide range of products available in-store.</p>
          </div>

          {/* Categories Tab navigation */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8 bg-white border border-slate-150 p-2 rounded-2xl max-w-3xl mx-auto overflow-x-auto shadow-sm">
            {categoriesData.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryTab(cat.id)}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex-shrink-0 cursor-pointer border-none ${
                  selectedCategoryTab === cat.id 
                    ? 'bg-emerald-600 text-white shadow-md' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Tab content panel */}
          <div className="max-w-4xl mx-auto bg-white border border-slate-150 rounded-3xl p-6 md:p-8 shadow-xl">
            {categoriesData.map(cat => {
              if (cat.id !== selectedCategoryTab) return null;
              return (
                <div key={cat.id} className="space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h3 className="text-lg font-black text-slate-900">{cat.name}</h3>
                    <p className="text-xs text-slate-500 mt-1 font-medium">{cat.desc}</p>
                  </div>
                  
                  {/* Products Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {cat.items.map((prod, i) => (
                      <div key={i} className="border border-slate-100 bg-slate-50/50 p-4 rounded-2xl flex items-center justify-between hover-card-lift transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                          <div>
                            <p className="font-bold text-slate-800 text-xs sm:text-sm">{prod.name}</p>
                            <p className="text-[10px] text-slate-400 font-bold mt-0.5 capitalize">Category: {cat.name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-emerald-700 text-xs sm:text-sm">₹{prod.price}</p>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">per {prod.unit}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-emerald-50/50 border border-emerald-150/50 rounded-xl p-3.5 text-center">
                    <p className="text-[10px] font-extrabold text-emerald-800 tracking-wide uppercase">
                      Stock is restocked daily. Walk in to purchase!
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Offers Section */}
      <section id="offers" className="py-16 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto space-y-3 mb-12">
            <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
              Offers & Deals
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Latest In-Store Offers</h2>
            <p className="text-slate-400 text-xs font-semibold">Special running discounts. Walk in to redeem these values!</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Offer 1 */}
            <div className="bg-stone-50 border border-slate-100 rounded-3xl p-6 text-center space-y-4 hover-card-lift transition-all shadow-sm">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto text-xl font-black shadow-sm">
                10%
              </div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">10% OFF Fruits & Vegetables</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Get an instant 10% flat discount on all farm-fresh green veggies and organic fruits at the counter.
              </p>
              <div className="bg-emerald-50 text-emerald-700 rounded-xl py-1 px-3 text-[10px] font-extrabold inline-block">
                Valid till End of Month
              </div>
            </div>

            {/* Offer 2 */}
            <div className="bg-stone-50 border border-slate-100 rounded-3xl p-6 text-center space-y-4 hover-card-lift transition-all shadow-sm">
              <div className="w-14 h-14 bg-emerald-600 text-white rounded-2xl flex items-center justify-center mx-auto text-sm font-black shadow-sm">
                B1G1
              </div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">Buy 1 Get 1 Free on Snacks</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Purchase selected snacks or branded biscuit packets and get a matching packet completely free.
              </p>
              <div className="bg-emerald-50 text-emerald-700 rounded-xl py-1 px-3 text-[10px] font-extrabold inline-block">
                Valid on Select Packs
              </div>
            </div>

            {/* Offer 3 */}
            <div className="bg-stone-50 border border-slate-100 rounded-3xl p-6 text-center space-y-4 hover-card-lift transition-all shadow-sm">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto text-xl font-black shadow-sm">
                20%
              </div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">20% OFF Personal Care</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Save 20% on soaps, shampoos, toothpastes, and handwash brands. Keep your hygiene clean & budget friendly.
              </p>
              <div className="bg-emerald-50 text-emerald-700 rounded-xl py-1 px-3 text-[10px] font-extrabold inline-block">
                Weekend Specials Only
              </div>
            </div>
          </div>

          {/* Banner bottom */}
          <div className="mt-10 max-w-4xl mx-auto bg-gradient-to-r from-emerald-700 to-teal-800 rounded-3xl p-6 sm:p-8 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
            <div className="space-y-2 text-center sm:text-left z-10">
              <h3 className="text-lg sm:text-xl font-extrabold">More exciting offers in-store!</h3>
              <p className="text-xs text-emerald-100/90 font-medium leading-relaxed">
                We have over 50 items with buy-one-get-one deals and wholesale price drops weekly. Visit us today and save.
              </p>
            </div>
            <button 
              onClick={() => scrollToSection('location')}
              className="bg-white hover:bg-slate-50 text-emerald-800 rounded-2xl py-3 px-6 text-xs font-bold shadow-md cursor-pointer border-none flex items-center gap-1.5 flex-shrink-0"
            >
              Find Store Location
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section id="gallery" className="py-16 bg-stone-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto space-y-3 mb-12">
            <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
              Our Store Gallery
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">A Glimpse of Our Store</h2>
            <p className="text-slate-400 text-xs font-semibold">Walk through our cleanly maintained physical aisles.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {[
              { name: 'Fresh Produce Aisle', desc: 'Daily organic greens & fruits' },
              { name: 'Dairy & Frozen', desc: 'Cold storage storage cabinets' },
              { name: 'Billing Checkout Counter', desc: 'Barcode POS scanning systems' },
              { name: 'Fresh Bakery Section', desc: 'Bread, cakes & cookies' },
              { name: 'Pantry Shelves', desc: 'Biscuits, snacks & oils' },
              { name: 'Store Front Entrance', desc: 'Welcome desk & customer lobby' }
            ].map((img, i) => (
              <div key={i} className="group relative bg-slate-200 aspect-[4/3] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                {/* Fallback pattern / representation of images */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/10 to-transparent flex flex-col justify-end p-4 z-10">
                  <h4 className="font-bold text-white text-xs sm:text-sm leading-tight">{img.name}</h4>
                  <p className="text-[9px] sm:text-xs text-emerald-300 font-bold mt-0.5 opacity-90">{img.desc}</p>
                </div>
                <div className="absolute inset-0 bg-emerald-800/10 opacity-0 group-hover:opacity-100 transition-opacity z-20"></div>
                {/* CSS visual display to represent image placeholders beautifully */}
                <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-700">
                  <ImageIcon className="w-8 h-8 opacity-25 group-hover:scale-105 transition-transform text-white" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Store Location Page */}
      <section id="location" className="py-16 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto space-y-3 mb-12">
            <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
              Store Location
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Visit Us - We are close to you!</h2>
            <p className="text-slate-400 text-xs font-semibold">Drop in to purchase all your grocery needs.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-5xl mx-auto items-stretch">
            {/* Info details */}
            <div className="lg:col-span-5 bg-stone-50 border border-slate-100 p-6 sm:p-8 rounded-3xl flex flex-col justify-between space-y-6">
              <div className="space-y-6">
                <div>
                  <span className="text-xl font-black tracking-tight text-emerald-800">FreshMart Store</span>
                  <p className="text-xs text-slate-500 font-bold mt-1">S Mart Supermarket Chain</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-slate-800 uppercase">Address</p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5 leading-relaxed">
                        123 Green Street, City Center, <br />
                        Your City, PIN - 560001
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-slate-800 uppercase">Opening Hours</p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5 leading-relaxed">
                        Monday - Sunday <br />
                        8:00 AM - 10:00 PM
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-slate-800 uppercase">Phone Contact</p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5 leading-relaxed">
                        +91 98765 43210
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/30 text-amber-800 rounded-xl p-3.5 flex items-start gap-2 shadow-inner">
                <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                  Reminder: No deliveries or online ordering services
                </span>
              </div>
            </div>

            {/* Map container */}
            <div className="lg:col-span-7 bg-slate-100 border border-slate-200 rounded-3xl overflow-hidden relative min-h-[300px] flex items-center justify-center shadow-lg">
              {/* Styled Mock Google Map */}
              <div className="absolute inset-0 bg-[#e5e9f0] p-6 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div className="bg-white p-2.5 rounded-lg shadow-md border border-slate-100 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-rose-500" />
                    <span className="text-xs font-bold text-slate-800">FreshMart Supermarket</span>
                  </div>
                  <div className="bg-white p-1.5 rounded-lg shadow-sm border border-slate-100 flex flex-col gap-1 text-[9px] font-bold text-slate-500">
                    <button className="px-1 border-b border-slate-100">+</button>
                    <button className="px-1">-</button>
                  </div>
                </div>
                
                {/* Styled illustration representing map details */}
                <div className="w-full h-full flex flex-col items-center justify-center relative">
                  {/* Grid lines simulating map streets */}
                  <div className="absolute h-0.5 w-full bg-white opacity-60 top-1/4"></div>
                  <div className="absolute h-0.5 w-full bg-white opacity-60 top-3/4"></div>
                  <div className="absolute w-0.5 h-full bg-white opacity-60 left-1/3"></div>
                  <div className="absolute w-0.5 h-full bg-white opacity-60 left-2/3"></div>
                  
                  {/* Pin mark */}
                  <div className="relative z-10 flex flex-col items-center gap-1 hover:scale-105 transition-transform cursor-pointer">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg border-2 border-white">
                      <Leaf className="w-4 h-4 fill-emerald-100 text-emerald-100" />
                    </div>
                    <span className="bg-slate-900 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow">FreshMart PIN</span>
                  </div>
                </div>

                <div className="bg-white/80 p-2 rounded-lg text-[9px] font-bold text-slate-500 flex justify-between">
                  <span>Map data ©2026</span>
                  <a href="https://maps.google.com" target="_blank" rel="noreferrer" className="text-emerald-700 flex items-center gap-0.5">
                    Open in Maps
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Us Section */}
      <section id="contact" className="py-16 bg-stone-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto space-y-3 mb-12">
            <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
              Contact Us
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">We'd love to hear from you</h2>
            <p className="text-slate-400 text-xs font-semibold">Reach out for supplier partnerships, customer queries, or franchise requests.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-5xl mx-auto items-stretch">
            
            {/* Contact details */}
            <div className="lg:col-span-5 bg-white border border-slate-150 p-6 sm:p-8 rounded-3xl flex flex-col justify-between space-y-6 shadow-sm">
              <div className="space-y-6">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">Contact Channels</h3>
                  <p className="text-xs text-slate-400 mt-1">Ways to reach our store management directly.</p>
                </div>

                <div className="space-y-5">
                  <div className="flex items-center gap-3 text-xs">
                    <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-700">Phone</p>
                      <p className="text-slate-500 font-semibold mt-0.5">+91 98765 43210</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-700">Email Address</p>
                      <p className="text-slate-500 font-semibold mt-0.5">info@freshmart.com</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-700">WhatsApp Chat</p>
                      <p className="text-slate-500 font-semibold mt-0.5">
                        <a href="https://wa.me/919876543210" target="_blank" rel="noreferrer" className="text-emerald-700 hover:underline flex items-center gap-0.5">
                          Chat on WhatsApp
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-emerald-50/50 border border-emerald-150/40 rounded-2xl p-4 text-xs">
                <p className="font-bold text-emerald-800">Franchise & Supplier Query</p>
                <p className="text-slate-500 mt-1 leading-relaxed font-semibold">
                  Are you a local farm supplier? We love partner listings! Send us an email with item stock details.
                </p>
              </div>
            </div>

            {/* Form */}
            <div className="lg:col-span-7 bg-white border border-slate-150 p-6 sm:p-8 rounded-3xl shadow-lg">
              <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider mb-6">Send a Message</h3>
              
              {formSubmitted ? (
                <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl p-6 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                    <Check className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold">Message Sent Successfully!</h4>
                  <p className="text-xs text-emerald-700/90 leading-relaxed font-semibold">
                    Thank you for contacting FreshMart Supermarket. Our team will review your enquiry and respond shortly.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1.5">Name</label>
                    <input 
                      type="text"
                      required
                      value={contactName}
                      onChange={e => setContactName(e.target.value)}
                      placeholder="Enter your name"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1.5">Email</label>
                    <input 
                      type="email"
                      required
                      value={contactEmail}
                      onChange={e => setContactEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1.5">Message</label>
                    <textarea 
                      required
                      rows="4"
                      value={contactMessage}
                      onChange={e => setContactMessage(e.target.value)}
                      placeholder="Write your query..."
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer border-none"
                  >
                    Send Message
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-slate-900 text-slate-400 py-12 border-t border-slate-800 font-medium">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 text-xs sm:text-sm">
          
          {/* Logo & description */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-600 rounded-lg flex items-center justify-center text-white">
                <Leaf className="w-4 h-4 text-emerald-100" />
              </div>
              <span className="text-lg font-black text-white tracking-tight">FreshMart</span>
            </div>
            <p className="text-slate-500 leading-relaxed font-semibold text-xs">
              Daily fresh produce, bakery goods, household supplies, and personal care essentials at affordable local supermarket rates.
            </p>
            <div className="text-[10px] text-amber-500 font-extrabold uppercase bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded inline-block">
              Offline walk-in store only
            </div>
          </div>

          {/* Quick links */}
          <div className="space-y-4">
            <h4 className="font-extrabold text-white text-xs uppercase tracking-wider">Quick Links</h4>
            <div className="flex flex-col gap-2.5 text-xs text-slate-400">
              <button onClick={() => scrollToSection('home')} className="text-left hover:text-white border-none bg-transparent cursor-pointer">Home</button>
              <button onClick={() => scrollToSection('about')} className="text-left hover:text-white border-none bg-transparent cursor-pointer">About Us</button>
              <button onClick={() => scrollToSection('categories')} className="text-left hover:text-white border-none bg-transparent cursor-pointer">Categories</button>
              <button onClick={() => scrollToSection('offers')} className="text-left hover:text-white border-none bg-transparent cursor-pointer">Offers</button>
              <button onClick={() => scrollToSection('gallery')} className="text-left hover:text-white border-none bg-transparent cursor-pointer">Gallery</button>
              <button onClick={() => scrollToSection('location')} className="text-left hover:text-white border-none bg-transparent cursor-pointer">Location</button>
              <button onClick={() => scrollToSection('contact')} className="text-left hover:text-white border-none bg-transparent cursor-pointer">Contact Us</button>
            </div>
          </div>

          {/* Categories */}
          <div className="space-y-4">
            <h4 className="font-extrabold text-white text-xs uppercase tracking-wider">Categories</h4>
            <div className="flex flex-col gap-2.5 text-xs text-slate-400">
              <button onClick={() => { scrollToSection('categories'); setSelectedCategoryTab('fruits'); }} className="text-left hover:text-white border-none bg-transparent cursor-pointer">Fruits & Vegetables</button>
              <button onClick={() => { scrollToSection('categories'); setSelectedCategoryTab('dairy'); }} className="text-left hover:text-white border-none bg-transparent cursor-pointer">Bakery & Dairy</button>
              <button onClick={() => { scrollToSection('categories'); setSelectedCategoryTab('snacks'); }} className="text-left hover:text-white border-none bg-transparent cursor-pointer">Snacks & Beverages</button>
              <button onClick={() => { scrollToSection('categories'); setSelectedCategoryTab('household'); }} className="text-left hover:text-white border-none bg-transparent cursor-pointer">Household Essentials</button>
              <button onClick={() => { scrollToSection('categories'); setSelectedCategoryTab('personal'); }} className="text-left hover:text-white border-none bg-transparent cursor-pointer">Personal Care</button>
            </div>
          </div>

          {/* Contact Details */}
          <div className="space-y-4 text-xs text-slate-400">
            <h4 className="font-extrabold text-white text-xs uppercase tracking-wider">Contact Info</h4>
            <p className="leading-relaxed">
              123 Green Street, City Center, <br />
              Your City, PIN - 560001
            </p>
            <p className="font-bold text-white">Call: +91 98765 43210</p>
            <p className="font-bold text-white">Mail: info@freshmart.com</p>
            <p className="text-emerald-400">
              <a href="https://wa.me/919876543210" target="_blank" rel="noreferrer" className="hover:underline">
                WhatsApp Chat: Chat now
              </a>
            </p>
          </div>
        </div>

        {/* Copywrite */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-800/80 pt-6 text-center text-xs text-slate-500 font-bold">
          <p>© 2026 FreshMart Supermarket Solutions. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
}
