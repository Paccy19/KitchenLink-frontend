import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Truck } from 'lucide-react';
import { specialDeliveryApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { StatusPill, formatWhen, rwf } from '../components/special-delivery/shared';

/** The customer's special delivery requests (big events), newest activity first. */
export default function SpecialDeliveriesPage() {
  const { isAuthenticated, openAuthModal } = useAuth();
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    specialDeliveryApi
      .list({ limit: 50 })
      .then((data) => setItems(data.items || []))
      .catch((err) => setError(err.message || 'Could not load your requests.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 animate-fade-in">
      <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2 mb-1">
        <Truck className="w-6 h-6 text-[#542813]" /> Special deliveries
      </h1>
      <p className="text-xs text-stone-500 mb-6">
        Big-event deliveries you're arranging with a kitchen. A delivery fee is only charged after you accept the kitchen's quotation.
      </p>
      {!isAuthenticated ? (
        <p className="text-sm text-stone-500">Sign in to see your requests.</p>
      ) : error ? (
        <p className="text-sm font-semibold text-red-600">{error}</p>
      ) : !items ? (
        <Loader2 className="w-6 h-6 animate-spin text-[#542813] mx-auto" />
      ) : items.length === 0 ? (
        <p className="text-sm text-stone-500">
          No special delivery requests yet. When a big-event destination needs a special arrangement, you can request one while
          booking the event.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                to={`/special-deliveries/${item.id}`}
                className="block rounded-2xl bg-white border border-stone-200/80 shadow-sm p-4 hover:border-[#542813]/40 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-stone-400">{item.reference}</p>
                    <p className="text-sm font-black text-gray-900 truncate">{item.vendor?.name}</p>
                    <p className="text-xs text-stone-500 truncate">{item.delivery_location?.address}</p>
                    <p className="text-xs text-stone-500">Delivery {formatWhen(item.requested_delivery_at)}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <StatusPill status={item.status} label={item.status_label} />
                    {item.agreed_fee_rwf != null ? (
                      <p className="text-xs font-black text-emerald-700">{rwf(item.agreed_fee_rwf)} agreed</p>
                    ) : item.active_quotation ? (
                      <p className="text-xs font-black text-indigo-700">Quote: {rwf(item.active_quotation.fee_rwf)}</p>
                    ) : null}
                    {item.unread_count > 0 && <p className="text-[11px] font-bold text-[#542813]">{item.unread_count} new message(s)</p>}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
