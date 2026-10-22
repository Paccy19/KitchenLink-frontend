import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen } from 'lucide-react';
import { adminApi } from '../../api/adminApi';
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
  Table,
  formatDate,
  formatRwf,
  toTitle,
} from '../../components/admin-dashboard/ui';

const TRANSACTION_TYPES = [
  'order_payment',
  'vendor_earning',
  'driver_earning',
  'driver_penalty',
  'commission',
  'refund',
  'withdrawal',
  'adjustment',
  'platform_withdrawal',
];

const EMPTY = { transactions: [], total: 0, page: 1, limit: 20 };

/**
 * The platform's money books (read-only): what the account should hold, what it
 * is made of, and the ledger behind it. For the finance role.
 */
export default function AdminPlatformBooksPage() {
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);

  const { data = EMPTY, isLoading, error } = useQuery({
    queryKey: ['admin', 'platform-books', { type, page }],
    queryFn: () => adminApi.platformWallet({ type, page, limit: 20 }),
  });

  if (isLoading) return <LoadingBlock />;
  if (error) return <ErrorNote error={error} />;

  const account = data.account || {};
  const reconciliation = account.reconciliation || {};

  return (
    <div className="space-y-5">
      <PageHeader
        title="Platform Books"
        description="The marketplace's money: what the account holds and every ledger entry behind it."
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard label="Cash in account" value={formatRwf(account.cash_balance_rwf)} hint="Should be in the real account" tone={reconciliation.balanced ? 'green' : 'red'} />
        <StatCard label="Held" value={formatRwf(account.held_balance_rwf)} hint="Orders in progress" />
        <StatCard label="Refunds owed" value={formatRwf(account.refunds_owed_rwf)} />
        <StatCard label="Owed to vendors" value={formatRwf(account.vendor_payable_rwf)} />
        <StatCard label="Owed to delivery workers" value={formatRwf(account.driver_payable_rwf)} />
        <StatCard label="Commission balance" value={formatRwf(account.commission_balance_rwf)} tone="violet" />
      </div>

      <Card
        title="Reconciliation"
        action={reconciliation.balanced ? <Badge tone="green">Balanced</Badge> : <Badge tone="red">Off by {formatRwf(reconciliation.unreconciled_rwf)}</Badge>}
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Collected" value={formatRwf(account.total_collected_rwf)} />
          <StatCard label="Refunded" value={formatRwf(account.total_refunded_rwf)} />
          <StatCard label="Commission earned" value={formatRwf(account.total_commission_rwf)} />
          <StatCard label="Paid out to vendors / workers" value={formatRwf((account.total_vendor_payouts_rwf || 0) + (account.total_driver_payouts_rwf || 0))} />
        </div>
        {account.computed_at && (
          <p className="mt-3 text-[11px] text-stone-400">Recomputed {formatDate(account.computed_at)}</p>
        )}
      </Card>

      <Card
        title="Ledger"
        description="Every money movement on the platform, newest first."
        action={
          <div className="w-48">
            <Select value={type} onChange={(event) => { setType(event.target.value); setPage(1); }}>
              <option value="">All types</option>
              {TRANSACTION_TYPES.map((entry) => (
                <option key={entry} value={entry}>{toTitle(entry)}</option>
              ))}
            </Select>
          </div>
        }
        bodyClassName="p-4 sm:p-5"
      >
        {data.transactions.length === 0 ? (
          <EmptyState icon={BookOpen} title="No ledger entries" description="Money movements will appear here as orders are paid and settled." />
        ) : (
          <>
            <Table
              columns={[
                { key: 'type', label: 'Type' },
                { key: 'amount', label: 'Amount' },
                { key: 'order', label: 'Order' },
                { key: 'reference', label: 'Reference' },
                { key: 'at', label: 'When' },
              ]}
            >
              {data.transactions.map((entry) => (
                <tr key={entry.id} className="hover:bg-stone-50/60">
                  <td className="px-4 py-3">
                    <Badge tone={entry.direction === 'credit' ? 'green' : 'amber'}>{toTitle(entry.type)}</Badge>
                    {entry.description && <p className="text-[11px] text-stone-400 mt-1">{entry.description}</p>}
                  </td>
                  <td className="px-4 py-3 font-bold text-gray-900">
                    {entry.direction === 'debit' ? '−' : '+'}{formatRwf(entry.amount_rwf)}
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-600">{entry.order_number || '—'}</td>
                  <td className="px-4 py-3 text-xs text-stone-500">{entry.reference || '—'}</td>
                  <td className="px-4 py-3 text-xs text-stone-500">{formatDate(entry.created_at)}</td>
                </tr>
              ))}
            </Table>
            <Pagination page={data.page} limit={data.limit} total={data.total} onPage={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
