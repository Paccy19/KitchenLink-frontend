import React, { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  TrendingUp,
  BarChart3,
  Wallet,
  RefreshCw,
  ArrowUpRight,
  AlertTriangle,
  ChefHat,
  Camera,
} from 'lucide-react';
import { useVendor } from '../../context/VendorContext';
import usePullToRefresh from '../../hooks/usePullToRefresh';
import StatCard from '../../components/vendor-dashboard/StatCard';
import OrderStatusBadge from '../../components/vendor-dashboard/OrderStatusBadge';

const money = (value) => `${value.toLocaleString()} RWF`;

export default function VendorOverviewPage() {
  const { vendor, stats, orders, menuItems, lastSyncedAt, markSynced, updateVendorProfile } = useVendor();
  const [refreshing, setRefreshing] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(vendor.avatar);
  const avatarInputRef = useRef(null);

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !/^image\/(jpeg|png|webp|gif)$/i.test(file.type)) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUri = String(reader.result);
      setAvatarUrl(dataUri);
      updateVendorProfile({ avatar: dataUri }).catch(() => setAvatarUrl(vendor.avatar));
    };
    reader.readAsDataURL(file);
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
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={vendor.name}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-2 ring-white/30 shadow-lg bg-white/10"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 ring-2 ring-white/30 flex items-center justify-center text-2xl font-black text-white/90">
                  {(vendor.name || 'K').slice(0, 1).toUpperCase()}
                </div>
              )}
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

      {!vendor.isOpen && (
        <div className="flex items-center gap-3 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 font-medium">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          Your store is currently closed. Customers cannot place new orders until you reopen from the sidebar.
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <StatCard icon={ShoppingBag} label="Today's Orders" value={stats.todayOrdersCount} hint="Received today" tone="cream" />
        <StatCard icon={Clock} label="Pending Orders" value={stats.pendingOrders} hint="Awaiting acceptance" tone="amber" />
        <StatCard icon={CheckCircle2} label="Completed Orders" value={stats.completedOrders} hint="All time" tone="emerald" />
        <StatCard icon={TrendingUp} label="Today's Sales" value={money(stats.todaySales)} hint="Gross today" tone="brown" />
        <StatCard icon={BarChart3} label="Total Sales" value={money(stats.totalSales)} hint="Lifetime gross" tone="cream" />
        <StatCard icon={Wallet} label="Available Balance" value={money(stats.availableBalance)} hint="Ready to withdraw" tone="brown" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent orders */}
        <div className="xl:col-span-2 bg-white rounded-3xl border border-stone-200/80 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-black text-base text-gray-900">Recent Orders</h3>
              <p className="text-[11px] text-stone-400 font-medium">Latest activity in your kitchen</p>
            </div>
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

        {/* Quick insights */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-stone-200/80 shadow-sm p-5">
            <h3 className="font-black text-base text-gray-900 mb-3">Menu Snapshot</h3>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#faf6f2] border border-[#ebd7c5] flex items-center justify-center">
                <ChefHat className="w-6 h-6 text-[#6d391d]" />
              </div>
              <div>
                <p className="text-2xl font-black text-gray-900">{menuItems.length}</p>
                <p className="text-[11px] text-stone-400 font-medium">Dishes on your menu</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between rounded-2xl bg-stone-50 border border-stone-100 px-3 py-2.5">
              <span className="text-xs font-bold text-stone-600">Unavailable dishes</span>
              <span className={`text-sm font-black ${unavailableCount ? 'text-amber-600' : 'text-emerald-600'}`}>
                {unavailableCount}
              </span>
            </div>
            <Link
              to="/vendor-dashboard/menu"
              className="mt-3 inline-flex w-full items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#faf6f2] hover:bg-[#f5ebe1] text-[#3d1b0c] border border-[#ebd7c5] font-bold text-xs transition active:scale-95"
            >
              Manage menu <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="rounded-3xl bg-gradient-to-br from-[#faf6f2] to-[#f5ebe1] border border-[#ebd7c5] p-5">
            <h3 className="font-black text-sm text-[#3d1b0c] mb-2">Payout Summary</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Net earned</span>
                <span className="font-bold">{money(stats.netEarned)}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Commission ({Math.round(vendor.commissionRate * 100)}%)</span>
                <span className="font-bold text-rose-600">− {money(stats.commission)}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Withdrawn</span>
                <span className="font-bold">{money(stats.withdrawn)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#d9bda6]/50">
                <span className="font-black text-[#3d1b0c]">Available</span>
                <span className="font-black text-[#4e2410]">{money(stats.availableBalance)}</span>
              </div>
            </div>
            <Link
              to="/vendor-dashboard/wallet"
              className="mt-3 inline-flex w-full items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#2b1206] to-[#542813] text-white font-bold text-xs transition active:scale-95"
            >
              Open wallet
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
