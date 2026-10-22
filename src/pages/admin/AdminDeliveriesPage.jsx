import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertTriangle, Bike, Map as MapIcon, Timer } from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import AdminOperationsMap from '../../components/admin-dashboard/AdminOperationsMap';
import {
  Badge,
  Card,
  EmptyState,
  ErrorNote,
  LoadingBlock,
  PageHeader,
  Pagination,
  Select,
  StatCard,
  StatusBadge,
  Table,
  formatDate,
  formatRelative,
} from '../../components/admin-dashboard/ui';

const EMPTY = { items: [], total: 0, page: 1, limit: 20 };
const TABS = [
  { id: 'map', label: 'Live map', icon: MapIcon },
  { id: 'active', label: 'In progress', icon: Bike },
  { id: 'late', label: 'Late pickups', icon: Timer },
];

const orderLink = (orderId) => `/admin-dashboard/orders?order=${orderId}`;

/** "Kitchen preparing" / "Ready" and, once ready, how long the worker has left. */
function PickupState({ delivery }) {
  if (['picked_up', 'out_for_delivery', 'delivered', 'completed'].includes(delivery.status)) {
    return <span className="text-xs text-stone-400">Collected</span>;
  }
  if (!delivery.kitchen_ready) return <Badge tone="amber">Kitchen preparing</Badge>;
  if (delivery.late_pickup) return <Badge tone="red">Late pickup</Badge>;
  if (!delivery.pickup_due_at) return <Badge tone="green">Ready</Badge>;
  const left = Math.round((new Date(delivery.pickup_due_at).getTime() - Date.now()) / 60000);
  return <Badge tone={left <= 5 ? 'red' : 'green'}>{left > 0 ? `Ready · ${left} min to collect` : 'Ready · overdue'}</Badge>;
}

export default function AdminDeliveriesPage() {
  const [tab, setTab] = useState('map');
  const [page, setPage] = useState(1);
  const [latePage, setLatePage] = useState(1);
  const [chargeStatus, setChargeStatus] = useState('');

  const mapQuery = useQuery({
    queryKey: ['admin', 'live-map'],
    queryFn: () => adminApi.liveMap(),
    enabled: tab === 'map',
    refetchInterval: 10000,
  });
  const activeQuery = useQuery({
    queryKey: ['admin', 'deliveries', page],
    queryFn: () => adminApi.liveDeliveries({ page, limit: 20 }),
    enabled: tab === 'active',
    refetchInterval: 15000,
  });
  const lateQuery = useQuery({
    queryKey: ['admin', 'late-pickups', latePage, chargeStatus],
    queryFn: () => adminApi.latePickups({ page: latePage, limit: 20, charge_status: chargeStatus }),
    enabled: tab === 'late',
    refetchInterval: 30000,
  });

  const map = mapQuery.data;
  const busyDrivers = new Set((map?.deliveries || []).map((d) => d.driver?.id).filter(Boolean));
  const freeDrivers = (map?.drivers || []).filter((d) => !busyDrivers.has(d.id) && d.counts_for_dispatch).length;
  const waiting = (map?.deliveries || []).filter((d) => !d.driver).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Deliveries"
        description="Live operations: who is delivering what, where every delivery worker is, and pickups that ran late."
      />

      <div className="flex flex-wrap gap-2" role="tablist">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold border transition ${
              tab === id ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {tab === 'map' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Deliveries in progress" value={map ? map.deliveries.length : '—'} icon={Bike} tone="blue" />
            <StatCard label="Waiting for a rider" value={map ? waiting : '—'} icon={AlertTriangle} tone={waiting ? 'amber' : 'slate'} />
            <StatCard label="Free delivery workers" value={map ? freeDrivers : '—'} hint="online, location fresh" icon={Bike} tone="green" />
            <StatCard label="Kitchens open" value={map ? map.kitchens.length : '—'} icon={MapIcon} tone="slate" />
          </div>
          <Card bodyClassName="p-2 sm:p-3">
            {mapQuery.error ? <ErrorNote error={mapQuery.error} /> : <AdminOperationsMap data={map} />}
            <p className="px-2 pt-2 text-[11px] text-stone-400">
              Refreshes every 10 seconds{map ? ` · updated ${formatRelative(map.generated_at)}` : ''}. Tap a pin for details.
            </p>
          </Card>
        </>
      )}

      {tab === 'active' && (
        <Card bodyClassName="p-4 sm:p-5">
          {activeQuery.isLoading ? (
            <LoadingBlock />
          ) : activeQuery.error ? (
            <ErrorNote error={activeQuery.error} />
          ) : (activeQuery.data || EMPTY).items.length === 0 ? (
            <EmptyState icon={Bike} title="No active deliveries" description="Nothing in progress right now." />
          ) : (
            <>
              <Table
                columns={[
                  { key: 'order', label: 'Order' },
                  { key: 'vendor', label: 'Kitchen' },
                  { key: 'driver', label: 'Delivery worker' },
                  { key: 'pickup', label: 'Food / pickup' },
                  { key: 'status', label: 'Status' },
                  { key: 'updated', label: 'Updated' },
                ]}
              >
                {activeQuery.data.items.map((delivery) => (
                  <tr key={delivery.id} className="hover:bg-stone-50/60">
                    <td className="px-4 py-3 font-bold whitespace-nowrap">
                      <Link to={orderLink(delivery.order_id)} className="text-gray-900 hover:underline">
                        {delivery.order_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-stone-600">{delivery.vendor?.name || '—'}</td>
                    <td className="px-4 py-3 text-stone-600">
                      {delivery.driver ? (
                        <>
                          <p className="font-semibold text-gray-800">{delivery.driver.name}</p>
                          <p className="text-[11px] text-stone-400">{delivery.driver.phone}</p>
                        </>
                      ) : (
                        <span className="text-amber-700 font-semibold">Waiting · offered to {delivery.offered_to}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <PickupState delivery={delivery} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={delivery.status_label || delivery.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-500">{formatDate(delivery.updated_at)}</td>
                  </tr>
                ))}
              </Table>
              <Pagination page={activeQuery.data.page} limit={activeQuery.data.limit} total={activeQuery.data.total} onPage={setPage} />
            </>
          )}
        </Card>
      )}

      {tab === 'late' && (
        <Card
          title="Late pickups"
          description="Delivery workers who didn't collect the food within the grace period after it was ready. Charges are recorded as pending until charging is set up."
          action={
            <div className="w-44">
              <Select
                aria-label="Filter by charge"
                value={chargeStatus}
                onChange={(event) => {
                  setChargeStatus(event.target.value);
                  setLatePage(1);
                }}
              >
                <option value="">All charges</option>
                <option value="pending">Charge pending</option>
                <option value="charged">Charged</option>
                <option value="waived">Waived</option>
              </Select>
            </div>
          }
          bodyClassName="p-4 sm:p-5"
        >
          {lateQuery.isLoading ? (
            <LoadingBlock />
          ) : lateQuery.error ? (
            <ErrorNote error={lateQuery.error} />
          ) : (lateQuery.data || EMPTY).items.length === 0 ? (
            <EmptyState icon={Timer} title="No late pickups" description="Every collected order was picked up on time." />
          ) : (
            <>
              <p className="mb-3 text-xs font-semibold text-stone-500">
                {lateQuery.data.pending_charges} late pickup{lateQuery.data.pending_charges === 1 ? '' : 's'} with a pending charge.
              </p>
              <Table
                columns={[
                  { key: 'order', label: 'Order' },
                  { key: 'driver', label: 'Delivery worker' },
                  { key: 'ready', label: 'Food ready / due' },
                  { key: 'late', label: 'Late by' },
                  { key: 'charge', label: 'Charge' },
                ]}
              >
                {lateQuery.data.items.map((row) => (
                  <tr key={row.id} className="hover:bg-stone-50/60">
                    <td className="px-4 py-3">
                      <Link to={orderLink(row.order_id)} className="font-bold text-gray-900 hover:underline">
                        {row.order_number}
                      </Link>
                      <p className="text-[11px] text-stone-400">{row.vendor?.name}</p>
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      <p className="font-semibold text-gray-800">{row.driver?.name || '—'}</p>
                      <p className="text-[11px] text-stone-400">{row.driver?.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-500">
                      <p>Ready {formatDate(row.ready_at)}</p>
                      <p>Due {formatDate(row.pickup_due_at)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-red-700">{row.minutes_late ?? '—'} min</p>
                      <p className="text-[11px] text-stone-400">
                        {row.still_waiting ? 'Still not collected' : `Collected ${formatDate(row.picked_up_at)}`}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={row.charge_status === 'pending' ? 'amber' : row.charge_status === 'charged' ? 'red' : 'slate'}>
                        {row.charge_status === 'pending' ? 'Pending' : row.charge_status === 'charged' ? 'Charged' : 'Waived'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </Table>
              <Pagination page={lateQuery.data.page} limit={lateQuery.data.limit} total={lateQuery.data.total} onPage={setLatePage} />
            </>
          )}
        </Card>
      )}
    </div>
  );
}
