import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Power,
  Navigation,
  CheckCircle2,
  Wallet,
  Star,
  Bell,
  Bike,
  ScanLine,
} from 'lucide-react';
import { useDriver } from '../../context/DriverContext';
import StatCard from '../../components/vendor-dashboard/StatCard';
import DeliveryOfferCard from '../../components/driver-dashboard/DeliveryOfferCard';
import EmptyState from '../../components/common/EmptyState';

export default function DriverDashboardPage() {
  const navigate = useNavigate();
  const {
    stats,
    availableDeliveries,
    isOnline,
    toggleOnline,
    enableNotifications,
    acceptDelivery,
    rejectDelivery,
    shareLocation,
    sharingLocation,
  } = useDriver();

  const [busyId, setBusyId] = useState(null);
  const [frame, setFrame] = useState(0);

  const goOnline = async () => {
    if (!isOnline) {
      await enableNotifications();
      await shareLocation().catch(() => {});
    }
    await toggleOnline();
  };

  const handleAccept = async (id) => {
    setBusyId(id);
    try {
      const active = await acceptDelivery(id);
      if (active?.id) navigate('/driver-dashboard/active');
      else navigate('/driver-dashboard/active');
    } catch {
      /* toast already shown */
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (id) => {
    setBusyId(id);
    try {
      await rejectDelivery(id);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Online / Offline toggle */}
      <div
        className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 transition-colors ${
          isOnline
            ? 'bg-gradient-to-br from-emerald-600 to-[#1c2b12] text-white'
            : 'bg-gradient-to-br from-stone-200 to-stone-300 text-stone-700'
        }`}
      >
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider opacity-80">
              {isOnline ? 'You are online' : 'You are offline'}
            </p>
            <h2 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight">
              {isOnline ? 'Nearby offers will appear below' : 'Go online to start receiving offers'}
            </h2>
            {!isOnline && (
              <p className="mt-1 text-sm opacity-80 font-medium">
                Accept, pick up and deliver — earnings are credited instantly on completion.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={goOnline}
            className={`flex-shrink-0 inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-base font-black transition active:scale-95 shadow-lg ${
              isOnline
                ? 'bg-white/15 text-white ring-1 ring-white/40 hover:bg-white/25'
                : 'bg-gradient-to-r from-[#1c2b12] via-[#3b5327] to-[#12200b] text-white hover:from-[#2a3f1b]'
            }`}
          >
            <Power className="w-5 h-5" />
            {isOnline ? 'Go offline' : 'Go online'}
          </button>
        </div>
        {isOnline && (
          <button
            type="button"
            onClick={goOnline}
            className="relative mt-4 inline-flex items-center gap-1.5 text-[11px] font-bold text-white/80 hover:text-white"
          >
            <Bell className="w-3.5 h-3.5" /> Tapping Go offline reassigns your active deliveries.
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={Navigation}
          label="Active delivery"
          value={stats.activeDeliveries}
          hint={stats.activeDeliveries > 0 ? 'In progress' : 'Nothing in motion'}
          tone="emerald"
        />
        <StatCard
          icon={CheckCircle2}
          label="Completed today"
          value={stats.completedToday}
          hint={`${stats.completedTotal} all time`}
          tone="cream"
        />
        <StatCard
          icon={Wallet}
          label="Earnings today"
          value={`${stats.earningsToday.toLocaleString()} RWF`}
          hint="credited on delivery"
          tone="amber"
        />
        <StatCard
          icon={Star}
          label="Rating"
          value={stats.rating?.toFixed(1)}
          hint={sharingLocation ? 'Sharing location…' : 'Your driver score'}
          tone="sky"
        />
      </div>

      {/* Available offers */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black text-gray-900">Available deliveries</h3>
          <p className="text-xs text-stone-500 font-medium">
            {isOnline ? 'Offer board refreshes automatically · first accept wins' : 'Go online to see offers near you'}
          </p>
        </div>
        {availableDeliveries.length > 0 && (
          <button
            type="button"
            onClick={() => setFrame((f) => f + 1)}
            className="text-xs font-bold text-[#3b5327] hover:text-[#1c2b12] inline-flex items-center gap-1"
          >
            <ScanLine className="w-3.5 h-3.5" /> Refresh
          </button>
        )}
      </div>
      <div key={frame} className="grid gap-4 md:grid-cols-2">
        {availableDeliveries.map((delivery) => (
          <DeliveryOfferCard
            key={delivery.id}
            delivery={delivery}
            busy={busyId === delivery.id}
            onAccept={handleAccept}
            onReject={handleReject}
          />
        ))}
      </div>

      {availableDeliveries.length === 0 && (
        <EmptyState
          icon={<Bike className="w-8 h-8 text-[#3b5327]" />}
          title={isOnline ? 'No deliveries on the board right now' : 'You are offline'}
          message={
            isOnline
              ? 'When a vendor marks an order as ready, it will show up here automatically. Offers refresh every few seconds.'
              : 'Flip the big switch above to go online and nearby delivery offers will appear here.'
          }
        />
      )}
    </div>
  );
}