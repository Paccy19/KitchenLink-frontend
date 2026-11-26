import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Receipt, Printer, Search, Wallet, Undo2, Lock } from 'lucide-react';
import { kitchenApi, saveBlob } from '../../api/kitchenApi';
import { vendorDownload } from '../../api/vendorApi';
import { useVendor } from '../../context/VendorContext';
import { PageHeader, Card, Button, Badge, ErrorNote, Empty, Loading, Modal, Field, Stat, inputClass, useLoad, useAction, money, when } from '../../components/vendor-dashboard/ops/ui';

const STATUS_TONE = { unpaid: 'amber', partially_paid: 'blue', paid: 'emerald', refunded: 'stone', void: 'red' };
const STATUS_LABEL = { unpaid: 'Unpaid', partially_paid: 'Part paid', paid: 'Paid', refunded: 'Refunded', void: 'Void' };
const TABS = [
  { id: 'open', label: 'Open bills' },
  { id: 'paid', label: 'Paid' },
  { id: '', label: 'All' },
];
const METHODS = [
  { id: 'cash', label: 'Cash' },
  { id: 'mobile_money', label: 'Mobile Money' },
  { id: 'card', label: 'Card' },
  { id: 'other', label: 'Other' },
];
// Who may take which payment (the server's rule): "all payments", or cash / digital on their own.
const mayTake = (can, methodId) => can('invoices.process_payment') || can(methodId === 'cash' ? 'invoices.cash' : 'invoices.digital');

/**
 * Bills. A table's bill gathers everything ordered at the table (every
 * department) into one invoice; app orders get their own, already paid
 * online. Cashiers take full or partial payments and print receipts.
 */
export default function VendorInvoicesPage() {
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState('open');
  const [q, setQ] = useState('');
  const { data, error, loading } = useLoad(() => kitchenApi.invoices({ status: tab || undefined, q: q || undefined, limit: 50 }), [tab, q], { intervalMs: 12000 });
  const openId = params.get('invoice');
  const invoices = data?.invoices || [];

  return (
    <div className="space-y-5">
      <PageHeader title="Invoices & payments" />
      <div className="grid grid-cols-2 gap-3 max-w-md">
        <Stat label="Open bills" value={data?.summary?.open_count ?? 0} />
        <Stat label="Still to collect" value={money(data?.summary?.open_balance_rwf)} tone={data?.summary?.open_balance_rwf ? 'warn' : undefined} />
      </div>
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {TABS.map((t) => (
            <button key={t.id || 'all'} type="button" onClick={() => setTab(t.id)} className={`px-3.5 py-2 rounded-full text-xs font-bold border ${tab === t.id ? 'bg-[#2b1206] text-white border-[#2b1206]' : 'bg-white text-stone-600 border-stone-200'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <label className="relative sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input className={`${inputClass} pl-9`} placeholder="Invoice, order or table" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>
      <ErrorNote message={error} />
      {loading && !data ? (
        <Loading />
      ) : invoices.length === 0 ? (
        <Card>
          <Empty icon={Receipt} title="No invoices here">Bills appear as soon as a table orders or an app order is paid.</Empty>
        </Card>
      ) : (
        <Card className="!p-0 overflow-hidden">
          <div className="divide-y divide-stone-100">
            {invoices.map((inv) => (
              <button key={inv.id} type="button" onClick={() => setParams({ invoice: inv.id })} className="w-full text-left px-4 py-3 hover:bg-[#faf6f2] flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm text-gray-900">
                    {inv.invoice_number} <span className="font-semibold text-stone-500">· {inv.table ? inv.table.label : 'App order'}</span>
                  </p>
                  <p className="text-[11px] text-stone-400">{when(inv.created_at)} · {inv.line_count} item{inv.line_count === 1 ? '' : 's'}{inv.is_open && inv.kind === 'table' ? ' · table still ordering' : ''}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-sm">{money(inv.total_rwf)}</p>
                  {inv.balance_due_rwf > 0 && inv.status !== 'paid' && <p className="text-[11px] font-bold text-amber-700">{money(inv.balance_due_rwf)} due</p>}
                </div>
                <Badge tone={STATUS_TONE[inv.status]}>{STATUS_LABEL[inv.status]}</Badge>
              </button>
            ))}
          </div>
        </Card>
      )}
      {openId && <InvoiceModal invoiceId={openId} onClose={() => setParams({})} />}
    </div>
  );
}

function InvoiceModal({ invoiceId, onClose }) {
  const { can, allowed, vendor } = useVendor();
  const { data: invoice, error, loading, setData } = useLoad(() => kitchenApi.invoice(invoiceId), [invoiceId], { intervalMs: 15000 });
  const methods = METHODS.filter((m) => mayTake(can, m.id));
  const partialOk = can('invoices.process_payment') || can('invoices.partial');
  const download = (kind) =>
    action.run(`doc-${kind}`, async () => {
      const blob = await vendorDownload(`${kitchenApi.invoiceDocumentUrl(invoice.id, kind)}&download=true`);
      saveBlob(blob, `${kind}-${invoice.invoice_number}.html`);
    });
  const action = useAction();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState(() => (can('invoices.process_payment') || can('invoices.cash') ? 'cash' : 'mobile_money'));
  const [reference, setReference] = useState('');
  const [refund, setRefund] = useState(null);
  useEffect(() => {
    if (invoice) setAmount(String(invoice.balance_due_rwf || ''));
  }, [invoice?.balance_due_rwf]); // eslint-disable-line react-hooks/exhaustive-deps

  const pay = () =>
    action.run('pay', async () => {
      setData(await kitchenApi.recordPayment(invoice.id, { amount_rwf: Number(amount), method, reference }));
      setReference('');
    });

  return (
    <Modal title={invoice ? `Invoice ${invoice.invoice_number}` : 'Invoice'} onClose={onClose} wide>
      {loading && !invoice ? (
        <Loading />
      ) : !invoice ? (
        <ErrorNote message={error} />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={STATUS_TONE[invoice.status]}>{STATUS_LABEL[invoice.status]}</Badge>
            {invoice.table && <Badge tone="brown">{invoice.table.label}</Badge>}
            {invoice.kind === 'order' && <Badge>Paid online in the app</Badge>}
            {invoice.is_open && invoice.kind === 'table' && <Badge tone="amber">Table still ordering</Badge>}
          </div>

          <Receipt_ invoice={invoice} />

          {invoice.payments?.length > 0 && (
            <div>
              <h4 className="text-xs font-black uppercase text-stone-500 mb-2">Payments</h4>
              <ul className="text-sm divide-y divide-stone-100">
                {invoice.payments.map((p) => (
                  <li key={p.id} className="py-1.5 flex justify-between gap-2">
                    <span>{p.method_label}{p.reference ? ` · ${p.reference}` : ''}{p.received_by ? ` · ${p.received_by}` : ''} · {when(p.at)}</span>
                    <span className="font-bold">{money(p.amount_rwf)}</span>
                  </li>
                ))}
                {(invoice.refunds || []).map((r) => (
                  <li key={r.id} className="py-1.5 flex justify-between gap-2 text-red-700">
                    <span>Refund ({r.method_label}) · {r.reason} · {when(r.at)}</span>
                    <span className="font-bold">−{money(r.amount_rwf)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {invoice.accepts_payments && (methods.length ? (
            <div className="rounded-2xl bg-[#faf6f2] border border-[#ebd7c5] p-4 space-y-3">
              <h4 className="font-black text-sm flex items-center gap-1.5"><Wallet className="w-4 h-4" /> Take a payment · {money(invoice.balance_due_rwf)} due</h4>
              <div className="grid sm:grid-cols-3 gap-3">
                <Field label="Amount (RWF)"><input className={inputClass} type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
                <Field label="How they paid">
                  <select className={inputClass} value={method} onChange={(e) => setMethod(e.target.value)}>
                    {methods.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>
                </Field>
                <Field label="Reference (optional)"><input className={inputClass} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Mobile money ID…" /></Field>
              </div>
              {!partialOk && Number(amount) < invoice.balance_due_rwf && <p className="text-[11px] font-semibold text-amber-700">Part payments need a cashier who may take them.</p>}
              <Button className="w-full" variant="success" busy={action.busy === 'pay'} disabled={!Number(amount) || (!partialOk && Number(amount) < invoice.balance_due_rwf)} onClick={pay}>
                Record {money(amount)} {Number(amount) < invoice.balance_due_rwf ? '(part payment)' : ''}
              </Button>
            </div>
          ) : (
            <p className="flex items-center gap-1.5 text-xs font-semibold text-stone-500"><Lock className="w-4 h-4" /> Payments are taken by the cashier.</p>
          ))}

          <ErrorNote message={action.error} />
          <div className="flex flex-wrap gap-2">
            {allowed('GET /vendor/invoices/:invoice_id/document') && (
              <>
                <Button variant="secondary" onClick={() => printReceipt(invoice, vendor?.name)}><Printer className="w-4 h-4" /> Print</Button>
                <Button variant="secondary" busy={action.busy === 'doc-invoice'} onClick={() => download('invoice')}>Download invoice</Button>
                {invoice.amount_paid_rwf > 0 && <Button variant="secondary" busy={action.busy === 'doc-receipt'} onClick={() => download('receipt')}>Receipt</Button>}
              </>
            )}
            {invoice.is_open && invoice.kind === 'table' && (can('invoices.edit') || can('tables.close_sessions') || can('reservations.manage_sessions')) && (
              <Button variant="secondary" busy={action.busy === 'close'} onClick={() => action.run('close', async () => setData(await kitchenApi.closeInvoice(invoice.id)))}>
                End table session
              </Button>
            )}
            {(can('invoices.edit') || can('invoices.discounts') || can('promotions.manual_discounts')) && invoice.accepts_payments && (
              <Button
                variant="secondary"
                busy={action.busy === 'disc'}
                onClick={() => {
                  const value = window.prompt('Discount in RWF (0 to remove)', String(invoice.discount_rwf || 0));
                  if (value !== null) action.run('disc', async () => setData(await kitchenApi.editInvoice(invoice.id, { discount_rwf: Number(value) })));
                }}
              >
                Discount
              </Button>
            )}
            {invoice.accepts_payments && <BillExtras invoice={invoice} onChanged={setData} />}
            {allowed('POST /vendor/invoices/:invoice_id/refunds') && invoice.refundable_rwf > 0 && (
              <Button variant="danger" onClick={() => setRefund({ amount: String(invoice.refundable_rwf), reason: '', method: 'cash' })}><Undo2 className="w-4 h-4" /> Refund</Button>
            )}
          </div>
          {refund && (
            <div className="rounded-2xl border border-red-200 bg-red-50/50 p-4 space-y-3">
              <div className="grid sm:grid-cols-3 gap-3">
                <Field label="Amount (RWF)"><input className={inputClass} type="number" value={refund.amount} onChange={(e) => setRefund({ ...refund, amount: e.target.value })} /></Field>
                <Field label="Given back as">
                  <select className={inputClass} value={refund.method} onChange={(e) => setRefund({ ...refund, method: e.target.value })}>
                    {METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>
                </Field>
                <Field label="Why"><input className={inputClass} value={refund.reason} onChange={(e) => setRefund({ ...refund, reason: e.target.value })} /></Field>
              </div>
              <Button
                variant="danger"
                className="w-full"
                busy={action.busy === 'refund'}
                onClick={() =>
                  action.run('refund', async () => {
                    setData(await kitchenApi.refundInvoice(invoice.id, { amount_rwf: Number(refund.amount), reason: refund.reason, method: refund.method }));
                    setRefund(null);
                  })
                }
              >
                Record refund
              </Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

/** On an unpaid table bill: a code, a customer (discount and points), spending points, split, cancel. */
function BillExtras({ invoice, onChanged }) {
  const { can } = useVendor();
  const action = useAction();
  const [open, setOpen] = useState('');
  const [code, setCode] = useState('');
  const [points, setPoints] = useState('');
  const [picked, setPicked] = useState([]);
  const canCustomer = can('customers.view') && ['invoices.edit', 'customers.loyalty', 'customers.discounts', 'invoices.process_payment'].some((p) => can(p));
  const { data: customers } = useLoad(() => (open === 'customer' && canCustomer ? kitchenApi.customers({ limit: 100 }) : Promise.resolve(null)), [open], { intervalMs: 120000 });
  const go = (key, fn) => action.run(key, async () => { const result = await fn(); if (result) onChanged(result.original || result); setOpen(''); });
  const tableBill = invoice.kind === 'table';
  if (!tableBill) return null;
  const btn = (id, label, show) => show && <Button key={id} variant="secondary" onClick={() => setOpen(open === id ? '' : id)}>{label}</Button>;
  return (
    <div className="w-full space-y-2">
      <div className="flex flex-wrap gap-2">
        {btn('code', 'Discount code', ['invoices.discounts', 'promotions.manual_discounts', 'invoices.process_payment', 'invoices.edit'].some((p) => can(p)))}
        {btn('customer', invoice.kitchen_customer_id ? 'Change customer' : 'Add customer', canCustomer)}
        {btn('points', 'Spend points', can('customers.loyalty') && Boolean(invoice.kitchen_customer_id))}
        {btn('split', 'Split bill', (can('invoices.split') || can('tables.split_bills')) && invoice.lines.filter((l) => !l.voided).length > 1)}
        {invoice.amount_paid_rwf === 0 && can('invoices.cancel') && (
          <Button variant="danger" busy={action.busy === 'cancel'} onClick={() => { const reason = window.prompt('Why cancel this bill?', ''); if (reason) go('cancel', () => kitchenApi.cancelInvoice(invoice.id, reason)); }}>Cancel bill</Button>
        )}
      </div>
      <ErrorNote message={action.error} />
      {open === 'code' && (
        <div className="flex gap-2"><input className={`${inputClass} uppercase`} value={code} onChange={(e) => setCode(e.target.value)} placeholder="CODE" /><Button busy={action.busy === 'code'} onClick={() => go('code', () => kitchenApi.applyCode(invoice.id, code))}>Apply</Button></div>
      )}
      {open === 'customer' && (
        <select className={inputClass} defaultValue={invoice.kitchen_customer_id || ''} onChange={(e) => go('customer', () => kitchenApi.setInvoiceCustomer(invoice.id, e.target.value))}>
          <option value="">No customer</option>
          {(customers?.customers || []).map((c) => <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ''} · {c.loyalty_points} pts{c.discount_percent ? ` · ${c.discount_percent}%` : ''}</option>)}
        </select>
      )}
      {open === 'points' && (
        <div className="flex gap-2"><input className={inputClass} type="number" min="1" value={points} onChange={(e) => setPoints(e.target.value)} placeholder="Points to spend" /><Button busy={action.busy === 'points'} onClick={() => go('points', () => kitchenApi.redeemPoints(invoice.id, Number(points)))}>Spend</Button></div>
      )}
      {open === 'split' && (
        <div className="rounded-2xl border border-stone-200 p-3 space-y-2">
          <p className="text-xs text-stone-500">Tick what goes on the new bill.</p>
          {invoice.lines.filter((l) => !l.voided).map((l) => (
            <label key={l.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={picked.includes(l.id)} onChange={() => setPicked(picked.includes(l.id) ? picked.filter((x) => x !== l.id) : [...picked, l.id])} /> {l.quantity}× {l.name} · {money(l.subtotal_rwf)}</label>
          ))}
          <Button busy={action.busy === 'split'} disabled={!picked.length} onClick={() => go('split', () => kitchenApi.splitInvoice(invoice.id, picked))}>Make a separate bill</Button>
        </div>
      )}
    </div>
  );
}

/** The bill: lines grouped by department, then totals. */
function Receipt_({ invoice }) {
  const groups = new Map();
  for (const line of invoice.lines.filter((l) => !l.voided)) {
    if (!groups.has(line.department_name)) groups.set(line.department_name, []);
    groups.get(line.department_name).push(line);
  }
  return (
    <div className="rounded-2xl border border-stone-200 p-4 text-sm">
      {[...groups.entries()].map(([name, lines]) => (
        <div key={name} className="mb-3">
          <p className="text-[11px] font-black uppercase text-stone-400 mb-1">{name}</p>
          {lines.map((line) => (
            <div key={line.id} className="flex justify-between gap-2 py-0.5">
              <span>{line.quantity}× {line.name}</span>
              <span className="font-semibold">{money(line.subtotal_rwf)}</span>
            </div>
          ))}
        </div>
      ))}
      <div className="border-t border-stone-200 pt-2 space-y-1">
        <Row label="Subtotal" value={money(invoice.subtotal_rwf)} />
        {invoice.delivery_fee_rwf > 0 && <Row label="Delivery" value={money(invoice.delivery_fee_rwf)} />}
        {invoice.discount_rwf > 0 && <Row label="Discount" value={`−${money(invoice.discount_rwf)}`} />}
        {(invoice.promotions || []).map((p) => <Row key={p.name} label={p.code ? `Code ${p.code}` : p.name} value={`−${money(p.amount_rwf)}`} />)}
        {invoice.loyalty_discount_rwf > 0 && <Row label={`${invoice.loyalty_points_redeemed} points`} value={`−${money(invoice.loyalty_discount_rwf)}`} />}
        <Row label="Total" value={money(invoice.total_rwf)} bold />
        <Row label="Paid" value={money(invoice.amount_paid_rwf)} />
        {invoice.balance_due_rwf > 0 && <Row label="Still due" value={money(invoice.balance_due_rwf)} bold />}
      </div>
    </div>
  );
}

const Row = ({ label, value, bold }) => (
  <div className={`flex justify-between ${bold ? 'font-black' : ''}`}>
    <span>{label}</span>
    <span>{value}</span>
  </div>
);

/** A printable receipt in its own window (built with text nodes only). */
function printReceipt(invoice, kitchenName) {
  const w = window.open('', '_blank', 'width=420,height=700');
  if (!w) return;
  const d = w.document;
  d.title = invoice.invoice_number;
  const root = d.createElement('div');
  root.style.cssText = 'font-family:ui-monospace,Menlo,monospace;font-size:13px;padding:16px;max-width:340px;margin:auto';
  const line = (text, style = '') => {
    const p = d.createElement('div');
    p.textContent = text;
    p.style.cssText = style;
    root.appendChild(p);
  };
  const pair = (left, right, style = '') => {
    const row = d.createElement('div');
    row.style.cssText = `display:flex;justify-content:space-between;gap:8px;${style}`;
    const a = d.createElement('span');
    a.textContent = left;
    const b = d.createElement('span');
    b.textContent = right;
    row.append(a, b);
    root.appendChild(row);
  };
  line(invoice.kitchen?.name || kitchenName || 'KitchenLink', 'font-size:16px;font-weight:bold;text-align:center');
  if (invoice.kitchen?.address) line(invoice.kitchen.address, 'text-align:center');
  if (invoice.kitchen?.phone) line(invoice.kitchen.phone, 'text-align:center');
  line('—'.repeat(20), 'text-align:center');
  line(`${invoice.invoice_number}${invoice.table ? ` · ${invoice.table.label}` : ''}`);
  line(when(invoice.created_at));
  line('—'.repeat(20), 'text-align:center');
  for (const l of invoice.lines.filter((x) => !x.voided)) pair(`${l.quantity}× ${l.name}`, money(l.subtotal_rwf));
  line('—'.repeat(20), 'text-align:center');
  pair('Subtotal', money(invoice.subtotal_rwf));
  if (invoice.delivery_fee_rwf) pair('Delivery', money(invoice.delivery_fee_rwf));
  if (invoice.discount_rwf) pair('Discount', `-${money(invoice.discount_rwf)}`);
  for (const p of invoice.promotions || []) pair(p.code ? `Code ${p.code}` : p.name, `-${money(p.amount_rwf)}`);
  if (invoice.loyalty_discount_rwf) pair(`${invoice.loyalty_points_redeemed} loyalty points`, `-${money(invoice.loyalty_discount_rwf)}`);
  pair('TOTAL', money(invoice.total_rwf), 'font-weight:bold;font-size:15px');
  pair('Paid', money(invoice.amount_paid_rwf));
  if (invoice.balance_due_rwf) pair('Due', money(invoice.balance_due_rwf), 'font-weight:bold');
  line(STATUS_LABEL[invoice.status], 'text-align:center;margin-top:8px;font-weight:bold');
  line('Thank you!', 'text-align:center;margin-top:12px');
  d.body.appendChild(root);
  w.focus();
  w.print();
}
