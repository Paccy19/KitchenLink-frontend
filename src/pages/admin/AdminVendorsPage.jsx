import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Store } from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import useFocusParam from '../../components/admin-dashboard/useFocusParam';
import {
  Button,
  Card,
  EmptyState,
  ErrorNote,
  Input,
  LoadingBlock,
  Modal,
  PageHeader,
  Pagination,
  Select,
  StatCard,
  StatusBadge,
  Table,
  formatDate,
  formatRwf,
  toTitle,
} from '../../components/admin-dashboard/ui';
import StatusModal from '../../components/admin-dashboard/StatusModal';

const EMPTY = { items: [], total: 0, page: 1, limit: 20 };

export default function AdminVendorsPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ status: '', search: '' });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [toast, setToast] = useState('');
  const focusId = useFocusParam('vendor');

  useEffect(() => {
    if (focusId) setDetailId(focusId);
  }, [focusId]);

  const listQuery = useQuery({
    queryKey: ['admin', 'vendors', { ...filters, page }],
    queryFn: () => adminApi.listVendors({ ...filters, page, limit: 20 }),
  });
  const countsQuery = useQuery({
    queryKey: ['admin', 'vendors', 'counts'],
    queryFn: () => adminApi.vendorCounts(),
  });
  const detailQuery = useQuery({
    queryKey: ['admin', 'vendor', detailId],
    queryFn: () => adminApi.getVendor(detailId),
    enabled: Boolean(detailId),
  });

  const mutation = useMutation({
    mutationFn: ({ vendor, payload }) => adminApi.setVendorStatus(vendor.id, payload),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'vendors'] });
      setTarget(null);
      setToast(
        result.cancelled_orders > 0
          ? `Vendor updated. ${result.cancelled_orders} open order(s) cancelled.`
          : 'Vendor status updated.',
      );
    },
  });

  const data = listQuery.data || EMPTY;
  const counts = countsQuery.data;

  const applyFilter = (patch) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Vendors" description="Approve, suspend and inspect marketplace kitchens." />

      {toast && (
        <div className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
          {toast}
        </div>
      )}

      {counts && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard label="Total" value={counts.total} />
          <StatCard label="Pending" value={counts.pending} tone="amber" />
          <StatCard label="Approved" value={counts.approved} tone="green" />
          <StatCard label="Rejected" value={counts.rejected} tone="red" />
          <StatCard label="Suspended" value={counts.suspended} tone="red" />
        </div>
      )}

      <Card title="Filters" bodyClassName="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              applyFilter({ search: search.trim() });
            }}
            className="relative sm:col-span-2"
          >
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search vendors by name…"
              className="pl-9"
            />
          </form>
          <Select value={filters.status} onChange={(event) => applyFilter({ status: event.target.value })}>
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="suspended">Suspended</option>
          </Select>
        </div>
      </Card>

      <Card bodyClassName="p-4 sm:p-5">
        {listQuery.isLoading ? (
          <LoadingBlock />
        ) : listQuery.error ? (
          <ErrorNote error={listQuery.error} />
        ) : data.items.length === 0 ? (
          <EmptyState icon={Store} title="No vendors found" description="Adjust the filters above." />
        ) : (
          <>
            <Table
              columns={[
                { key: 'name', label: 'Vendor' },
                { key: 'contact', label: 'Contact' },
                { key: 'status', label: 'Status' },
                { key: 'sales', label: 'Sales' },
                { key: 'created', label: 'Joined' },
                { key: 'actions', label: '', className: 'text-right' },
              ]}
            >
              {data.items.map((vendor) => (
                <tr key={vendor.id} className="hover:bg-stone-50/60">
                  <td className="px-4 py-3">
                    <p className="font-bold text-gray-900">{vendor.name}</p>
                    <p className="text-[11px] text-stone-400">{toTitle(vendor.vendor_type)}</p>
                  </td>
                  <td className="px-4 py-3 text-stone-600">
                    <p>{vendor.phone || '—'}</p>
                    <p className="text-[11px] text-stone-400">{vendor.neighborhood || ''}</p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={vendor.status} />
                  </td>
                  <td className="px-4 py-3 text-stone-700 font-bold">{formatRwf(vendor.total_sales_rwf)}</td>
                  <td className="px-4 py-3 text-xs text-stone-500">
                    {formatDate(vendor.created_at, { withTime: false })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button variant="ghost" size="sm" onClick={() => setDetailId(vendor.id)}>
                        View
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => setTarget(vendor)}>
                        Status
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
            <Pagination page={data.page} limit={data.limit} total={data.total} onPage={setPage} />
          </>
        )}
      </Card>

      <StatusModal
        open={Boolean(target)}
        title={target ? `Change status · ${target.name}` : 'Change status'}
        statuses={['pending', 'approved', 'rejected', 'suspended']}
        current={target?.status}
        submitting={mutation.isPending}
        onClose={() => setTarget(null)}
        onSubmit={(payload) => mutation.mutate({ vendor: target, payload })}
      />

      <Modal
        open={Boolean(detailId)}
        title={detailQuery.data?.vendor?.name || 'Vendor details'}
        onClose={() => setDetailId(null)}
        width="max-w-2xl"
      >
        {detailQuery.isLoading ? (
          <LoadingBlock />
        ) : detailQuery.error ? (
          <ErrorNote error={detailQuery.error} />
        ) : detailQuery.data ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <Info label="Status" value={<StatusBadge status={detailQuery.data.vendor.status} />} />
              <Info label="Type" value={toTitle(detailQuery.data.vendor.vendor_type)} />
              <Info label="Rating" value={detailQuery.data.vendor.rating} />
              <Info label="Total Sales" value={formatRwf(detailQuery.data.vendor.total_sales_rwf)} />
              <Info label="Balance" value={formatRwf(detailQuery.data.vendor.available_balance_rwf)} />
              <Info label="Phone" value={detailQuery.data.vendor.phone || '—'} />
            </div>

            {(detailQuery.data.vendor.rejection_reason || detailQuery.data.vendor.suspension_reason) && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                {detailQuery.data.vendor.suspension_reason || detailQuery.data.vendor.rejection_reason}
              </p>
            )}

            <div>
              <p className="text-xs font-black uppercase tracking-wider text-stone-400 mb-2">
                Recent orders
              </p>
              <div className="divide-y divide-stone-50 rounded-xl border border-stone-100">
                {detailQuery.data.recent_orders.length === 0 && (
                  <p className="px-4 py-4 text-sm text-stone-400">No recent orders.</p>
                )}
                {detailQuery.data.recent_orders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                    <span className="text-sm font-bold text-gray-900">{order.order_number}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-sm text-stone-600">{formatRwf(order.total_amount_rwf)}</span>
                      <StatusBadge status={order.status_label || order.status} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      {mutation.isError && <ErrorNote error={mutation.error} />}
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
