import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Search } from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import useFocusParam from '../../components/admin-dashboard/useFocusParam';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorNote,
  Field,
  Input,
  LoadingBlock,
  Modal,
  PageHeader,
  Pagination,
  Select,
  StatusBadge,
  Table,
  Textarea,
  formatDate,
  formatRwf,
  statusTone,
  toTitle,
} from '../../components/admin-dashboard/ui';

const EMPTY = { items: [], total: 0, page: 1, limit: 20 };
const ORDER_STATUSES = [
  'placed',
  'confirmed',
  'preparing',
  'ready',
  'assigned',
  'picked_up',
  'out_for_delivery',
  'delivered',
  'cancelled',
];
const CLOSED = ['delivered', 'cancelled'];

export default function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ status: '', from: '', to: '' });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState(null);
  const [statusOpen, setStatusOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [statusValue, setStatusValue] = useState('confirmed');
  const [note, setNote] = useState('');
  const [driverId, setDriverId] = useState('');
  const [error, setError] = useState('');
  const focusId = useFocusParam('order');

  useEffect(() => {
    if (focusId) setDetailId(focusId);
  }, [focusId]);

  const listQuery = useQuery({
    queryKey: ['admin', 'orders', { ...filters, page }],
    queryFn: () =>
      adminApi.listOrders({
        status: filters.status,
        search: filters.search,
        from: filters.from ? `${filters.from}T00:00:00` : '',
        to: filters.to ? `${filters.to}T23:59:59` : '',
        page,
        limit: 20,
      }),
  });

  const detailQuery = useQuery({
    queryKey: ['admin', 'order', detailId],
    queryFn: () => adminApi.getOrder(detailId),
    enabled: Boolean(detailId),
  });

  const driversQuery = useQuery({
    queryKey: ['admin', 'drivers', 'approved'],
    queryFn: () => adminApi.listDrivers({ status: 'approved', limit: 100 }),
    enabled: reassignOpen,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'order', detailId] });
  };

  const statusMutation = useMutation({
    mutationFn: () => adminApi.updateOrderStatus(detailId, { status: statusValue, note }),
    onSuccess: () => {
      invalidate();
      setStatusOpen(false);
      setNote('');
    },
  });
  const cancelMutation = useMutation({
    mutationFn: () => adminApi.cancelOrder(detailId, { reason: note }),
    onSuccess: () => {
      invalidate();
      setCancelOpen(false);
      setNote('');
    },
  });
  const reassignMutation = useMutation({
    mutationFn: () => adminApi.reassignDriver(detailId, { driver_id: driverId, note }),
    onSuccess: () => {
      invalidate();
      setReassignOpen(false);
      setNote('');
      setDriverId('');
    },
  });

  const data = listQuery.data || EMPTY;
  const order = detailQuery.data?.order;

  const applyFilter = (patch) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  };

  const openModal = (setter) => {
    setError('');
    setNote('');
    setter(true);
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Orders" description="Search, override statuses and reassign delivery workers." />

      <Card title="Filters" bodyClassName="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              applyFilter({ search: search.trim() });
            }}
            className="relative lg:col-span-2"
          >
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search order number, customer…"
              className="pl-9"
            />
          </form>
          <Select value={filters.status} onChange={(event) => applyFilter({ status: event.target.value })}>
            <option value="">All statuses</option>
            {ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {toTitle(status)}
              </option>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="date"
              value={filters.from}
              onChange={(event) => applyFilter({ from: event.target.value })}
            />
            <Input
              type="date"
              value={filters.to}
              onChange={(event) => applyFilter({ to: event.target.value })}
            />
          </div>
        </div>
      </Card>

      <Card bodyClassName="p-4 sm:p-5">
        {listQuery.isLoading ? (
          <LoadingBlock />
        ) : listQuery.error ? (
          <ErrorNote error={listQuery.error} />
        ) : data.items.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No orders found" description="Adjust the filters above." />
        ) : (
          <>
            <Table
              columns={[
                { key: 'order', label: 'Order' },
                { key: 'parties', label: 'Vendor / Customer' },
                { key: 'amount', label: 'Total' },
                { key: 'status', label: 'Status' },
                { key: 'created', label: 'Placed' },
                { key: 'actions', label: '', className: 'text-right' },
              ]}
            >
              {data.items.map((row) => (
                <tr key={row.id} className="hover:bg-stone-50/60">
                  <td className="px-4 py-3">
                    <p className="font-bold text-gray-900">{row.order_number}</p>
                    <p className="text-[11px] text-stone-400">
                      {toTitle(row.payment_method)} · {row.payment_status}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-stone-600">
                    <p className="text-sm font-semibold text-gray-800">{row.vendor?.name || '—'}</p>
                    <p className="text-[11px] text-stone-400">{row.customer?.name || '—'}</p>
                  </td>
                  <td className="px-4 py-3 font-bold text-gray-900">{formatRwf(row.total_amount_rwf)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.status_label || row.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-500">{formatDate(row.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="secondary" size="sm" onClick={() => setDetailId(row.id)}>
                      Details
                    </Button>
                  </td>
                </tr>
              ))}
            </Table>
            <Pagination page={data.page} limit={data.limit} total={data.total} onPage={setPage} />
          </>
        )}
      </Card>

      <Modal
        open={Boolean(detailId)}
        title={order ? `Order ${order.order_number}` : 'Order details'}
        onClose={() => setDetailId(null)}
        width="max-w-3xl"
      >
        {detailQuery.isLoading ? (
          <LoadingBlock />
        ) : detailQuery.error ? (
          <ErrorNote error={detailQuery.error} />
        ) : order ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={order.status_label || order.status} />
              <Badge tone={statusTone(order.payment_status)}>Payment: {toTitle(order.payment_status)}</Badge>
              <span className="text-xs text-stone-500">Placed {formatDate(order.created_at)}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <Info label="Vendor" value={order.vendor?.name || '—'} />
              <Info label="Customer" value={order.customer?.name || '—'} />
              <Info label="Delivery worker" value={order.driver?.name || 'Unassigned'} />
              <Info label="Subtotal" value={formatRwf(order.subtotal_rwf)} />
              <Info label="Delivery fee" value={formatRwf(order.delivery_fee_rwf)} />
              <Info label="Total" value={formatRwf(order.total_amount_rwf)} />
              <Info
                label="Order type"
                value={order.order_type_label || toTitle(order.order_type || 'immediate')}
              />
              {order.scheduled_for && (
                <Info
                  label="Scheduled for"
                  value={new Date(order.scheduled_for).toLocaleString([], {
                    weekday: 'short',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                />
              )}
              {order.special_text && <Info label="Special" value={order.special_text} />}
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-wider text-stone-400 mb-2">Items</p>
              <div className="divide-y divide-stone-50 rounded-xl border border-stone-100">
                {order.items.map((item, index) => (
                  <div key={`${item.menu_item_id || index}`} className="flex items-center justify-between px-4 py-2">
                    <span className="text-sm text-gray-800">
                      {item.quantity}× {item.name}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">{formatRwf(item.subtotal_rwf)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-wider text-stone-400 mb-2">History</p>
              <div className="space-y-2">
                {order.status_history.map((entry, index) => (
                  <div key={index} className="flex items-start gap-2 text-xs">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-stone-300" />
                    <div>
                      <p className="font-bold text-gray-800">{entry.label}</p>
                      <p className="text-stone-400">
                        {formatDate(entry.at)} {entry.note ? `· ${entry.note}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-stone-100">
              <Button onClick={() => openModal(setStatusOpen)}>Set status</Button>
              <Button
                variant="secondary"
                onClick={() => openModal(setReassignOpen)}
                disabled={CLOSED.includes(order.status)}
              >
                Reassign delivery worker
              </Button>
              <Button
                variant="danger"
                onClick={() => openModal(setCancelOpen)}
                disabled={CLOSED.includes(order.status)}
              >
                Cancel order
              </Button>
            </div>

            {statusMutation.isError && <ErrorNote error={statusMutation.error} />}
            {cancelMutation.isError && <ErrorNote error={cancelMutation.error} />}
            {reassignMutation.isError && <ErrorNote error={reassignMutation.error} />}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={statusOpen}
        title="Set order status"
        onClose={() => setStatusOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setStatusOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => statusMutation.mutate()} disabled={statusMutation.isPending}>
              {statusMutation.isPending ? 'Saving…' : 'Apply'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Status">
            <Select value={statusValue} onChange={(event) => setStatusValue(event.target.value)}>
              {ORDER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {toTitle(status)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Note (optional)">
            <Textarea value={note} onChange={(event) => setNote(event.target.value)} />
          </Field>
        </div>
      </Modal>

      <Modal
        open={cancelOpen}
        title="Cancel order"
        onClose={() => setCancelOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelOpen(false)}>
              Keep order
            </Button>
            <Button variant="danger" onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending}>
              {cancelMutation.isPending ? 'Cancelling…' : 'Cancel order'}
            </Button>
          </>
        }
      >
        <Field label="Reason">
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Why is this order being cancelled?"
          />
        </Field>
      </Modal>

      <Modal
        open={reassignOpen}
        title="Reassign delivery worker"
        onClose={() => setReassignOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setReassignOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!driverId) {
                  setError('Select a delivery worker.');
                  return;
                }
                setError('');
                reassignMutation.mutate();
              }}
              disabled={reassignMutation.isPending}
            >
              {reassignMutation.isPending ? 'Assigning…' : 'Assign'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Delivery worker">
            <Select value={driverId} onChange={(event) => setDriverId(event.target.value)}>
              <option value="">Select an approved delivery worker…</option>
              {(driversQuery.data?.items || []).map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.name} · {driver.phone || toTitle(driver.vehicle_type)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Note (optional)">
            <Textarea value={note} onChange={(event) => setNote(event.target.value)} />
          </Field>
          {error && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
          )}
        </div>
      </Modal>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-xl bg-stone-50 px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">{label}</p>
      <p className="text-sm font-bold text-gray-900 mt-0.5">{value}</p>
    </div>
  );
}
