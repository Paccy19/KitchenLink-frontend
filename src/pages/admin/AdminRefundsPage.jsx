import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RotateCcw } from 'lucide-react';
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
  Table,
  formatDate,
  formatRwf,
} from '../../components/admin-dashboard/ui';

const EMPTY = { items: [], total: 0, page: 1, limit: 20, summary: null };
const STATUS_TONE = { pending: 'amber', completed: 'green', failed: 'red' };
const STATUS_LABEL = { pending: 'To send', completed: 'Sent', failed: 'Failed' };
const CANCELLED_BY = { customer: 'Customer', vendor: 'Kitchen', admin: 'Support', system: 'System' };

/**
 * Refunds owed to customers for cancelled paid orders. With a manual payout
 * service the team sends the money back and records the transaction id.
 */
export default function AdminRefundsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('pending');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState(null);
  const [outcome, setOutcome] = useState('completed');
  const [reference, setReference] = useState('');
  const [actionCode, setActionCode] = useState('');
  const { can, limits } = useAdmin();
  const [reason, setReason] = useState('');
  const focusId = useFocusParam('refund');

  const listQuery = useQuery({
    queryKey: ['admin', 'refunds', { status, search, page }],
    queryFn: () => adminApi.listRefunds({ status, search, page, limit: 20 }),
  });
  const focusQuery = useQuery({
    queryKey: ['admin', 'refund-focus', focusId],
    queryFn: () => adminApi.listRefunds({ limit: 100 }),
    enabled: Boolean(focusId),
  });

  const mutation = useMutation({
    mutationFn: (body) => adminApi.updateRefund(target.id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'refunds'] });
      setTarget(null);
    },
  });

  const open = (refund) => {
    mutation.reset();
    setTarget(refund);
    setOutcome(refund.status === 'failed' ? 'pending' : 'completed');
    setReference('');
    setActionCode('');
    setReason('');
  };

  useEffect(() => {
    if (!focusId || !focusQuery.data) return;
    const found = focusQuery.data.items.find((refund) => refund.id === focusId);
    if (found) open(found);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, focusQuery.data]);

  const data = listQuery.data || EMPTY;
  const summary = data.summary;
  const service = data.payout_service;

  const save = () => {
    if (outcome === 'completed') mutation.mutate({ status: 'completed', reference, action_code: actionCode || undefined });
    else if (outcome === 'failed') mutation.mutate({ status: 'failed', reason });
    else mutation.mutate({ status: 'pending' });
  };
  // Large refunds need an SMS code (server enforces it too).
  const needsCode = outcome === 'completed' && target && target.amount_rwf >= (limits?.large_money_action_rwf ?? 50000);
  const saveDisabled =
    (needsCode && actionCode.length !== 6) ||
    mutation.isPending ||
    (outcome === 'completed' && !reference.trim()) ||
    (outcome === 'failed' && !reason.trim());

  return (
    <div className="space-y-5">
      <PageHeader
        title="Refunds"
        description="Money owed back to customers whose paid orders were cancelled. Send it back the way they paid, then record the transaction reference."
      />

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <StatCard label="To send" value={formatRwf(summary.pending.amount_rwf)} hint={`${summary.pending.count} refunds`} tone="amber" />
          <StatCard label="Failed (still owed)" value={formatRwf(summary.failed.amount_rwf)} hint={`${summary.failed.count} refunds`} tone="red" />
          <StatCard label="Sent" value={formatRwf(summary.completed.amount_rwf)} hint={`${summary.completed.count} refunds`} tone="green" />
        </div>
      )}
      {service && !service.automatic && (
        <p className="text-xs text-stone-500">
          Payout service: <strong>{service.label}</strong>. Send each refund from the business mobile money / card
          account, then mark it sent here. The customer is notified automatically.
        </p>
      )}

      <Card
        action={
          <div className="flex flex-wrap gap-2">
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Order number, phone or reference"
              className="!py-1.5 text-xs w-56"
            />
            <Select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              className="!py-1.5 text-xs"
              aria-label="Status"
            >
              <option value="">All refunds</option>
              <option value="pending">To send</option>
              <option value="failed">Failed</option>
              <option value="completed">Sent</option>
            </Select>
          </div>
        }
        bodyClassName="p-4 sm:p-5"
      >
        {listQuery.isLoading ? (
          <LoadingBlock />
        ) : listQuery.error ? (
          <ErrorNote error={listQuery.error} />
        ) : data.items.length === 0 ? (
          <EmptyState icon={RotateCcw} title={status === 'pending' ? 'No refunds to send' : 'No refunds'} />
        ) : (
          <>
            <Table
              columns={[
                { key: 'order', label: 'Order' },
                { key: 'customer', label: 'Customer' },
                { key: 'amount', label: 'Amount' },
                { key: 'to', label: 'Send to' },
                { key: 'status', label: 'Status' },
                { key: 'when', label: 'Cancelled' },
                { key: 'actions', label: '', className: 'text-right' },
              ]}
            >
              {data.items.map((refund) => (
                <tr key={refund.id} className="hover:bg-stone-50/60">
                  <td className="px-4 py-3">
                    <p className="font-bold text-gray-900">{refund.order_number}</p>
                    <p className="text-[11px] text-stone-400">
                      by {CANCELLED_BY[refund.cancelled_by] || refund.cancelled_by}
                      {refund.reason ? ` · ${refund.reason}` : ''}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-stone-600">
                    <p>{refund.customer?.name || '—'}</p>
                    <p className="text-[11px] text-stone-400">{refund.customer?.phone || ''}</p>
                  </td>
                  <td className="px-4 py-3 font-bold text-gray-900">{formatRwf(refund.amount_rwf)}</td>
                  <td className="px-4 py-3 text-stone-600">{refund.destination.label}</td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[refund.status]}>{STATUS_LABEL[refund.status]}</Badge>
                    {refund.reference && <p className="text-[11px] text-stone-400 mt-0.5">ref {refund.reference}</p>}
                    {refund.failure_reason && <p className="text-[11px] text-red-600 mt-0.5">{refund.failure_reason}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-500">{formatDate(refund.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    {refund.status !== 'completed' && can('refunds:write') && (
                      <Button size="sm" variant={refund.status === 'pending' ? 'primary' : 'secondary'} onClick={() => open(refund)}>
                        {refund.status === 'pending' ? 'Send refund' : 'Retry'}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </Table>
            <Pagination page={data.page} limit={data.limit} total={data.total} onPage={setPage} />
          </>
        )}
      </Card>

      <Modal
        open={Boolean(target)}
        title={target ? `Refund · ${target.order_number}` : 'Refund'}
        onClose={() => setTarget(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setTarget(null)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saveDisabled}>
              {mutation.isPending
                ? 'Saving…'
                : outcome === 'completed'
                  ? 'Mark as sent'
                  : outcome === 'failed'
                    ? 'Mark as failed'
                    : 'Retry refund'}
            </Button>
          </>
        }
      >
        {target && (
          <div className="space-y-4">
            <div className="rounded-xl bg-stone-50 border border-stone-200 p-3 text-sm space-y-1">
              <p className="text-stone-600">
                Send <strong className="text-gray-900">{formatRwf(target.amount_rwf)}</strong> back to{' '}
                <strong className="text-gray-900">{target.customer?.name || 'the customer'}</strong> on their{' '}
                <strong className="text-gray-900">{target.destination.label}</strong>.
              </p>
              <p className="text-[11px] text-stone-400">
                Cancelled by {CANCELLED_BY[target.cancelled_by] || target.cancelled_by} · {formatDate(target.created_at)}
              </p>
              {target.failure_reason && <p className="text-[11px] text-red-600">Last attempt failed: {target.failure_reason}</p>}
            </div>

            <Field label="Outcome">
              <Select value={outcome} onChange={(event) => setOutcome(event.target.value)}>
                {target.status === 'pending' ? (
                  <>
                    <option value="completed">Sent: I sent the money back</option>
                    <option value="failed">Failed: it could not be sent (customer is asked for another number)</option>
                  </>
                ) : (
                  <option value="pending">Retry: put it back in the list to send</option>
                )}
              </Select>
            </Field>
            {outcome === 'completed' && (
              <Field label="Transaction reference (required)">
                <Input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="e.g. MoMo transaction ID" />
              </Field>
            )}
            {needsCode && (
              <ActionCodeField
                purpose="large_payment"
                value={actionCode}
                onChange={setActionCode}
                label={`Large refund: code sent to your phone (${formatRwf(limits?.large_money_action_rwf ?? 50000)} or more)`}
              />
            )}
            {outcome === 'failed' && (
              <Field label="Reason (shown to the customer)">
                <Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="e.g. Number not registered for mobile money" />
              </Field>
            )}
            {mutation.isError && <ErrorNote error={mutation.error} />}
          </div>
        )}
      </Modal>
    </div>
  );
}
