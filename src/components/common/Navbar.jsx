import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation as useRouterLocation } from 'react-router-dom';
import { 
  ShoppingBag, 
  User, 
  Clock,
  UtensilsCrossed, 
  LogOut, 
  ListOrdered,
  CalendarDays,
  Heart,
  Store,
  Bike,
  Map,
  Wallet,
  ExternalLink,
  LayoutDashboard,
  Navigation,
  History,
  Settings,
  ShieldCheck,
  LifeBuoy
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useVendor } from '../../context/VendorContext';
import { useDriver } from '../../context/DriverContext';
import { useAdmin } from '../../context/AdminContext';
import { useNotifications } from '../../context/NotificationContext';
import { notificationLink } from '../../utils/notificationLink';
import FadeImage from './FadeImage';
import NotificationPopups from './NotificationPopups';
import RoleSelectModal from '../auth/RoleSelectModal';
import ThemeToggle from './ThemeToggle';
import useSupportUnread from '../../hooks/useSupportUnread';
import { chatApi } from '../../api/endpoints';
import {
  Bell,
  CheckCheck,
  MessageCircle,
} from 'lucide-react';

export default function Navbar() {
  const { pathname } = useRouterLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const { totalItemCount, setIsCartOpen } = useCart();
  const { items: wishlistItems } = useWishlist();
  const {
    isAuthenticated: isVendorSignedIn,
    hasToken,
    exitMarketplace,
    enterMarketplace,
    logout: vendorLogout,
    vendor,
  } = useVendor();
  const vendorSignedIn = isVendorSignedIn || hasToken;
  const {
    isAuthenticated: isDriverSignedIn,
    hasToken: hasDriverToken,
    marketplaceMode: driverMarketplaceMode,
    exitMarketplace: exitDriverMarketplace,
    logout: driverLogout,
    driver,
  } = useDriver();
  const driverSignedIn = isDriverSignedIn || hasDriverToken;
  const {
    isAuthenticated: isAdminSignedIn,
    hasToken: hasAdminToken,
    logout: adminLogout,
    admin,
  } = useAdmin();
  const adminSignedIn = isAdminSignedIn || hasAdminToken;
  const { notifications, unreadCount, loaded: notificationsLoaded, markRead, markAllRead } = useNotifications();
  // Unread messages from kitchens (customer–kitchen chat).
  const chatUnread = useSupportUnread(chatApi, { enabled: isAuthenticated });

  // A vendor/driver only gets a way back to their dashboard after explicitly
  // choosing to visit the marketplace, and only while browsing marketplace/shop pages.
  const isMarketplacePath =
    pathname === '/vendors' ||
    pathname === '/vendors/map' ||
    /^\/vendor\/[^/]+$/.test(pathname);
  // This header only shows outside the Vendor Dashboard, so a signed-in vendor
  // seeing it is visiting the marketplace: always offer the way back (also after a refresh).
  const showBackToVendor = vendorSignedIn;
  const showBackToDriver = driverSignedIn && driverMarketplaceMode && isMarketplacePath;
  const showBackToAdmin = adminSignedIn && isMarketplacePath;

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isRoleSelectOpen, setIsRoleSelectOpen] = useState(false);

  // Clicking anywhere outside the notifications or account dropdown (or pressing Esc) closes it.
  const notificationsRef = useRef(null);
  const userMenuRef = useRef(null);
  useEffect(() => {
    if (!isNotificationsOpen && !isUserMenuOpen) return undefined;
    const onPointerDown = (event) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsNotificationsOpen(false);
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isNotificationsOpen, isUserMenuOpen]);

  // Expose the live header height so sticky sub-headers (vendor tabs, checkout
  // summary) can offset themselves regardless of breakpoint/banner wrapping.
  const headerRef = useRef(null);
  useEffect(() => {
    const node = headerRef.current;
    if (!node) return undefined;
    const apply = () =>
      document.documentElement.style.setProperty('--app-header-h', `${node.offsetHeight}px`);
    apply();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(apply);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // The account button is shared by every signed-in role. Vendors/drivers take
  // precedence over a lingering customer session so they always reach their own pages.
  const accountRole = vendorSignedIn
    ? 'vendor'
    : driverSignedIn
      ? 'driver'
      : adminSignedIn
        ? 'admin'
        : isAuthenticated
          ? 'customer'
          : null;
  const accountName =
    accountRole === 'vendor' ? vendor?.name || 'Your Kitchen'
      : accountRole === 'driver' ? driver?.name || 'Delivery worker'
        : accountRole === 'admin' ? admin?.name || 'Administrator'
          : accountRole === 'customer' ? user?.name || 'Account'
            : '';
  const accountAvatar =
    accountRole === 'vendor' ? vendor?.avatar
      : accountRole === 'driver' ? driver?.avatar
        : accountRole === 'customer' ? user?.avatar
          : '';
  const accountSubtitle =
    accountRole === 'vendor' ? vendor?.ownerName || vendor?.type || 'Vendor account'
      : accountRole === 'driver' ? driver?.phone || 'Delivery worker account'
        : accountRole === 'admin' ? admin?.email || 'Admin account'
          : accountRole === 'customer' ? user?.phone
            : '';
  const accountInitials = String(accountName || 'U')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const accountLinkClass =
    'flex items-center gap-2.5 px-4 py-2.5 text-sm text-stone-700 hover:bg-[#faf6f2] hover:text-[#542813] transition';

  const handleAccountLogout = () => {
    setIsUserMenuOpen(false);
    if (accountRole === 'vendor') vendorLogout?.();
    else if (accountRole === 'driver') driverLogout?.();
    else if (accountRole === 'admin') adminLogout?.();
    else logout();
  };

  return (
    <>
      {isAuthenticated && (
        <NotificationPopups
          notifications={notifications}
          loaded={notificationsLoaded}
          linkFor={(notification) => notificationLink(notification, 'customer')}
          onRead={(notification) => !notification.read && markRead(notification.id)}
        />
      )}
      <header ref={headerRef} className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200/80 shadow-sm">
      {/* Top Banner for Pre-order & Scheduled Meals reminder */}
      <div className="bg-gradient-to-r from-[#1c0a03] via-[#3a1a0c] to-[#1c0a03] border-b border-[#4e2410]/50 text-[#f5ebe1] text-xs py-1.5 px-4 text-center font-medium flex items-center justify-center gap-2 overflow-hidden">
        <span className="flex-shrink-0 bg-[#542813] text-[#ebd7c5] border border-[#7a3a19]/50 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
          New
        </span>
        <span className="min-w-0 truncate">Empowering Kigali's Home Cooks & Kitchens! Order immediate meals or pre-order tomorrow's home specials.</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-2 sm:gap-4">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 sm:gap-3 flex-shrink-0 group">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-[#2b1206] via-[#481f0d] to-[#1c0a03] flex items-center justify-center text-white shadow-md shadow-[#2b1206]/25 group-hover:scale-105 group-hover:shadow-lg transition-all duration-300">
              <UtensilsCrossed className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2] text-[#f5ebe1]" />
            </div>
            <div className="min-w-0 hidden min-[420px]:block">
              <div className="font-extrabold text-lg sm:text-xl tracking-tight text-gray-900 group-hover:text-[#542813] transition-colors flex items-center gap-1.5">
                Kitchen<span className="text-[#8a5332]">Link</span>
                <span className="hidden lg:inline-block text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-[#f5ebe1] text-[#3d1b0c] border border-[#ebd7c5]">Market</span>
              </div>
              <p className="hidden sm:block text-[11px] text-stone-500 font-medium">Any Cook · Any Food · Anywhere</p>
            </div>
          </Link>

          {/* Right Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 xl:gap-3 flex-shrink-0">

            {/* Driver portal. A driver sees a return button only on
                marketplace/shop pages after choosing to visit the marketplace.
                The vendor's return link now lives in the account menu. Guests
                may become vendors; signed-in customers see nothing. */}
            {showBackToDriver && (
              <Link
                to="/driver-dashboard"
                onClick={exitDriverMarketplace}
                className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#12301c] bg-[#f2f8ee] hover:bg-[#e6f2de] border border-[#d9e5d0] transition hover:-translate-y-0.5 hover:shadow-sm"
              >
                <Bike className="w-3.5 h-3.5 text-[#3b5327]" />
                <span>Back to Delivery Worker Dashboard</span>
              </Link>
            )}

            {/* Quick Link: Pre-Orders */}
            <Link
              to="/vendors?filter=preorder"
              className="theme-primary-pill hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#3d1b0c] bg-[#faf6f2] hover:bg-[#f5ebe1] border border-[#ebd7c5] transition hover:-translate-y-0.5 hover:shadow-sm"
            >
              <CalendarDays className="w-3.5 h-3.5 text-[#6d391d]" />
              <span>Tomorrow's Specials</span>
            </Link>

            {/* Quick Link: Nearby Map */}
            <Link
              to="/vendors/map"
              className="theme-primary-pill hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#3d1b0c] bg-[#faf6f2] hover:bg-[#f5ebe1] border border-[#ebd7c5] transition hover:-translate-y-0.5 hover:shadow-sm"
            >
              <Map className="w-3.5 h-3.5 text-[#6d391d]" />
              <span>Nearby Map</span>
            </Link>

            {/* Cart Trigger Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="theme-primary-pill relative flex items-center p-2.5 rounded-xl bg-[#faf6f2] hover:bg-[#f5ebe1] text-[#3d1b0c] border border-[#ebd7c5] transition group active:scale-95"
              aria-label={`View cart${totalItemCount ? `, ${totalItemCount} ${totalItemCount === 1 ? 'item' : 'items'}` : ''}`}
              title="Cart"
            >
              <ShoppingBag className="w-4 h-4 group-hover:scale-110 text-[#6d391d] transition-transform" />
              {totalItemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-gradient-to-r from-[#2b1206] to-[#542813] text-white text-[10px] flex items-center justify-center font-bold animate-soft-pulse">
                  {totalItemCount}
                </span>
              )}
            </button>

            <ThemeToggle />

            <Link
              to="/wishlist"
              aria-label={`Saved dishes${wishlistItems.length ? `, ${wishlistItems.length} ${wishlistItems.length === 1 ? 'item' : 'items'}` : ''}`}
              title="Saved dishes"
              className="relative hidden lg:flex p-2.5 rounded-xl border border-gray-200 bg-white text-rose-600 hover:bg-rose-50 transition"
            >
              <Heart className="w-4 h-4" />
              {wishlistItems.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-rose-600 text-white text-[9px] flex items-center justify-center font-bold">
                  {wishlistItems.length}
                </span>
              )}
            </Link>

            {/* Notifications bell */}
            {isAuthenticated && (
              <div className="relative" ref={notificationsRef}>
                <button
                  onClick={() => {
                    setIsNotificationsOpen(!isNotificationsOpen);
                    setIsUserMenuOpen(false);
                  }}
                  aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
                  title="Notifications"
                  className="relative p-2.5 rounded-xl border border-gray-200 bg-white text-stone-600 hover:bg-[#faf6f2] hover:text-[#542813] transition"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-gradient-to-r from-[#2b1206] to-[#542813] text-white text-[9px] flex items-center justify-center font-bold">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {isNotificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-stone-100 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-stone-100">
                      <span className="text-xs font-black uppercase tracking-wider text-stone-500">
                        Notifications
                      </span>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllRead}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-[#542813] hover:text-[#2b1206]"
                        >
                          <CheckCheck className="w-3 h-3" />
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="px-4 py-6 text-xs text-stone-500 text-center">
                          You have no notifications yet.
                        </p>
                      ) : (
                        notifications.map((notification) => (
                          <Link
                            key={notification.id}
                            to={notificationLink(notification, 'customer')}
                            onClick={() => {
                              if (!notification.read) markRead(notification.id);
                              setIsNotificationsOpen(false);
                            }}
                            className={`block px-4 py-3 border-b border-stone-50 hover:bg-[#faf6f2] transition ${
                              notification.read ? '' : 'bg-[#fffbf5]'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-xs font-bold text-gray-900">
                                {notification.title}
                              </span>
                              {!notification.read && (
                                <span className="w-2 h-2 rounded-full bg-[#542813] flex-shrink-0 mt-1" />
                              )}
                            </div>
                            <p className="text-[11px] text-stone-600 mt-0.5 leading-snug">
                              {notification.body}
                            </p>
                          </Link>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* User Account / Login (role aware: customer, vendor, driver) */}
            {accountRole ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => {
                    setIsUserMenuOpen(!isUserMenuOpen);
                    setIsNotificationsOpen(false);
                  }}
                  aria-label={`Account menu for ${accountName}`}
                  title={accountName}
                  className="flex items-center rounded-full hover:ring-2 hover:ring-[#8a5332]/40 transition active:scale-95"
                >
                  <FadeImage
                    src={accountAvatar}
                    alt={accountName}
                    priority
                    className="w-9 h-9 rounded-full object-cover ring-2 ring-[#8a5332]/30"
                    fallback={
                      <span className="w-9 h-9 rounded-full bg-[#542813] text-white ring-2 ring-[#8a5332]/30 flex items-center justify-center text-xs font-black">
                        {accountInitials}
                      </span>
                    }
                  />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-stone-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-4 py-2 border-b border-stone-100">
                      <p className="text-sm font-bold text-gray-900 truncate">{accountName}</p>
                      <p className="text-xs text-stone-500 truncate">{accountSubtitle}</p>
                    </div>

                    {accountRole === 'customer' && (
                      <>
                        <Link to="/profile" onClick={() => setIsUserMenuOpen(false)} className={accountLinkClass}>
                          <User className="w-4 h-4 text-stone-400" />
                          <span>My Profile &amp; Addresses</span>
                        </Link>
                        <Link to="/orders" onClick={() => setIsUserMenuOpen(false)} className={accountLinkClass}>
                          <ListOrdered className="w-4 h-4 text-stone-400" />
                          <span>Order History</span>
                        </Link>
                        <Link to="/messages" onClick={() => setIsUserMenuOpen(false)} className={accountLinkClass}>
                          <MessageCircle className="w-4 h-4 text-stone-400" />
                          <span>Messages</span>
                          {chatUnread > 0 && (
                            <span className="ml-auto min-w-5 h-5 px-1.5 rounded-full bg-[#542813] text-white text-[10px] font-black flex items-center justify-center">
                              {chatUnread}
                            </span>
                          )}
                        </Link>
                        <Link to="/wishlist" onClick={() => setIsUserMenuOpen(false)} className={accountLinkClass}>
                          <Heart className="w-4 h-4 text-rose-500" />
                          <span>Saved Dishes</span>
                        </Link>
                        <Link to="/track" onClick={() => setIsUserMenuOpen(false)} className={accountLinkClass}>
                          <Clock className="w-4 h-4 text-stone-400" />
                          <span>Track Active Order</span>
                        </Link>
                        <Link to="/support" onClick={() => setIsUserMenuOpen(false)} className={accountLinkClass}>
                          <LifeBuoy className="w-4 h-4 text-stone-400" />
                          <span>Help &amp; Support</span>
                        </Link>
                      </>
                    )}

                    {accountRole === 'vendor' && (
                      <>
                        {showBackToVendor && (
                          <Link
                            to="/vendor-dashboard"
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              exitMarketplace();
                            }}
                            className={accountLinkClass}
                          >
                            <Store className="w-4 h-4 text-stone-400" />
                            <span>Back to Vendor Dashboard</span>
                          </Link>
                        )}
                        <Link to="/vendor-dashboard/orders" onClick={() => setIsUserMenuOpen(false)} className={accountLinkClass}>
                          <ListOrdered className="w-4 h-4 text-stone-400" />
                          <span>Order History</span>
                        </Link>
                        <Link to="/vendor-dashboard/profile" onClick={() => setIsUserMenuOpen(false)} className={accountLinkClass}>
                          <User className="w-4 h-4 text-stone-400" />
                          <span>Profile</span>
                        </Link>
                        <Link to="/vendor-dashboard/wallet" onClick={() => setIsUserMenuOpen(false)} className={accountLinkClass}>
                          <Wallet className="w-4 h-4 text-stone-400" />
                          <span>Earnings</span>
                        </Link>
                        {vendor?.id && (
                          <Link
                            to={`/vendor/${vendor.id}`}
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              enterMarketplace();
                            }}
                            className={accountLinkClass}
                          >
                            <ExternalLink className="w-4 h-4 text-stone-400" />
                            <span>View public storefront</span>
                          </Link>
                        )}
                      </>
                    )}

                    {accountRole === 'driver' && (
                      <>
                        {showBackToDriver && (
                          <Link
                            to="/driver-dashboard"
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              exitDriverMarketplace();
                            }}
                            className={accountLinkClass}
                          >
                            <Bike className="w-4 h-4 text-stone-400" />
                            <span>Back to Delivery Worker Dashboard</span>
                          </Link>
                        )}
                        <Link to="/driver-dashboard" onClick={() => setIsUserMenuOpen(false)} className={accountLinkClass}>
                          <LayoutDashboard className="w-4 h-4 text-stone-400" />
                          <span>Dashboard</span>
                        </Link>
                        <Link to="/driver-dashboard/active" onClick={() => setIsUserMenuOpen(false)} className={accountLinkClass}>
                          <Navigation className="w-4 h-4 text-stone-400" />
                          <span>Active Delivery</span>
                        </Link>
                        <Link to="/driver-dashboard/history" onClick={() => setIsUserMenuOpen(false)} className={accountLinkClass}>
                          <History className="w-4 h-4 text-stone-400" />
                          <span>Delivery History</span>
                        </Link>
                        <Link to="/driver-dashboard/earnings" onClick={() => setIsUserMenuOpen(false)} className={accountLinkClass}>
                          <Wallet className="w-4 h-4 text-stone-400" />
                          <span>Earnings</span>
                        </Link>
                        <Link to="/driver-dashboard/profile" onClick={() => setIsUserMenuOpen(false)} className={accountLinkClass}>
                          <Settings className="w-4 h-4 text-stone-400" />
                          <span>Profile &amp; Settings</span>
                        </Link>
                      </>
                    )}

                    {accountRole === 'admin' && (
                      <>
                        {showBackToAdmin && (
                          <Link to="/admin-dashboard" onClick={() => setIsUserMenuOpen(false)} className={accountLinkClass}>
                            <LayoutDashboard className="w-4 h-4 text-stone-400" />
                            <span>Back to Admin Panel</span>
                          </Link>
                        )}
                        <Link to="/admin-dashboard" onClick={() => setIsUserMenuOpen(false)} className={accountLinkClass}>
                          <ShieldCheck className="w-4 h-4 text-stone-400" />
                          <span>Admin Dashboard</span>
                        </Link>
                        <Link to="/admin-dashboard/settings" onClick={() => setIsUserMenuOpen(false)} className={accountLinkClass}>
                          <Settings className="w-4 h-4 text-stone-400" />
                          <span>Panel Settings</span>
                        </Link>
                      </>
                    )}

                    <div className="border-t border-stone-100 my-1"></div>

                    <button
                      onClick={handleAccountLogout}
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
                onClick={() => setIsRoleSelectOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] hover:from-[#3d1b0c] hover:via-[#5c2810] hover:to-[#2c1206] text-white font-bold text-xs shadow-md shadow-[#2b1206]/20 transition-all active:scale-95"
              >
                <User className="w-3.5 h-3.5 text-[#d9bda6]" />
                <span>Sign In</span>
              </button>
            )}

          </div>

        </div>

        {/* Mobile quick links: the same shortcuts as the desktop bar, in their
            own row since they don't fit beside the logo on small screens. */}
        <div className="lg:hidden flex items-center gap-2 pb-3 overflow-x-auto">
          {showBackToDriver && (
            <Link
              to="/driver-dashboard"
              onClick={exitDriverMarketplace}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#12301c] bg-[#f2f8ee] hover:bg-[#e6f2de] border border-[#d9e5d0] transition"
            >
              <Bike className="w-3.5 h-3.5 text-[#3b5327]" />
              <span>Driver Dashboard</span>
            </Link>
          )}
          <Link
            to="/vendors?filter=preorder"
            className="theme-primary-pill flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#3d1b0c] bg-[#faf6f2] hover:bg-[#f5ebe1] border border-[#ebd7c5] transition"
          >
            <CalendarDays className="w-3.5 h-3.5 text-[#6d391d]" />
            <span>Tomorrow's Specials</span>
          </Link>
          <Link
            to="/vendors/map"
            className="theme-primary-pill flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#3d1b0c] bg-[#faf6f2] hover:bg-[#f5ebe1] border border-[#ebd7c5] transition"
          >
            <Map className="w-3.5 h-3.5 text-[#6d391d]" />
            <span>Nearby Map</span>
          </Link>
          <Link
            to="/wishlist"
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-gray-200 bg-white text-rose-600 hover:bg-rose-50 transition"
          >
            <Heart className="w-3.5 h-3.5" />
            <span>Saved</span>
            {wishlistItems.length > 0 && (
              <span className="min-w-4 h-4 px-1 rounded-full bg-rose-600 text-white text-[9px] flex items-center justify-center font-bold">
                {wishlistItems.length}
              </span>
            )}
          </Link>
        </div>

      </div>
    </header>
      <RoleSelectModal
        open={isRoleSelectOpen}
        onClose={() => setIsRoleSelectOpen(false)}
      />
    </>
  );
}
