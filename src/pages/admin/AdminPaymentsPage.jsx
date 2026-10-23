import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Percent, Plus, Trash2 } from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import { VENDOR_TYPES } from '../../data/vendorTypes';
import { useAdmin } from '../../context/AdminContext';
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
  StatCard,
  StatusBadge,
  Table,
  formatDate,
  formatRwf,
  toTitle,
} from '../../components/admin-dashboard/ui';

const PAYMENT_STATUSES = ['pending', 'processing', 'successful', 'failed', 'refunded'];
const EMPTY = { items: [], total: 0, page: 1, limit: 20 };

const emptyCommission = {
  name: '',
  scope: 'global',
  vendor_id: '',
  category_id: '',
  vendor_type: '',
  percentage: 15,
  fixed_fee_rwf: 0,
  is_active: true,
};

export default function AdminPaymentsPage() {
  const queryClient = useQueryClient();
  const { can } = useAdmin();
  const canSeeCommissions = can('commissions:read');
  const canEditCommissions = can('commissions:write');
  const [filters, setFilters] = useState({ status: '', method: '' });
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyCommission);
  const [formError, setFormError] = useState('');

  const paymentsQuery = useQuery({
    queryKey: ['admin', 'payments', { ...filters, page }],
    queryFn: () => adminApi.listPayments({ ...filters, page, limit: 20 }),
  });
  const summaryQuery = useQuery({
    queryKey: ['admin', 'payments', 'summary'],
    queryFn: () => adminApi.paymentSummary(),
  });
  const commissionsQuery = useQuery({
    queryKey: ['admin', 'commissions'],
    queryFn: () => adminApi.listCommissions({ limit: 100 }),
    enabled: canSeeCommissions,
  });
  const categoriesQuery = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: () => adminApi.listCategories(),
    enabled: canEditCommissions,
  });
  const vendorsQuery = useQuery({
    queryKey: ['admin', 'vendors', 'for-commission'],
    queryFn: () => adminApi.listVendors({ limit: 100 }),
    enabled: canEditCommissions && form.scope === 'vendor',
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'commissions'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'payments'] });
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name.trim(),
        scope: form.scope,
        percentage: Number(form.percentage),
        fixed_fee_rwf: Number(form.fixed_fee_rwf) || 0,
        is_active: Boolean(form.is_active),
      };
      if (form.scope === 'vendor') payload.vendor_id = form.vendor_id;
      if (form.scope === 'category') payload.category_id = form.category_id;
      if (form.scope === 'vendor_type') payload.vendor_type = form.vendor_type;
      return editing
        ? adminApi.updateCommission(editing.id, payload)
        : adminApi.createCommission(payload);
    },
    onSuccess: () => {
      invalidate();
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.deleteCommission(id),
    onSuccess: invalidate,
  });

  const data = paymentsQuery.data || EMPTY;
  const summary = summaryQuery.data;
  const commissions = commissionsQuery.data?.items || [];

  const openCreate = () => {
    setForm(emptyCommission);
    setFormError('');
    setEditing({ id: null });
  };
  const openEdit = (commission) => {
    setForm({
      name: commission.name,
      scope: commission.scope,
      vendor_id: commission.vendor_id || '',
      category_id: commission.category_id || '',
      vendor_type: commission.vendor_type || '',
      percentage: commission.percentage,
      fixed_fee_rwf: commission.fixed_fee_rwf,
      is_active: commission.is_active,
    });
    setFormError('');
    setEditing(commission);
  };

  const submitForm = () => {
    if (!form.name.trim()) {
      setFormError('Name is required.');
      return;
    }
    if (form.scope === 'vendor' && !form.vendor_id) {
      setFormError('Select a vendor for vendor scope.');
      return;
    }
    if (form.scope === 'category' && !form.category_id) {
      setFormError('Select a category for category scope.');
      return;
    }
    if (form.scope === 'vendor_type' && !form.vendor_type) {
      setFormError('Select a vendor type.');
      return;
    }
    setFormError('');
    saveMutation.mutate();
  };

  const applyFilter = (patch) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Payments & Commissions" description="Track transactions and set commission rules." />

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Successful Total" value={formatRwf(summary.successful_total_rwf)} tone="green" />
          <StatCard label="Successful Count" value={summary.successful_count} tone="green" />
          {summary.by_status.slice(0, 2).map((row) => (
            <StatCard
              key={row.status}
              label={toTitle(row.status)}
              value={formatRwf(row.total_rwf)}
              hint={`${row.count} payments`}
              tone="blue"
            />
          ))}
        </div>
      )}

      <Card
        title="Transactions"
        action={
          <div className="flex items-center gap-2">
            <Select
              value={filters.status}
              onChange={(event) => applyFilter({ status: event.target.value })}
              className="!py-1.5 text-xs"
            >
              <option value="">All statuses</option>
              {PAYMENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {toTitle(status)}
                </option>
              ))}
            </Select>
            <Select
              value={filters.method}
              onChange={(event) => applyFilter({ method: event.target.value })}
              className="!py-1.5 text-xs"
            >
              <option value="">All methods</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="card">Card</option>
              <option value="ekash">eKash</option>
              <option value="cash">Cash</option>
            </Select>
          </div>
        }
        bodyClassName="p-4 sm:p-5"
      >
        {paymentsQuery.isLoading ? (
          <LoadingBlock />
        ) : paymentsQuery.error ? (
          <ErrorNote error={paymentsQuery.error} />
        ) : data.items.length === 0 ? (
          <EmptyState icon={CreditCard} title="No payments found" />
        ) : (
          <>
            <Table
              columns={[
                { key: 'order', label: 'Order' },
                { key: 'customer', label: 'Customer' },
                { key: 'amount', label: 'Amount' },
                { key: 'method', label: 'Method' },
                { key: 'status', label: 'Status' },
                { key: 'created', label: 'Date' },
              ]}
            >
              {data.items.map((payment) => (
                <tr key={payment.id} className="hover:bg-stone-50/60">
                  <td className="px-4 py-3 font-bold text-gray-900">{payment.order_number || '—'}</td>
                  <td className="px-4 py-3 text-stone-600">{payment.customer?.name || '—'}</td>
                  <td className="px-4 py-3 font-bold text-gray-900">{formatRwf(payment.amount_rwf)}</td>
                  <td className="px-4 py-3 text-stone-600">{toTitle(payment.provider || payment.method)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={payment.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-500">{formatDate(payment.created_at)}</td>
                </tr>
              ))}
            </Table>
            <Pagination page={data.page} limit={data.limit} total={data.total} onPage={setPage} />
          </>
        )}
      </Card>

      {canSeeCommissions && (
      <Card
        title="Commission Rules"
        description={
          canEditCommissions
            ? 'Most specific active scope wins: vendor › category › vendor type › global.'
            : 'Only the owner can change the commission rate.'
        }
        action={
          canEditCommissions ? (
            <Button size="sm" onClick={openCreate}>
              <Plus className="w-3.5 h-3.5" /> New rule
            </Button>
          ) : null
        }
        bodyClassName="p-4 sm:p-5"
      >
        {commissionsQuery.isLoading ? (
          <LoadingBlock />
        ) : commissionsQuery.error ? (
          <ErrorNote error={commissionsQuery.error} />
        ) : commissions.length === 0 ? (
          <EmptyState icon={Percent} title="No commission rules" description="Create a global rule to get started." />
        ) : (
          <Table
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'scope', label: 'Scope' },
              { key: 'target', label: 'Target' },
              { key: 'rate', label: 'Rate' },
              { key: 'active', label: 'Active' },
              { key: 'actions', label: '', className: 'text-right' },
            ]}
          >
            {commissions.map((commission) => (
              <tr key={commission.id} className="hover:bg-stone-50/60">
                <td className="px-4 py-3 font-bold text-gray-900">{commission.name}</td>
                <td className="px-4 py-3">
                  <Badge tone="violet">{toTitle(commission.scope)}</Badge>
                </td>
                <td className="px-4 py-3 text-stone-600">
                  {commission.vendor_name || commission.category_name || commission.vendor_type_label || commission.vendor_type || 'All'}
                </td>
                <td className="px-4 py-3 font-bold text-gray-900">
                  {commission.percentage}%
                  {commission.fixed_fee_rwf > 0 && (
                    <span className="text-[11px] text-stone-400"> + {formatRwf(commission.fixed_fee_rwf)}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={commission.is_active ? 'green' : 'slate'}>
                    {commission.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className={`flex items-center justify-end gap-1.5 ${canEditCommissions ? '' : 'hidden'}`}>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(commission)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (window.confirm(`Delete commission rule “${commission.name}”?`)) {
                          deleteMutation.mutate(commission.id);
                        }
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      )}

      <Modal
        open={Boolean(editing)}
        title={editing?.id ? 'Edit commission rule' : 'New commission rule'}
        onClose={() => setEditing(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={submitForm} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving…' : 'Save rule'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Name">
            <Input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="e.g. Global platform fee"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Scope">
              <Select
                value={form.scope}
                onChange={(event) => setForm((prev) => ({ ...prev, scope: event.target.value }))}
              >
                <option value="global">Global</option>
                <option value="vendor_type">Vendor type</option>
                <option value="category">Category</option>
                <option value="vendor">Vendor</option>
              </Select>
            </Field>
            <Field label="Percentage (%)">
              <Input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={form.percentage}
                onChange={(event) => setForm((prev) => ({ ...prev, percentage: event.target.value }))}
              />
            </Field>
          </div>

          {form.scope === 'vendor' && (
            <Field label="Vendor">
              <Select
                value={form.vendor_id}
                onChange={(event) => setForm((prev) => ({ ...prev, vendor_id: event.target.value }))}
              >
                <option value="">Select vendor…</option>
                {(vendorsQuery.data?.items || []).map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          {form.scope === 'category' && (
            <Field label="Category">
              <Select
                value={form.category_id}
                onChange={(event) => setForm((prev) => ({ ...prev, category_id: event.target.value }))}
              >
                <option value="">Select category…</option>
                {(categoriesQuery.data?.items || []).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          {form.scope === 'vendor_type' && (
            <Field label="Vendor type">
              <Select
                value={form.vendor_type}
                onChange={(event) => setForm((prev) => ({ ...prev, vendor_type: event.target.value }))}
              >
                <option value="">Select vendor type…</option>
                {VENDOR_TYPES.map((type) => (
                  <option key={type.code} value={type.code}>
                    {type.label}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Fixed fee (RWF)">
              <Input
                type="number"
                min="0"
                value={form.fixed_fee_rwf}
                onChange={(event) => setForm((prev) => ({ ...prev, fixed_fee_rwf: event.target.value }))}
              />
            </Field>
            <Field label="Active">
              <label className="flex items-center gap-2 mt-1.5">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) => setForm((prev) => ({ ...prev, is_active: event.target.checked }))}
                  className="w-4 h-4 rounded border-stone-300 text-[#1f2937]"
                />
                <span className="text-sm text-stone-600">Enabled</span>
              </label>
            </Field>
          </div>

          {formError && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{formError}</p>
          )}
          {saveMutation.isError && <ErrorNote error={saveMutation.error} />}
        </div>
      </Modal>
    </div>
  );
}
