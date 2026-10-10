import React, { useState } from 'react';
import { NavLink, Outlet, Link, Navigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Navigation,
  History,
  Wallet,
  Settings,
  Menu as MenuIcon,
  X,
  Bike,
  Store,
  Radio,
  MapPin,
  Power,
} from 'lucide-react';
import { useDriver } from '../../context/DriverContext';
import useDriverRealtime from '../../hooks/useDriverRealtime';

const NAV = [
  { to: '/driver-dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/driver-dashboard/active', label: 'Active Delivery', icon: Navigation, badgeKey: 'activeDeliveries' },
  { to: '/driver-dashboard/history', label: 'Delivery History', icon: History },
  { to: '/driver-dashboard/earnings', label: 'Earnings', icon: Wallet },
  { to: '/driver-dashboard/profile', label: 'Profile & Settings', icon: Settings },
];

const VEHICLE_LABEL = {
  motorcycle: 'Motorcycle',
  scooter: 'Scooter',
  bicycle: 'Bicycle',
  car: 'Car',
  foot: 'On foot',
  bike: 'Bike',
  truck: 'Truck',
};

export default function DriverLayout() {
  const {
    driver,
    stats,
    shareLocation,
    sharingLocation,
    hasToken,
    isAuthenticated,
  } = useDriver();
  const { connected } = useDriverRealtime({ enabled: true });
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (!hasToken) {
    return <Navigate to="/driver-login" replace />;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf7f4]">
        <div className="flex flex-col items-center gap-3 text-stone-500">
          <div className="w-10 h-10 rounded-full border-2 border-[#d9e5d0] border-t-[#3b5327] animate-spin" />
          <p className="text-sm font-bold">Loading your driver app…</p>
        </div>
      </div>
    );
  }

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
      isActive
        ? 'bg-gradient-to-r from-[#1c2b12] via-[#3b5327] to-[#12200b] text-white shadow-md shadow-[#1c2b12]/20'
        : 'text-stone-600 hover:bg-[#f5f8f2] hover:text-[#3b5327]'
    }`;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-2 pb-5">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#1c2b12] via-[#3b5327] to-[#12200b] flex items-center justify-center flex-shrink-0 shadow-md">
          <Bike className="w-6 h-6 text-[#eef5e5]" />
        </div>
        <div className="min-w-0">
          <p className="font-extrabold text-sm text-gray-900 truncate">{driver.name}</p>
          <p className="text-[11px] text-[#4a6a34] font-bold">
            {VEHICLE_LABEL[driver.vehicleType] || 'Driver'}
            {driver.plateNumber ? ` · ${driver.plateNumber}` : ''}
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-[#f5f8f2] border border-[#d9e5d0] p-3 mb-4">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
          <Radio className={`w-3.5 h-3.5 ${stats.isOnline ? 'animate-pulse' : ''}`} />
          {stats.isOnline ? 'Online — receiving offers' : 'Offline — go online to receive offers'}
        </div>
        <button
          type="button"
          onClick={shareLocation}
          disabled={sharingLocation}
          className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white border border-[#d9e5d0] text-[#3b5327] hover:bg-[#eef5e5] transition disabled:opacity-60"
        >
          <MapPin className="w-3.5 h-3.5" />
          {sharingLocation ? 'Sharing location…' : 'Update location'}
        </button>
      </div>

      <nav className="space-y-1.5 flex-1">
        {NAV.map((item) => {
          const Icon = item.icon;
          const count = item.badgeKey === 'activeDeliveries' ? stats.activeDeliveries : 0;
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
                <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-emerald-500 text-white text-[11px] font-black flex items-center justify-center">
                  {count}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="pt-4 mt-4 border-t border-stone-100 space-y-1.5">
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-bold text-stone-600">
          <Power className="w-4 h-4 text-[#4a6a34]" />
          <span>
            On {stats.completedTotal} trips ·{' '}
            {stats.earningsTotal.toLocaleString()} RWF earned
          </span>
        </div>
        <Link
          to="/"
          className="flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-bold text-stone-600 hover:bg-[#f5f8f2] hover:text-[#3b5327] transition"
        >
          <Store className="w-4 h-4" />
          Back to marketplace
        </Link>
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
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setDrawerOpen(false)}
            />
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
                  <h1 className="font-black text-base sm:text-lg text-gray-900 truncate">Driver App</h1>
                  <p className="text-[11px] text-stone-400 font-medium hidden sm:block">
                    Accept, pick up and deliver orders
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
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#3b5327] to-[#1c2b12] text-white flex items-center justify-center font-black text-sm ring-2 ring-[#d9e5d0]">
                  {driver.name.slice(0, 1).toUpperCase()}
                </div>
              </div>
            </div>
          </header>

          <main className="p-4 sm:p-6 pb-16">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}