import React, { useCallback, useRef, useState } from 'react';
import { shrinkAvatar } from '../../utils/shrinkImage';
import { Link } from 'react-router-dom';
import { vendorRequest } from '../../api/vendorApi';
import { ShoppingBag, Clock, TrendingUp, RefreshCw, ArrowUpRight, AlertTriangle, MapPin, Camera } from 'lucide-react';
import { useVendor } from '../../context/VendorContext';
import usePullToRefresh from '../../hooks/usePullToRefresh';
import StatCard from '../../components/vendor-dashboard/StatCard';
import OrderStatusBadge from '../../components/vendor-dashboard/OrderStatusBadge';

import FadeImage from '../../components/common/FadeImage';

const money = (value) => `${value.toLocaleString()} RWF`;

/**
 * The kitchen account and anyone allowed to see sales get the full overview;
 * other employees get their own: their queue, the counter and open bills.
 */
export default function VendorOverviewPage() {
  const { workspace, can } = useVendor();
  if (!workspace) return null;
  if (!can('overview.dashboard')) return <StaffOverview />;
  return <OwnerOverview />;
}

function OwnerOverview() {
  const {
    vendor,
    stats,
    orders,
    menuItems,
    lastSyncedAt,
    markSynced,
    updateVendorProfile,
    setStoreOpen,
    storeStatus,
  } = useVendor();
  const [refreshing, setRefreshing] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(vendor.avatar);
  const avatarInputRef = useRef(null);

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !/^image\/(jpeg|png|webp|gif)$/i.test(file.type)) return;
    // Shrunk first: phone photos are far bigger than the 1 MB upload limit.
    shrinkAvatar(file)
      .then((dataUri) => {
        setAvatarUrl(dataUri);
        return updateVendorProfile({ avatar: dataUri });
      })
      .catch(() => setAvatarUrl(vendor.avatar));
  };

  const sync = useCallback(async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 700));
    markSynced();
    setRefreshing(false);
  }, [markSynced]);

  const pull = usePullToRefresh(sync, { enabled: true });

  const recentOrders = orders.slice(0, 4);
  const unavailableCount = menuItems.filter((item) => !item.isAvailable).length;
  const syncedLabel = new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div {...pull.handlers} className="space-y-6">
      {pull.pullDistance > 0 && (
        <div
          className="flex items-center justify-center text-xs font-bold text-[#542813] transition-all"
          style={{ height: pull.pullDistance }}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${pull.ready ? 'rotate-180' : ''}`} />
          {pull.ready ? 'Release to refresh' : 'Pull to refresh'}
        </div>
      )}

      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2b1206] via-[#481f0d] to-[#1c0a03] text-white p-6 sm:p-8 shadow-lg">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <FadeImage
                src={avatarUrl}
                alt={vendor.name}
                priority
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-2 ring-white/30 shadow-lg bg-white/10"
                fallback={
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 ring-2 ring-white/30 flex items-center justify-center text-2xl font-black text-white/90">
                    {(vendor.name || 'K').slice(0, 1).toUpperCase()}
                  </div>
                }
              />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                title="Upload kitchen logo / profile picture"
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white text-[#542813] flex items-center justify-center shadow-md hover:bg-[#faf6f2] transition active:scale-90"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#d9bda6]">Welcome back</p>
              <h2 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight">{vendor.name}</h2>
              <p className="mt-1 text-xs sm:text-sm text-[#ebd7c5]/80 font-medium">
                {vendor.type} · {vendor.location} · Last synced {syncedLabel}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={sync}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 font-bold text-xs transition active:scale-95 disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {!vendor.isLive && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 font-medium">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span className="flex-1">
            Your store is closed and hidden from the map. Open it so nearby customers can find your
            kitchen and order.
          </span>
          <button
            type="button"
            onClick={() => setStoreOpen(true)}
            disabled={storeStatus !== 'idle'}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition active:scale-95 disabled:opacity-60"
          >
            <MapPin className="w-3.5 h-3.5" />
            {storeStatus === 'saving' ? 'Opening…' : 'Open store'}
          </button>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <StatCard icon={ShoppingBag} label="Today's orders" value={stats.todayOrdersCount} tone="cream" />
        <StatCard icon={Clock} label="Waiting" value={stats.pendingOrders} tone="amber" />
        <StatCard icon={TrendingUp} label="Today's sales" value={money(stats.todaySales)} tone="brown" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent orders */}
        <div className="xl:col-span-3 bg-white rounded-3xl border border-stone-200/80 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-base text-gray-900">Recent orders</h3>
            <Link
              to="/vendor-dashboard/orders"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#542813] hover:text-[#2b1206]"
            >
              View all <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <p className="text-sm text-stone-500 py-6 text-center">No orders yet.</p>
          ) : (
            <div className="divide-y divide-stone-100">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{order.customer.name}</p>
                    <p className="text-[11px] text-stone-400 font-medium truncate">
                      {order.id} · {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <OrderStatusBadge status={order.status} />
                    <span className="text-sm font-black text-[#4e2410] min-w-[85px] text-right">
                      {order.total.toLocaleString()} RWF
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

const STAFF_TILES = [
  { perm: 'kitchen.view_queue', to: '/vendor-dashboard/kitchen', label: 'Tickets to prepare', count: 'queue' },
  { perm: 'service.view_ready', to: '/vendor-dashboard/service', label: 'Orders with items ready', count: 'ready_orders' },
  { perm: 'invoices.view', to: '/vendor-dashboard/invoices', label: 'Open bills', count: 'open_invoices' },
  { perm: 'tables.view', to: '/vendor-dashboard/tables', label: 'Tables', count: 'tables' },
  { perm: 'staff.view', to: '/vendor-dashboard/staff', label: 'Employees', count: 'staff' },
];

function StaffOverview() {
  const { workspace, can, vendor } = useVendor();
  const tiles = STAFF_TILES.filter((tile) => can(tile.perm));
  const departments = (workspace.departments || []).filter((d) => (workspace.department_ids || []).includes(d.id));
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Hello, {workspace.actor?.name?.split(' ')[0] || 'there'}</h2>
        <p className="text-xs text-stone-500 font-medium">
          {vendor.name}
          {departments.length ? ` · ${departments.map((d) => d.name).join(', ')}` : ''}
        </p>
      </div>
      {tiles.length === 0 ? (
        <p className="text-sm text-stone-500">Your role has no tasks yet. Ask your kitchen administrator to give you one.</p>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {tiles.map((tile) => (
            <Link key={tile.to} to={tile.to} className="rounded-2xl bg-white border border-stone-200/80 shadow-sm p-4 hover:border-[#c08a63] transition">
              <p className="text-3xl font-black text-gray-900">{workspace.counts?.[tile.count] ?? 0}</p>
              <p className="text-xs font-bold text-stone-500 mt-1">{tile.label}</p>
            </Link>
          ))}
        </div>
      )}
      <ClockCard />
      <ChangeMyPassword />
    </div>
  );
}

/** Clocking in and out, and the next shift (attendance). */
function ClockCard() {
  const { workspace, refreshWorkspace } = useVendor();
  const [state, setState] = useState({ busy: false, error: '' });
  const clock = workspace?.clock;
  if (!clock || workspace?.actor?.type !== 'staff') return null;
  const hm = (d) => new Date(d).toLocaleString('en-GB', { timeZone: 'Africa/Kigali', weekday: 'short', hour: '2-digit', minute: '2-digit' });
  const press = async () => {
    setState({ busy: true, error: '' });
    try {
      await vendorRequest(clock.clocked_in ? '/vendor/attendance/clock-out' : '/vendor/attendance/clock-in', { method: 'POST', body: {} });
      await refreshWorkspace();
      setState({ busy: false, error: '' });
    } catch (err) {
      setState({ busy: false, error: err.message });
    }
  };
  return (
    <div className="max-w-sm rounded-2xl bg-white border border-stone-200/80 p-4 space-y-2">
      <p className="font-black text-sm">{clock.clocked_in ? `Working since ${hm(clock.entry.clock_in_at)}` : 'Not clocked in'}</p>
      {clock.next_shift && <p className="text-xs text-stone-500">Shift: {hm(clock.next_shift.starts_at)} – {hm(clock.next_shift.ends_at)}</p>}
      {state.error && <p role="alert" className="text-xs font-semibold text-red-600">{state.error}</p>}
      <button type="button" disabled={state.busy} onClick={press} className={`w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60 ${clock.clocked_in ? 'bg-stone-700' : 'bg-emerald-600'}`}>
        {state.busy ? 'Please wait…' : clock.clocked_in ? 'Clock out' : 'Clock in'}
      </button>
    </div>
  );
}

/** An employee replaces the password their administrator gave them. */
function ChangeMyPassword() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [state, setState] = useState({ busy: false, error: '', done: false });
  const submit = async (event) => {
    event.preventDefault();
    setState({ busy: true, error: '', done: false });
    try {
      await vendorRequest('/vendor/auth/change-password', { method: 'POST', body: { current_password: current, new_password: next } });
      setCurrent('');
      setNext('');
      setState({ busy: false, error: '', done: true });
    } catch (err) {
      setState({ busy: false, error: err.message || 'Could not change your password.', done: false });
    }
  };
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs font-bold text-[#542813] underline underline-offset-2">
        Change my password
      </button>
    );
  }
  const input = 'w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm';
  return (
    <form onSubmit={submit} className="max-w-sm rounded-2xl bg-white border border-stone-200/80 p-4 space-y-3">
      <p className="font-black text-sm">Change my password</p>
      <input className={input} type="password" placeholder="Current password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" required />
      <input className={input} type="password" placeholder="New password (8+ characters)" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" minLength={8} required />
      {state.error && <p role="alert" className="text-xs font-semibold text-red-600">{state.error}</p>}
      {state.done && <p className="text-xs font-semibold text-emerald-700">Password changed. Other devices were signed out.</p>}
      <button type="submit" disabled={state.busy} className="w-full py-2.5 rounded-xl bg-[#2b1206] text-white text-sm font-bold disabled:opacity-60">{state.busy ? 'Saving…' : 'Save new password'}</button>
    </form>
  );
}
