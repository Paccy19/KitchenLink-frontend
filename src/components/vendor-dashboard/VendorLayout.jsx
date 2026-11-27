import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';
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
  FileSearch,
  MessageCircle,
  Settings,
  ChevronDown,
  Truck,
  MapPinned,
  ChefHat,
  ConciergeBell,
  QrCode,
  Receipt,
  Layers,
  Users,
  Boxes,
  BarChart3,
  History,
  SlidersHorizontal,
  Inbox,
  CalendarClock,
  Banknote,
  BadgePercent,
  HeartHandshake,
  Landmark,
  LayoutGrid,
  HandPlatter,
  PackageOpen,
  Bike,
  BellRing,
  Volume2,
  VolumeX,
} from 'lucide-react';
import useNewWorkChime from '../../hooks/useNewWorkChime';
import { useVendor } from '../../context/VendorContext';
import { vendorApi } from '../../api/vendorApi';
import useSupportUnread from '../../hooks/useSupportUnread';
import useVendorRealtime from '../../hooks/useVendorRealtime';
import RoleAccountMenu from '../common/RoleAccountMenu';
import ThemeToggle from '../common/ThemeToggle';
import VendorNotificationBell from './VendorNotificationBell';
import { VENDOR_SETTINGS_BASE, VENDOR_SETTINGS_SECTIONS } from '../../data/vendorSettings';

// `perm`: shown when the signed-in person holds any of these (the kitchen
// owner and kitchen administrators hold all). The server enforces the same.
const NAV = [
  { to: '/vendor-dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/vendor-dashboard/inbox', label: 'Team inbox', icon: Inbox, badgeKey: 'inbox' },
  { to: '/vendor-dashboard/orders', label: 'Orders', icon: ClipboardList, badgeKey: 'pendingOrders', perm: ['orders.view', 'orders.receive', 'orders.history', 'delivery.view_orders', 'delivery.history'], route: 'GET /vendor/orders' },
  { to: '/vendor-dashboard/kitchen', label: 'Preparation', icon: ChefHat, badgeKey: 'queue', perm: ['kitchen.view_queue'], route: 'GET /vendor/kitchen/queue' },
  { to: '/vendor-dashboard/floor', label: 'Floor', icon: LayoutGrid, badgeKey: 'floor', perm: ['tables.seat', 'tables.waitlist', 'tables.sessions_view', 'reservations.check_in'], route: 'GET /vendor/floor' },
  { to: '/vendor-dashboard/my-tables', label: 'My tables', icon: HandPlatter, badgeKey: 'myTables', perm: ['service.view_assigned', 'service.order_for_guests'] },
  { to: '/vendor-dashboard/service', label: 'Service & pickup', icon: ConciergeBell, badgeKey: 'ready', perm: ['service.view_ready', 'service.takeaway', 'service.dine_in', 'delivery.view_orders', 'service.view_assigned', 'service.customer_requests'], route: 'GET /vendor/service/board' },
  { to: '/vendor-dashboard/tables', label: 'Tables & QR', icon: QrCode, perm: ['tables.view'], route: 'GET /vendor/tables' },
  { to: '/vendor-dashboard/packing', label: 'Packing', icon: PackageOpen, badgeKey: 'packing', perm: ['packing.view'], route: 'GET /vendor/packing' },
  { to: '/vendor-dashboard/deliveries', label: 'Deliveries', icon: Bike, badgeKey: 'deliveries', perm: ['delivery.view_orders', 'delivery.assign_workers', 'delivery.create_assignments', 'delivery.change_assignments', 'delivery.track', 'delivery.drive'], route: 'GET /vendor/deliveries' },
  { to: '/vendor-dashboard/reservations', label: 'Reservations', icon: CalendarClock, badgeKey: 'bookings', perm: ['reservations.view', 'reservations.active_sessions', 'reservations.table_availability'], route: 'GET /vendor/reservations' },
  { to: '/vendor-dashboard/invoices', label: 'Invoices & payments', icon: Receipt, badgeKey: 'invoices', perm: ['invoices.view', 'invoices.outstanding'], route: 'GET /vendor/invoices' },
  { to: '/vendor-dashboard/cashier', label: 'Cashier till', icon: Banknote, perm: ['invoices.cashier_sessions', 'invoices.cashier_reports', 'invoices.process_payment', 'invoices.cash'], route: 'GET /vendor/cashier/sessions' },
  { to: '/vendor-dashboard/menu', label: 'Menu', icon: UtensilsCrossed, badgeKey: 'menuCount', perm: ['menu.view'], route: 'GET /vendor/menu' },
  { to: '/vendor-dashboard/promotions', label: 'Promotions', icon: BadgePercent, perm: ['promotions.view'], route: 'GET /vendor/promotions' },
  { to: '/vendor-dashboard/departments', label: 'Services & departments', icon: Layers, perm: ['departments.view'] },
  { to: '/vendor-dashboard/staff', label: 'Staff & roles', icon: Users, perm: ['staff.view', 'roles.view', 'staff.schedules', 'staff.attendance'], route: 'GET /vendor/staff' },
  { to: '/vendor-dashboard/customers', label: 'Customers', icon: HeartHandshake, perm: ['customers.view', 'customers.feedback', 'customers.reviews'], route: 'GET /vendor/customers' },
  { to: '/vendor-dashboard/inventory', label: 'Inventory', icon: Boxes, perm: ['inventory.view', 'inventory.view_alerts', 'inventory.purchase_orders', 'inventory.receive_deliveries'], route: 'GET /vendor/inventory' },
  { to: '/vendor-dashboard/finance', label: 'Finance', icon: Landmark, perm: ['finance.expenses_view', 'finance.profit_loss', 'finance.transactions'] },
  { to: '/vendor-dashboard/reports', label: 'Reports', icon: BarChart3, perm: ['reports.sales', 'reports.orders', 'reports.products', 'reports.departments', 'reports.employees', 'reports.inventory', 'reports.financial', 'reports.payments', 'reports.customers', 'finance.revenue', 'overview.department_performance', 'overview.financial_summary'], route: 'GET /vendor/reports' },
  { to: '/vendor-dashboard/activity', label: 'Activity & security', icon: History, perm: ['audit.kitchen_logs', 'audit.employee_logs', 'audit.financial_logs', 'audit.permission_changes', 'audit.login_history', 'audit.security_events', 'overview.activity_logs', 'staff.view_activity', 'roles.history'], route: 'GET /vendor/activity' },
  { to: '/vendor-dashboard/wallet', label: 'Wallet', icon: Wallet, perm: ['account.wallet'] },
  { to: '/vendor-dashboard/messages', label: 'Customer messages', icon: MessageCircle, badgeKey: 'chats', perm: ['customers.complaints'] },
  // Big-event delivery: negotiations with customers, and where the kitchen delivers.
  { to: '/vendor-dashboard/special-deliveries', label: 'Special deliveries', icon: Truck, perm: ['delivery.fees'] },
  { to: '/vendor-dashboard/delivery-coverage', label: 'Delivery Coverage', icon: MapPinned, perm: ['delivery.settings'] },
  { to: '/vendor-dashboard/notifications', label: 'Notifications', icon: Bell, badgeKey: 'notifications', perm: ['notifications.view', 'notifications.history'] },
  { to: '/vendor-dashboard/operations', label: 'Operations settings', icon: SlidersHorizontal, perm: ['reservations.deposits', 'settings.operational_rules', 'settings.payment_preferences', 'settings.notifications', 'notifications.order_alerts', 'notifications.employee_alerts', 'finance.settings', 'customers.loyalty'], route: 'PUT /vendor/operations' },
  // A group: opens to list the settings pages.
  { to: VENDOR_SETTINGS_BASE, label: 'Settings', icon: Settings, children: VENDOR_SETTINGS_SECTIONS, perm: ['settings.view_profile', 'settings.edit_profile', 'settings.images', 'settings.contact', 'settings.hours', 'settings.kitchen_settings'] },
  { to: '/vendor-dashboard/support', label: 'Help & Support', icon: LifeBuoy, badgeKey: 'support', perm: ['settings.kitchen_settings'] },
];

// Sidebar groups, in order (pages not listed go under Settings).
const SECTIONS = [
  ['Today', ['', 'inbox', 'orders', 'kitchen', 'floor', 'my-tables', 'service', 'packing', 'deliveries']],
  ['Guests', ['tables', 'reservations', 'customers', 'messages']],
  ['Money', ['invoices', 'cashier', 'finance', 'reports', 'wallet']],
  ['Menu & stock', ['menu', 'promotions', 'inventory']],
  ['Team', ['staff', 'departments', 'activity']],
];
const sectionOf = (to) => {
  const key = to.replace('/vendor-dashboard', '').replace(/^\//, '');
  const index = SECTIONS.findIndex(([, keys]) => keys.includes(key));
  return index === -1 ? SECTIONS.length : index;
};
const sectionName = (index) => SECTIONS[index]?.[0] || 'Settings';

// Pages that only repeat what a person's own work page already shows. A
// chef's orders are on Preparation, a packer's on Packing, a server's on
// My tables; viewing orders or departments alone doesn't add a page for them.
const VIEW_ONLY = {
  '/vendor-dashboard/orders': ['orders.view', 'orders.details'],
  '/vendor-dashboard/departments': ['departments.view'],
};
const ALWAYS = ['/vendor-dashboard', '/vendor-dashboard/inbox'];

/**
 * The dashboard pages this person gets, in sidebar order: only those their
 * permissions are for. Overview stays: for staff it is their day (clocking in, their tasks).
 */
export function useVendorPages() {
  const { workspace, can, allowed, routeAccess, isKitchenAdmin } = useVendor();
  const held = Object.keys(workspace?.permissions || {});
  const loads = (item) => (item.route && routeAccess ? allowed(item.route) : !item.perm || item.perm.some((permission) => can(permission)));
  const pages = NAV.filter(loads);
  if (!workspace || isKitchenAdmin || workspace.is_admin) return pages;
  const strong = pages.filter((item) => {
    const weak = VIEW_ONLY[item.to];
    if (!weak) return true;
    const group = item.to === '/vendor-dashboard/departments' ? 'departments.' : null;
    return group ? held.some((p) => p.startsWith(group) && !weak.includes(p)) : item.perm.some((p) => !weak.includes(p) && can(p));
  });
  // With nothing else to do, the view-only pages stay (someone who may only view orders).
  const work = strong.filter((item) => !ALWAYS.includes(item.to));
  return work.length ? strong : pages;
}

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
    workspace,
    can,
    allowed,
    routeAccess,
    isKitchenAdmin,
  } = useVendor();
  const { connected } = useVendorRealtime({ enabled: true });
  const canSupport = Boolean(workspace) && can('settings.kitchen_settings');
  const canChats = Boolean(workspace) && can('customers.complaints');
  const supportUnread = useSupportUnread(vendorApi.support, { enabled: Boolean(hasToken && isAuthenticated && canSupport) });
  // Unread customer messages.
  const chatUnread = useSupportUnread(vendorApi.chats, { enabled: Boolean(hasToken && isAuthenticated && canChats) });
  // A page shows when the person may load it: the server's own rule for its main request.
  const visibleNav = useVendorPages()
    .map((item, order) => ({ ...item, section: sectionOf(item.to), order }))
    .sort((a, b) => a.section - b.section || a.order - b.order);
  const staffName = workspace?.actor?.type === 'staff' ? workspace.actor.name : '';
  // New orders and tickets nobody has accepted: a repeating chime and a banner.
  const newWork = workspace?.counts?.new_work || 0;
  const chime = useNewWorkChime(newWork);
  const workPage = visibleNav.some((item) => item.to === '/vendor-dashboard/kitchen') ? '/vendor-dashboard/kitchen' : '/vendor-dashboard/orders';
  const [drawerOpen, setDrawerOpen] = useState(false);
  // The Settings group stays open while one of its pages is showing.
  const { pathname } = useLocation();
  const onSettings = pathname.startsWith(VENDOR_SETTINGS_BASE);
  const [settingsOpen, setSettingsOpen] = useState(onSettings);
  useEffect(() => {
    if (onSettings) setSettingsOpen(true);
  }, [onSettings]);
  const isPending = vendor?.verificationStatus === 'Pending';
  // Pending vendors see the review popup on arrival and whenever they try an action.
  const [reviewPopupOpen, setReviewPopupOpen] = useState(true);

  useEffect(() => {
    const open = () => setReviewPopupOpen(true);
    window.addEventListener('ofk:vendor-pending-review', open);
    return () => window.removeEventListener('ofk:vendor-pending-review', open);
  }, []);

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
    if (item.badgeKey === 'chats') return chatUnread;
    if (item.badgeKey === 'queue') return workspace?.counts?.queue || 0;
    if (item.badgeKey === 'ready') return workspace?.counts?.ready_orders || 0;
    if (item.badgeKey === 'invoices') return workspace?.counts?.open_invoices || 0;
    if (item.badgeKey === 'inbox') return workspace?.counts?.inbox || 0;
    if (item.badgeKey === 'floor') return workspace?.counts?.waiting_list || 0;
    if (item.badgeKey === 'myTables') return workspace?.counts?.my_tables || 0;
    if (item.badgeKey === 'packing') return workspace?.counts?.to_pack || 0;
    if (item.badgeKey === 'deliveries') return workspace?.counts?.my_deliveries || 0;
    if (item.badgeKey === 'bookings') return workspace?.counts?.bookings_to_confirm || 0;
    return 0;
  };

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all ${
      isActive
        ? 'bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] text-white shadow-md shadow-[#2b1206]/20'
        : 'text-stone-600 hover:bg-[#faf6f2] hover:text-[#542813]'
    }`;

  const SidebarContent = () => (
    // min-h-0 lets the menu list scroll inside the sidebar when it is taller
    // than the screen (e.g. with Settings open), instead of running off it.
    <div className="flex flex-col h-full flex-1 min-h-0">
      <div className="flex items-center gap-3 px-2 pb-5">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#2b1206] via-[#481f0d] to-[#1c0a03] flex items-center justify-center flex-shrink-0 shadow-md">
          <Store className="w-6 h-6 text-[#f5ebe1]" />
        </div>
        <div className="min-w-0">
          <p className="font-extrabold text-sm text-gray-900 truncate">{vendor.name}</p>
          <p className="text-[11px] text-[#8a5332] font-bold truncate">
            {staffName ? `${staffName}${isKitchenAdmin ? ' · Administrator' : ''}` : vendor.type}
          </p>
        </div>
      </div>

      {can('settings.availability') && (
      <div className="rounded-2xl bg-[#faf6f2] border border-[#ebd7c5] p-3 mb-4">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
          <BadgeCheck className="w-3.5 h-3.5" />
          {vendor.verificationStatus} Vendor
        </div>
        <StoreToggle
          vendor={vendor}
          status={storeStatus}
          error={storeError}
          onToggle={isPending ? () => setReviewPopupOpen(true) : toggleStoreOpen}
        />
      </div>
      )}

      <nav className="space-y-1 flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
        {visibleNav.map((item, index) => {
          const Icon = item.icon;
          const count = badgeValue(item);
          // A small heading where a new group starts (only when there is more than one group).
          const heading = visibleNav.length > 6 && (index === 0 || visibleNav[index - 1].section !== item.section) ? (
            <p key={`h-${item.section}`} className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">{sectionName(item.section)}</p>
          ) : null;
          if (item.children) {
            return [heading, (
              <div key={item.to}>
                <button
                  type="button"
                  onClick={() => setSettingsOpen((open) => !open)}
                  aria-expanded={settingsOpen}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                    onSettings ? 'text-[#542813] bg-[#faf6f2]' : 'text-stone-600 hover:bg-[#faf6f2] hover:text-[#542813]'
                  }`}
                >
                  <Icon className="w-[18px] h-[18px]" />
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${settingsOpen ? 'rotate-180' : ''}`} />
                </button>
                {settingsOpen && (
                  <div className="mt-1 ml-6 pl-3 border-l border-stone-200 space-y-1">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.id}
                        to={`${item.to}/${child.id}`}
                        onClick={() => setDrawerOpen(false)}
                        className={({ isActive }) =>
                          `block px-3 py-2 rounded-xl text-[13px] font-bold transition-all ${
                            isActive
                              ? 'bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] text-white shadow-md shadow-[#2b1206]/20'
                              : 'text-stone-500 hover:bg-[#faf6f2] hover:text-[#542813]'
                          }`
                        }
                      >
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )];
          }
          return [heading, (
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
          )];
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
            <div className="absolute left-0 top-0 h-full w-72 max-w-[85%] bg-white p-5 shadow-2xl animate-fade-in flex flex-col">
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
                  <h1 className="font-black text-base sm:text-lg text-gray-900 truncate">{staffName ? vendor.name : 'Vendor Dashboard'}</h1>
                  <p className="text-[11px] text-stone-400 font-medium hidden sm:block">
                    {staffName ? `Signed in as ${staffName}` : 'Manage your kitchen, orders and earnings'}
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
                <ThemeToggle />
                {can('notifications.view') && <VendorNotificationBell />}
                <RoleAccountMenu role="vendor" />
              </div>
            </div>
          </header>

          <main className="p-4 sm:p-6 pb-16">
            {isPending && (
              <div className="mb-5 flex items-start gap-3 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                <BadgeCheck className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p>
                  <span className="font-bold">Verification pending.</span> Your documents are under review by our team.
                  You can already add your menu — customers will see your kitchen and dishes once you're approved.
                  Orders, wallet and opening your store unlock after approval.
                </p>
              </div>
            )}
            {newWork > 0 && (
              <div className={`mb-5 flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3 text-sm ${chime.ringing ? 'bg-[#2b1206] text-white shadow-lg animate-pulse' : 'bg-white border border-stone-200 text-stone-700'}`} role="status">
                <BellRing className="w-5 h-5 flex-shrink-0" />
                <span className="font-bold flex-1 min-w-[10rem]">
                  {newWork} new {newWork === 1 ? 'order' : 'orders'} waiting to be accepted
                </span>
                <NavLink to={workPage} onClick={chime.acknowledge} className={`px-3 py-1.5 rounded-full text-xs font-bold ${chime.ringing ? 'bg-white text-[#2b1206]' : 'bg-[#2b1206] text-white'}`}>Open</NavLink>
                {chime.ringing && <button type="button" onClick={chime.acknowledge} className="px-3 py-1.5 rounded-full text-xs font-bold border border-white/60">Got it</button>}
                <button type="button" onClick={chime.toggleSound} aria-label={chime.soundOn ? 'Turn the sound off' : 'Turn the sound on'} className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold ${chime.ringing ? 'border border-white/60' : 'border border-stone-200'}`}>
                  {chime.soundOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                  {chime.soundOn ? 'Sound on' : 'Turn on sound'}
                </button>
              </div>
            )}
            <Outlet />
          </main>
        </div>
      </div>
      {isPending && reviewPopupOpen && (
        <PendingReviewPopup onClose={() => setReviewPopupOpen(false)} />
      )}
    </div>
  );
}

/** Modal telling a pending vendor their documents are still being reviewed. */
function PendingReviewPopup({ onClose }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-labelledby="pending-review-title">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-3xl border border-amber-200 shadow-2xl p-6 text-center animate-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 mx-auto flex items-center justify-center">
          <FileSearch className="w-7 h-7 text-amber-600" />
        </div>
        <h2 id="pending-review-title" className="mt-4 text-lg font-black text-gray-900 tracking-tight">
          Documents under review
        </h2>
        <p className="mt-2 text-sm text-stone-600">
          Your verification documents are still being reviewed by our team. You can set up your menu now,
          but it stays hidden from customers — and orders, wallet and opening your store stay locked — until
          your account is approved.
        </p>
        <p className="mt-2 text-xs text-stone-500">
          We'll notify you as soon as a decision is made. Questions? Use Help &amp; Support.
        </p>
        <button
          type="button"
          onClick={onClose}
          autoFocus
          className="mt-5 w-full inline-flex items-center justify-center px-5 py-3 rounded-xl bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] hover:from-[#3d1b0c] text-white font-bold text-sm shadow-md transition active:scale-95"
        >
          OK, I understand
        </button>
      </div>
    </div>
  );
}

/**
 * Open/close switch. An open store shows on the map and to nearby customers
 * at its registered kitchen coordinates (set in profile settings).
 */
function StoreToggle({ vendor, status, error, onToggle }) {
  const busy = status !== 'idle';
  const live = vendor.isLive;
  const hasCoords = vendor.liveLocation?.lat != null && vendor.liveLocation?.lng != null;
  const needsLocation = !live && !hasCoords;

  let label = 'Store Closed';
  let hint = 'Open your store to appear on the map and to nearby customers.';
  let tone = 'bg-stone-200 text-stone-600';
  let dot = 'bg-stone-400';
  if (status === 'saving') {
    label = 'Saving…';
    hint = '';
  } else if (live) {
    label = 'Store Open';
    hint = 'Visible on the map at your kitchen location.';
    tone = 'bg-emerald-100 text-emerald-800';
    dot = 'bg-emerald-500';
  } else if (needsLocation) {
    hint = "Add your kitchen's coordinates in Profile before opening.";
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
