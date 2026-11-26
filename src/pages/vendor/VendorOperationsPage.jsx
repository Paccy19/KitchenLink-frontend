import React, { useEffect, useState } from 'react';
import { kitchenApi } from '../../api/kitchenApi';
import { PageHeader, Card, Button, ErrorNote, Loading, useAction } from '../../components/vendor-dashboard/ops/ui';

/** How the kitchen runs in house: when dine-in guests pay, table ordering, partial service, stock deduction. */
export default function VendorOperationsPage() {
  const [settings, setSettings] = useState(null);
  const [saved, setSaved] = useState(false);
  const action = useAction();
  useEffect(() => {
    kitchenApi.operations().then(setSettings).catch((err) => action.setError(err.message));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!settings) return <><ErrorNote message={action.error} /><Loading /></>;
  const save = () =>
    action.run('save', async () => {
      setSettings(await kitchenApi.saveOperations({
        payment_timing: settings.payment_timing,
        table_ordering_enabled: settings.table_ordering_enabled,
        allow_partial_service: settings.allow_partial_service,
        inventory_auto_deduct: settings.inventory_auto_deduct,
      }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  const toggle = (key) => setSettings((s) => ({ ...s, [key]: !s[key] }));
  return (
    <div className="space-y-5 max-w-3xl">
      <PageHeader title="Operations settings" subtitle="How orders, service and payments work inside your kitchen." />
      <Card>
        <h3 className="font-black text-sm mb-1">When do dine-in guests pay?</h3>
        <p className="text-xs text-stone-500 mb-3">App orders (delivery and takeaway) are always paid in the app first. New orders follow the new rule; open orders keep theirs.</p>
        <div className="grid sm:grid-cols-2 gap-2">
          {settings.payment_timings.map((t) => (
            <label key={t.id} className={`flex items-start gap-2 rounded-2xl border p-3 cursor-pointer ${settings.payment_timing === t.id ? 'border-[#6d391d] bg-[#faf6f2]' : 'border-stone-200'}`}>
              <input type="radio" name="timing" className="mt-1" checked={settings.payment_timing === t.id} onChange={() => setSettings({ ...settings, payment_timing: t.id })} />
              <span>
                <span className="font-bold text-sm block">{t.label}</span>
                <span className="text-[11px] text-stone-500">
                  {t.gate === 'preparation' ? 'Departments start once the bill is paid.' : t.gate === 'collection' ? 'Food can be prepared, but leaves the counter only once paid.' : 'The cashier settles the bill at the end.'}
                </span>
              </span>
            </label>
          ))}
        </div>
      </Card>
      <Card className="space-y-3">
        <Toggle on={settings.table_ordering_enabled} onClick={() => toggle('table_ordering_enabled')} title="Guests can order from table QR codes" hint="Switch off to have servers take every order." />
        <Toggle on={settings.allow_partial_service} onClick={() => toggle('allow_partial_service')} title="Serve items as soon as each department is done" hint="Off: servers wait until the whole order is ready. Delivery orders always leave together." />
        <Toggle on={settings.inventory_auto_deduct} onClick={() => toggle('inventory_auto_deduct')} title="Take stock off automatically from recipes" hint="When a department marks a ticket ready, each dish's recipe comes off your stock. Dishes without a recipe are not counted." />
      </Card>
      <ErrorNote message={action.error} />
      <Button busy={action.busy === 'save'} onClick={save}>{saved ? 'Saved' : 'Save settings'}</Button>
    </div>
  );
}

function Toggle({ on, onClick, title, hint }) {
  return (
    <button type="button" onClick={onClick} className="w-full flex items-start justify-between gap-4 text-left">
      <span>
        <span className="font-bold text-sm block">{title}</span>
        <span className="text-[11px] text-stone-500">{hint}</span>
      </span>
      <span aria-hidden="true" className={`mt-1 w-11 h-6 rounded-full flex-shrink-0 relative transition ${on ? 'bg-emerald-500' : 'bg-stone-300'}`}>
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition ${on ? 'left-[22px]' : 'left-0.5'}`} />
      </span>
    </button>
  );
}
