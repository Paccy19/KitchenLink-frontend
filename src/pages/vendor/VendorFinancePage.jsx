import React, { useState } from 'react';
import { Landmark, Plus, Trash2, Pencil } from 'lucide-react';
import { kitchenApi } from '../../api/kitchenApi';
import { useVendor } from '../../context/VendorContext';
import { PageHeader, Card, Button, ErrorNote, Empty, Loading, Modal, Field, Stat, inputClass, useLoad, useAction, money, when } from '../../components/vendor-dashboard/ops/ui';

const today = () => new Date(Date.now() + 2 * 3600000).toISOString().slice(0, 10);

/** Expenses, profit and loss, and every money movement. */
export default function VendorFinancePage() {
  const { can } = useVendor();
  const tabs = [
    ...(can('finance.profit_loss') ? [['pnl', 'Profit & loss']] : []),
    ...(can('finance.expenses_view') ? [['expenses', 'Expenses']] : []),
    ...(can('finance.transactions') ? [['transactions', 'Transactions']] : []),
  ];
  const [tab, setTab] = useState(tabs[0]?.[0] || 'expenses');
  return (
    <div className="space-y-5">
      <PageHeader title="Finance" />
      <div className="flex rounded-xl bg-stone-100 p-1 w-fit">
        {tabs.map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)} className={`px-4 py-2 rounded-lg text-xs font-bold ${tab === id ? 'bg-white shadow text-gray-900' : 'text-stone-500'}`}>{label}</button>
        ))}
      </div>
      {tab === 'pnl' && <ProfitLoss />}
      {tab === 'expenses' && <Expenses />}
      {tab === 'transactions' && <Transactions />}
    </div>
  );
}

function ProfitLoss() {
  const [period, setPeriod] = useState('monthly');
  const [date, setDate] = useState(today());
  const { data, error, loading } = useLoad(() => kitchenApi.profitLoss({ period, date }), [period, date]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        {[['daily', 'Day'], ['weekly', 'Week'], ['monthly', 'Month'], ['yearly', 'Year']].map(([id, label]) => (
          <button key={id} type="button" onClick={() => setPeriod(id)} className={`px-3.5 py-2 rounded-full text-xs font-bold border ${period === id ? 'bg-[#2b1206] text-white border-[#2b1206]' : 'bg-white text-stone-600 border-stone-200'}`}>{label}</button>
        ))}
        <input type="date" value={date} max={today()} onChange={(e) => e.target.value && setDate(e.target.value)} className="px-3 py-2 rounded-xl border border-stone-200 text-sm" />
      </div>
      <ErrorNote message={error} />
      {loading && !data ? <Loading /> : data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat label="Revenue" value={money(data.revenue.total_rwf)} hint={data.period.label} />
            <Stat label="Expenses" value={money(data.costs.expenses_rwf)} />
            <Stat label="Commission & refunds" value={money(data.costs.commission_rwf + data.costs.refunds_rwf)} />
            <Stat label="Profit" value={money(data.profit_rwf)} hint={data.margin_percent != null ? `${data.margin_percent}% margin` : undefined} tone={data.profit_rwf < 0 ? 'warn' : undefined} />
          </div>
          <Card>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-stone-100">
                <Row label="Food sales" value={data.revenue.food_rwf} />
                {data.revenue.own_delivery_fees_rwf > 0 && <Row label="Delivery fees (deliveries you made)" value={data.revenue.own_delivery_fees_rwf} />}
                <Row label="KitchenLink commission" value={-data.costs.commission_rwf} />
                <Row label="Refunds" value={-data.costs.refunds_rwf} />
                {data.costs.expenses_by_category.map((e) => <Row key={e.category} label={`Expense: ${e.category}`} value={-e.total_rwf} />)}
                <Row label="Profit" value={data.profit_rwf} bold />
              </tbody>
            </table>
            <p className="text-[11px] text-stone-400 mt-3">{data.note}</p>
          </Card>
        </>
      )}
    </div>
  );
}

const Row = ({ label, value, bold }) => (
  <tr className={bold ? 'font-black' : ''}>
    <td className="py-2">{label}</td>
    <td className={`py-2 text-right ${value < 0 ? 'text-red-600' : ''}`}>{value < 0 ? `−${money(-value)}` : money(value)}</td>
  </tr>
);

function Expenses() {
  const { can } = useVendor();
  const { data, error, loading, reload } = useLoad(() => kitchenApi.expenses({ limit: 100 }), []);
  const action = useAction();
  const [editing, setEditing] = useState(null);
  const rows = data?.expenses || [];
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-stone-600">Last 30 days: <b>{money(data?.total_rwf)}</b></p>
        {can('finance.expenses_record') && <Button onClick={() => setEditing({})}><Plus className="w-4 h-4" /> Record expense</Button>}
      </div>
      <ErrorNote message={error || action.error} />
      {(data?.by_category || []).length > 0 && (
        <div className="flex flex-wrap gap-2">{data.by_category.map((c) => <span key={c.category} className="px-3 py-1 rounded-full bg-white border border-stone-200 text-xs font-bold">{c.category}: {money(c.total_rwf)}</span>)}</div>
      )}
      <Card className="!p-0 overflow-hidden">
        {loading && !data ? <Loading /> : rows.length === 0 ? <Empty icon={Landmark} title="No expenses recorded" /> : (
          <div className="divide-y divide-stone-100">
            {rows.map((e) => (
              <div key={e.id} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                <div className="flex-1 min-w-0">
                  <p className="font-bold">{e.category}{e.description ? ` · ${e.description}` : ''}</p>
                  <p className="text-[11px] text-stone-500">{when(e.date)} · {e.payment_method}{e.recorded_by ? ` · ${e.recorded_by}` : ''}{e.from_purchase_order ? ' · from a purchase order' : ''}</p>
                </div>
                <span className="font-black">{money(e.amount_rwf)}</span>
                {can('finance.expenses_edit') && !e.from_purchase_order && <Button variant="secondary" className="!py-1.5 !px-2.5" aria-label="Edit" onClick={() => setEditing(e)}><Pencil className="w-3.5 h-3.5" /></Button>}
                {can('finance.expenses_delete') && <Button variant="danger" className="!py-1.5 !px-2.5" aria-label="Delete" onClick={() => window.confirm('Delete this expense?') && action.run(e.id, async () => { await kitchenApi.deleteExpense(e.id); reload(); })}><Trash2 className="w-3.5 h-3.5" /></Button>}
              </div>
            ))}
          </div>
        )}
      </Card>
      {editing && <ExpenseForm expense={editing} categories={data?.categories || []} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
    </div>
  );
}

function ExpenseForm({ expense, categories, onClose, onSaved }) {
  const { workspace } = useVendor();
  const [form, setForm] = useState({ date: (expense.date || new Date().toISOString()).slice(0, 10), category: expense.category || categories[0] || 'Other', description: expense.description || '', amount_rwf: expense.amount_rwf || '', payment_method: expense.payment_method || 'cash', department_id: expense.department_id || '', reference: expense.reference || '' });
  const action = useAction();
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const save = () => action.run('s', async () => {
    const body = { ...form, amount_rwf: Number(form.amount_rwf), department_id: form.department_id || null };
    if (expense.id) await kitchenApi.updateExpense(expense.id, body);
    else await kitchenApi.createExpense(body);
    onSaved();
  });
  return (
    <Modal title={expense.id ? 'Edit expense' : 'Record an expense'} onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date"><input className={inputClass} type="date" value={form.date} onChange={set('date')} /></Field>
          <Field label="Amount (RWF)"><input className={inputClass} type="number" min="1" value={form.amount_rwf} onChange={set('amount_rwf')} autoFocus /></Field>
          <Field label="Category">
            <input className={inputClass} list="expense-categories" value={form.category} onChange={set('category')} />
            <datalist id="expense-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
          </Field>
          <Field label="Paid with">
            <select className={inputClass} value={form.payment_method} onChange={set('payment_method')}>
              {[['cash', 'Cash'], ['mobile_money', 'Mobile Money'], ['card', 'Card'], ['bank', 'Bank transfer'], ['other', 'Other']].map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </Field>
        </div>
        <Field label="What for"><input className={inputClass} value={form.description} onChange={set('description')} /></Field>
        {(workspace?.departments || []).length > 0 && (
          <Field label="Department (optional)">
            <select className={inputClass} value={form.department_id} onChange={set('department_id')}>
              <option value="">Whole kitchen</option>
              {workspace.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Field>
        )}
        <Field label="Reference (optional)"><input className={inputClass} value={form.reference} onChange={set('reference')} /></Field>
        <ErrorNote message={action.error} />
        <Button className="w-full" busy={action.busy === 's'} onClick={save}>Save</Button>
      </div>
    </Modal>
  );
}

function Transactions() {
  const { data, error, loading } = useLoad(() => kitchenApi.transactions(), []);
  const rows = data?.transactions || [];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 max-w-md">
        <Stat label="In (30 days)" value={money(data?.totals?.in_rwf)} />
        <Stat label="Out (30 days)" value={money(data?.totals?.out_rwf)} />
      </div>
      <ErrorNote message={error} />
      <Card className="!p-0 overflow-hidden">
        {loading && !data ? <Loading /> : rows.length === 0 ? <Empty icon={Landmark} title="No money movements yet" /> : (
          <div className="divide-y divide-stone-100">
            {rows.map((t, i) => (
              <div key={i} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                <div className="flex-1 min-w-0">
                  <p className="font-bold">{t.kind === 'payment' ? 'Payment' : t.kind === 'refund' ? 'Refund' : 'Expense'} · {t.label}</p>
                  <p className="text-[11px] text-stone-500">{when(t.at)} · {t.method}{t.channel === 'online' ? ' (app)' : ''}{t.reference ? ` · ${t.reference}` : ''}{t.by ? ` · ${t.by}` : ''}</p>
                </div>
                <span className={`font-black ${t.amount_rwf < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{t.amount_rwf < 0 ? `−${money(-t.amount_rwf)}` : money(t.amount_rwf)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
