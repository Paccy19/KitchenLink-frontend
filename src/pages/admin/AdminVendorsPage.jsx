import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Store,
  FileText,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import Can from '../../components/admin-dashboard/Can';
import useFocusParam from '../../components/admin-dashboard/useFocusParam';
import {
  Badge,
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
} from '../../components/admin-dashboard/ui';
import StatusModal from '../../components/admin-dashboard/StatusModal';
import LiveRouteMap from '../../components/tracking/LiveRouteMap';
import { KIGALI_CENTER } from '../../lib/mapStyle';
import VendorTypeBadge from '../../components/common/VendorTypeBadge';
import VendorTypeFilter from '../../components/common/VendorTypeFilter';
import { VENDOR_TYPES, getVendorType } from '../../data/vendorTypes';

const EMPTY = { items: [], total: 0, page: 1, limit: 20 };

export default function AdminVendorsPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ status: '', search: '' });
  // Vendor type filter (codes) and whether the table is grouped by type.
  const [vendorTypes, setVendorTypes] = useState([]);
  const [groupByType, setGroupByType] = useState(false);
  const [newType, setNewType] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [viewedDocs, setViewedDocs] = useState(() => new Set());
  const [toast, setToast] = useState('');
  const focusId = useFocusParam('vendor');

  useEffect(() => {
    if (focusId) setDetailId(focusId);
  }, [focusId]);

  useEffect(() => {
    setViewedDocs(new Set());
    setNewType('');
  }, [detailId]);

  const listQuery = useQuery({
    queryKey: ['admin', 'vendors', { ...filters, vendorTypes, page }],
    queryFn: () =>
      adminApi.listVendors({
        ...filters,
        vendor_type: vendorTypes.length ? vendorTypes.join(',') : undefined,
        page,
        limit: 20,
      }),
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
      queryClient.invalidateQueries({ queryKey: ['admin', 'vendor'] });
      setTarget(null);
      setToast(
        result.cancelled_orders > 0
          ? `Vendor updated. ${result.cancelled_orders} open order(s) cancelled.`
          : 'Vendor status updated.',
      );
    },
  });

  const typeMutation = useMutation({
    mutationFn: (body) => adminApi.setVendorType(detailId, body),
    onSuccess: (_result, body) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'vendors'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'vendor'] });
      setNewType('');
      setToast(
        body.decision === 'reject'
          ? 'Type change request declined.'
          : body.decision === 'approve'
            ? 'Type change approved.'
            : 'Vendor type updated.',
      );
    },
  });

  const nationwideMutation = useMutation({
    mutationFn: (enabled) => adminApi.setVendorNationwide(detailId, enabled),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'vendors'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'vendor'] });
      setToast(result.vendor?.nationwide?.enabled ? 'Nationwide orders switched on.' : 'Nationwide orders switched off.');
    },
  });

  const reviewMutation = useMutation({
    mutationFn: () => adminApi.reviewVendorDocuments(detailId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'vendors'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'vendor'] });
      setToast('Verification documents marked as reviewed.');
    },
  });

  const markViewed = (index) => {
    setViewedDocs((prev) => {
      if (prev.has(index)) return prev;
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  };

  const data = listQuery.data || EMPTY;
  const counts = countsQuery.data;
  // How many vendors of each type (within the chosen status), for the type chips.
  const typeCounts = Object.fromEntries((data.type_counts || []).map((row) => [row.code, row.count]));
  const rows = groupByType
    ? [...data.items].sort(
        (a, b) =>
          VENDOR_TYPES.findIndex((t) => t.code === getVendorType(a.vendor_type).code) -
          VENDOR_TYPES.findIndex((t) => t.code === getVendorType(b.vendor_type).code),
      )
    : data.items;
  const detailVendor = detailQuery.data?.vendor;
  const documents = detailVendor?.verification_documents || [];
  const allDocumentsViewed =
    documents.length > 0 && documents.every((_, index) => viewedDocs.has(index));
  const documentsReviewed = Boolean(detailVendor?.documents_reviewed_at);

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

      <Card title="Filters" bodyClassName="p-4 space-y-3">
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
        <VendorTypeFilter
          value={vendorTypes}
          onChange={(codes) => {
            setVendorTypes(codes);
            setPage(1);
          }}
          counts={typeCounts}
          label="Vendor type"
        />
        <label className="inline-flex items-center gap-2 text-xs font-semibold text-stone-600">
          <input type="checkbox" checked={groupByType} onChange={(event) => setGroupByType(event.target.checked)} />
          Group the list by vendor type
        </label>
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
              {rows.map((vendor, index) => {
                const typeCode = getVendorType(vendor.vendor_type).code;
                const startsGroup = groupByType && (index === 0 || getVendorType(rows[index - 1].vendor_type).code !== typeCode);
                return (
                <React.Fragment key={vendor.id}>
                {startsGroup && (
                  <tr className="bg-stone-50">
                    <td colSpan={6} className="px-4 py-2">
                      <span className="inline-flex items-center gap-2">
                        <VendorTypeBadge type={typeCode} />
                        <span className="text-[11px] font-bold text-stone-500">
                          {rows.filter((row) => getVendorType(row.vendor_type).code === typeCode).length} on this page
                          {typeCounts[typeCode] != null ? ` · ${typeCounts[typeCode]} in total` : ''}
                        </span>
                      </span>
                    </td>
                  </tr>
                )}
                <tr className="hover:bg-stone-50/60">
                  <td className="px-4 py-3">
                    <p className="font-bold text-gray-900">{vendor.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      <VendorTypeBadge type={vendor.vendor_type} size="xs" />
                      {vendor.nationwide?.enabled && <Badge tone="violet">Nationwide</Badge>}
                      {vendor.vendor_type_request && (
                        <Badge tone="amber">Wants {vendor.vendor_type_request.vendor_type_label}</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-stone-600">
                    <p>{vendor.phone || '—'}</p>
                    <p className="text-[11px] text-stone-400">{vendor.neighborhood || ''}</p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={vendor.status} />
                    <Badge tone={vendor.is_open ? 'green' : 'slate'} className="mt-1">
                      {vendor.is_open ? 'Store open' : 'Store closed'}
                    </Badge>
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
                      <Can permission="vendors:write">
                        <Button variant="secondary" size="sm" onClick={() => setTarget(vendor)}>
                          Status
                        </Button>
                      </Can>
                    </div>
                  </td>
                </tr>
                </React.Fragment>
                );
              })}
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
        approveBlocked={
          Boolean(target) &&
          target.status !== 'approved' &&
          (target.verification_documents?.length || 0) > 0 &&
          !target.documents_reviewed_at
        }
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
              <Info label="Type" value={<VendorTypeBadge type={detailQuery.data.vendor.vendor_type} />} />
              <Info label="Rating" value={detailQuery.data.vendor.rating} />
              <Info label="Total Sales" value={formatRwf(detailQuery.data.vendor.total_sales_rwf)} />
              <Info label="Balance" value={formatRwf(detailQuery.data.vendor.available_balance_rwf)} />
              <Info label="Phone" value={detailQuery.data.vendor.phone || '—'} />
            </div>

            <VendorTypeAdmin
              vendor={detailQuery.data.vendor}
              newType={newType}
              setNewType={setNewType}
              mutation={typeMutation}
            />

            <NationwideAdmin vendor={detailQuery.data.vendor} mutation={nationwideMutation} />

            <KitchenLocation vendor={detailQuery.data.vendor} />

            {(detailQuery.data.vendor.rejection_reason || detailQuery.data.vendor.suspension_reason) && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                {detailQuery.data.vendor.suspension_reason || detailQuery.data.vendor.rejection_reason}
              </p>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-black uppercase tracking-wider text-stone-400">
                  Verification documents
                </p>
                {documentsReviewed ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                    <ShieldCheck className="w-3.5 h-3.5" /> Reviewed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700">
                    <ShieldAlert className="w-3.5 h-3.5" /> Not reviewed
                  </span>
                )}
              </div>

              {documents.length === 0 ? (
                <p className="text-sm text-stone-400">No verification documents uploaded.</p>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc, index) => {
                    const isImage = /\.(png|jpe?g|webp|gif)$/i.test(doc.url || '');
                    const opened = viewedDocs.has(index);
                    return (
                      <div
                        key={`${doc.url}-${index}`}
                        className="flex items-center gap-3 rounded-xl border border-stone-100 bg-stone-50/60 p-2.5"
                      >
                        <span className="w-10 h-10 rounded-lg overflow-hidden bg-white border border-stone-100 flex items-center justify-center flex-shrink-0">
                          {isImage ? (
                            <img src={doc.url} alt={doc.label} className="w-full h-full object-cover" />
                          ) : (
                            <FileText className="w-5 h-5 text-stone-400" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-gray-900 truncate">
                            {doc.label || `Document ${index + 1}`}
                          </p>
                          <p className="text-[11px] text-stone-400">
                            {formatDate(doc.uploaded_at, { withTime: false })}
                          </p>
                        </div>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => markViewed(index)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                            opened
                              ? 'text-emerald-700 bg-emerald-50'
                              : 'text-[#3d1b0c] bg-white border border-stone-200 hover:bg-stone-100'
                          }`}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          {opened ? 'Opened' : 'Open'}
                        </a>
                      </div>
                    );
                  })}
                </div>
              )}

              <Can permission="vendors:write">
                {!documentsReviewed && documents.length > 0 && (
                  <div className="flex flex-wrap items-center gap-3 mt-3">
                    <Button
                      size="sm"
                      disabled={!allDocumentsViewed || reviewMutation.isPending}
                      onClick={() => reviewMutation.mutate()}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {reviewMutation.isPending ? 'Saving…' : 'Mark documents as reviewed'}
                    </Button>
                    {!allDocumentsViewed && (
                      <p className="text-[11px] text-stone-400">
                        Open every document above first ({viewedDocs.size}/{documents.length}).
                      </p>
                    )}
                  </div>
                )}

                {detailVendor?.status !== 'approved' && (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2.5 mt-3">
                    <p className="text-xs font-semibold text-emerald-800">
                      {documentsReviewed
                        ? 'Documents reviewed. You can approve this vendor.'
                        : 'Review and confirm the documents before approving.'}
                    </p>
                    <Button
                      size="sm"
                      disabled={!documentsReviewed || mutation.isPending}
                      onClick={() =>
                        mutation.mutate({ vendor: detailVendor, payload: { status: 'approved' } })
                      }
                    >
                      Approve vendor
                    </Button>
                  </div>
                )}
              </Can>
              {reviewMutation.isError && <ErrorNote error={reviewMutation.error} className="mt-2" />}
            </div>

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

/**
 * The kitchen's registered location (set by the vendor at registration or
 * in their profile) and whether the store is open — only open stores are on
 * the customer map and offered to delivery workers.
 */
function KitchenLocation({ vendor }) {
  const { latitude: lat, longitude: lng, updated_at: updatedAt } = vendor.location || {};
  const hasCoords = lat != null && lng != null;
  // Vendors registered before kitchen coordinates were collected got the city centre.
  const isDefault = hasCoords && Math.abs(lat - KIGALI_CENTER.lat) < 1e-4 && Math.abs(lng - KIGALI_CENTER.lng) < 1e-4;
  return (
    <div className="rounded-2xl border border-stone-200 overflow-hidden">
      <div className="px-4 py-3 flex flex-wrap items-start justify-between gap-2">
        <div className="text-sm min-w-0">
          <p className="text-xs font-black uppercase tracking-wider text-stone-400">Kitchen location</p>
          <p className="font-bold text-gray-900 mt-1">{[vendor.address, vendor.neighborhood].filter(Boolean).join(', ') || 'No address'}</p>
          <p className="text-xs text-stone-500 font-mono">
            {hasCoords ? `${lat.toFixed(6)}, ${lng.toFixed(6)}` : 'No coordinates'}
            {updatedAt ? ` · set ${formatDate(updatedAt)}` : ''}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Badge tone={vendor.is_open ? 'green' : 'slate'}>{vendor.is_open ? 'Store open · on the map' : 'Store closed · hidden'}</Badge>
          {hasCoords && (
            <a
              href={`https://www.google.com/maps?q=${lat},${lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-bold text-sky-700 hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Google Maps
            </a>
          )}
        </div>
      </div>
      {isDefault && (
        <p className="mx-4 mb-3 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          This is the Kigali city-centre default, not the real kitchen. Ask the vendor to set their location in Profile.
        </p>
      )}
      {hasCoords && (
        <LiveRouteMap kitchen={{ lat, lng, label: vendor.name }} className="h-56 !rounded-none" />
      )}
    </div>
  );
}

/**
 * Vendor type in the detail view: answer the vendor's change request, or set
 * the type directly. The vendor is told either way.
 */
function VendorTypeAdmin({ vendor, newType, setNewType, mutation }) {
  const request = vendor.vendor_type_request;
  return (
    <div className="rounded-2xl border border-stone-200 px-4 py-3 space-y-3">
      <p className="text-xs font-black uppercase tracking-wider text-stone-400">Vendor type</p>
      {request && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 space-y-2">
          <p className="text-xs font-semibold text-amber-900 flex flex-wrap items-center gap-1.5">
            Asked to change from <VendorTypeBadge type={vendor.vendor_type} size="xs" /> to{' '}
            <VendorTypeBadge type={request.vendor_type} size="xs" />
            {request.requested_at ? <span className="text-amber-800">· {formatDate(request.requested_at)}</span> : null}
          </p>
          {request.reason && <p className="text-xs text-amber-800">“{request.reason}”</p>}
          <Can permission="vendors:write">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={mutation.isPending} onClick={() => mutation.mutate({ decision: 'approve' })}>
                Approve change
              </Button>
              <Button size="sm" variant="secondary" disabled={mutation.isPending} onClick={() => mutation.mutate({ decision: 'reject' })}>
                Decline
              </Button>
            </div>
          </Can>
        </div>
      )}
      <Can permission="vendors:write">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={newType} onChange={(event) => setNewType(event.target.value)} className="max-w-xs">
            <option value="">Change type to…</option>
            {VENDOR_TYPES.filter((type) => type.code !== getVendorType(vendor.vendor_type).code).map((type) => (
              <option key={type.code} value={type.code}>
                {type.label}
              </option>
            ))}
          </Select>
          <Button
            size="sm"
            variant="secondary"
            disabled={!newType || mutation.isPending}
            onClick={() => mutation.mutate({ vendor_type: newType })}
          >
            {mutation.isPending ? 'Saving…' : 'Save type'}
          </Button>
        </div>
      </Can>
      {mutation.isError && <ErrorNote error={mutation.error} />}
    </div>
  );
}

/**
 * Nationwide events: the kitchen takes orders anywhere in Rwanda and brings
 * orders beyond the delivery workers' range itself. Caterers are on by type;
 * the admin can switch any kitchen on or off, or go back to the type default.
 */
function NationwideAdmin({ vendor, mutation }) {
  const nationwide = vendor.nationwide || {};
  const choice = nationwide.source === 'admin' ? (nationwide.enabled ? 'on' : 'off') : 'default';
  const options = [
    { value: 'default', label: `Type default (${nationwide.by_type ? 'on' : 'off'})`, enabled: null },
    { value: 'on', label: 'On', enabled: true },
    { value: 'off', label: 'Off', enabled: false },
  ];
  return (
    <div className="rounded-2xl border border-stone-200 px-4 py-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-black uppercase tracking-wider text-stone-400">Nationwide events</p>
        <Badge tone={nationwide.enabled ? 'violet' : 'slate'}>{nationwide.enabled ? 'On' : 'Off'}</Badge>
      </div>
      <p className="text-xs text-stone-500">
        Takes orders anywhere in Rwanda. Orders beyond the delivery workers' range are brought by the kitchen itself, for its travel fee
        ({Number(nationwide.travel_base_fee_rwf || 0).toLocaleString()} RWF + {Number(nationwide.travel_per_km_rwf || 0).toLocaleString()} RWF/km).
        Caterers are on by default.
      </p>
      <Can permission="vendors:write">
        <div className="flex flex-wrap gap-2">
          {options.map((option) => (
            <Button
              key={option.value}
              size="sm"
              variant={choice === option.value ? 'primary' : 'secondary'}
              disabled={mutation.isPending || choice === option.value}
              onClick={() => mutation.mutate(option.enabled)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </Can>
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
