import React, { useEffect, useState } from 'react';
import { kitchenApi } from '../../api/kitchenApi';
import { useVendor } from '../../context/VendorContext';
import { PageHeader, Card, Button, ErrorNote, Loading, useAction } from '../../components/vendor-dashboard/ops/ui';

/** How the kitchen runs in house: when dine-in guests pay, table ordering, partial service, stock deduction. */
export default function VendorOperationsPage() {
  const { can } = useVendor();
  const [settings, setSettings] = useState(null);
  const [saved, setSaved] = useState(false);
  const action = useAction();
  useEffect(() => {
    kitchenApi.operations().then(setSettings).catch((err) => action.setError(err.message));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!settings) return <><ErrorNote message={action.error} /><Loading /></>;
  const save = () =>
    action.run('save', async () => {
      const body = {};
      if (can('settings.payment_preferences') || can('finance.settings')) body.payment_timing = settings.payment_timing;
      if (can('settings.operational_rules')) Object.assign(body, { table_ordering_enabled: settings.table_ordering_enabled, allow_partial_service: settings.allow_partial_service, inventory_auto_deduct: settings.inventory_auto_deduct, require_packing: settings.require_packing, session_close: settings.session_close });
      if (settings.reservations && (can('settings.operational_rules') || can('reservations.edit'))) {
        const r = settings.reservations;
        body.reservations = {
          enabled_online: r.enabled_online, require_confirmation: r.require_confirmation, keep_deposit_on_no_show: r.keep_deposit_on_no_show, preorders: r.preorders,
          duration_minutes: Number(r.duration_minutes), buffer_minutes: Number(r.buffer_minutes), max_party: Number(r.max_party), refund_deposit_hours: Number(r.refund_deposit_hours), reminder_minutes: Number(r.reminder_minutes),
          ...(can('reservations.deposits') || can('finance.settings') ? { deposit_per_guest_rwf: Number(r.deposit_per_guest_rwf) } : {}),
        };
      }
      const alerts = Object.fromEntries((settings.alert_types || []).filter((t) => can(t.setting) || can('settings.notifications')).map((t) => [t.id, settings.alerts?.[t.id] !== false]));
      if (Object.keys(alerts).length) body.alerts = alerts;
      if (can('customers.loyalty') || can('settings.operational_rules')) body.loyalty = { enabled: settings.loyalty?.enabled, earn_per_rwf: Number(settings.loyalty?.earn_per_rwf), point_value_rwf: Number(settings.loyalty?.point_value_rwf) };
      setSettings(await kitchenApi.saveOperations(body));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  const toggle = (key) => setSettings((s) => ({ ...s, [key]: !s[key] }));
  return (
    <div className="space-y-5 max-w-3xl">
      <PageHeader title="Operations settings" />
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
        <Toggle on={settings.table_ordering_enabled} onClick={() => toggle('table_ordering_enabled')} title="Guests can order from table QR codes" />
        <Toggle on={settings.allow_partial_service} onClick={() => toggle('allow_partial_service')} title="Serve items as soon as each department is done" />
        <Toggle on={settings.inventory_auto_deduct} onClick={() => toggle('inventory_auto_deduct')} title="Take stock off automatically from recipes" />
      </Card>
      {(settings.alert_types || []).length > 0 && (
        <Card className="space-y-3">
          <h3 className="font-black text-sm">Team alerts</h3>
          <p className="text-xs text-stone-500">Sent to the team inbox of whoever handles them. Each person can also mute kinds for themselves.</p>
          {settings.alert_types.map((t) => (
            <Toggle
              key={t.id}
              on={settings.alerts?.[t.id] !== false}
              onClick={() => (can(t.setting) || can('settings.notifications')) && setSettings((s) => ({ ...s, alerts: { ...s.alerts, [t.id]: s.alerts?.[t.id] === false } }))}
              title={t.label}
              hint={can(t.setting) || can('settings.notifications') ? '' : 'Your role cannot change this one.'}
            />
          ))}
        </Card>
      )}
      {settings.loyalty && (
        <Card className="space-y-3">
          <Toggle on={settings.loyalty.enabled} onClick={() => setSettings((s) => ({ ...s, loyalty: { ...s.loyalty, enabled: !s.loyalty.enabled } }))} title="Loyalty points" />
          {settings.loyalty.enabled && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <label>1 point for every (RWF)<input className="mt-1 w-full px-3 py-2 rounded-xl border border-stone-200" type="number" min="100" value={settings.loyalty.earn_per_rwf} onChange={(e) => setSettings((s) => ({ ...s, loyalty: { ...s.loyalty, earn_per_rwf: e.target.value } }))} /></label>
              <label>1 point is worth (RWF)<input className="mt-1 w-full px-3 py-2 rounded-xl border border-stone-200" type="number" min="1" value={settings.loyalty.point_value_rwf} onChange={(e) => setSettings((s) => ({ ...s, loyalty: { ...s.loyalty, point_value_rwf: e.target.value } }))} /></label>
            </div>
          )}
        </Card>
      )}
      {can('settings.operational_rules') && settings.session_close && (
        <Card className="space-y-3">
          <p className="font-black text-gray-900">Packing and closing tables</p>
          <Toggle on={settings.require_packing} onClick={() => toggle('require_packing')} title="Pack delivery and pickup orders before they leave" />
          <p className="text-xs font-bold text-stone-500 pt-2">A table can close when…</p>
          {[
            ['orders_complete', 'Every order is served or cancelled'],
            ['paid', 'The bill is paid'],
            ['packing_resolved', 'Leftovers and takeaway are handed over'],
            ['requests_resolved', 'No guest request is still open'],
          ].map(([key, title]) => (
            <Toggle key={key} on={settings.session_close[key]} onClick={() => setSettings((st) => ({ ...st, session_close: { ...st.session_close, [key]: !st.session_close[key] } }))} title={title} hint={key === 'paid' ? 'A manager with the override permission can still close it, with a reason.' : ''} />
          ))}
        </Card>
      )}
      {settings.reservations && (can('settings.operational_rules') || can('reservations.edit')) && (
        <Card className="space-y-3">
          <p className="font-black text-gray-900">Table bookings</p>
          {[
            ['enabled_online', 'Guests can book a table from your kitchen page'],
            ['require_confirmation', 'You confirm online bookings yourself', 'Off: a free table is held for the guest straight away.'],
            ['preorders', 'Guests can order dishes ahead', 'Sent to the kitchen when they are seated, never earlier.'],
            ['keep_deposit_on_no_show', 'Keep the deposit if guests don\'t come'],
          ].map(([key, title, hint]) => (
            <Toggle key={key} on={settings.reservations[key]} onClick={() => setSettings((st) => ({ ...st, reservations: { ...st.reservations, [key]: !st.reservations[key] } }))} title={title} hint={hint} />
          ))}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-bold text-stone-500">
            {[
              ['duration_minutes', 'Table time (min)', 15],
              ['buffer_minutes', 'Gap between bookings (min)', 0],
              ['max_party', 'Largest online party', 1],
              ['refund_deposit_hours', 'Deposit back if cancelled (hours before)', 0],
              ['reminder_minutes', 'Remind before (min)', 0],
              ...(can('reservations.deposits') || can('finance.settings') ? [['deposit_per_guest_rwf', 'Deposit per guest (RWF, 0 = none)', 0]] : []),
            ].map(([key, label, min]) => (
              <label key={key}>{label}<input className="mt-1 w-full px-3 py-2 rounded-xl border border-stone-200 text-gray-900" type="number" min={min} value={settings.reservations[key]} onChange={(e) => setSettings((st) => ({ ...st, reservations: { ...st.reservations, [key]: e.target.value } }))} /></label>
            ))}
          </div>
        </Card>
      )}
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
