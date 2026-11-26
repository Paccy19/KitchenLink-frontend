import React, { useState } from 'react';
import SpecialComposer from '../../components/vendor-dashboard/SpecialComposer';
import OfferDayComposer from '../../components/vendor-dashboard/OfferDayComposer';
import { BadgePercent, Plus, Trash2, Pencil, Ticket, Sparkles } from 'lucide-react';
import { kitchenApi } from '../../api/kitchenApi';
import { useVendor } from '../../context/VendorContext';
import { PageHeader, Card, Button, Badge, ErrorNote, Empty, Loading, Modal, Field, inputClass, useLoad, useAction, when, money } from '../../components/vendor-dashboard/ops/ui';

const localInput = (d) => (d ? new Date(new Date(d).getTime() + 2 * 3600000).toISOString().slice(0, 16) : '');
const fromLocal = (v) => (v ? new Date(`${v}:00+02:00`).toISOString() : null);

/**
 * Discounts on table bills: codes the cashier enters, and automatic
 * campaigns ("50% off coffee after 5"). App orders keep their app prices;
 * Offer Days and Tomorrow's Special stay under Settings.
 */
export default function VendorPromotionsPage() {
  const { can, menuItems, workspace } = useVendor();
  const { data, error, loading, reload } = useLoad(() => kitchenApi.promotions(), []);
  const action = useAction();
  const [editing, setEditing] = useState(null);
  const rows = data?.promotions || [];
  const canCreate = can('promotions.create') && (can('promotions.codes') || can('promotions.campaigns'));
  return (
    <div className="space-y-5">
      <PageHeader
        title="Promotions"
        subtitle="Discount codes and automatic campaigns on table bills."
        actions={canCreate && <Button onClick={() => setEditing({ kind: can('promotions.codes') ? 'code' : 'automatic' })}><Plus className="w-4 h-4" /> New promotion</Button>}
      />
      {(can('promotions.create') || can('promotions.edit')) && (
        <div className="grid lg:grid-cols-2 gap-4">
          {/* What app customers see: Tomorrow's Special and Offer Days. */}
          <SpecialComposer />
          <OfferDayComposer />
        </div>
      )}
      <h3 className="font-black text-gray-900 pt-2">Codes and campaigns on table bills</h3>
      <ErrorNote message={error || action.error} />
      {loading && !data ? <Loading /> : rows.length === 0 ? <Card><Empty icon={BadgePercent} title="No promotions yet" /></Card> : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((p) => (
            <Card key={p.id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-black flex items-center gap-1.5">{p.kind === 'code' ? <Ticket className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />} {p.name}</p>
                  {p.code && <p className="font-mono text-sm mt-0.5">{p.code}</p>}
                </div>
                <Badge tone={p.is_live ? 'emerald' : 'stone'}>{p.is_live ? 'Live' : p.is_active ? 'Not live' : 'Off'}</Badge>
              </div>
              <p className="text-sm mt-2"><b>{p.discount_type === 'percent' ? `${p.value}% off` : `${money(p.value)} off`}</b> {p.applies_to === 'all' ? 'the bill' : p.applies_to === 'products' ? `${p.product_ids.length} product${p.product_ids.length === 1 ? '' : 's'}` : (p.department_ids.map((id) => workspace?.departments?.find((d) => d.id === id)?.name).filter(Boolean).join(', ') || 'departments')}</p>
              <p className="text-[11px] text-stone-500 mt-1">
                {[p.min_order_rwf ? `bills from ${money(p.min_order_rwf)}` : '', p.starts_at ? `from ${when(p.starts_at)}` : '', p.ends_at ? `until ${when(p.ends_at)}` : '', p.usage_limit ? `${p.used_count}/${p.usage_limit} used` : p.kind === 'code' ? `${p.used_count} used` : ''].filter(Boolean).join(' · ')}
              </p>
              <div className="flex gap-2 mt-3">
                {can('promotions.edit') && <Button variant="secondary" className="flex-1 !py-1.5 !text-xs" onClick={() => setEditing(p)}><Pencil className="w-3.5 h-3.5" /> Edit</Button>}
                {can('promotions.delete') && <Button variant="danger" className="!py-1.5 !px-2.5" aria-label={`Delete ${p.name}`} onClick={() => window.confirm(`Delete ${p.name}?`) && action.run(p.id, async () => { await kitchenApi.deletePromotion(p.id); reload(); })}><Trash2 className="w-3.5 h-3.5" /></Button>}
              </div>
            </Card>
          ))}
        </div>
      )}
      {editing && <PromotionForm promotion={editing} menuItems={menuItems} departments={workspace?.departments || []} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
    </div>
  );
}

function PromotionForm({ promotion, menuItems, departments, onClose, onSaved }) {
  const { can } = useVendor();
  const isNew = !promotion.id;
  const [form, setForm] = useState({
    kind: promotion.kind,
    name: promotion.name || '',
    code: promotion.code || '',
    discount_type: promotion.discount_type || 'percent',
    value: promotion.value ?? 10,
    applies_to: promotion.applies_to || 'all',
    product_ids: promotion.product_ids || [],
    department_ids: promotion.department_ids || [],
    min_order_rwf: promotion.min_order_rwf || 0,
    starts_at: localInput(promotion.starts_at),
    ends_at: localInput(promotion.ends_at),
    usage_limit: promotion.usage_limit || '',
    is_active: promotion.is_active ?? true,
  });
  const action = useAction();
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const toggle = (key, value) => setForm((f) => ({ ...f, [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value] }));
  const save = () =>
    action.run('s', async () => {
      const body = { ...form, value: Number(form.value), min_order_rwf: Number(form.min_order_rwf || 0), usage_limit: form.usage_limit ? Number(form.usage_limit) : null, starts_at: fromLocal(form.starts_at), ends_at: fromLocal(form.ends_at) };
      if (form.kind !== 'code') delete body.code;
      if (isNew) await kitchenApi.createPromotion(body);
      else {
        delete body.kind;
        await kitchenApi.updatePromotion(promotion.id, body);
      }
      onSaved();
    });
  return (
    <Modal title={isNew ? 'New promotion' : `Edit ${promotion.name}`} onClose={onClose} wide>
      <div className="space-y-3">
        {isNew && (
          <div className="flex gap-2">
            {can('promotions.codes') && <Button variant={form.kind === 'code' ? 'primary' : 'secondary'} onClick={() => setForm({ ...form, kind: 'code' })}><Ticket className="w-4 h-4" /> Discount code</Button>}
            {can('promotions.campaigns') && <Button variant={form.kind === 'automatic' ? 'primary' : 'secondary'} onClick={() => setForm({ ...form, kind: 'automatic' })}><Sparkles className="w-4 h-4" /> Automatic campaign</Button>}
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Name"><input className={inputClass} value={form.name} onChange={set('name')} placeholder="Happy hour" /></Field>
          {form.kind === 'code' && <Field label="Code guests give"><input className={`${inputClass} uppercase`} value={form.code} onChange={set('code')} placeholder="WELCOME10" /></Field>}
          <Field label="Discount">
            <div className="flex gap-2">
              <input className={inputClass} type="number" min="1" value={form.value} onChange={set('value')} />
              <select className={inputClass} value={form.discount_type} onChange={set('discount_type')}>
                <option value="percent">%</option>
                <option value="amount">RWF</option>
              </select>
            </div>
          </Field>
          <Field label="Only bills from (RWF)"><input className={inputClass} type="number" min="0" value={form.min_order_rwf} onChange={set('min_order_rwf')} /></Field>
          <Field label="Starts (optional)"><input className={inputClass} type="datetime-local" value={form.starts_at} onChange={set('starts_at')} /></Field>
          <Field label="Ends (optional)"><input className={inputClass} type="datetime-local" value={form.ends_at} onChange={set('ends_at')} /></Field>
          {form.kind === 'code' && <Field label="Times it can be used (optional)"><input className={inputClass} type="number" min="1" value={form.usage_limit} onChange={set('usage_limit')} /></Field>}
        </div>
        <Field label="Applies to">
          <select className={inputClass} value={form.applies_to} onChange={set('applies_to')}>
            <option value="all">The whole bill</option>
            {(can('promotions.products') || can('menu.promotions')) && <option value="products">Some products</option>}
            {can('promotions.departments') && departments.length > 0 && <option value="departments">Some departments</option>}
          </select>
        </Field>
        {form.applies_to === 'products' && (
          <div className="max-h-48 overflow-y-auto grid sm:grid-cols-2 gap-1 rounded-2xl border border-stone-200 p-3">
            {menuItems.map((m) => <label key={m.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.product_ids.includes(m.id)} onChange={() => toggle('product_ids', m.id)} /> {m.name}</label>)}
          </div>
        )}
        {form.applies_to === 'departments' && (
          <div className="flex flex-wrap gap-3 rounded-2xl border border-stone-200 p-3">
            {departments.map((d) => <label key={d.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.department_ids.includes(d.id)} onChange={() => toggle('department_ids', d.id)} /> {d.name}</label>)}
          </div>
        )}
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.is_active} onChange={set('is_active')} /> Active</label>
        <ErrorNote message={action.error} />
        <Button className="w-full" busy={action.busy === 's'} onClick={save}>Save</Button>
      </div>
    </Modal>
  );
}
