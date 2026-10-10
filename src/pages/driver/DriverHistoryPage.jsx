import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { History as HistoryIcon, RotateCcw, Navigation } from 'lucide-react';
import { useDriver } from '../../context/DriverContext';
import { deliveryStatusLabel } from '../../api/driverApi';
import EmptyState from '../../components/common/EmptyState';

function StatusChip({ status }) {
  const palette = {
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    cancelled: 'bg-red-50 text-red-700 border-red-200',
    rejected: 'bg-stone-100 text-stone-500 border-stone-200',
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-black border ${
        palette[status] || 'bg-stone-100 text-stone-500 border-stone-200'
      }`}
    >
      {deliveryStatusLabel(status)}
    </span>
  );
}

function formatDate(iso) {
  if (!iso) return '—';
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function DriverHistoryPage() {
  const { history, refreshHistory } = useDriver();
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    setBusy(true);
    try {
      await refreshHistory();
    } finally {
      setBusy(false);
    }
  };

  if (history.length === 0) {
    return (
      <EmptyState
        icon={<HistoryIcon className="w-8 h-8 text-[#3b5327]" />}
        title="No deliveries yet"
        message="Your completed and cancelled deliveries will show up here once you start working."
        actionLabel="Refresh"
        onAction={refresh}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Delivery history</h1>
          <p className="text-sm font-medium text-stone-500">
            Recent trips · showing the latest {history.length}
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

      <div className="rounded-3xl bg-white border border-stone-200/80 shadow-sm divide-y divide-stone-100 overflow-hidden">
        {history.map((delivery) => (
          <div key={delivery.id} className="p-5 flex flex-wrap items-center gap-4">
            <span className="w-11 h-11 rounded-2xl bg-[#f5f8f2] text-[#3b5327] flex items-center justify-center flex-shrink-0">
              <Navigation className="w-5 h-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-extrabold text-gray-900 truncate">
                Order {delivery.orderNumber} <span className="text-stone-300">·</span> {delivery.vendor.name}
              </p>
              <p className="text-xs font-medium text-stone-500 truncate">
                {delivery.pickup.address || 'Vendor'} → {delivery.dropoff.address || 'Customer'}
              </p>
              <p className="text-[11px] text-stone-400 mt-0.5">{formatDate(delivery.completedAt || delivery.deliveredAt || delivery.createdAt)}</p>
            </div>
            <div className="flex items-center gap-3">
              <StatusChip status={delivery.status} />
              <span className="text-sm font-black text-gray-900 w-24 text-right">
                {delivery.promisedEarnings.toLocaleString()} RWF
              </span>
            </div>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-stone-400 font-medium">
        Full history and payout reports are managed by your operator platform.
      </p>
      <Link to="/driver-dashboard" className="block text-center text-xs font-bold text-stone-500 hover:text-[#3b5327]">
        ← Back to dashboard
      </Link>
    </div>
  );
}