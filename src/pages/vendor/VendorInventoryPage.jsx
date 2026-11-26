import React, { useState } from 'react';
import { Boxes, Plus, Pencil, Trash2, ArrowDownUp, AlertTriangle, Truck } from 'lucide-react';
import { kitchenApi } from '../../api/kitchenApi';
import { useVendor } from '../../context/VendorContext';
import { PageHeader, Card, Button, Badge, ErrorNote, Empty, Loading, Modal, Field, Stat, inputClass, useLoad, useAction, money, when, DepartmentTabs } from '../../components/vendor-dashboard/ops/ui';

const REASONS = [
  { id: 'purchase', label: 'Bought / received', sign: 1 },
  { id: 'return', label: 'Returned to stock', sign: 1 },
  { id: 'usage', label: 'Used', sign: -1 },
  { id: 'waste', label: 'Wasted / spoiled', sign: -1 },
  { id: 'adjustment', label: 'Count correction (+ or −)', sign: 0 },
];

/** Stock per department (or kitchen-wide), every change recorded, low-stock warnings. */
export default function VendorInventoryPage() {
  const { can, workspace } = useVendor();
  const [tab, setTab] = useState('stock');
  return (
    <div className="space-y-5">
      <PageHeader title="Inventory" subtitle="Stock levels, every change, and your suppliers." />
      <div className="flex rounded-xl bg-stone-100 p-1 w-fit">
        {[['stock', 'Stock'], ['movements', 'History'], ...(can('inventory.suppliers') ? [['suppliers', 'Suppliers']] : [])].map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)} className={`px-4 py-2 rounded-lg text-xs font-bold ${tab === id ? 'bg-white shadow text-gray-900' : 'text-stone-500'}`}>{label}</button>
        ))}
      </div>
      {tab === 'stock' && <StockTab departments={workspace?.departments || []} />}
      {tab === 'movements' && <MovementsTab />}
      {tab === 'suppliers' && <SuppliersTab />}
    </div>
  );
}

function StockTab({ departments }) {
  const { can } = useVendor();
  const [department, setDepartment] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const { data, error, loading, reload } = useLoad(() => kitchenApi.inventory({ department_id: department === 'main' ? 'none' : department || undefined, low: lowOnly ? 'true' : undefined }), [department, lowOnly]);
  const { data: supplierData } = useLoad(() => (can('inventory.suppliers') || can('inventory.view') ? kitchenApi.suppliers() : Promise.resolve({ suppliers: [] })), [], { intervalMs: 60000 });
  const [editing, setEditing] = useState(null);
  const [adjusting, setAdjusting] = useState(null);
  const action = useAction();
  const items = data?.items || [];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Items" value={data?.summary?.count ?? 0} />
        <Stat label="Running low" value={data?.summary?.low ?? 0} tone={data?.summary?.low ? 'warn' : undefined} />
        <Stat label="Out of stock" value={data?.summary?.out ?? 0} tone={data?.summary?.out ? 'warn' : undefined} />
        <Stat label="Stock value" value={money(data?.summary?.stock_value_rwf)} />
      </div>
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <DepartmentTabs departments={departments} value={department} onChange={setDepartment} includeNone />
        <div className="flex gap-2 items-center">
          <label className="flex items-center gap-2 text-xs font-bold text-stone-600"><input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} /> Low only</label>
          {can('inventory.add') && <Button onClick={() => setEditing('new')}><Plus className="w-4 h-4" /> Add item</Button>}
        </div>
      </div>
      <ErrorNote message={error || action.error} />
      {loading && !data ? (
        <Loading />
      ) : items.length === 0 ? (
        <Card><Empty icon={Boxes} title="No stock items">Add ingredients and supplies (coffee beans, flour, cups…) to track them.</Empty></Card>
      ) : (
        <Card className="!p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase text-stone-500 bg-stone-50">
              <tr>
                <th className="text-left px-4 py-2">Item</th>
                <th className="text-left px-4 py-2">Department</th>
                <th className="text-right px-4 py-2">In stock</th>
                <th className="text-right px-4 py-2 hidden md:table-cell">Alert at</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-2.5">
                    <p className="font-bold text-gray-900">{item.name}</p>
                    {item.supplier_name && <p className="text-[11px] text-stone-400">{item.supplier_name}</p>}
                  </td>
                  <td className="px-4 py-2.5 text-stone-600">{item.department_name}</td>
                  <td className="px-4 py-2.5 text-right">
                    <span className="font-black">{item.quantity}</span> <span className="text-stone-500">{item.unit}</span>
                    {item.is_out ? <Badge tone="red" className="ml-2">Out</Badge> : item.is_low ? <Badge tone="amber" className="ml-2"><AlertTriangle className="w-3 h-3" /> Low</Badge> : null}
                  </td>
                  <td className="px-4 py-2.5 text-right text-stone-500 hidden md:table-cell">{item.low_stock_threshold || '—'}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1.5">
                      {(can('inventory.update', item.department_id) || can('inventory.remove', item.department_id)) && (
                        <Button variant="soft" className="!py-1.5 !px-2.5 !text-xs" onClick={() => setAdjusting(item)}><ArrowDownUp className="w-3.5 h-3.5" /> Change</Button>
                      )}
                      {can('inventory.update', item.department_id) && <Button variant="secondary" className="!py-1.5 !px-2.5" aria-label={`Edit ${item.name}`} onClick={() => setEditing(item)}><Pencil className="w-3.5 h-3.5" /></Button>}
                      {can('inventory.remove', item.department_id) && (
                        <Button variant="danger" className="!py-1.5 !px-2.5" aria-label={`Remove ${item.name}`} onClick={() => window.confirm(`Remove ${item.name}?`) && action.run('del', async () => { await kitchenApi.deleteStockItem(item.id); reload(); })}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      {editing && <ItemForm item={editing === 'new' ? null : editing} departments={departments} suppliers={supplierData?.suppliers || []} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
      {adjusting && <AdjustForm item={adjusting} suppliers={supplierData?.suppliers || []} onClose={() => setAdjusting(null)} onSaved={() => { setAdjusting(null); reload(); }} />}
    </div>
  );
}

function ItemForm({ item, departments, suppliers, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: item?.name || '',
    unit: item?.unit || 'pcs',
    quantity: '',
    low_stock_threshold: item?.low_stock_threshold ?? '',
    cost_per_unit_rwf: item?.cost_per_unit_rwf ?? '',
    department_id: item?.department_id || '',
    supplier_id: item?.supplier_id || '',
    sku: item?.sku || '',
  });
  const action = useAction();
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const save = () =>
    action.run('save', async () => {
      const body = { ...form, department_id: form.department_id || null, supplier_id: form.supplier_id || null, low_stock_threshold: Number(form.low_stock_threshold || 0), cost_per_unit_rwf: Number(form.cost_per_unit_rwf || 0) };
      if (item) {
        delete body.quantity;
        await kitchenApi.updateStockItem(item.id, body);
      } else await kitchenApi.createStockItem({ ...body, quantity: Number(form.quantity || 0) });
      onSaved();
    });
  return (
    <Modal title={item ? `Edit ${item.name}` : 'Add stock item'} onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name"><input className={inputClass} value={form.name} onChange={set('name')} autoFocus /></Field>
          <Field label="Unit"><input className={inputClass} value={form.unit} onChange={set('unit')} placeholder="kg, L, pcs" /></Field>
          {!item && <Field label="Starting quantity"><input className={inputClass} type="number" step="any" value={form.quantity} onChange={set('quantity')} /></Field>}
          <Field label="Warn me below"><input className={inputClass} type="number" step="any" value={form.low_stock_threshold} onChange={set('low_stock_threshold')} /></Field>
          <Field label="Cost per unit (RWF)"><input className={inputClass} type="number" value={form.cost_per_unit_rwf} onChange={set('cost_per_unit_rwf')} /></Field>
          <Field label="Code / SKU"><input className={inputClass} value={form.sku} onChange={set('sku')} /></Field>
        </div>
        <Field label="Department">
          <select className={inputClass} value={form.department_id} onChange={set('department_id')}>
            <option value="">Whole kitchen</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Field>
        <Field label="Supplier">
          <select className={inputClass} value={form.supplier_id} onChange={set('supplier_id')}>
            <option value="">None</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <ErrorNote message={action.error} />
        <Button className="w-full" busy={action.busy === 'save'} onClick={save}>Save</Button>
      </div>
    </Modal>
  );
}

function AdjustForm({ item, suppliers, onClose, onSaved }) {
  const [form, setForm] = useState({ reason: 'purchase', delta: '', note: '', supplier_id: '' });
  const action = useAction();
  const reason = REASONS.find((r) => r.id === form.reason);
  const save = () => action.run('save', async () => { await kitchenApi.adjustStock(item.id, { ...form, delta: Number(form.delta), supplier_id: form.supplier_id || undefined }); onSaved(); });
  return (
    <Modal title={`Change stock: ${item.name}`} onClose={onClose}>
      <div className="space-y-3">
        <p className="text-sm text-stone-600">Now: <b>{item.quantity} {item.unit}</b></p>
        <Field label="What happened">
          <select className={inputClass} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}>
            {REASONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </Field>
        <Field label={`Quantity (${item.unit})`} hint={reason.sign === 0 ? 'Use a minus sign to lower the count.' : reason.sign > 0 ? 'Added to stock.' : 'Taken from stock.'}>
          <input className={inputClass} type="number" step="any" value={form.delta} onChange={(e) => setForm({ ...form, delta: e.target.value })} autoFocus />
        </Field>
        {form.reason === 'purchase' && suppliers.length > 0 && (
          <Field label="From supplier">
            <select className={inputClass} value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}>
              <option value="">—</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
        )}
        <Field label="Note (optional)"><input className={inputClass} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
        <ErrorNote message={action.error} />
        <Button className="w-full" busy={action.busy === 'save'} disabled={!Number(form.delta)} onClick={save}>Save change</Button>
      </div>
    </Modal>
  );
}

function MovementsTab() {
  const { data, error, loading } = useLoad(() => kitchenApi.stockMovements({ limit: 100 }), []);
  const rows = data?.movements || [];
  return (
    <Card className="!p-0 overflow-hidden">
      <ErrorNote message={error} />
      {loading && !data ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty icon={ArrowDownUp} title="No stock changes yet" />
      ) : (
        <div className="divide-y divide-stone-100">
          {rows.map((m) => (
            <div key={m.id} className="px-4 py-2.5 flex items-center gap-3 text-sm">
              <span className={`w-20 text-right font-black ${m.delta < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{m.delta > 0 ? '+' : ''}{m.delta} {m.unit}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 truncate">{m.item_name}</p>
                <p className="text-[11px] text-stone-500">{m.reason}{m.order_number ? ` · ${m.order_number}` : ''}{m.note ? ` · ${m.note}` : ''} · {m.by}</p>
              </div>
              <span className="text-[11px] text-stone-400 text-right">{when(m.at)}<br />left {m.quantity_after}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function SuppliersTab() {
  const { data, error, loading, reload } = useLoad(() => kitchenApi.suppliers(), []);
  const [editing, setEditing] = useState(null);
  const action = useAction();
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={() => setEditing({})}><Plus className="w-4 h-4" /> Add supplier</Button></div>
      <ErrorNote message={error || action.error} />
      {loading && !data ? <Loading /> : (data?.suppliers || []).length === 0 ? (
        <Card><Empty icon={Truck} title="No suppliers yet" /></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.suppliers.map((s) => (
            <Card key={s.id}>
              <p className="font-black">{s.name}</p>
              <p className="text-xs text-stone-500">{[s.contact_name, s.phone, s.email].filter(Boolean).join(' · ')}</p>
              {s.notes && <p className="text-xs text-stone-600 mt-1">{s.notes}</p>}
              <div className="flex gap-2 mt-3">
                <Button variant="secondary" className="flex-1 !py-2 !text-xs" onClick={() => setEditing(s)}>Edit</Button>
                <Button variant="danger" className="!py-2 !px-3" aria-label={`Remove ${s.name}`} onClick={() => window.confirm(`Remove ${s.name}?`) && action.run('d', async () => { await kitchenApi.deleteSupplier(s.id); reload(); })}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      {editing && <SupplierForm supplier={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
    </div>
  );
}

function SupplierForm({ supplier, onClose, onSaved }) {
  const [form, setForm] = useState({ name: supplier.name || '', contact_name: supplier.contact_name || '', phone: supplier.phone || '', email: supplier.email || '', notes: supplier.notes || '' });
  const action = useAction();
  const save = () => action.run('s', async () => { if (supplier.id) await kitchenApi.updateSupplier(supplier.id, form); else await kitchenApi.createSupplier(form); onSaved(); });
  return (
    <Modal title={supplier.id ? `Edit ${supplier.name}` : 'Add supplier'} onClose={onClose}>
      <div className="space-y-3">
        {[['name', 'Name'], ['contact_name', 'Contact person'], ['phone', 'Phone'], ['email', 'Email'], ['notes', 'Notes']].map(([key, label]) => (
          <Field key={key} label={label}><input className={inputClass} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></Field>
        ))}
        <ErrorNote message={action.error} />
        <Button className="w-full" busy={action.busy === 's'} onClick={save}>Save</Button>
      </div>
    </Modal>
  );
}
