import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  Wallet,
  Store,
  Bike,
  Users,
  MessageSquareWarning,
  Truck,
  TrendingUp,
  Percent,
} from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import {
  Card,
  StatCard,
  StatusBadge,
  LoadingBlock,
  ErrorNote,
  formatRwf,
  formatDate,
  PageHeader,
} from '../../components/admin-dashboard/ui';

export default function AdminOverviewPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => adminApi.dashboard(),
  });

  if (isLoading) return <LoadingBlock label="Loading overview…" />;
  if (error) return <ErrorNote error={error} />;
  if (!data) return null;

  const { today, orders, vendors, customers, drivers, deliveries, complaints, recent_orders } = data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="Today's performance and live marketplace health."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Orders Today" value={today.orders} icon={ShoppingBag} tone="blue" />
        <StatCard label="Sales Today" value={formatRwf(today.sales_rwf)} icon={Wallet} tone="green" />
        <StatCard
          label="Completed Today"
          value={today.completed_orders}
          icon={TrendingUp}
          tone="green"
        />
        <StatCard
          label="Commission Today"
          value={formatRwf(today.commission_rwf)}
          icon={Percent}
          tone="violet"
          hint={`${data.commission_percent}% of gross`}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Pending Orders" value={orders.pending} icon={ShoppingBag} tone="amber" />
        <StatCard label="Live Orders" value={orders.live} icon={Truck} tone="blue" />
        <StatCard label="Active Deliveries" value={deliveries.active} icon={Bike} tone="blue" />
        <StatCard label="Open Complaints" value={complaints.open} icon={MessageSquareWarning} tone="red" />
      </div>

      {data.operations && (
        <Card
          title="Needs attention now"
          description="Dispatch, customer pickups and kitchens, live."
          action={
            <Link to="/admin-dashboard/deliveries" className="text-xs font-bold text-[#1f2937] hover:underline">
              Live map
            </Link>
          }
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3 text-sm">
            <AttentionLink to="/admin-dashboard/deliveries" label="Waiting for a delivery worker" value={data.operations.orders_awaiting_driver} warn />
            <AttentionLink to="/admin-dashboard/deliveries?tab=late" label="Late, not yet collected" value={data.operations.late_pickups_waiting} warn />
            <AttentionLink to="/admin-dashboard/deliveries?tab=late" label="Late pickups (charge pending)" value={data.operations.late_pickups_pending_charge} warn />
            <AttentionLink to="/admin-dashboard/orders" label="Pickups awaiting collection" value={data.operations.pickups_awaiting_collection} />
            <AttentionLink to="/admin-dashboard/orders" label="Pickups locked (wrong codes)" value={data.operations.pickups_locked} warn />
            <AttentionLink to="/admin-dashboard/vendors" label="Kitchens open now" value={data.operations.kitchens_open} />
            <AttentionLink to="/admin-dashboard/drivers" label="Delivery workers ready for orders" value={data.operations.drivers_matchable} />
          </div>
          <p className="mt-3 text-[11px] text-stone-400">
            {data.operations.pickup_orders_last_24h} customer pickup order{data.operations.pickup_orders_last_24h === 1 ? '' : 's'} in the last 24 hours.
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Vendors">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Metric label="Total" value={vendors.total} />
            <Metric label="Pending" value={vendors.pending} tone="text-amber-600" />
            <Metric label="Approved" value={vendors.approved} tone="text-emerald-600" />
            <Metric label="Suspended" value={vendors.suspended} tone="text-red-600" />
          </div>
          <Link
            to="/admin-dashboard/vendors"
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#1f2937] hover:underline"
          >
            <Store className="w-3.5 h-3.5" /> Manage vendors
          </Link>
        </Card>

        <Card title="Delivery Workers">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Metric label="Total" value={drivers.total} />
            <Metric label="Online" value={drivers.online} tone="text-emerald-600" />
            <Metric label="Pending" value={drivers.pending} tone="text-amber-600" />
            <Metric label="Suspended" value={drivers.suspended} tone="text-red-600" />
          </div>
          <Link
            to="/admin-dashboard/drivers"
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#1f2937] hover:underline"
          >
            <Bike className="w-3.5 h-3.5" /> Manage delivery workers
          </Link>
        </Card>

        <Card title="Customers">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Metric label="Total" value={customers.total} />
            <Metric label="Active" value={customers.active} tone="text-emerald-600" />
            <Metric label="Suspended" value={customers.total - customers.active} tone="text-red-600" />
            <Metric label="Delivery Fees" value={formatRwf(today.delivery_fees_rwf)} />
          </div>
          <Link
            to="/admin-dashboard/users"
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#1f2937] hover:underline"
          >
            <Users className="w-3.5 h-3.5" /> Manage users
          </Link>
        </Card>
      </div>

      <Card
        title="Recent Orders"
        action={
          <Link to="/admin-dashboard/orders" className="text-xs font-bold text-[#1f2937] hover:underline">
            View all
          </Link>
        }
        bodyClassName="p-0"
      >
        <div className="divide-y divide-stone-50">
          {recent_orders.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-stone-400">No orders yet.</p>
          )}
          {recent_orders.map((order) => (
            <div key={order.id} className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">
                  {order.order_number} · {order.vendor?.name || 'Vendor'}
                </p>
                <p className="text-[11px] text-stone-500">
                  {order.customer?.name || 'Customer'} · {formatDate(order.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-sm font-bold text-gray-900">{formatRwf(order.total_amount_rwf)}</span>
                <StatusBadge status={order.status_label || order.status} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/** A count that links to where it is handled; amber when it needs action. */
function AttentionLink({ to, label, value, warn = false }) {
  const alert = warn && value > 0;
  return (
    <Link
      to={to}
      className={`rounded-xl px-3 py-2 border transition hover:shadow-sm ${
        alert ? 'bg-amber-50 border-amber-200' : 'bg-stone-50 border-transparent'
      }`}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 leading-tight">{label}</p>
      <p className={`text-lg font-black ${alert ? 'text-amber-700' : 'text-gray-900'}`}>{value}</p>
    </Link>
  );
}

function Metric({ label, value, tone = 'text-gray-900' }) {
  return (
    <div className="rounded-xl bg-stone-50 px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">{label}</p>
      <p className={`text-lg font-black ${tone}`}>{value}</p>
    </div>
  );
}
