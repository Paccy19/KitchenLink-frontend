import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BarChart3, ChevronLeft, ChevronRight, Download, Sparkles, Archive } from 'lucide-react';
import { kitchenApi, saveBlob } from '../../api/kitchenApi';
import { useVendor } from '../../context/VendorContext';
import { PageHeader, Card, Button, Badge, ErrorNote, Empty, Loading, Stat, useLoad, useAction, money, when, DepartmentTabs } from '../../components/vendor-dashboard/ops/ui';

const PERIODS = [
  { id: 'daily', label: 'Day' },
  { id: 'weekly', label: 'Week' },
  { id: 'monthly', label: 'Month' },
  { id: 'yearly', label: 'Year' },
];
const FULFILMENT = { delivery: 'Delivery', pickup: 'Takeaway', vendor_delivery: 'Kitchen delivery', dine_in: 'Dine-in' };
const today = () => new Date(Date.now() + 2 * 3600000).toISOString().slice(0, 10); // Rwanda date

/** Moves a YYYY-MM-DD date by one period. */
function shift(date, period, step) {
  const d = new Date(`${date}T12:00:00Z`);
  if (period === 'daily') d.setUTCDate(d.getUTCDate() + step);
  if (period === 'weekly') d.setUTCDate(d.getUTCDate() + 7 * step);
  if (period === 'monthly') d.setUTCMonth(d.getUTCMonth() + step);
  if (period === 'yearly') d.setUTCFullYear(d.getUTCFullYear() + step);
  return d.toISOString().slice(0, 10);
}

/**
 * Daily, weekly, monthly and yearly reports. Finished periods are saved
 * automatically when they end (and the kitchen is told); the current one
 * is live. Department managers see only their departments.
 */
export default function VendorReportsPage() {
  const { can, workspace } = useVendor();
  const [params, setParams] = useSearchParams();
  const period = params.get('period') || 'daily';
  const date = params.get('date') || today();
  const [department, setDepartment] = useState('');
  const set = (next) => setParams({ period, date, ...next });
  const { data: report, error, loading } = useLoad(() => kitchenApi.report({ period, date, department_id: department || undefined }), [period, date, department], { intervalMs: 30000 });
  const action = useAction();
  const financial = can('reports.sales');
  const future = shift(date, period, 1) > today() && period === 'daily';

  const exportCsv = () =>
    action.run('csv', async () => saveBlob(await kitchenApi.reportCsv({ period, date, department_id: department || undefined }), `kitchenlink-${period}-${date}.csv`));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reports"
        subtitle="Everything that happened, in plain words. Each finished day, week, month and year is saved automatically."
        actions={<Button variant="secondary" busy={action.busy === 'csv'} onClick={exportCsv}><Download className="w-4 h-4" /> Export CSV</Button>}
      />
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div className="flex rounded-xl bg-stone-100 p-1 w-fit">
          {PERIODS.map((p) => (
            <button key={p.id} type="button" onClick={() => set({ period: p.id })} className={`px-4 py-2 rounded-lg text-xs font-bold ${period === p.id ? 'bg-white shadow text-gray-900' : 'text-stone-500'}`}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" className="!px-2.5" aria-label="Previous" onClick={() => set({ date: shift(date, period, -1) })}><ChevronLeft className="w-4 h-4" /></Button>
          <input type="date" value={date} max={today()} onChange={(e) => e.target.value && set({ date: e.target.value })} className="px-3 py-2 rounded-xl border border-stone-200 text-sm font-semibold" />
          <Button variant="secondary" className="!px-2.5" aria-label="Next" disabled={future} onClick={() => set({ date: shift(date, period, 1) })}><ChevronRight className="w-4 h-4" /></Button>
          <Button variant="soft" onClick={() => set({ date: today() })}>Now</Button>
        </div>
      </div>
      {financial && <DepartmentTabs departments={workspace?.departments || []} value={department} onChange={setDepartment} allLabel="Whole kitchen" />}
      <ErrorNote message={error || action.error} />
      {loading && !report ? (
        <Loading />
      ) : !report ? null : (
        <ReportBody report={report} />
      )}
      {financial && <SavedReports period={period} onOpen={(d) => set({ date: d })} />}
    </div>
  );
}

function ReportBody({ report }) {
  const s = report.summary;
  const showMoney = report.summary.sales_rwf != null;
  const metric = (p) => (showMoney ? p.sales_rwf : p.orders) || 0;
  const maxSeries = Math.max(1, ...report.series.map(metric));
  const maxDept = Math.max(1, ...report.departments.map((d) => d.sales_rwf));
  return (
    <div className="space-y-5">
      <Card className="bg-gradient-to-br from-[#2b1206] via-[#481f0d] to-[#200d05] !border-0 text-white">
        <div className="flex items-center justify-between gap-2 mb-3">
          <p className="font-black text-lg">{report.period.label}</p>
          <Badge tone={report.live ? 'amber' : 'emerald'}>{report.live ? 'Live — period not finished' : report.stored ? 'Saved report' : 'Final'}</Badge>
        </div>
        <ul className="space-y-1.5">
          {report.highlights.map((h) => (
            <li key={h} className="flex gap-2 text-sm text-[#f5ebe1]"><Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#f7a23b]" /> {h}</li>
          ))}
        </ul>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Sales" value={s.sales_rwf == null ? '—' : money(s.sales_rwf)} hint={report.change?.sales_percent != null ? `${report.change.sales_percent >= 0 ? '+' : ''}${report.change.sales_percent}% vs ${report.previous?.label}` : undefined} />
        <Stat label="Orders" value={s.orders_placed} hint={`${s.orders_completed} completed · ${s.orders_cancelled} cancelled`} />
        <Stat label="Average order" value={s.average_order_rwf == null ? '—' : money(s.average_order_rwf)} hint={`${s.items_sold} items sold`} />
        <Stat label="Ready in" value={s.avg_prep_minutes != null ? `${s.avg_prep_minutes} min` : '—'} hint={s.busiest_hour ? `Busiest ${s.busiest_hour}` : undefined} />
      </div>

      {report.series.length > 0 && (
        <Card>
          <h3 className="font-black text-sm mb-3">{showMoney ? 'Sales over time' : 'Orders over time'}</h3>
          <div className="flex items-end gap-1 h-40" role="img" aria-label="Sales over time">
            {report.series.map((p) => (
              <div key={p.key} className="flex-1 flex flex-col items-center gap-1 min-w-0" title={`${p.key}: ${showMoney ? `${money(p.sales_rwf)} · ` : ''}${p.orders} orders`}>
                <div className="w-full rounded-t-md bg-[#c08a63]" style={{ height: `${Math.max(4, (metric(p) / maxSeries) * 100)}%` }} />
                <span className="text-[9px] text-stone-400 truncate w-full text-center">{p.key.slice(-5)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <h3 className="font-black text-sm mb-3">Departments</h3>
          {report.departments.length === 0 ? <p className="text-sm text-stone-500">No sales yet.</p> : (
            <div className="space-y-3">
              {report.departments.map((d) => (
                <div key={d.department_id || 'main'}>
                  <div className="flex justify-between text-sm"><span className="font-bold">{d.name}</span><span className="font-black">{money(d.sales_rwf)}</span></div>
                  <div className="h-2 rounded-full bg-stone-100 mt-1"><div className="h-2 rounded-full bg-[#6d391d]" style={{ width: `${(d.sales_rwf / maxDept) * 100}%` }} /></div>
                  <p className="text-[11px] text-stone-500 mt-0.5">{d.items_sold} items · {d.orders} orders{d.avg_prep_minutes != null ? ` · ready in ${d.avg_prep_minutes} min` : ''}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <h3 className="font-black text-sm mb-3">Best sellers</h3>
          {report.top_products.length === 0 ? <p className="text-sm text-stone-500">Nothing sold yet.</p> : (
            <ol className="space-y-1.5 text-sm">
              {report.top_products.map((p, i) => (
                <li key={p.name} className="flex justify-between gap-2"><span><b>{i + 1}.</b> {p.name} <span className="text-stone-400 text-[11px]">{p.department}</span></span><span className="font-bold">{p.quantity} · {money(p.sales_rwf)}</span></li>
              ))}
            </ol>
          )}
          {report.not_sold.length > 0 && <p className="text-[11px] text-stone-500 mt-3">Not sold: {report.not_sold.join(', ')}</p>}
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <Card>
          <h3 className="font-black text-sm mb-3">How customers ordered</h3>
          <ul className="space-y-1 text-sm">
            {Object.entries(report.by_fulfillment).map(([k, v]) => (
              <li key={k} className="flex justify-between"><span>{FULFILMENT[k] || k}</span><span className="font-bold">{v.orders}{v.sales_rwf != null ? ` · ${money(v.sales_rwf)}` : ''}</span></li>
            ))}
            {!Object.keys(report.by_fulfillment).length && <li className="text-stone-500">—</li>}
          </ul>
          {report.tables.length > 0 && (
            <>
              <h4 className="text-[11px] font-black uppercase text-stone-400 mt-4 mb-1">Tables</h4>
              <ul className="space-y-1 text-sm">{report.tables.slice(0, 6).map((t) => <li key={t.table} className="flex justify-between"><span>{t.table}</span><span className="font-bold">{t.sales_rwf != null ? money(t.sales_rwf) : `${t.orders} orders`}</span></li>)}</ul>
            </>
          )}
        </Card>
        {report.payments && (
          <Card>
            <h3 className="font-black text-sm mb-3">Money</h3>
            <ul className="space-y-1 text-sm">
              <li className="flex justify-between"><span>Taken in person</span><b>{money(report.payments.collected_in_person_rwf)}</b></li>
              {report.payments.collected_by_method.map((m) => <li key={m.method} className="flex justify-between text-stone-500 pl-3"><span>{m.method}</span><span>{money(m.amount_rwf)}</span></li>)}
              <li className="flex justify-between"><span>Paid in the app</span><b>{money(report.payments.paid_online_rwf)}</b></li>
              {report.sales?.commission_rwf > 0 && <li className="flex justify-between text-stone-500"><span>KitchenLink commission</span><span>−{money(report.sales.commission_rwf)}</span></li>}
              <li className="flex justify-between"><span>Refunded</span><b>{money(report.payments.refunded_in_person_rwf + report.payments.refunded_online_rwf)}</b></li>
              <li className={`flex justify-between ${report.payments.outstanding_rwf ? 'text-amber-700' : ''}`}><span>Still unpaid</span><b>{money(report.payments.outstanding_rwf)}</b></li>
            </ul>
          </Card>
        )}
        <Card>
          <h3 className="font-black text-sm mb-3">Stock</h3>
          <p className="text-sm">{report.inventory.hidden ? 'Not part of your role.' : `${report.inventory.movements} changes · value ${money(report.inventory.stock_value_rwf)}`}</p>
          {report.inventory.most_used.length > 0 && <ul className="mt-2 space-y-1 text-sm">{report.inventory.most_used.slice(0, 5).map((i) => <li key={i.name} className="flex justify-between"><span>{i.name}</span><span>{i.used} {i.unit}</span></li>)}</ul>}
          {report.inventory.low_stock.length > 0 && <p className="text-[11px] font-bold text-amber-700 mt-3">Low: {report.inventory.low_stock.map((i) => i.name).join(', ')}</p>}
        </Card>
      </div>

      {report.customers && (
        <Card>
          <h3 className="font-black text-sm mb-3">Customers</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <Stat label="App customers" value={report.customers.customers} />
            <Stat label="New" value={report.customers.new_customers} />
            <Stat label="Returning" value={report.customers.returning_customers} />
            <Stat label="Table guests" value={report.customers.table_guests} />
          </div>
          {report.customers.top.length > 0 && (
            <ol className="text-sm space-y-1">{report.customers.top.map((c, i) => <li key={c.customer_id} className="flex justify-between"><span><b>{i + 1}.</b> {c.name} · {c.orders} order{c.orders === 1 ? '' : 's'}</span><span className="font-bold">{money(c.spent_rwf)}</span></li>)}</ol>
          )}
        </Card>
      )}
      {report.staff && report.staff.length > 0 && (
        <Card className="!p-0 overflow-x-auto">
          <h3 className="font-black text-sm px-5 pt-4 pb-2">Team</h3>
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase text-stone-500 bg-stone-50"><tr><th className="text-left px-5 py-2">Employee</th><th className="text-right px-3 py-2">Tickets done</th><th className="text-right px-3 py-2">Items served</th><th className="text-right px-5 py-2">Payments taken</th></tr></thead>
            <tbody className="divide-y divide-stone-100">
              {report.staff.map((m) => <tr key={m.staff_id}><td className="px-5 py-2 font-bold">{m.name}</td><td className="text-right px-3">{m.tickets_done}</td><td className="text-right px-3">{m.items_served}</td><td className="text-right px-5">{m.payments_taken} · {money(m.payments_rwf)}</td></tr>)}
            </tbody>
          </table>
        </Card>
      )}
      <p className="text-[11px] text-stone-400">{report.definitions?.sales}</p>
    </div>
  );
}

function SavedReports({ period, onOpen }) {
  const { data } = useLoad(() => kitchenApi.reportHistory(period), [period], { intervalMs: 120000 });
  const reports = data?.reports || [];
  return (
    <Card>
      <h3 className="font-black text-sm mb-3 flex items-center gap-1.5"><Archive className="w-4 h-4" /> Saved {PERIODS.find((p) => p.id === period)?.label.toLowerCase()} reports</h3>
      {reports.length === 0 ? (
        <Empty icon={BarChart3} title="None saved yet">A report is saved automatically at the end of each period.</Empty>
      ) : (
        <div className="divide-y divide-stone-100">
          {reports.map((r) => (
            <button key={r.id} type="button" onClick={() => onOpen(new Date(new Date(r.start).getTime() + 2 * 3600000).toISOString().slice(0, 10))} className="w-full text-left py-2.5 flex items-center gap-3 hover:bg-[#faf6f2] rounded-lg px-2">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">{r.label}</p>
                <p className="text-[11px] text-stone-500 truncate">{r.highlights[0]}</p>
              </div>
              <span className="text-sm font-black">{money(r.sales_rwf)}</span>
              <span className="text-[11px] text-stone-400 hidden sm:block">{when(r.generated_at)}</span>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}
