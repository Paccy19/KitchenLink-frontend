import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet,
  Star,
  RotateCcw,
  TrendingUp,
  Banknote,
  ArrowUpRight,
  Clock,
} from 'lucide-react';
import { useDriver } from '../../context/DriverContext';
import { deliveryStatusLabel } from '../../api/driverApi';
import { useToast } from '../../components/common/Toast';
import StatCard from '../../components/vendor-dashboard/StatCard';
import ConfirmDialog from '../../components/vendor-dashboard/ConfirmDialog';
import PayoutDestinationPicker, {
  emptyPayoutDestination,
  payoutDestinationPayload,
  payoutDestinationReady,
  payoutDestinationText,
} from '../../components/common/PayoutDestinationPicker';

const money = (value) => `${Number(value || 0).toLocaleString()} RWF`;

const STATUS_STYLES = {
  processing: { label: 'Processing', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  completed: { label: 'Paid', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  failed: { label: 'Failed · refunded', className: 'bg-rose-50 text-rose-700 border-rose-200' },
};

export default function DriverEarningsPage() {
  const { driver, earnings, refreshEarnings, stats, wallet, refreshWallet, requestWithdrawal } = useDriver();
  const { success, error } = useToast();
  const [busy, setBusy] = useState(false);

  const [amount, setAmount] = useState('');
  // Where the money goes: registered number (confirmed), another number, or a bank account.
  const [destination, setDestination] = useState(emptyPayoutDestination);
  const [confirm, setConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    refreshWallet().catch(() => null);
  }, [refreshWallet]);

  const refresh = async () => {
    setBusy(true);
    try {
      await Promise.all([refreshEarnings(), refreshWallet()]);
    } finally {
      setBusy(false);
    }
  };

  const summary = earnings || {
    todayRwf: stats.earningsToday,
    todayDeliveries: stats.completedToday,
    totalRwf: stats.earningsTotal,
    totalDeliveries: stats.completedTotal,
    sharePercent: 100,
    rating: stats.rating,
  };

  const available = wallet?.availableBalance ?? 0;
  const numericAmount = Number(amount);
  const invalid = !amount || !Number.isInteger(numericAmount) || numericAmount <= 0;
  const exceeds = !invalid && numericAmount > available;
  const destinationReady = payoutDestinationReady(destination);

  const submit = () => {
    if (invalid || exceeds || !destinationReady) return;
    setConfirm(true);
  };

  const confirmWithdrawal = async () => {
    setSubmitting(true);
    try {
      await requestWithdrawal({ amount: numericAmount, ...payoutDestinationPayload(destination) });
      success(`Withdrawal of ${money(numericAmount)} requested to ${payoutDestinationText(destination)}.`);
      setAmount('');
    } catch (err) {
      error(err?.message || 'Could not submit your withdrawal.');
    } finally {
      setSubmitting(false);
      setConfirm(false);
    }
  };

  const bars = (summary.deliveries || []).slice(-10).map((delivery) => ({
    id: delivery.id,
    orderNumber: delivery.orderNumber,
    amount: delivery.paidEarnings ?? delivery.promisedEarnings,
  }));

  const maxBar = Math.max(1, ...bars.map((bar) => bar.amount));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Earnings & Wallet</h1>
          <p className="text-sm font-medium text-stone-500">
            You keep {summary.sharePercent}% of every delivery fee · withdraw to mobile money or your bank anytime
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
          label="Available Balance"
          value={money(available)}
          hint="Ready to withdraw"
          tone="emerald"
        />
        <StatCard
          icon={Clock}
          label="Processing"
          value={money(wallet?.processing)}
          hint="Being paid out"
          tone="amber"
        />
        <StatCard
          icon={TrendingUp}
          label="All time"
          value={money(summary.totalRwf)}
          hint={`${summary.totalDeliveries} deliveries · today ${money(summary.todayRwf)}`}
          tone="cream"
        />
        <StatCard
          icon={Star}
          label="Rating"
          value={summary.rating?.toFixed(1)}
          hint="Customer reviews"
          tone="sky"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Withdraw card */}
        <div className="lg:col-span-1 rounded-3xl bg-white border border-stone-200/80 shadow-sm p-5 space-y-4 h-fit">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <Banknote className="w-5 h-5 text-[#3b5327]" />
            </div>
            <div>
              <h3 className="font-black text-sm text-gray-900">Withdraw Funds</h3>
              <p className="text-[11px] text-stone-400 font-medium">Available {money(available)}</p>
            </div>
          </div>

          <div>
            <label htmlFor="withdraw-amount" className="text-xs font-bold text-stone-500 block mb-1.5">
              Amount (RWF)
            </label>
            <input
              id="withdraw-amount"
              type="number"
              min="0"
              inputMode="numeric"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0"
              className={`w-full text-sm p-3 rounded-xl border outline-none transition ${
                amount && (invalid || exceeds) ? 'border-red-300 focus:border-red-400' : 'border-stone-200 focus:border-[#3b5327]'
              }`}
            />
            <div className="flex gap-2 mt-2">
              {[25, 50, 100].map((percent) => (
                <button
                  key={percent}
                  type="button"
                  onClick={() => setAmount(String(Math.floor((available * percent) / 100)))}
                  className="flex-1 text-[11px] font-bold py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition active:scale-95"
                >
                  {percent === 100 ? 'Max' : `${percent}%`}
                </button>
              ))}
            </div>
            {exceeds && <p className="text-[11px] text-red-500 font-semibold mt-1.5">Amount exceeds available balance.</p>}
          </div>

          <PayoutDestinationPicker
            value={destination}
            onChange={setDestination}
            registeredPhone={wallet?.payoutPhone || driver?.phone || ''}
            defaultName={wallet?.payoutName || driver?.name || ''}
            theme="moss"
          />

          <button
            type="button"
            onClick={submit}
            disabled={invalid || exceeds || !destinationReady || submitting}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#1c2b12] to-[#3b5327] text-white font-bold text-sm shadow-md transition active:scale-95 disabled:opacity-50 disabled:active:scale-100"
          >
            Withdraw
          </button>
          <p className="text-[10px] text-stone-400 font-medium leading-snug">
            The amount is reserved right away and sent by the Online Food Kitchen team, usually within 24 hours.
            If a payout fails, the money returns to your balance.
          </p>
        </div>

        {/* Withdrawal history */}
        <div className="lg:col-span-2 rounded-3xl bg-white border border-stone-200/80 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-black text-base text-gray-900">Withdrawals</h3>
              <p className="text-[11px] text-stone-400 font-medium">Your payout requests</p>
            </div>
            <span className="text-xs font-bold text-stone-500">Withdrawn {money(wallet?.withdrawn)}</span>
          </div>
          {!wallet || wallet.withdrawals.length === 0 ? (
            <p className="text-sm text-stone-500 py-8 text-center">No withdrawals yet.</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {wallet.withdrawals.map((entry) => {
                const style = STATUS_STYLES[entry.status] || STATUS_STYLES.processing;
                return (
                  <li key={entry.id} className="flex items-center gap-3 py-3">
                    <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-gray-900 truncate">
                        {entry.method} · {entry.accountNumber}
                      </p>
                      <p className="text-[11px] text-stone-400 font-medium truncate">
                        {new Date(entry.date).toLocaleString()}
                        {entry.status === 'completed' && entry.reference ? ` · ref ${entry.reference}` : ''}
                        {entry.status === 'failed' && entry.failureReason ? ` · ${entry.failureReason}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-sm font-black text-gray-900">− {money(entry.amount)}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${style.className}`}>
                        {style.label}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
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
                  {delivery.earningsPenaltyRwf > 0 && (
                    <p className="text-[11px] font-bold text-red-600">
                      Late-pickup penalty: −{delivery.earningsPenaltyRwf.toLocaleString()} RWF (from this delivery fee)
                    </p>
                  )}
                </div>
                <span className="text-sm font-black text-emerald-700">
                  +{(delivery.paidEarnings ?? delivery.promisedEarnings).toLocaleString()} RWF
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

      <ConfirmDialog
        isOpen={confirm}
        title="Confirm withdrawal"
        message={`Withdraw ${money(numericAmount)} to ${payoutDestinationText(destination)}? It will be sent within 24 hours.`}
        confirmLabel={submitting ? 'Submitting…' : 'Confirm Withdrawal'}
        tone="default"
        onConfirm={confirmWithdrawal}
        onCancel={() => setConfirm(false)}
      />
    </div>
  );
}
