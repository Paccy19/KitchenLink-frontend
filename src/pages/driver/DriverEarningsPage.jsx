import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, CheckCircle2, Star, RotateCcw, TrendingUp } from 'lucide-react';
import { useDriver } from '../../context/DriverContext';
import { deliveryStatusLabel } from '../../api/driverApi';
import StatCard from '../../components/vendor-dashboard/StatCard';

export default function DriverEarningsPage() {
  const { earnings, refreshEarnings, stats } = useDriver();
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    setBusy(true);
    try {
      await refreshEarnings();
    } finally {
      setBusy(false);
    }
  };

  const summary = earnings || {
    todayRwf: stats.earningsToday,
    todayDeliveries: stats.completedToday,
    totalRwf: stats.earningsTotal,
    totalDeliveries: stats.completedTotal,
    sharePercent: 80,
    rating: stats.rating,
  };

  const bars = (summary.deliveries || []).slice(-10).map((delivery) => ({
    id: delivery.id,
    orderNumber: delivery.orderNumber,
    amount: delivery.promisedEarnings,
  }));

  const maxBar = Math.max(1, ...bars.map((bar) => bar.amount));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Earnings</h1>
          <p className="text-sm font-medium text-stone-500">
            You keep {summary.sharePercent}% of every delivery fee + tips
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={busy}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-stone-200 text-stone-600 text-sm font-bold hover:bg-stone-50 transition active:scale-95 disabled:opacity-60"
        >
          <RotateCcw className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={Wallet}
          label="Today"
          value={`${summary.todayRwf.toLocaleString()} RWF`}
          hint={`${summary.todayDeliveries} deliveries`}
          tone="emerald"
        />
        <StatCard
          icon={TrendingUp}
          label="All time"
          value={`${summary.totalRwf.toLocaleString()} RWF`}
          hint={`${summary.totalDeliveries} deliveries`}
          tone="cream"
        />
        <StatCard
          icon={CheckCircle2}
          label="Delivery fee share"
          value={`${summary.sharePercent}%`}
          hint="credited per delivery"
          tone="amber"
        />
        <StatCard
          icon={Star}
          label="Rating"
          value={summary.rating?.toFixed(1)}
          hint="Customer reviews"
          tone="sky"
        />
      </div>

      {bars.length > 0 && (
        <div className="rounded-3xl bg-white border border-stone-200/80 shadow-sm p-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-4">
            Recent payouts
          </p>
          <div className="flex items-end gap-2 h-32">
            {bars.map((bar) => (
              <div key={bar.id} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                <span className="text-[10px] font-bold text-stone-500 truncate max-w-full">
                  {bar.orderNumber}
                </span>
                <div
                  className="w-full rounded-t-2xl bg-gradient-to-t from-[#1c2b12] to-[#3b5327] transition-all"
                  style={{ height: `${Math.max(6, (bar.amount / maxBar) * 100)}%` }}
                />
              </div>
            ))}
          </div>
          <p className="mt-2 text-[10px] font-medium text-stone-400">
            Last {bars.length} completed deliveries · RWF per trip
          </p>
        </div>
      )}

      <div className="rounded-3xl bg-white border border-stone-200/80 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Earnings breakdown</p>
        </div>
        {summary.deliveries && summary.deliveries.length > 0 ? (
          <ul className="divide-y divide-stone-100">
            {summary.deliveries.map((delivery) => (
              <li key={delivery.id} className="px-5 py-4 flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm text-gray-900 truncate">
                    Order {delivery.orderNumber} · {delivery.vendor.name}
                  </p>
                  <p className="text-xs text-stone-500 truncate">
                    {deliveryStatusLabel(delivery.status)} → {delivery.dropoff.address || 'customer'}
                  </p>
                </div>
                <span className="text-sm font-black text-emerald-700">
                  +{delivery.promisedEarnings.toLocaleString()} RWF
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-8 text-sm text-stone-500 text-center">
            Completed deliveries with payouts will appear here.
          </p>
        )}
      </div>

      <Link to="/driver-dashboard" className="block text-center text-xs font-bold text-stone-500 hover:text-[#3b5327]">
        ← Back to dashboard
      </Link>
    </div>
  );
}