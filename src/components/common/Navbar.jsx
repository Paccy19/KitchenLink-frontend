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
  Heart,
  Store,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useLocation } from '../../context/LocationContext';
import { useWishlist } from '../../context/WishlistContext';
import { useVendor } from '../../context/VendorContext';

export default function Navbar({ onSearchChange, searchTerm = '' }) {
  const navigate = useNavigate();
  const { user, isAuthenticated, openAuthModal, logout } = useAuth();
  const { totalItemCount, setIsCartOpen } = useCart();
  const { items: wishlistItems } = useWishlist();
  const { currentLocation, setIsLocationModalOpen, neighborhoods, selectLocation } = useLocation();
  const { isRegistered } = useVendor();

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
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200/80 shadow-sm">
      {/* Top Banner for Pre-order & Scheduled Meals reminder */}
      <div className="bg-gradient-to-r from-[#1c0a03] via-[#3a1a0c] to-[#1c0a03] border-b border-[#4e2410]/50 text-[#f5ebe1] text-xs py-1.5 px-4 text-center font-medium flex items-center justify-center gap-2">
        <span className="bg-[#542813] text-[#ebd7c5] border border-[#7a3a19]/50 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
          New
        </span>
        <span>Empowering Kigali's Home Cooks & Kitchens! Order immediate meals or pre-order tomorrow's home specials.</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 flex-shrink-0 group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#2b1206] via-[#481f0d] to-[#1c0a03] flex items-center justify-center text-white shadow-md shadow-[#2b1206]/25 group-hover:scale-105 group-hover:shadow-lg transition-all duration-300">
              <UtensilsCrossed className="w-6 h-6 stroke-[2.2] text-[#f5ebe1]" />
            </div>
            <div>
              <div className="font-extrabold text-xl tracking-tight text-gray-900 group-hover:text-[#542813] transition-colors flex items-center gap-1.5">
                Food<span className="text-[#8a5332]">Kitchen</span>
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-[#f5ebe1] text-[#3d1b0c] border border-[#ebd7c5]">Market</span>
              </div>
              <p className="text-[11px] text-stone-500 font-medium">Any Cook · Any Food · Anywhere</p>
            </div>
          </Link>

          {/* Location Selector */}
          <div className="relative hidden md:block">
            <button
              onClick={() => setIsLocDropdownOpen(!isLocDropdownOpen)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-stone-50 hover:bg-[#faf6f2] border border-stone-200 text-sm font-semibold text-stone-700 hover:border-[#d9bda6] hover:text-[#3d1b0c] transition active:scale-95"
            >
              <MapPin className="w-4 h-4 text-[#8a5332] flex-shrink-0" />
              <span className="max-w-[140px] truncate">{currentLocation}</span>
              <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
            </button>

            {isLocDropdownOpen && (
              <div className="absolute top-full mt-2 left-0 w-64 bg-white rounded-2xl shadow-xl border border-stone-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-stone-400">
                  Select Delivery Area
                </div>
                {neighborhoods.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => {
                      selectLocation(`${n.name}, Kigali`);
                      setIsLocDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-sm flex items-center justify-between hover:bg-[#faf6f2] hover:text-[#542813] transition ${
                      currentLocation.includes(n.name) ? 'bg-[#faf6f2] text-[#542813] font-bold' : 'text-stone-700'
                    }`}
                  >
                    <span>{n.name}</span>
                    <span className="text-xs text-stone-400">{n.district}</span>
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
                className="w-full pl-11 pr-4 py-2.5 rounded-full bg-stone-100/80 hover:bg-stone-100 focus:bg-white border border-transparent focus:border-[#542813] focus:ring-4 focus:ring-[#542813]/10 text-sm transition outline-none"
              />
              <Search className="w-4 h-4 text-stone-400 absolute left-4 top-3.5" />
            </form>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3">

            {/* Vendor portal */}
            <Link
              to={isRegistered ? '/vendor-dashboard' : '/vendor-register'}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#3d1b0c] bg-[#faf6f2] hover:bg-[#f5ebe1] border border-[#ebd7c5] transition hover:-translate-y-0.5 hover:shadow-sm"
            >
              <Store className="w-3.5 h-3.5 text-[#6d391d]" />
              <span>{isRegistered ? 'Vendor Dashboard' : 'Become a Vendor'}</span>
            </Link>

            {/* Quick Link: Pre-Orders */}
            <Link
              to="/?filter=preorder"
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#3d1b0c] bg-[#faf6f2] hover:bg-[#f5ebe1] border border-[#ebd7c5] transition hover:-translate-y-0.5 hover:shadow-sm"
            >
              <CalendarDays className="w-3.5 h-3.5 text-[#6d391d]" />
              <span>Tomorrow's Specials</span>
            </Link>

            {/* Cart Trigger Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#faf6f2] hover:bg-[#f5ebe1] text-[#3d1b0c] font-bold text-sm border border-[#ebd7c5] transition group active:scale-95"
              aria-label="View Cart"
            >
              <ShoppingBag className="w-4 h-4 group-hover:scale-110 text-[#6d391d] transition-transform" />
              <span className="hidden sm:inline">Cart</span>
              {totalItemCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-gradient-to-r from-[#2b1206] to-[#542813] text-white text-xs flex items-center justify-center font-bold animate-soft-pulse">
                  {totalItemCount}
                </span>
              )}
            </button>

            <Link
              to="/wishlist"
              aria-label={`Saved dishes${wishlistItems.length ? `, ${wishlistItems.length} ${wishlistItems.length === 1 ? 'item' : 'items'}` : ''}`}
              title="Saved dishes"
              className="relative p-2.5 rounded-xl border border-gray-200 bg-white text-rose-600 hover:bg-rose-50 transition"
            >
              <Heart className="w-4 h-4" />
              {wishlistItems.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-rose-600 text-white text-[9px] flex items-center justify-center font-bold">
                  {wishlistItems.length}
                </span>
              )}
            </Link>

            {/* User Account / Login */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-stone-50 hover:bg-[#faf6f2] border border-stone-200 text-sm font-medium transition"
                >
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-7 h-7 rounded-full object-cover ring-2 ring-[#8a5332]/30"
                  />
                  <span className="hidden md:inline font-bold text-stone-800 text-xs max-w-[100px] truncate">
                    {user.name.split(' ')[0]}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-stone-400 hidden sm:inline" />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-stone-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-4 py-2 border-b border-stone-100">
                      <p className="text-sm font-bold text-gray-900">{user.name}</p>
                      <p className="text-xs text-stone-500">{user.phone}</p>
                    </div>

                    <Link
                      to="/profile"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-stone-700 hover:bg-[#faf6f2] hover:text-[#542813] transition"
                    >
                      <User className="w-4 h-4 text-stone-400" />
                      <span>My Profile & Addresses</span>
                    </Link>

                    <Link
                      to="/orders"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-stone-700 hover:bg-[#faf6f2] hover:text-[#542813] transition"
                    >
                      <ListOrdered className="w-4 h-4 text-stone-400" />
                      <span>Order History</span>
                    </Link>

                    <Link
                      to="/wishlist"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition"
                    >
                      <Heart className="w-4 h-4 text-rose-500" />
                      <span>Saved Dishes</span>
                    </Link>

                    <Link
                      to={isRegistered ? '/vendor-dashboard' : '/vendor-register'}
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-stone-700 hover:bg-[#faf6f2] hover:text-[#542813] transition"
                    >
                      <Store className="w-4 h-4 text-stone-400" />
                      <span>{isRegistered ? 'Vendor Dashboard' : 'Become a Vendor'}</span>
                    </Link>

                    <Link
                      to="/track"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-stone-700 hover:bg-[#faf6f2] hover:text-[#542813] transition"
                    >
                      <Clock className="w-4 h-4 text-stone-400" />
                      <span>Track Active Order</span>
                    </Link>

                    <div className="border-t border-stone-100 my-1"></div>

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
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] hover:from-[#3d1b0c] hover:via-[#5c2810] hover:to-[#2c1206] text-white font-bold text-xs shadow-md shadow-[#2b1206]/20 transition-all active:scale-95"
              >
                <User className="w-3.5 h-3.5 text-[#d9bda6]" />
                <span>Sign In</span>
              </button>
            )}

            {/* Mobile menu hamburger */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-stone-600 hover:text-stone-900 rounded-lg"
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
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-stone-100 border border-transparent focus:border-[#542813] focus:bg-white text-sm outline-none"
            />
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-2.5" />
          </form>
        </div>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-stone-100 space-y-2">
            <div className="flex items-center justify-between p-2 bg-stone-50 rounded-lg">
              <span className="text-xs text-stone-500 font-medium">Location:</span>
              <span className="text-xs font-bold text-stone-800">{currentLocation}</span>
            </div>
            <Link
              to="/orders"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-[#faf6f2] hover:text-[#542813] rounded-lg"
            >
              Order History
            </Link>
            <Link
              to="/wishlist"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-orange-50 rounded-lg"
            >
              <Heart className="w-4 h-4 text-rose-500" />
              Saved Dishes
            </Link>
            <Link
              to="/track"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-[#faf6f2] hover:text-[#542813] rounded-lg"
            >
              Track Order
            </Link>
            <Link
              to="/profile"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-[#faf6f2] hover:text-[#542813] rounded-lg"
            >
              My Profile
            </Link>
            <Link
              to={isRegistered ? '/vendor-dashboard' : '/vendor-register'}
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-[#542813] hover:bg-[#faf6f2] rounded-lg"
            >
              <Store className="w-4 h-4" />
              {isRegistered ? 'Vendor Dashboard' : 'Become a Vendor'}
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
