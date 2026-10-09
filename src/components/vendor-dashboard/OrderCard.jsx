import React from 'react';
import { Phone, MapPin, Clock, Eye, Check, X, CalendarClock } from 'lucide-react';
import OrderStatusBadge from './OrderStatusBadge';
import { ORDER_ACTION_LABEL, ORDER_NEXT_STATUS } from '../../data/vendorOptions';

const timeAgo = (iso) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr${hours > 1 ? 's' : ''} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
};

export default function OrderCard({ order, onAdvance, onCancel, onView }) {
  const nextStatus = ORDER_NEXT_STATUS[order.status];
  const nextLabel = ORDER_ACTION_LABEL[order.status];
  const canAct = Boolean(nextStatus);
  const visibleItems = order.items.slice(0, 3);
  const remaining = order.items.length - visibleItems.length;

  return (
    <div className="bg-white rounded-3xl border border-stone-200/80 shadow-sm hover:shadow-md hover:border-[#ebd7c5] transition-all duration-300 p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-black text-sm text-gray-900">{order.id}</h3>
            {order.orderType === 'Scheduled' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[#faf6f2] text-[#542813] border border-[#ebd7c5]">
                <CalendarClock className="w-3 h-3" />
                Scheduled
              </span>
            )}
          </div>
          <p className="text-[11px] text-stone-400 font-medium mt-0.5 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {timeAgo(order.createdAt)}
            {order.scheduledFor ? ` · for ${order.scheduledFor}` : ''}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="rounded-2xl bg-stone-50 border border-stone-100 p-3 space-y-1.5">
        <p className="text-xs font-bold text-gray-900">{order.customer.name}</p>
        <p className="text-[11px] text-stone-500 flex items-center gap-1.5">
          <Phone className="w-3 h-3 text-[#8a5332]" />
          {order.customer.phone}
        </p>
        <p className="text-[11px] text-stone-500 flex items-start gap-1.5">
          <MapPin className="w-3 h-3 text-[#8a5332] mt-0.5 flex-shrink-0" />
          <span>{order.customer.address}</span>
        </p>
      </div>

      <div className="space-y-1.5">
        {visibleItems.map((entry, index) => (
          <div key={index} className="flex justify-between gap-3 text-xs">
            <span className="text-stone-700">
              <span className="font-bold text-gray-900">{entry.quantity}×</span> {entry.name}
              {entry.options ? <span className="text-stone-400"> · {entry.options}</span> : null}
            </span>
            <span className="font-bold text-stone-800 flex-shrink-0">
              {(entry.price * entry.quantity).toLocaleString()} RWF
            </span>
          </div>
        ))}
        {remaining > 0 && (
          <p className="text-[11px] text-[#542813] font-semibold">+{remaining} more item{remaining > 1 ? 's' : ''}</p>
        )}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-stone-100">
        <span className="text-[11px] text-stone-500 font-medium">
          Total <span className="text-base font-black text-[#4e2410] ml-1">{order.total.toLocaleString()} RWF</span>
        </span>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            order.paymentStatus === 'Paid'
              ? 'bg-emerald-100 text-emerald-800'
              : order.paymentStatus === 'Refunded'
              ? 'bg-stone-200 text-stone-700'
              : 'bg-amber-100 text-amber-800'
          }`}
        >
          {order.paymentStatus}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => onView(order)}
          className="flex-1 min-w-[110px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs transition active:scale-95"
        >
          <Eye className="w-3.5 h-3.5" />
          Details
        </button>

        {canAct && (
          <button
            type="button"
            onClick={() => onAdvance(order)}
            className="flex-1 min-w-[130px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] hover:from-[#3d1b0c] text-white font-bold text-xs shadow-sm transition active:scale-95"
          >
            <Check className="w-3.5 h-3.5" />
            {nextLabel}
          </button>
        )}

        {canAct && (
          <button
            type="button"
            onClick={() => onCancel(order)}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs transition active:scale-95"
          >
            <X className="w-3.5 h-3.5" />
            {order.status === 'New' ? 'Reject' : 'Cancel'}
          </button>
        )}
      </div>
    </div>
  );
}
