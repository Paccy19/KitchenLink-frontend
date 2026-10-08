import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, 
  MapPin, 
  Search, 
  User, 
  Clock, 
  ChevronDown, 
  UtensilsCrossed, 
  LogOut, 
  ListOrdered,
  CalendarDays,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useLocation } from '../../context/LocationContext';

export default function Navbar({ onSearchChange, searchTerm = '' }) {
  const navigate = useNavigate();
  const { user, isAuthenticated, openAuthModal, logout } = useAuth();
  const { totalItemCount, setIsCartOpen } = useCart();
  const { currentLocation, setIsLocationModalOpen, neighborhoods, selectLocation } = useLocation();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLocDropdownOpen, setIsLocDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/?q=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
      {/* Top Banner for Pre-order & Scheduled Meals reminder */}
      <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 text-white text-xs py-1.5 px-4 text-center font-medium flex items-center justify-center gap-2">
        <span className="bg-white/20 text-white text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
          New
        </span>
        <span>Empowering Kigali's Home Cooks & Kitchens! Order immediate meals or pre-order tomorrow's home specials.</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 flex-shrink-0 group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
              <UtensilsCrossed className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="font-extrabold text-xl tracking-tight text-gray-900 group-hover:text-orange-600 transition-colors flex items-center gap-1.5">
                Food<span className="text-orange-500">Kitchen</span>
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">Market</span>
              </div>
              <p className="text-[11px] text-gray-500 font-medium">Any Cook · Any Food · Anywhere</p>
            </div>
          </Link>

          {/* Location Selector */}
          <div className="relative hidden md:block">
            <button
              onClick={() => setIsLocDropdownOpen(!isLocDropdownOpen)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200/70 text-sm font-semibold text-gray-700 transition"
            >
              <MapPin className="w-4 h-4 text-orange-500 flex-shrink-0" />
              <span className="max-w-[140px] truncate">{currentLocation}</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>

            {isLocDropdownOpen && (
              <div className="absolute top-full mt-2 left-0 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Select Delivery Area
                </div>
                {neighborhoods.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => {
                      selectLocation(`${n.name}, Kigali`);
                      setIsLocDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-sm flex items-center justify-between hover:bg-orange-50 hover:text-orange-600 transition ${
                      currentLocation.includes(n.name) ? 'bg-orange-50/70 text-orange-600 font-bold' : 'text-gray-700'
                    }`}
                  >
                    <span>{n.name}</span>
                    <span className="text-xs text-gray-400">{n.district}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-lg hidden lg:block">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
                placeholder="What are you craving? (Chicken, Rice, Isombe, Burger, Brochettes...)"
                className="w-full pl-11 pr-4 py-2.5 rounded-full bg-gray-100/90 hover:bg-gray-100 focus:bg-white border border-transparent focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 text-sm transition outline-none"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-4 top-3.5" />
            </form>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3">

            {/* Quick Link: Pre-Orders */}
            <Link
              to="/?filter=preorder"
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/60 transition"
            >
              <CalendarDays className="w-3.5 h-3.5 text-amber-600" />
              <span>Tomorrow's Specials</span>
            </Link>

            {/* Cart Trigger Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2 px-3.5 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-600 font-bold text-sm border border-orange-200/50 transition group"
              aria-label="View Cart"
            >
              <ShoppingBag className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">Cart</span>
              {totalItemCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-orange-600 text-white text-xs flex items-center justify-center font-bold animate-soft-pulse">
                  {totalItemCount}
                </span>
              )}
            </button>

            {/* User Account / Login */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-sm font-medium transition"
                >
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-7 h-7 rounded-full object-cover ring-2 ring-orange-500/30"
                  />
                  <span className="hidden md:inline font-bold text-gray-800 text-xs max-w-[100px] truncate">
                    {user.name.split(' ')[0]}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden sm:inline" />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-bold text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.phone}</p>
                    </div>

                    <Link
                      to="/profile"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition"
                    >
                      <User className="w-4 h-4 text-gray-400" />
                      <span>My Profile & Addresses</span>
                    </Link>

                    <Link
                      to="/orders"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition"
                    >
                      <ListOrdered className="w-4 h-4 text-gray-400" />
                      <span>Order History</span>
                    </Link>

                    <Link
                      to="/track"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition"
                    >
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span>Track Active Order</span>
                    </Link>

                    <div className="border-t border-gray-100 my-1"></div>

                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
                    >
                      <LogOut className="w-4 h-4 text-red-500" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={openAuthModal}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs shadow-sm transition"
              >
                <User className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}

            {/* Mobile menu hamburger */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-gray-600 hover:text-gray-900 rounded-lg"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>

        {/* Mobile Search Input */}
        <div className="lg:hidden pb-3">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
              placeholder="Search chicken, rice, isombe, pizza..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-gray-100 border border-transparent focus:border-orange-500 focus:bg-white text-sm outline-none"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-2.5" />
          </form>
        </div>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-gray-100 space-y-2">
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
              <span className="text-xs text-gray-500 font-medium">Location:</span>
              <span className="text-xs font-bold text-gray-800">{currentLocation}</span>
            </div>
            <Link
              to="/orders"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-orange-50 rounded-lg"
            >
              Order History
            </Link>
            <Link
              to="/track"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-orange-50 rounded-lg"
            >
              Track Order
            </Link>
            <Link
              to="/profile"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-orange-50 rounded-lg"
            >
              My Profile
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
