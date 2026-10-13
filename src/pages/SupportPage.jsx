import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, LifeBuoy } from 'lucide-react';
import SupportCenter from '../components/support/SupportCenter';
import { supportApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { useOrders } from '../context/OrderContext';

/** Customer Help & Support: conversations with the support team. */
export default function SupportPage() {
  const { isAuthenticated, openAuthModal } = useAuth();
  const { orders } = useOrders();

  const orderOptions = useMemo(
    () =>
      orders
        .filter((order) => order.backendId || order.orderNumber)
        .slice(0, 30)
        .map((order) => ({
          id: order.id,
          label: `${order.orderNumber || order.id} · ${order.vendorName || 'Order'}`,
        })),
    [orders]
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="mb-6">
        <Link to="/" className="inline-flex items-center gap-2 text-xs font-bold text-stone-600 hover:text-[#542813] transition">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Marketplace</span>
        </Link>
      </div>
      {isAuthenticated ? (
        <SupportCenter api={supportApi} role="customer" orders={orderOptions} />
      ) : (
        <div className="bg-white rounded-3xl border border-stone-200/80 shadow-sm p-10 text-center">
          <LifeBuoy className="w-10 h-10 text-[#542813] mx-auto" />
          <h1 className="mt-3 text-xl font-black text-gray-900">Help &amp; Support</h1>
          <p className="mt-1 text-sm text-stone-500">Sign in so our support team can see your orders and reply to you.</p>
          <button
            type="button"
            onClick={openAuthModal}
            className="mt-5 px-5 py-2.5 bg-gradient-to-r from-[#2b1206] to-[#542813] text-white rounded-xl font-bold text-xs shadow-md"
          >
            Sign in
          </button>
        </div>
      )}
    </div>
  );
}
