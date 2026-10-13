import React, { useState } from 'react';
import { NavLink, Outlet, Navigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  UtensilsCrossed,
  Wallet,
  Menu as MenuIcon,
  X,
  Store,
  BadgeCheck,
  Radio,
  LogOut,
  Loader2,
  MapPin,
  Bell,
  LifeBuoy,
} from 'lucide-react';
import { useVendor } from '../../context/VendorContext';
import { vendorApi } from '../../api/vendorApi';
import useSupportUnread from '../../hooks/useSupportUnread';
import useVendorRealtime from '../../hooks/useVendorRealtime';
import RoleAccountMenu from '../common/RoleAccountMenu';
import VendorNotificationBell from './VendorNotificationBell';

const NAV = [
  { to: '/vendor-dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/vendor-dashboard/orders', label: 'Orders', icon: ClipboardList, badgeKey: 'pendingOrders' },
  { to: '/vendor-dashboard/menu', label: 'Menu', icon: UtensilsCrossed, badgeKey: 'menuCount' },
  { to: '/vendor-dashboard/wallet', label: 'Wallet', icon: Wallet },
  { to: '/vendor-dashboard/notifications', label: 'Notifications', icon: Bell, badgeKey: 'notifications' },
  { to: '/vendor-dashboard/support', label: 'Help & Support', icon: LifeBuoy, badgeKey: 'support' },
];

export default function VendorLayout() {
  const {
    vendor,
    stats,
    menuItems,
    unreadNotifications,
    toggleStoreOpen,
    storeStatus,
    storeError,
    hasToken,
    isAuthenticated,
    logout,
  } = useVendor();
  const { connected } = useVendorRealtime({ enabled: true });
  const supportUnread = useSupportUnread(vendorApi.support, { enabled: Boolean(hasToken && isAuthenticated) });
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (!hasToken) {
    return <Navigate to="/vendor-login" replace />;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf7f4]">
        <div className="flex flex-col items-center gap-3 text-stone-500">
          <div className="w-10 h-10 rounded-full border-2 border-[#ebd7c5] border-t-[#542813] animate-spin" />
          <p className="text-sm font-bold">Loading your kitchen…</p>
        </div>
      </div>
    );
  }

  const badgeValue = (item) => {
    if (item.badgeKey === 'pendingOrders') return stats.pendingOrders;
    if (item.badgeKey === 'menuCount') return menuItems.length;
    if (item.badgeKey === 'notifications') return unreadNotifications;
    if (item.badgeKey === 'support') return supportUnread;
    return 0;
  };

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
      isActive
        ? 'bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] text-white shadow-md shadow-[#2b1206]/20'
        : 'text-stone-600 hover:bg-[#faf6f2] hover:text-[#542813]'
    }`;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-2 pb-5">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#2b1206] via-[#481f0d] to-[#1c0a03] flex items-center justify-center flex-shrink-0 shadow-md">
          <Store className="w-6 h-6 text-[#f5ebe1]" />
        </div>
        <div className="min-w-0">
          <p className="font-extrabold text-sm text-gray-900 truncate">{vendor.name}</p>
          <p className="text-[11px] text-[#8a5332] font-bold">{vendor.type}</p>
        </div>
      </div>

      <div className="rounded-2xl bg-[#faf6f2] border border-[#ebd7c5] p-3 mb-4">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
          <BadgeCheck className="w-3.5 h-3.5" />
          {vendor.verificationStatus} Vendor
        </div>
        <StoreToggle
          vendor={vendor}
          status={storeStatus}
          error={storeError}
          onToggle={toggleStoreOpen}
        />
      </div>

      <nav className="space-y-1.5 flex-1">
        {NAV.map((item) => {
          const Icon = item.icon;
          const count = badgeValue(item);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={navLinkClass}
              onClick={() => setDrawerOpen(false)}
            >
              <Icon className="w-[18px] h-[18px]" />
              <span className="flex-1">{item.label}</span>
              {count > 0 && (
                <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-amber-400 text-[#3d1b0c] text-[11px] font-black flex items-center justify-center">
                  {count}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="pt-4 mt-4 border-t border-stone-100 space-y-1.5">
        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-bold text-red-600 hover:bg-red-50 transition"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#faf7f4]">
      <div className="mx-auto max-w-[1400px] flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col w-72 flex-shrink-0 border-r border-stone-200/80 bg-white min-h-screen sticky top-0 h-screen p-5">
          <SidebarContent />
        </aside>

        {/* Mobile drawer */}
        {drawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
            <div className="absolute left-0 top-0 h-full w-72 max-w-[85%] bg-white p-5 shadow-2xl animate-fade-in">
              <div className="flex justify-end mb-2">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close menu"
                  className="w-9 h-9 rounded-full text-stone-500 hover:bg-stone-100 flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <SidebarContent />
            </div>
          </div>
        )}

        {/* Main column */}
        <div className="flex-1 min-w-0">
          <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200/80">
            <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  aria-label="Open menu"
                  className="lg:hidden w-10 h-10 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center transition"
                >
                  <MenuIcon className="w-5 h-5" />
                </button>
                <div className="min-w-0">
                  <h1 className="font-black text-base sm:text-lg text-gray-900 truncate">Vendor Dashboard</h1>
                  <p className="text-[11px] text-stone-400 font-medium hidden sm:block">
                    Manage your kitchen, orders and earnings
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <span
                  className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border ${
                    connected
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-stone-100 text-stone-500 border-stone-200'
                  }`}
                >
                  <Radio className={`w-3.5 h-3.5 ${connected ? 'animate-pulse' : ''}`} />
                  {connected ? 'Live' : 'Connecting…'}
                </span>
                <VendorNotificationBell />
                <RoleAccountMenu role="vendor" />
              </div>
            </div>
          </header>

          <main className="p-4 sm:p-6 pb-16">
            {vendor.verificationStatus === 'Pending' && (
              <div className="mb-5 flex items-start gap-3 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                <BadgeCheck className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p>
                  <span className="font-bold">Verification pending.</span> Your documents are under review by our team.
                  You can set up your menu and manage orders in the meantime.
                </p>
              </div>
            )}
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

const timeAgo = (iso) => {
  if (!iso) return '';
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  return `${Math.round(minutes / 60)} h ago`;
};

/**
 * Open/close switch. Opening asks the browser for the vendor's GPS position:
 * customers only see the kitchen as nearby while it is open with a fresh
 * location.
 */
function StoreToggle({ vendor, status, error, onToggle }) {
  const busy = status !== 'idle';
  const live = vendor.isLive;
  const needsLocation = vendor.isOpen && !live;

  let label = 'Store Closed';
  let hint = 'Open to share your location and appear to nearby customers.';
  let tone = 'bg-stone-200 text-stone-600';
  let dot = 'bg-stone-400';
  if (status === 'locating') {
    label = 'Getting your location…';
    hint = 'Allow location access when your browser asks.';
  } else if (status === 'saving') {
    label = 'Saving…';
    hint = '';
  } else if (live) {
    label = 'Store Open';
    hint = `Visible to nearby customers · location ${timeAgo(vendor.liveLocation?.updatedAt)}`;
    tone = 'bg-emerald-100 text-emerald-800';
    dot = 'bg-emerald-500';
  } else if (needsLocation) {
    label = 'Share location to go live';
    hint = 'Your store is hidden until you share your current location.';
    tone = 'bg-amber-100 text-amber-800';
    dot = 'bg-amber-500';
  }

  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        disabled={busy}
        aria-pressed={live}
        className={`mt-2 w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-bold transition disabled:opacity-75 ${tone}`}
      >
        <span className="flex items-center gap-1.5 text-left">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : needsLocation && <MapPin className="w-3.5 h-3.5" />}
          {label}
        </span>
        {!busy && <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />}
      </button>
      {hint && <p className="mt-1.5 text-[10px] leading-snug text-stone-500 font-medium">{hint}</p>}
      {error && (
        <p role="alert" className="mt-1.5 text-[10px] leading-snug text-red-700 font-semibold">
          {error}
        </p>
      )}
    </>
  );
}
