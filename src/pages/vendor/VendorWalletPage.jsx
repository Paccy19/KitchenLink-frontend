import React, { useMemo, useState } from 'react';
import {
  Wallet as WalletIcon,
  TrendingUp,
  Percent,
  Clock,
  CheckCircle2,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Smartphone,
  Building2,
} from 'lucide-react';
import { useVendor } from '../../context/VendorContext';
import { useToast } from '../../components/common/Toast';
import StatCard from '../../components/vendor-dashboard/StatCard';
import ConfirmDialog from '../../components/vendor-dashboard/ConfirmDialog';

const money = (value) => `${value.toLocaleString()} RWF`;
const METHODS = [
  { id: 'MTN Mobile Money', icon: Smartphone },
  { id: 'Airtel Money', icon: Smartphone },
  { id: 'Bank Transfer', icon: Building2 },
];

export default function VendorWalletPage() {
  const { vendor, orders, wallet, stats, requestWithdrawal } = useVendor();
  const { success, error } = useToast();

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState(METHODS[0].id);
  const [confirm, setConfirm] = useState(false);

  const transactions = useMemo(() => {
    const payouts = orders
      .filter((order) => order.status === 'Completed')
      .map((order) => ({
        id: order.id,
        type: 'credit',
        title: `Payout · ${order.customer.name}`,
        subtitle: `${order.id} · after ${Math.round(vendor.commissionRate * 100)}% commission`,
        amount: Math.round(order.total * (1 - vendor.commissionRate)),
        date: order.createdAt,
      }));

    const withdrawals = (wallet.withdrawalHistory || []).map((entry) => ({
      id: entry.id,
      type: 'debit',
      title: 'Withdrawal',
      subtitle: `${entry.method} · ${entry.status}`,
      amount: entry.amount,
      date: entry.date,
    }));

    return [...payouts, ...withdrawals].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [orders, wallet.withdrawalHistory, vendor.commissionRate]);

  const numericAmount = Number(amount);
  const invalid = !amount || Number.isNaN(numericAmount) || numericAmount <= 0;
  const exceeds = !invalid && numericAmount > stats.availableBalance;

  const submit = () => {
    if (invalid || exceeds) return;
    setConfirm(true);
  };

  const confirmWithdrawal = async () => {
    try {
      const entry = await requestWithdrawal(numericAmount, method);
      success(`Withdrawal of ${money(numericAmount)} submitted via ${entry.method}.`);
      setConfirm(false);
      setAmount('');
    } catch (err) {
      error(err?.message || 'Could not submit your withdrawal.');
      setConfirm(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Vendor Wallet</h2>
        <p className="text-xs text-stone-500 font-medium">Track earnings, commission and withdrawals</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard icon={TrendingUp} label="Total Sales" value={money(stats.totalSales)} hint="Lifetime gross" tone="brown" />
        <StatCard icon={Percent} label="Commission" value={money(stats.commission)} hint={`${Math.round(vendor.commissionRate * 100)}% platform fee`} tone="amber" />
        <StatCard icon={Clock} label="Pending Balance" value={money(stats.pendingBalance)} hint="From active orders" tone="cream" />
        <StatCard icon={WalletIcon} label="Available Balance" value={money(stats.availableBalance)} hint="Ready to withdraw" tone="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Withdraw card */}
        <div className="lg:col-span-1 rounded-3xl bg-white border border-stone-200/80 shadow-sm p-5 space-y-4 h-fit">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#faf6f2] border border-[#ebd7c5] flex items-center justify-center">
              <Banknote className="w-5 h-5 text-[#6d391d]" />
            </div>
            <div>
              <h3 className="font-black text-sm text-gray-900">Withdraw Funds</h3>
              <p className="text-[11px] text-stone-400 font-medium">Available {money(stats.availableBalance)}</p>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-stone-500 block mb-1.5">Amount (RWF)</label>
            <input
              type="number"
              min="0"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0"
              className={`w-full text-sm p-3 rounded-xl border outline-none transition ${
                invalid || exceeds ? 'border-red-300 focus:border-red-400' : 'border-stone-200 focus:border-[#542813]'
              }`}
            />
            <div className="flex gap-2 mt-2">
              {[25, 50, 100].map((percent) => (
                <button
                  key={percent}
                  type="button"
                  onClick={() => setAmount(String(Math.floor((stats.availableBalance * percent) / 100)))}
                  className="flex-1 text-[11px] font-bold py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition active:scale-95"
                >
                  {percent === 100 ? 'Max' : `${percent}%`}
                </button>
              ))}
            </div>
            {exceeds && <p className="text-[11px] text-red-500 font-semibold mt-1.5">Amount exceeds available balance.</p>}
          </div>

          <div>
            <label className="text-xs font-bold text-stone-500 block mb-1.5">Payout method</label>
            <div className="space-y-2">
              {METHODS.map((option) => {
                const Icon = option.icon;
                const active = method === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setMethod(option.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-xs font-bold transition ${
                      active
                        ? 'border-[#542813] bg-[#faf6f2] text-[#3d1b0c]'
                        : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-[#8a5332]" />
                    {option.id}
                    {active && <CheckCircle2 className="w-4 h-4 ml-auto text-[#542813]" />}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={submit}
            disabled={invalid || exceeds}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] hover:from-[#3d1b0c] text-white font-bold text-sm shadow-md transition active:scale-95 disabled:opacity-50 disabled:active:scale-100"
          >
            Withdraw
          </button>
        </div>

        {/* Transactions */}
        <div className="lg:col-span-2 rounded-3xl bg-white border border-stone-200/80 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-black text-base text-gray-900">Transaction History</h3>
              <p className="text-[11px] text-stone-400 font-medium">Payouts and withdrawals</p>
            </div>
            <span className="text-xs font-bold text-stone-500">Withdrawn {money(stats.withdrawn)}</span>
          </div>

          {transactions.length === 0 ? (
            <p className="text-sm text-stone-500 py-8 text-center">No transactions yet.</p>
          ) : (
            <div className="divide-y divide-stone-100">
              {transactions.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 py-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      entry.type === 'credit' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                    }`}
                  >
                    {entry.type === 'credit' ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900 truncate">{entry.title}</p>
                    <p className="text-[11px] text-stone-400 font-medium truncate">
                      {entry.subtitle} · {new Date(entry.date).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-black flex-shrink-0 ${
                      entry.type === 'credit' ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {entry.type === 'credit' ? '+' : '−'} {money(entry.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirm}
        title="Confirm withdrawal"
        message={`Withdraw ${money(numericAmount)} via ${method}? It will be processed within 24 hours.`}
        confirmLabel="Confirm Withdrawal"
        tone="default"
        onConfirm={confirmWithdrawal}
        onCancel={() => setConfirm(false)}
      />
    </div>
  );
}
