import React from 'react';
import { X, Phone, MapPin, Check, X as XIcon, Clock, CreditCard, FileText } from 'lucide-react';
import OrderStatusBadge from './OrderStatusBadge';
import { ORDER_ACTION_LABEL, ORDER_NEXT_STATUS } from '../../data/vendorMockData';

const FLOW = ['New', 'Accepted', 'Preparing', 'Ready', 'Completed'];

export default function OrderDetailModal({ order, isOpen, onClose, onAdvance, onCancel }) {
  if (!isOpen || !order) return null;

  const nextStatus = ORDER_NEXT_STATUS[order.status];
  const nextLabel = ORDER_ACTION_LABEL[order.status];
  const canAct = Boolean(nextStatus);
  const currentIndex = FLOW.indexOf(order.status);
  const commission = Math.round(order.total * 0.15);
  const payout = order.total - order.deliveryFee - commission;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Order ${order.id} details`}
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-stone-100 animate-scale-in"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-stone-100 px-5 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-gray-900">{order.id}</h3>
            <p className="text-[11px] text-stone-400 font-medium">
              {new Date(order.createdAt).toLocaleString()} · {order.orderType}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <OrderStatusBadge status={order.status} />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close order details"
              className="w-9 h-9 rounded-full text-stone-500 hover:text-stone-800 hover:bg-stone-100 flex items-center justify-center transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-6">
          {order.status === 'Cancelled' ? (
            <div className="rounded-2xl bg-rose-50 border border-rose-100 p-4 text-sm text-rose-700 font-medium">
              This order was cancelled / rejected.
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {FLOW.map((step, index) => {
                const done = index <= currentIndex;
                return (
                  <React.Fragment key={step}>
                    <div className="flex flex-col items-center gap-1 flex-shrink-0">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black ${
                          done ? 'bg-[#542813] text-white' : 'bg-stone-100 text-stone-400'
                        }`}
                      >
                        {done ? <Check className="w-3.5 h-3.5" /> : index + 1}
                      </div>
                      <span className={`text-[9px] font-bold ${done ? 'text-[#542813]' : 'text-stone-400'}`}>
                        {step}
                      </span>
                    </div>
                    {index < FLOW.length - 1 && (
                      <div className={`flex-1 h-0.5 mb-4 ${index < currentIndex ? 'bg-[#542813]' : 'bg-stone-200'}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-stone-50 border border-stone-100 p-4 space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-stone-400">Customer</h4>
              <p className="text-sm font-bold text-gray-900">{order.customer.name}</p>
              <p className="text-xs text-stone-600 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#8a5332]" />
                {order.customer.phone}
              </p>
              <p className="text-xs text-stone-600 flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#8a5332] mt-0.5 flex-shrink-0" />
                <span>{order.customer.address}</span>
              </p>
            </div>

            <div className="rounded-2xl bg-stone-50 border border-stone-100 p-4 space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-stone-400">Fulfilment</h4>
              <p className="text-xs text-stone-600 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#8a5332]" />
                {order.scheduledFor ? `Scheduled for ${order.scheduledFor}` : `ETA ${order.eta}`}
              </p>
              <p className="text-xs text-stone-600 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-[#8a5332]" />
                {order.paymentMethod} · {order.paymentStatus}
              </p>
              {order.notes && (
                <p className="text-xs text-stone-600 flex items-start gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#8a5332] mt-0.5 flex-shrink-0" />
                  <span>{order.notes}</span>
                </p>
              )}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-stone-400 mb-2">Order Items</h4>
            <div className="rounded-2xl border border-stone-100 divide-y divide-stone-100 overflow-hidden">
              {order.items.map((entry, index) => (
                <div key={index} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      {entry.quantity}× {entry.name}
                    </p>
                    {entry.options && <p className="text-[11px] text-stone-400">{entry.options}</p>}
                  </div>
                  <span className="text-sm font-bold text-stone-800 flex-shrink-0">
                    {(entry.price * entry.quantity).toLocaleString()} RWF
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-[#faf6f2] border border-[#ebd7c5] p-4 space-y-2 text-sm">
            <div className="flex justify-between text-stone-600">
              <span>Subtotal</span>
              <span className="font-semibold">{order.subtotal.toLocaleString()} RWF</span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>Delivery fee</span>
              <span className="font-semibold">{order.deliveryFee.toLocaleString()} RWF</span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>Platform commission ({Math.round(order.total ? (commission / order.total) * 100 : 15)}%)</span>
              <span className="font-semibold text-rose-600">− {commission.toLocaleString()} RWF</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-[#ebd7c5]">
              <span className="font-black text-[#3d1b0c]">Order total</span>
              <span className="font-black text-[#4e2410]">{order.total.toLocaleString()} RWF</span>
            </div>
            <div className="flex justify-between text-[#3d1b0c]">
              <span className="font-bold">Your payout</span>
              <span className="font-black">{payout.toLocaleString()} RWF</span>
            </div>
          </div>
        </div>

        {canAct && (
          <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t border-stone-100 px-5 sm:px-6 py-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => onCancel(order)}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs transition active:scale-95"
            >
              <XIcon className="w-4 h-4" />
              {order.status === 'New' ? 'Reject Order' : 'Cancel Order'}
            </button>
            <button
              type="button"
              onClick={() => onAdvance(order)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] hover:from-[#3d1b0c] text-white font-bold text-sm shadow-md transition active:scale-95"
            >
              <Check className="w-4 h-4" />
              {nextLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
