import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Wallet } from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import Can from '../../components/admin-dashboard/Can';
import ActionCodeField from '../../components/admin-dashboard/ActionCodeField';
import { useAdmin } from '../../context/AdminContext';
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
const PAYEE_TYPES = [
  { value: '', label: 'Vendors & delivery workers' },
  { value: 'vendor', label: 'Vendors' },
  { value: 'driver', label: 'Delivery workers' },
];
const EMPTY = { items: [], total: 0, page: 1, limit: 20 };

const PayeeBadge = ({ type }) =>
  type === 'driver' ? <Badge tone="green">Delivery worker</Badge> : <Badge tone="violet">Vendor</Badge>;

export default function AdminPayoutsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('withdrawals');
  const [filters, setFilters] = useState({ status: '', payee_type: '' });
  const [page, setPage] = useState(1);
  const [balPage, setBalPage] = useState(1);
  const [target, setTarget] = useState(null);
  const [status, setStatus] = useState('completed');
  const [reference, setReference] = useState('');
  const [reason, setReason] = useState('');
  const [actionCode, setActionCode] = useState('');
  const { limits } = useAdmin();
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
  const balanceType = tab === 'driver-balances' ? 'driver' : 'vendor';
  const balancesQuery = useQuery({
    queryKey: ['admin', 'payout-balances', balanceType, balPage],
    queryFn: () =>
      adminApi.payoutBalances({
        page: balPage,
        limit: 20,
        sort: 'balance',
        ...(balanceType === 'driver' ? { payee_type: 'driver' } : {}),
      }),
    enabled: tab !== 'withdrawals',
  });
  const summaryQuery = useQuery({
    queryKey: ['admin', 'payout-summary', filters.payee_type],
    queryFn: () => adminApi.payoutSummary(filters.payee_type ? { payee_type: filters.payee_type } : undefined),
  });

  const mutation = useMutation({
    mutationFn: () =>
      adminApi.updatePayout(target.id, {
        status,
        reference,
        ...(actionCode ? { action_code: actionCode } : {}),
        ...(status === 'failed' ? { reason } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'payouts'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'payout-summary'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'payout-balances'] });
      setTarget(null);
      setReference('');
      setReason('');
    },
  });

  const data = withdrawalsQuery.data || EMPTY;
  const balances = balancesQuery.data || EMPTY;
  const summary = summaryQuery.data;
  const isProcessing = target?.status === 'processing';

  const openUpdate = (withdrawal) => {
    mutation.reset();
    setTarget(withdrawal);
    setStatus(withdrawal.status === 'processing' ? 'completed' : withdrawal.status);
    setReference(withdrawal.reference && withdrawal.status !== 'processing' ? withdrawal.reference : '');
    setReason('');
    setActionCode('');
  };

  useEffect(() => {
    if (!focusId || !focusQuery.data) return;
    const found = focusQuery.data.items.find((withdrawal) => withdrawal.id === focusId);
    if (found) openUpdate(found);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, focusQuery.data]);

  const setFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  // Large payouts need an SMS code (server enforces it too).
  const needsCode =
    isProcessing && status === 'completed' && target.amount_rwf >= (limits?.large_money_action_rwf ?? 50000);
  const saveDisabled =
    (needsCode && actionCode.length !== 6) ||
    mutation.isPending || (isProcessing && status === 'completed' && !reference.trim());

  return (
    <div className="space-y-5">
      <PageHeader
        title="Payouts"
        description="Pay vendor and delivery worker withdrawal requests, and review their balances."
      />

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

      <div className="flex flex-wrap items-center gap-2">
        {[
          ['withdrawals', 'Withdrawals'],
          ['vendor-balances', 'Vendor Balances'],
          ['driver-balances', 'Delivery Worker Balances'],
        ].map(([key, label]) => (
          <Button
            key={key}
            variant={tab === key ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => {
              setTab(key);
              setBalPage(1);
            }}
          >
            {label}
          </Button>
        ))}
      </div>

      {tab === 'withdrawals' ? (
        <Card
          action={
            <div className="flex flex-wrap gap-2">
              <Select
                value={filters.payee_type}
                onChange={(event) => setFilter('payee_type', event.target.value)}
                className="!py-1.5 text-xs"
                aria-label="Payee type"
              >
                {PAYEE_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <Select
                value={filters.status}
                onChange={(event) => setFilter('status', event.target.value)}
                className="!py-1.5 text-xs"
                aria-label="Status"
              >
                <option value="">All statuses</option>
                {WITHDRAWAL_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </div>
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
                  { key: 'payee', label: 'Payee' },
                  { key: 'amount', label: 'Amount' },
                  { key: 'payTo', label: 'Pay to' },
                  { key: 'status', label: 'Status' },
                  { key: 'reference', label: 'Reference' },
                  { key: 'created', label: 'Requested' },
                  { key: 'actions', label: '', className: 'text-right' },
                ]}
              >
                {data.items.map((withdrawal) => (
                  <tr key={withdrawal.id} className="hover:bg-stone-50/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <PayeeBadge type={withdrawal.payee_type} />
                        <span className="font-bold text-gray-900">{withdrawal.payee_name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-900">{formatRwf(withdrawal.amount_rwf)}</td>
                    <td className="px-4 py-3 text-stone-600">
                      <p>{withdrawal.method_label}</p>
                      {withdrawal.bank_name && <p className="text-[11px] font-semibold text-stone-500">{withdrawal.bank_name}</p>}
                      <p className="text-[11px] text-stone-400">{withdrawal.account_number || 'No number on file'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={withdrawal.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-500">
                      {withdrawal.reference || '—'}
                      {withdrawal.failure_reason && (
                        <p className="text-[11px] text-red-600">{withdrawal.failure_reason}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-500">{formatDate(withdrawal.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <Can permission="payouts:write">
                      <Button
                        variant={withdrawal.status === 'processing' ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => openUpdate(withdrawal)}
                      >
                        {withdrawal.status === 'processing' ? 'Pay out' : 'View'}
                      </Button>
                      </Can>
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
          title={balanceType === 'driver' ? 'Delivery Worker Balances' : 'Vendor Balances'}
          description={
            balanceType === 'driver'
              ? 'Delivery fees earned and not yet withdrawn, ranked by available balance.'
              : 'Ranked by available balance.'
          }
          bodyClassName="p-4 sm:p-5"
        >
          {balancesQuery.isLoading ? (
            <LoadingBlock />
          ) : balancesQuery.error ? (
            <ErrorNote error={balancesQuery.error} />
          ) : balances.items.length === 0 ? (
            <EmptyState icon={Wallet} title={balanceType === 'driver' ? 'No delivery worker balances' : 'No vendor balances'} />
          ) : (
            <>
              {balanceType === 'driver' ? (
                <Table
                  columns={[
                    { key: 'rider', label: 'Delivery worker' },
                    { key: 'balance', label: 'Available' },
                    { key: 'earned', label: 'Total Earned' },
                    { key: 'deliveries', label: 'Deliveries' },
                  ]}
                >
                  {balances.items.map((driver) => (
                    <tr key={driver.id} className="hover:bg-stone-50/60">
                      <td className="px-4 py-3">
                        <p className="font-bold text-gray-900">{driver.name}</p>
                        <p className="text-[11px] text-stone-400">
                          {[driver.phone, driver.vehicle_type].filter(Boolean).join(' · ')}
                        </p>
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-900">
                        {formatRwf(driver.available_balance_rwf)}
                      </td>
                      <td className="px-4 py-3 text-stone-600">{formatRwf(driver.total_earnings_rwf)}</td>
                      <td className="px-4 py-3 text-stone-600">{driver.completed_deliveries}</td>
                    </tr>
                  ))}
                </Table>
              ) : (
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
              )}
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
        title={target ? `${isProcessing ? 'Pay out' : 'Payout'} · ${target.payee_name || ''}` : 'Payout'}
        onClose={() => setTarget(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setTarget(null)}>
              {isProcessing ? 'Cancel' : 'Close'}
            </Button>
            <Button onClick={() => mutation.mutate()} disabled={saveDisabled}>
              {mutation.isPending
                ? 'Saving…'
                : !isProcessing
                  ? 'Save reference'
                  : status === 'completed'
                    ? 'Mark as paid'
                    : 'Mark as failed & refund'}
            </Button>
          </>
        }
      >
        {target && (
          <div className="space-y-4">
            <div className="rounded-xl bg-stone-50 border border-stone-200 p-3 text-sm space-y-1">
              <div className="flex items-center gap-2">
                <PayeeBadge type={target.payee_type} />
                <strong className="text-gray-900">{target.payee_name}</strong>
              </div>
              <p className="text-stone-600">
                Send <strong className="text-gray-900">{formatRwf(target.amount_rwf)}</strong> via{' '}
                <strong className="text-gray-900">{target.method_label}</strong> to{' '}
                {target.bank_name && <strong className="text-gray-900">{target.bank_name} account </strong>}
                <strong className="text-gray-900">{target.account_number || 'their saved payout details'}</strong>
                {target.account_name ? ` (${target.account_name})` : ''}
              </p>
              <p className="text-[11px] text-stone-400">Requested {formatDate(target.created_at)}</p>
            </div>

            {isProcessing ? (
              <Field label="Outcome">
                <Select value={status} onChange={(event) => setStatus(event.target.value)}>
                  <option value="completed">Paid: I sent the money</option>
                  <option value="failed">Failed: return the money to their balance</option>
                </Select>
              </Field>
            ) : (
              <p className="text-sm text-stone-600">
                Status: <StatusBadge status={target.status} />{' '}
                <span className="text-[11px] text-stone-400">
                  Finalized payouts can't change status. You can still correct the reference.
                </span>
              </p>
            )}

            {(status === 'completed' || !isProcessing) && (
              <Field label="Transaction reference (required)">
                <Input
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  placeholder="e.g. MoMo / Airtel transaction ID"
                />
              </Field>
            )}
            {needsCode && (
              <ActionCodeField
                purpose="large_payment"
                value={actionCode}
                onChange={setActionCode}
                label={`Large payout: code sent to your phone (${formatRwf(limits?.large_money_action_rwf ?? 50000)} or more)`}
              />
            )}
            {isProcessing && status === 'failed' && (
              <Field label="Reason (shown to the payee)">
                <Input
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="e.g. Number not registered for mobile money"
                />
              </Field>
            )}
            {mutation.isError && <ErrorNote error={mutation.error} />}
          </div>
        )}
      </Modal>
    </div>
  );
}
