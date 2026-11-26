import React, { useState } from 'react';
import { HeartHandshake, Plus, Search, Star, Send, MessageSquareReply } from 'lucide-react';
import { kitchenApi } from '../../api/kitchenApi';
import { useVendor } from '../../context/VendorContext';
import { PageHeader, Card, Button, Badge, ErrorNote, Empty, Loading, Modal, Field, Stat, inputClass, useLoad, useAction, money, when } from '../../components/vendor-dashboard/ops/ui';

/** The kitchen's customers, their loyalty points and discounts, and what guests say. */
export default function VendorCustomersPage() {
  const { can } = useVendor();
  const tabs = [
    ...(can('customers.view') ? [['customers', 'Customers']] : []),
    ...(can('customers.feedback') ? [['feedback', 'Feedback']] : []),
    ...(can('customers.reviews') || can('customers.feedback') ? [['reviews', 'Public reviews']] : []),
  ];
  const [tab, setTab] = useState(tabs[0]?.[0] || 'customers');
  const [notify, setNotify] = useState(false);
  return (
    <div className="space-y-5">
      <PageHeader
        title="Customers"
        actions={can('notifications.customer') && <Button variant="secondary" onClick={() => setNotify(true)}><Send className="w-4 h-4" /> Message customers</Button>}
      />
      <div className="flex rounded-xl bg-stone-100 p-1 w-fit">
        {tabs.map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)} className={`px-4 py-2 rounded-lg text-xs font-bold ${tab === id ? 'bg-white shadow text-gray-900' : 'text-stone-500'}`}>{label}</button>
        ))}
      </div>
      {tab === 'customers' && <CustomersTab />}
      {tab === 'feedback' && <FeedbackTab />}
      {tab === 'reviews' && <FeedbackTab reviews />}
      {notify && <NotifyModal onClose={() => setNotify(false)} />}
    </div>
  );
}

function CustomersTab() {
  const { can } = useVendor();
  const [q, setQ] = useState('');
  const { data, error, loading, reload } = useLoad(() => kitchenApi.customers({ q: q || undefined, limit: 60 }), [q]);
  const [open, setOpen] = useState(null);
  const [adding, setAdding] = useState(false);
  const list = data?.customers || [];
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <label className="relative sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input className={`${inputClass} pl-9`} placeholder="Name, phone or tag" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        {can('customers.manage') && <Button onClick={() => setAdding(true)}><Plus className="w-4 h-4" /> Add customer</Button>}
      </div>
      <ErrorNote message={error} />
      <Card className="!p-0 overflow-hidden">
        {loading && !data ? <Loading /> : list.length === 0 ? <Empty icon={HeartHandshake} title="No customers yet">App customers appear here once they order. Add regulars to give them loyalty points.</Empty> : (
          <div className="divide-y divide-stone-100">
            {list.map((c) => (
              <button key={c.id} type="button" onClick={() => can('customers.profiles') && setOpen(c.id)} className="w-full text-left px-4 py-3 hover:bg-[#faf6f2] flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm text-gray-900 flex items-center gap-2">{c.name} {c.app_customer && <Badge tone="blue">App</Badge>} {c.tags.map((t) => <Badge key={t}>{t}</Badge>)}</p>
                  <p className="text-[11px] text-stone-500">{[c.phone, `${c.orders_count} orders`, c.last_order_at ? `last ${when(c.last_order_at)}` : ''].filter(Boolean).join(' · ')}</p>
                </div>
                <div className="text-right text-xs">
                  <p className="font-black">{money(c.total_spent_rwf)}</p>
                  <p className="text-stone-500">{c.loyalty_points} pts{c.discount_percent ? ` · ${c.discount_percent}% off` : ''}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>
      {open && <CustomerModal customerId={open} onClose={() => { setOpen(null); reload(); }} />}
      {adding && <AddCustomer onClose={() => setAdding(false)} onSaved={() => { setAdding(false); reload(); }} />}
    </div>
  );
}

function AddCustomer({ onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', phone: '', notes: '' });
  const action = useAction();
  return (
    <Modal title="Add a customer" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Name"><input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus /></Field>
        <Field label="Phone (optional)"><input className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="078…" /></Field>
        <Field label="Notes (optional)"><input className={inputClass} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Allergic to nuts" /></Field>
        <ErrorNote message={action.error} />
        <Button className="w-full" busy={action.busy === 's'} onClick={() => action.run('s', async () => { await kitchenApi.createCustomer({ ...form, phone: form.phone || null }); onSaved(); })}>Save</Button>
      </div>
    </Modal>
  );
}

function CustomerModal({ customerId, onClose }) {
  const { can } = useVendor();
  const { data: c, error, reload } = useLoad(() => kitchenApi.customer(customerId), [customerId], { intervalMs: 60000 });
  const action = useAction();
  const [points, setPoints] = useState({ points: '', reason: '' });
  const [notes, setNotes] = useState(null);
  const [discount, setDiscount] = useState(null);
  if (!c) return <Modal title="Customer" onClose={onClose}>{error ? <ErrorNote message={error} /> : <Loading />}</Modal>;
  return (
    <Modal title={c.name} onClose={onClose} wide>
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Orders" value={c.orders_count} />
          <Stat label="Spent" value={money(c.total_spent_rwf)} />
          <Stat label="Points" value={c.loyalty_points} />
          <Stat label="Discount" value={`${c.discount_percent}%`} />
        </div>
        <p className="text-sm text-stone-600">{[c.phone, c.email].filter(Boolean).join(' · ') || 'No contact details'}</p>
        <ErrorNote message={action.error} />
        {can('customers.manage') && (
          <Field label="Notes about this customer">
            <div className="flex gap-2">
              <input className={inputClass} value={notes ?? c.notes} onChange={(e) => setNotes(e.target.value)} />
              <Button variant="secondary" busy={action.busy === 'n'} onClick={() => action.run('n', async () => { await kitchenApi.updateCustomer(c.id, { notes: notes ?? c.notes }); reload(); })}>Save</Button>
            </div>
          </Field>
        )}
        {can('customers.discounts') && (
          <Field label="Standing discount on table bills (%)">
            <div className="flex gap-2">
              <input className={inputClass} type="number" min="0" max="100" value={discount ?? c.discount_percent} onChange={(e) => setDiscount(e.target.value)} />
              <Button variant="secondary" busy={action.busy === 'd'} onClick={() => action.run('d', async () => { await kitchenApi.updateCustomer(c.id, { discount_percent: Number(discount ?? c.discount_percent) }); reload(); })}>Save</Button>
            </div>
          </Field>
        )}
        {can('customers.loyalty') && (
          <div className="rounded-2xl border border-stone-200 p-3 space-y-2">
            <p className="font-black text-sm">Loyalty points</p>
            <div className="grid grid-cols-3 gap-2">
              <input className={inputClass} type="number" placeholder="+10 or -5" value={points.points} onChange={(e) => setPoints({ ...points, points: e.target.value })} />
              <input className={`${inputClass} col-span-2`} placeholder="Why" value={points.reason} onChange={(e) => setPoints({ ...points, reason: e.target.value })} />
            </div>
            <Button variant="secondary" busy={action.busy === 'p'} onClick={() => action.run('p', async () => { await kitchenApi.adjustPoints(c.id, Number(points.points), points.reason); setPoints({ points: '', reason: '' }); reload(); })}>Change points</Button>
            {(c.loyalty_history || []).length > 0 && (
              <ul className="text-xs text-stone-600 max-h-32 overflow-y-auto">
                {c.loyalty_history.map((h, i) => <li key={i}>{h.points > 0 ? '+' : ''}{h.points} · {h.reason} · {when(h.at)}</li>)}
              </ul>
            )}
          </div>
        )}
        {c.orders && (
          <div>
            <p className="font-black text-sm mb-2">Order history</p>
            <ul className="divide-y divide-stone-100 text-sm max-h-60 overflow-y-auto">
              {c.orders.map((o) => (
                <li key={o.id} className="py-1.5 flex justify-between gap-2"><span>{o.order_number} · {o.items.join(', ')}</span><span className="font-bold whitespace-nowrap">{money(o.total_rwf)}</span></li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}

function FeedbackTab({ reviews = false }) {
  const { can } = useVendor();
  const { data, error, loading, reload } = useLoad(() => kitchenApi.feedback(reviews ? { public: 'true' } : {}), [reviews]);
  const action = useAction();
  const [replying, setReplying] = useState(null);
  const rows = data?.feedback || [];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 max-w-sm">
        <Stat label="Average rating" value={data?.average_rating ? `${data.average_rating} ★` : '—'} />
        <Stat label="Ratings" value={data?.count ?? 0} />
      </div>
      <ErrorNote message={error || action.error} />
      {loading && !data ? <Loading /> : rows.length === 0 ? <Card><Empty icon={Star} title="No feedback yet">Guests can rate their order from the table page.</Empty></Card> : (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((f) => (
            <Card key={f.id}>
              <div className="flex items-center justify-between">
                <p className="font-black text-amber-600">{'★'.repeat(f.rating)}<span className="text-stone-300">{'★'.repeat(5 - f.rating)}</span></p>
                <span className="text-[11px] text-stone-400">{when(f.created_at)}</span>
              </div>
              <p className="text-sm text-stone-700 mt-1">{f.comment || <i className="text-stone-400">No comment</i>}</p>
              <p className="text-[11px] text-stone-500 mt-1">{f.name}{f.table ? ` · ${f.table}` : ''} · {f.order_number}{f.is_public ? ' · public' : ''}</p>
              {f.reply ? (
                <p className="mt-2 text-xs rounded-xl bg-[#faf6f2] border border-[#ebd7c5] px-3 py-2"><b>{f.replied_by}:</b> {f.reply}</p>
              ) : can('customers.complaints') && (
                replying === f.id ? (
                  <ReplyBox onSend={(text) => action.run(f.id, async () => { await kitchenApi.replyFeedback(f.id, text); setReplying(null); reload(); })} busy={action.busy === f.id} />
                ) : (
                  <button type="button" className="mt-2 text-xs font-bold text-[#6d391d] inline-flex items-center gap-1" onClick={() => setReplying(f.id)}><MessageSquareReply className="w-3.5 h-3.5" /> Reply</button>
                )
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ReplyBox({ onSend, busy }) {
  const [text, setText] = useState('');
  return (
    <div className="mt-2 flex gap-2">
      <input className={inputClass} value={text} onChange={(e) => setText(e.target.value)} placeholder="Your reply" autoFocus />
      <Button busy={busy} disabled={text.trim().length < 2} onClick={() => onSend(text)}>Send</Button>
    </div>
  );
}

function NotifyModal({ onClose }) {
  const [form, setForm] = useState({ title: '', body: '' });
  const [result, setResult] = useState(null);
  const action = useAction();
  return (
    <Modal title="Message your customers" onClose={onClose}>
      <div className="space-y-3">
        <p className="text-xs text-stone-500">Goes to the app customers who ordered from you in the last 90 days, as a KitchenLink notification. At most 3 a day.</p>
        <Field label="Title"><input className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
        <Field label="Message"><textarea className={inputClass} rows={3} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></Field>
        <ErrorNote message={action.error} />
        {result && <p className="text-sm font-semibold text-emerald-700">Sent to {result.sent} customer{result.sent === 1 ? '' : 's'}.</p>}
        <Button className="w-full" busy={action.busy === 's'} onClick={() => action.run('s', async () => setResult(await kitchenApi.notifyCustomers(form)))}><Send className="w-4 h-4" /> Send</Button>
      </div>
    </Modal>
  );
}
