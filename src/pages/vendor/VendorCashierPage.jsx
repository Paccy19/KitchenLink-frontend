import React, { useState } from 'react';
import { Banknote, Lock, Unlock } from 'lucide-react';
import { kitchenApi } from '../../api/kitchenApi';
import { useVendor } from '../../context/VendorContext';
import { PageHeader, Card, Button, Badge, ErrorNote, Empty, Loading, Field, Stat, inputClass, useLoad, useAction, money, when } from '../../components/vendor-dashboard/ops/ui';

/** The cashier's till: open with a float, close by counting the cash. Plus what each cashier took. */
export default function VendorCashierPage() {
  const { can } = useVendor();
  const canSessions = can('invoices.cashier_sessions') || can('invoices.process_payment') || can('invoices.cash');
  const { data, error, loading, reload } = useLoad(() => (canSessions ? kitchenApi.cashierSessions() : Promise.resolve({ sessions: [], mine: null })), [canSessions], { intervalMs: 20000 });
  const { data: report } = useLoad(() => (can('invoices.cashier_reports') ? kitchenApi.cashierReport() : Promise.resolve(null)), [], { intervalMs: 60000 });
  const action = useAction();
  const [float, setFloat] = useState('');
  const [counted, setCounted] = useState('');
  const mine = data?.mine;
  return (
    <div className="space-y-5">
      <PageHeader title="Cashier till" />
      <ErrorNote message={error || action.error} />
      {canSessions && (
        <Card>
          {loading && !data ? <Loading /> : mine ? (
            <div className="space-y-3">
              <p className="font-black flex items-center gap-2"><Unlock className="w-4 h-4 text-emerald-600" /> Your till is open since {when(mine.opened_at)}</p>
              <p className="text-sm text-stone-600">Starting cash: {money(mine.opening_float_rwf)}</p>
              <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                <Field label="Cash counted in the drawer (RWF)"><input className={inputClass} type="number" min="0" value={counted} onChange={(e) => setCounted(e.target.value)} /></Field>
                <Button busy={action.busy === 'close'} disabled={counted === ''} onClick={() => action.run('close', async () => { await kitchenApi.closeTill(mine.id, { counted_cash_rwf: Number(counted) }); setCounted(''); reload(); })}><Lock className="w-4 h-4" /> Close till</Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
              <Field label="Starting cash in the drawer (RWF)"><input className={inputClass} type="number" min="0" value={float} onChange={(e) => setFloat(e.target.value)} /></Field>
              <Button busy={action.busy === 'open'} onClick={() => action.run('open', async () => { await kitchenApi.openTill({ opening_float_rwf: Number(float || 0) }); setFloat(''); reload(); })}><Unlock className="w-4 h-4" /> Open my till</Button>
            </div>
          )}
        </Card>
      )}
      {(data?.sessions || []).length > 0 && (
        <Card className="!p-0 overflow-hidden">
          <h3 className="font-black text-sm px-5 pt-4 pb-2">Tills</h3>
          <div className="divide-y divide-stone-100">
            {data.sessions.map((s) => (
              <div key={s.id} className="px-5 py-2.5 flex flex-wrap items-center gap-3 text-sm">
                <span className="font-bold flex-1">{s.cashier}</span>
                <span className="text-stone-500 text-xs">{when(s.opened_at)} → {s.closed_at ? when(s.closed_at) : 'open'}</span>
                {s.status === 'closed' ? (
                  <>
                    <span className="text-xs">Expected {money(s.expected_cash_rwf)} · counted {money(s.counted_cash_rwf)}</span>
                    <Badge tone={s.difference_rwf === 0 ? 'emerald' : 'amber'}>{s.difference_rwf === 0 ? 'Balanced' : `${s.difference_rwf > 0 ? '+' : '−'}${money(Math.abs(s.difference_rwf))}`}</Badge>
                  </>
                ) : <Badge tone="blue">Open</Badge>}
              </div>
            ))}
          </div>
        </Card>
      )}
      {report && (
        <Card>
          <h3 className="font-black text-sm mb-3">Last 30 days by cashier</h3>
          {report.cashiers.length === 0 ? <Empty icon={Banknote} title="No payments yet" /> : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {report.cashiers.map((c) => (
                <Stat key={c.cashier} label={c.cashier} value={money(c.total_rwf)} hint={`${c.payments} payments · ${Object.entries(c.by_method).map(([m, v]) => `${m} ${money(v)}`).join(', ')}`} />
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
