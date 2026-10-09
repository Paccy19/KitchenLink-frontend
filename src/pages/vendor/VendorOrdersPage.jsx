import React, { useMemo, useState } from 'react';
import { Search, ClipboardList, Inbox } from 'lucide-react';
import { useVendor } from '../../context/VendorContext';
import { useToast } from '../../components/common/Toast';
import { VENDOR_ORDER_STATUSES } from '../../data/vendorMockData';
import OrderCard from '../../components/vendor-dashboard/OrderCard';
import OrderDetailModal from '../../components/vendor-dashboard/OrderDetailModal';
import ConfirmDialog from '../../components/vendor-dashboard/ConfirmDialog';
import EmptyState from '../../components/common/EmptyState';

const NEXT_STATUS = { New: 'Accepted', Accepted: 'Preparing', Preparing: 'Ready', Ready: 'Completed' };
const ACTION_PAST = {
  Accepted: 'accepted',
  Preparing: 'preparing',
  Ready: 'ready',
  Completed: 'completed',
};

export default function VendorOrdersPage() {
  const { orders, updateOrderStatus } = useVendor();
  const { success } = useToast();

  const [activeTab, setActiveTab] = useState('New');
  const [query, setQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const counts = useMemo(() => {
    const map = { All: orders.length };
    VENDOR_ORDER_STATUSES.forEach((status) => {
      map[status.id] = orders.filter((order) => order.status === status.id).length;
    });
    return map;
  }, [orders]);

  const tabs = [{ id: 'All', label: 'All' }, ...VENDOR_ORDER_STATUSES];

  const visibleOrders = useMemo(() => {
    const term = query.trim().toLowerCase();
    return orders
      .filter((order) => activeTab === 'All' || order.status === activeTab)
      .filter((order) => {
        if (!term) return true;
        return (
          order.id.toLowerCase().includes(term) ||
          order.customer.name.toLowerCase().includes(term) ||
          order.customer.phone.toLowerCase().includes(term)
        );
      });
  }, [orders, activeTab, query]);

  const handleAdvance = (order) => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    if (next === 'Completed') {
      setConfirm({
        title: 'Mark order as completed?',
        message: `${order.id} will be closed and the payout released to your wallet.`,
        confirmLabel: 'Mark Completed',
        tone: 'default',
        onConfirm: () => {
          updateOrderStatus(order.id, next);
          success(`Order ${order.id} marked completed.`);
          setConfirm(null);
        },
      });
      return;
    }
    updateOrderStatus(order.id, next);
    success(`Order ${order.id} is now ${ACTION_PAST[next]}.`);
  };

  const handleCancel = (order) => {
    const rejecting = order.status === 'New';
    setConfirm({
      title: rejecting ? 'Reject this order?' : 'Cancel this order?',
      message: `${order.id} from ${order.customer.name} will be cancelled. This cannot be undone.`,
      confirmLabel: rejecting ? 'Reject Order' : 'Cancel Order',
      tone: 'danger',
      onConfirm: () => {
        updateOrderStatus(order.id, 'Cancelled');
        success(`Order ${order.id} ${rejecting ? 'rejected' : 'cancelled'}.`);
        setConfirm(null);
      },
    });
  };

  const advanceAndClose = (order) => {
    handleAdvance(order);
    setSelectedOrder(null);
  };

  const cancelAndClose = (order) => {
    setSelectedOrder(null);
    handleCancel(order);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Order Management</h2>
          <p className="text-xs text-stone-500 font-medium">Accept, prepare and fulfil incoming orders</p>
        </div>
        <div className="relative sm:w-72">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by order ID, customer…"
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-stone-200 focus:border-[#542813] focus:ring-2 focus:ring-[#542813]/10 outline-none transition bg-white"
          />
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition active:scale-95 ${
                isActive
                  ? 'bg-gradient-to-r from-[#2b1206] to-[#542813] text-white border-transparent shadow-sm'
                  : 'bg-white text-stone-600 border-stone-200 hover:border-[#d9bda6] hover:text-[#542813]'
              }`}
            >
              {tab.label}
              <span
                className={`min-w-[20px] px-1.5 rounded-full text-[10px] font-black ${
                  isActive ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600'
                }`}
              >
                {counts[tab.id] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {visibleOrders.length === 0 ? (
        <EmptyState
          icon={<Inbox className="w-8 h-8 text-[#542813]" />}
          title={query ? 'No matching orders' : `No ${activeTab === 'All' ? '' : activeTab.toLowerCase()} orders`}
          message={
            query
              ? 'Try a different order ID or customer name.'
              : 'New orders will appear here the moment a customer checks out.'
          }
        >
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-stone-400 font-semibold">
            <ClipboardList className="w-3.5 h-3.5" />
            Live updates enabled
          </div>
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visibleOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onAdvance={handleAdvance}
              onCancel={handleCancel}
              onView={setSelectedOrder}
            />
          ))}
        </div>
      )}

      <OrderDetailModal
        order={selectedOrder}
        isOpen={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        onAdvance={advanceAndClose}
        onCancel={cancelAndClose}
      />

      <ConfirmDialog
        isOpen={Boolean(confirm)}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel}
        tone={confirm?.tone}
        onConfirm={confirm?.onConfirm}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
