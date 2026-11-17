import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminApi } from '../../api/adminApi';
import { useAdmin } from '../../context/AdminContext';
import { useToast } from '../../components/common/Toast';
import { Button, Card, ErrorNote, Field, Input, LoadingBlock, Modal, PageHeader, Pagination, Select, Table, Textarea, formatRwf } from '../../components/admin-dashboard/ui';
import { QuotationCard, RequestFacts, StatusHistory, StatusPill, formatWhen } from '../../components/special-delivery/shared';

const STATUSES = [
  'pending_vendor_review',
  'awaiting_customer_information',
  'negotiation_accepted',
  'negotiating',
  'quotation_submitted',
  'quotation_revision_requested',
  'quotation_rejected',
  'quotation_expired',
  'quotation_accepted',
  'delivery_confirmed',
  'completed',
  'vendor_declined',
  'customer_cancelled',
  'disputed',
];

/**
 * Admin → Delivery Management: big-event delivery pricing (starting fee,
 * price per meter, minimum and the automatic ceiling above which the price is
 * negotiated) and every special delivery negotiation, with its quotations,
 * chat and history, and dispute resolution. The standard delivery fee stays
 * under Settings → Delivery fee by distance.
 */
export default function AdminDeliveryManagementPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Delivery Management"
        description="Big-event delivery pricing and special delivery negotiations between customers and kitchens."
      />
      <BigEventPricingCard />
      <SpecialDeliveriesCard />
    </div>
  );
}

function BigEventPricingCard() {
  const { can } = useAdmin();
  const toast = useToast();
  const editable = can('deliveries:write');
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [exampleKm, setExampleKm] = useState('40');

  const apply = (data) => {
    setSaved(data);
    setForm({
      enabled: data.enabled,
      starting_fee_rwf: String(data.starting_fee_rwf),
      per_meter_rwf: String(data.per_meter_rwf),
      min_fee_rwf: String(data.min_fee_rwf),
      auto_ceiling_rwf: String(data.auto_ceiling_rwf),
      quotation_validity_hours: String(data.quotation_validity_hours),
    });
  };

  useEffect(() => {
    adminApi.bigEventDelivery().then(apply).catch(setError);
  }, []);

  if (error && !form) return <ErrorNote error={error} />;
  if (!form) return <LoadingBlock />;

  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));
  const num = (value) => Number(value);
  const exampleMeters = Math.max(0, Number(exampleKm) || 0) * 1000;
  const exampleFee = Math.max(num(form.min_fee_rwf), Math.round(num(form.starting_fee_rwf) + exampleMeters * num(form.per_meter_rwf)));
  const exampleNegotiated = !form.enabled || exampleFee > num(form.auto_ceiling_rwf);
  // Distance where the automatic price reaches the ceiling.
  const ceilingKm =
    num(form.per_meter_rwf) > 0 ? Math.max(0, (num(form.auto_ceiling_rwf) - num(form.starting_fee_rwf)) / num(form.per_meter_rwf) / 1000) : null;

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      apply(
        await adminApi.saveBigEventDelivery({
          enabled: form.enabled,
          starting_fee_rwf: num(form.starting_fee_rwf),
          per_meter_rwf: num(form.per_meter_rwf),
          min_fee_rwf: num(form.min_fee_rwf),
          auto_ceiling_rwf: num(form.auto_ceiling_rwf),
          quotation_validity_hours: num(form.quotation_validity_hours),
        }),
      );
      toast.success('Big-event delivery pricing saved. It applies to new quotes and orders.');
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      title="Big-event delivery pricing"
      description="Charged when a kitchen delivers a big-event order. Kitchens cannot change it; orders keep the price they were charged."
    >
      <div className="space-y-4">
        <label className="flex items-center gap-2 text-sm font-bold text-gray-800">
          <input type="checkbox" disabled={!editable} checked={form.enabled} onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))} className="w-4 h-4 accent-[#542813]" />
          Automatic big-event pricing on
          <span className="text-xs font-normal text-stone-500">(off: every big-event delivery is quoted by the kitchen)</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Field label="Starting fee (RWF)">
            <Input inputMode="numeric" value={form.starting_fee_rwf} onChange={set('starting_fee_rwf')} disabled={!editable} />
          </Field>
          <Field label="Price per meter (RWF)" hint="Up to 3 decimals">
            <Input inputMode="decimal" value={form.per_meter_rwf} onChange={set('per_meter_rwf')} disabled={!editable} />
          </Field>
          <Field label="Minimum fee (RWF)">
            <Input inputMode="numeric" value={form.min_fee_rwf} onChange={set('min_fee_rwf')} disabled={!editable} />
          </Field>
          <Field label="Automatic ceiling (RWF)" hint="Above it: negotiated">
            <Input inputMode="numeric" value={form.auto_ceiling_rwf} onChange={set('auto_ceiling_rwf')} disabled={!editable} />
          </Field>
          <Field label="Quotations valid (hours)">
            <Input inputMode="numeric" value={form.quotation_validity_hours} onChange={set('quotation_validity_hours')} disabled={!editable} />
          </Field>
        </div>

        <div className="rounded-xl bg-stone-50 border border-stone-100 p-3 text-xs text-stone-700 space-y-1">
          <p>
            Fee = {formatRwf(num(form.starting_fee_rwf))} + road meters × {form.per_meter_rwf} RWF (at least {formatRwf(num(form.min_fee_rwf))}).
            {ceilingKm != null && ` Reaches the ${formatRwf(num(form.auto_ceiling_rwf))} ceiling at about ${ceilingKm.toFixed(1)} km.`}
          </p>
          <p className="flex flex-wrap items-center gap-1.5">
            Example:
            <Input className="w-20 py-1" inputMode="decimal" value={exampleKm} onChange={(e) => setExampleKm(e.target.value)} aria-label="Example distance in km" />
            km of road →{' '}
            <strong>{exampleNegotiated ? `special delivery (formula ${formatRwf(exampleFee)} is not charged)` : formatRwf(exampleFee)}</strong>
          </p>
          <p className="text-stone-500">A fee above the ceiling is never cut to the ceiling: the customer and kitchen agree a quotation instead.</p>
        </div>

        {error && <ErrorNote error={error} />}
        {editable && (
          <div className="flex items-center gap-3">
            <Button onClick={save} disabled={busy}>
              {busy ? 'Saving…' : 'Save pricing'}
            </Button>
            {saved?.updated_at && <span className="text-[11px] text-stone-400">Last saved {formatWhen(saved.updated_at)}</span>}
            {!saved?.saved && <span className="text-[11px] text-stone-400">Using the starting values (not saved yet).</span>}
          </div>
        )}
      </div>
    </Card>
  );
}

function SpecialDeliveriesCard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const openId = searchParams.get('request') || '';
  const [filters, setFilters] = useState({ status: '', search: '' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    adminApi
      .specialDeliveries({ ...filters, page, limit: 20 })
      .then(setData)
      .catch(setError);
  }, [filters, page]);
  useEffect(() => {
    load();
  }, [load]);

  return (
    <Card title="Special delivery negotiations" description="Requests outside a kitchen's coverage or above the automatic ceiling.">
      <div className="flex flex-wrap gap-2 mb-4">
        <Select
          value={filters.status}
          onChange={(e) => {
            setPage(1);
            setFilters((f) => ({ ...f, status: e.target.value }));
          }}
          aria-label="Status"
          className="w-56"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, ' ')}
            </option>
          ))}
        </Select>
        <Input
          placeholder="Reference, e.g. SD-000124"
          value={filters.search}
          onChange={(e) => {
            setPage(1);
            setFilters((f) => ({ ...f, search: e.target.value }));
          }}
          className="w-56"
        />
      </div>
      {error && <ErrorNote error={error} />}
      {!data ? (
        <LoadingBlock />
      ) : data.items.length === 0 ? (
        <p className="text-sm text-stone-500">No special delivery requests.</p>
      ) : (
        <>
          <Table
            columns={[
              { key: 'ref', label: 'Reference' },
              { key: 'customer', label: 'Customer' },
              { key: 'vendor', label: 'Kitchen' },
              { key: 'to', label: 'Destination' },
              { key: 'fee', label: 'Price' },
              { key: 'status', label: 'Status' },
              { key: 'updated', label: 'Updated' },
            ]}
          >
            {data.items.map((item) => (
              <tr key={item.id} className="hover:bg-stone-50 cursor-pointer" onClick={() => setSearchParams({ request: item.id })}>
                <td className="px-4 py-2.5 font-bold">{item.reference}</td>
                <td className="px-4 py-2.5">{item.customer?.name}</td>
                <td className="px-4 py-2.5">{item.vendor?.name}</td>
                <td className="px-4 py-2.5 max-w-[14rem] truncate">{item.destination_district?.name || item.delivery_location?.address}</td>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  {item.agreed_fee_rwf != null ? `${formatRwf(item.agreed_fee_rwf)} agreed` : item.active_quotation ? `${formatRwf(item.active_quotation.fee_rwf)} quoted` : '—'}
                </td>
                <td className="px-4 py-2.5">
                  <StatusPill status={item.status} label={item.status_label} />
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap text-xs text-stone-500">{formatWhen(item.updated_at)}</td>
              </tr>
            ))}
          </Table>
          <Pagination page={data.page} limit={data.limit} total={data.total} onPage={setPage} />
        </>
      )}
      {openId && <RequestModal id={openId} onClose={() => setSearchParams({})} onChanged={load} />}
    </Card>
  );
}

function RequestModal({ id, onClose, onChanged }) {
  const { can } = useAdmin();
  const toast = useToast();
  const [request, setRequest] = useState(null);
  const [error, setError] = useState(null);
  const [outcome, setOutcome] = useState('completed');
  const [resolution, setResolution] = useState('');
  const [reduction, setReduction] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    adminApi.specialDelivery(id).then(setRequest).catch(setError);
  }, [id]);

  const resolve = async () => {
    setBusy(true);
    try {
      await adminApi.resolveSpecialDeliveryDispute(id, {
        outcome,
        resolution: resolution.trim(),
        ...(outcome !== 'customer_cancelled' && Number(reduction) > 0 ? { fee_reduction_rwf: Number(reduction) } : {}),
      });
      setRequest(await adminApi.specialDelivery(id));
      toast.success('Dispute resolved.');
      onChanged?.();
    } catch (err) {
      toast.error(err.message || 'Could not resolve the dispute.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open title={request ? `Special delivery ${request.reference}` : 'Special delivery'} onClose={onClose} width="max-w-3xl">
      {error && <ErrorNote error={error} />}
      {!request ? (
        <LoadingBlock />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span>
              <strong>{request.customer?.name}</strong> {request.customer?.phone} → <strong>{request.vendor?.name}</strong> {request.vendor?.phone}
            </span>
            <StatusPill status={request.status} label={request.status_label} />
          </div>
          <RequestFacts request={request} />
          {request.agreed_fee_rwf != null && (
            <p className="text-sm font-bold text-emerald-800">
              Agreed {formatRwf(request.agreed_fee_rwf)} on {formatWhen(request.agreed_at)}
              {request.order ? ` · order ${request.order.order_number} (${request.order.status}, ${request.order.payment_status})` : ''}
            </p>
          )}
          {request.dispute && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 space-y-1">
              <p className="font-bold">
                Dispute by the {request.dispute.raised_by === 'vendor' ? 'kitchen' : 'customer'} · {formatWhen(request.dispute.raised_at)}
              </p>
              <p>{request.dispute.reason}</p>
              {request.dispute.resolution && <p className="text-emerald-800">Resolved: {request.dispute.resolution}</p>}
              {request.dispute.fee_reduced_by_rwf > 0 && (
                <p className="text-emerald-800">
                  Delivery fee reduced by {formatRwf(request.dispute.fee_reduced_by_rwf)}
                  {request.dispute.refund_rwf > 0 ? `, ${formatRwf(request.dispute.refund_rwf)} refunded` : ' (off the unpaid balance)'}.
                </p>
              )}
            </div>
          )}
          {request.status === 'disputed' && can('deliveries:write') && (
            <div className="rounded-xl border border-stone-200 p-3 space-y-2">
              <p className="text-xs font-black uppercase text-stone-500">Resolve the dispute</p>
              <Select value={outcome} onChange={(e) => setOutcome(e.target.value)} aria-label="Outcome">
                <option value="completed">Delivered — close as completed</option>
                <option value="delivery_confirmed">Back to confirmed (delivery still to happen)</option>
                <option value="customer_cancelled">Cancel the arrangement</option>
              </Select>
              {outcome === 'customer_cancelled' ? (
                <p className="text-[11px] text-stone-500">
                  The order is cancelled and everything the customer paid is refunded automatically (less any refund already given).
                </p>
              ) : (
                <Field
                  label="Reduce the delivery fee by (RWF)"
                  hint={`Optional. At most ${formatRwf(request.order?.delivery_fee_rwf ?? 0)}. Comes off any unpaid balance first; what the customer already overpaid is refunded. The kitchen is paid that much less.`}
                >
                  <Input
                    inputMode="numeric"
                    value={reduction}
                    onChange={(e) => setReduction(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    placeholder="0"
                    disabled={!request.order || request.order.payment_status !== 'paid'}
                  />
                </Field>
              )}
              <Textarea value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="What was decided (both sides see this)" />
              <Button onClick={resolve} disabled={busy || !resolution.trim()}>
                {busy ? 'Saving…' : 'Resolve'}
              </Button>
              {request.order?.payout_on_hold && (
                <p className="text-[11px] text-stone-500">The kitchen's payout for this order is on hold until the dispute is resolved.</p>
              )}
            </div>
          )}
          {request.refunds?.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-black uppercase text-stone-500">Refunds</p>
              {request.refunds.map((refund) => (
                <p key={refund.id} className="text-xs text-stone-700">
                  <strong>{formatRwf(refund.amount_rwf)}</strong> · {refund.kind_label} · {refund.status_label} · to {refund.destination.label}
                  {refund.reference ? ` · ref ${refund.reference}` : ''} ·{' '}
                  <a href={`/admin-dashboard/refunds?refund=${refund.id}`} className="underline">
                    open
                  </a>
                </p>
              ))}
            </div>
          )}
          {request.quotations?.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-black uppercase text-stone-500">Quotations</p>
              {request.quotations.map((q) => (
                <QuotationCard key={q.id} quotation={q} highlight={q.status === 'accepted'} />
              ))}
            </div>
          )}
          <div className="space-y-2">
            <p className="text-xs font-black uppercase text-stone-500">Chat (read only)</p>
            <div className="max-h-64 overflow-y-auto rounded-xl border border-stone-100 bg-stone-50 p-3 space-y-1.5 text-xs">
              {request.messages?.length ? (
                request.messages.map((m) => (
                  <p key={m.id}>
                    <strong className="uppercase text-[10px] text-stone-400">{m.author_role}</strong> {formatWhen(m.created_at)}:{' '}
                    {m.kind === 'image' ? (
                      <a href={m.attachment_url} target="_blank" rel="noreferrer" className="underline">
                        photo
                      </a>
                    ) : m.kind === 'location' && m.location ? (
                      `📍 ${m.location.label || ''} (${m.location.latitude}, ${m.location.longitude})`
                    ) : (
                      m.body
                    )}
                  </p>
                ))
              ) : (
                <p className="text-stone-500">No messages.</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-black uppercase text-stone-500">History</p>
            <StatusHistory history={request.status_history} />
          </div>
        </div>
      )}
    </Modal>
  );
}
