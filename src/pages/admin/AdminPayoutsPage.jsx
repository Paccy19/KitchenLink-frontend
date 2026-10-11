import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Wallet } from 'lucide-react';
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
  StatCard,
  StatusBadge,
  Table,
  formatDate,
  formatRwf,
} from '../../components/admin-dashboard/ui';

const WITHDRAWAL_STATUSES = ['processing', 'completed', 'failed'];
const EMPTY = { items: [], total: 0, page: 1, limit: 20 };

export default function AdminPayoutsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('withdrawals');
  const [filters, setFilters] = useState({ status: '' });
  const [page, setPage] = useState(1);
  const [balPage, setBalPage] = useState(1);
  const [target, setTarget] = useState(null);
  const [status, setStatus] = useState('completed');
  const [reference, setReference] = useState('');
  const focusId = useFocusParam('payout');

  const focusQuery = useQuery({
    queryKey: ['admin', 'payout-focus', focusId],
    queryFn: () => adminApi.listPayouts({ limit: 100 }),
    enabled: Boolean(focusId),
  });

  const withdrawalsQuery = useQuery({
    queryKey: ['admin', 'payouts', { ...filters, page }],
    queryFn: () => adminApi.listPayouts({ ...filters, page, limit: 20 }),
  });
  const balancesQuery = useQuery({
    queryKey: ['admin', 'payout-balances', balPage],
    queryFn: () => adminApi.payoutBalances({ page: balPage, limit: 20, sort: 'balance' }),
  });
  const summaryQuery = useQuery({
    queryKey: ['admin', 'payout-summary'],
    queryFn: () => adminApi.payoutSummary(),
  });

  const mutation = useMutation({
    mutationFn: () => adminApi.updatePayout(target.id, { status, reference }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'payouts'] });
      setTarget(null);
      setReference('');
    },
  });

  const data = withdrawalsQuery.data || EMPTY;
  const balances = balancesQuery.data || EMPTY;
  const summary = summaryQuery.data;

  const openUpdate = (withdrawal) => {
    setTarget(withdrawal);
    setStatus(withdrawal.status === 'processing' ? 'completed' : withdrawal.status);
    setReference(withdrawal.reference || '');
  };

  useEffect(() => {
    if (!focusId || !focusQuery.data) return;
    const found = focusQuery.data.items.find((withdrawal) => withdrawal.id === focusId);
    if (found) openUpdate(found);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, focusQuery.data]);

  return (
    <div className="space-y-5">
      <PageHeader title="Payouts" description="Review vendor withdrawal requests and balances." />

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {summary.by_status.map((row) => (
            <StatCard
              key={row.status}
              label={row.status}
              value={formatRwf(row.total_rwf)}
              hint={`${row.count} requests`}
            />
          ))}
          {summary.by_status.length === 0 && <StatCard label="Requests" value={0} />}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button
          variant={tab === 'withdrawals' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setTab('withdrawals')}
        >
          Withdrawals
        </Button>
        <Button
          variant={tab === 'balances' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setTab('balances')}
        >
          Vendor Balances
        </Button>
      </div>

      {tab === 'withdrawals' ? (
        <Card
          action={
            <Select
              value={filters.status}
              onChange={(event) => {
                setFilters({ status: event.target.value });
                setPage(1);
              }}
              className="!py-1.5 text-xs"
            >
              <option value="">All statuses</option>
              {WITHDRAWAL_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          }
          bodyClassName="p-4 sm:p-5"
        >
          {withdrawalsQuery.isLoading ? (
            <LoadingBlock />
          ) : withdrawalsQuery.error ? (
            <ErrorNote error={withdrawalsQuery.error} />
          ) : data.items.length === 0 ? (
            <EmptyState icon={Wallet} title="No withdrawal requests" />
          ) : (
            <>
              <Table
                columns={[
                  { key: 'vendor', label: 'Vendor' },
                  { key: 'amount', label: 'Amount' },
                  { key: 'method', label: 'Method' },
                  { key: 'status', label: 'Status' },
                  { key: 'reference', label: 'Reference' },
                  { key: 'created', label: 'Requested' },
                  { key: 'actions', label: '', className: 'text-right' },
                ]}
              >
                {data.items.map((withdrawal) => (
                  <tr key={withdrawal.id} className="hover:bg-stone-50/60">
                    <td className="px-4 py-3 font-bold text-gray-900">{withdrawal.vendor_name || '—'}</td>
                    <td className="px-4 py-3 font-bold text-gray-900">{formatRwf(withdrawal.amount_rwf)}</td>
                    <td className="px-4 py-3 text-stone-600">{withdrawal.method_label}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={withdrawal.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-500">{withdrawal.reference || '—'}</td>
                    <td className="px-4 py-3 text-xs text-stone-500">{formatDate(withdrawal.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="secondary" size="sm" onClick={() => openUpdate(withdrawal)}>
                        Update
                      </Button>
                    </td>
                  </tr>
                ))}
              </Table>
              <Pagination page={data.page} limit={data.limit} total={data.total} onPage={setPage} />
            </>
          )}
        </Card>
      ) : (
        <Card
          title="Vendor Balances"
          description="Ranked by available balance."
          bodyClassName="p-4 sm:p-5"
        >
          {balancesQuery.isLoading ? (
            <LoadingBlock />
          ) : balancesQuery.error ? (
            <ErrorNote error={balancesQuery.error} />
          ) : balances.items.length === 0 ? (
            <EmptyState icon={Wallet} title="No vendor balances" />
          ) : (
            <>
              <Table
                columns={[
                  { key: 'vendor', label: 'Vendor' },
                  { key: 'balance', label: 'Available' },
                  { key: 'sales', label: 'Total Sales' },
                  { key: 'commission', label: 'Est. Commission' },
                ]}
              >
                {balances.items.map((vendor) => (
                  <tr key={vendor.id} className="hover:bg-stone-50/60">
                    <td className="px-4 py-3">
                      <p className="font-bold text-gray-900">{vendor.name}</p>
                      <p className="text-[11px] text-stone-400">{vendor.neighborhood || ''}</p>
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-900">
                      {formatRwf(vendor.available_balance_rwf)}
                    </td>
                    <td className="px-4 py-3 text-stone-600">{formatRwf(vendor.total_sales_rwf)}</td>
                    <td className="px-4 py-3">
                      <Badge tone="violet">{formatRwf(vendor.estimated_commission_rwf)}</Badge>
                    </td>
                  </tr>
                ))}
              </Table>
              <Pagination
                page={balances.page}
                limit={balances.limit}
                total={balances.total}
                onPage={setBalPage}
              />
            </>
          )}
        </Card>
      )}

      <Modal
        open={Boolean(target)}
        title={target ? `Update payout · ${target.vendor_name || ''}` : 'Update payout'}
        onClose={() => setTarget(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setTarget(null)}>
              Cancel
            </Button>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {target && (
            <p className="text-sm text-stone-600">
              Amount: <strong className="text-gray-900">{formatRwf(target.amount_rwf)}</strong> · Requested{' '}
              {formatDate(target.created_at)}
            </p>
          )}
          <Field label="Status">
            <Select value={status} onChange={(event) => setStatus(event.target.value)}>
              {WITHDRAWAL_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Reference / transaction id">
            <Input
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="e.g. MoMo TXN ID"
            />
          </Field>
          {mutation.isError && <ErrorNote error={mutation.error} />}
        </div>
      </Modal>
    </div>
  );
}
