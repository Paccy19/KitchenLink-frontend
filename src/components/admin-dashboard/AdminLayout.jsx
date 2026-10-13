import React, { useState } from 'react';
import { NavLink, Outlet, Navigate, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  Bike,
  Store,
  Users,
  CreditCard,
  Wallet,
  Tags,
  MessageSquareWarning,
  BarChart3,
  ScrollText,
  Settings,
  ShieldCheck,
  Landmark,
  AlertTriangle,
  Menu as MenuIcon,
  X,
  ExternalLink,
  LogOut,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import RoleAccountMenu from '../common/RoleAccountMenu';
import AdminNotificationBell from './AdminNotificationBell';

const NAV = [
  { to: '/admin-dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin-dashboard/orders', label: 'Orders', icon: ClipboardList },
  { to: '/admin-dashboard/deliveries', label: 'Deliveries', icon: Bike },
  { to: '/admin-dashboard/vendors', label: 'Vendors', icon: Store },
  { to: '/admin-dashboard/drivers', label: 'Delivery Workers', icon: Bike },
  { to: '/admin-dashboard/users', label: 'Users', icon: Users },
  { to: '/admin-dashboard/payments', label: 'Payments', icon: CreditCard },
  { to: '/admin-dashboard/payouts', label: 'Payouts', icon: Wallet },
  { to: '/admin-dashboard/platform', label: 'Platform Wallet', icon: Landmark, ownerOnly: true },
  { to: '/admin-dashboard/categories', label: 'Categories', icon: Tags },
  { to: '/admin-dashboard/complaints', label: 'Complaints', icon: MessageSquareWarning },
  { to: '/admin-dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/admin-dashboard/audit', label: 'Audit Log', icon: ScrollText },
  { to: '/admin-dashboard/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout() {
  const { admin, hasToken, isAuthenticated, logout } = useAdmin();
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (!hasToken) {
    return <Navigate to="/admin-login" replace />;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f6f8]">
        <div className="flex flex-col items-center gap-3 text-stone-500">
          <div className="w-10 h-10 rounded-full border-2 border-stone-200 border-t-[#1f2937] animate-spin" />
          <p className="text-sm font-bold">Loading admin panel…</p>
        </div>
      </div>
    );
  }

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
      isActive
        ? 'bg-gradient-to-r from-[#111827] via-[#1f2937] to-[#0b1220] text-white shadow-md'
        : 'text-stone-600 hover:bg-stone-100 hover:text-[#1f2937]'
    }`;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-2 pb-5">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#111827] via-[#1f2937] to-[#0b1220] flex items-center justify-center flex-shrink-0 shadow-md">
          <ShieldCheck className="w-6 h-6 text-white" />
        </div>
        <div className="min-w-0">
          <p className="font-extrabold text-sm text-gray-900 truncate">FoodKitchen</p>
          <p className="text-[11px] text-[#374151] font-bold">Admin Panel</p>
        </div>
      </div>

      <div className="rounded-2xl bg-stone-100 border border-stone-200 p-3 mb-4">
        <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Signed in as</p>
        <p className="text-sm font-black text-gray-900 truncate mt-0.5">{admin?.name || 'Admin'}</p>
        <p className="text-[11px] text-stone-500 truncate">{admin?.email}</p>
        {admin?.role && (
          <span className="mt-1.5 inline-flex items-center px-2 py-0.5 rounded-full bg-[#1f2937] text-white text-[10px] font-black uppercase tracking-wider">
            {String(admin.role).replace(/_/g, ' ')}
          </span>
        )}
      </div>

      <nav className="space-y-1 flex-1 overflow-y-auto">
        {NAV.filter((item) => !item.ownerOnly || admin?.role === 'super_admin').map((item) => {
          const Icon = item.icon;
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
            </NavLink>
          );
        })}
      </nav>

      <div className="pt-4 mt-4 border-t border-stone-100 space-y-1">
        <Link
          to="/vendors"
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold text-stone-600 hover:bg-stone-100 transition"
        >
          <ExternalLink className="w-4 h-4" />
          Visit marketplace
        </Link>
        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 transition"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f5f6f8]">
      <div className="mx-auto max-w-[1500px] flex">
        <aside className="hidden lg:flex flex-col w-72 flex-shrink-0 border-r border-stone-200/80 bg-white min-h-screen sticky top-0 h-screen p-5">
          <SidebarContent />
        </aside>

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
                  <h1 className="font-black text-base sm:text-lg text-gray-900 truncate">Admin Panel</h1>
                  <p className="text-[11px] text-stone-400 font-medium hidden sm:block">
                    Marketplace operations &amp; control
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <AdminNotificationBell />
                <RoleAccountMenu role="admin" />
              </div>
            </div>
          </header>

          <main className="p-4 sm:p-6 pb-16">
            {admin?.uses_default_password && (
              <Link
                to="/admin-dashboard/settings"
                className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-xs font-bold text-red-800 hover:bg-red-100"
              >
                <AlertTriangle className="w-4 h-4" />
                You are using the default admin password. Change it now in Settings.
              </Link>
            )}
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
