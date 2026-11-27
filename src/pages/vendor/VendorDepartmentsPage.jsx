import React, { useState } from 'react';
import { Layers, Plus, Pencil, Trash2, Users, UtensilsCrossed, ChefHat, Wand2 } from 'lucide-react';
import { vendorApi } from '../../api/vendorApi';
import { KINDS, guessKind } from '../../components/vendor-dashboard/ops/departmentKinds';
import { kitchenApi } from '../../api/kitchenApi';
import { useVendor } from '../../context/VendorContext';
import { PageHeader, Card, Button, Badge, ErrorNote, Empty, Loading, Modal, Field, inputClass, useLoad, useAction } from '../../components/vendor-dashboard/ops/ui';

/**
 * Services & departments inside this kitchen (Food, Coffee, Bakery, Bar …).
 * Optional: with none, the kitchen works as one. Each department has its own
 * dishes, staff, preparation stages and queue, all under this one kitchen.
 */
export default function VendorDepartmentsPage() {
  const { can, allowed } = useVendor();
  const { data, error, loading, reload } = useLoad(() => kitchenApi.departments(), []);
  const [editing, setEditing] = useState(null);
  const [sorting, setSorting] = useState(false);
  const action = useAction();
  const departments = data?.departments || [];
  const canSort = can('departments.create') && (can('menu.assign_departments') || can('menu.edit'));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Services & departments"
        actions={can('departments.create') && <Button onClick={() => setEditing('new')}><Plus className="w-4 h-4" /> Create department</Button>}
      />
      <ErrorNote message={error || action.error} />
      {data && canSort && (departments.length === 0 || data.unassigned_products > 0) && (
        <button type="button" onClick={() => setSorting(true)} className="kl-rise w-full flex items-center justify-between gap-3 rounded-3xl bg-gradient-to-r from-[#2b1206] to-[#6d391d] text-white px-5 py-4 text-left shadow-md">
          <span>
            <span className="block font-bold">{departments.length === 0 ? 'Send each dish to the right team' : `${data.unassigned_products} dish${data.unassigned_products === 1 ? '' : 'es'} in no department`}</span>
            <span className="block text-xs text-white/75 mt-0.5">Pilau to the kitchen, cake to the baker, coffee to the barista. One bill for the customer.</span>
          </span>
          <Wand2 className="w-5 h-5 flex-shrink-0" />
        </button>
      )}
      {loading && !data ? (
        <Loading />
      ) : departments.length === 0 ? (
        <Card>
          <Empty icon={Layers} title="No departments yet">
            Your kitchen works as one until you add some. Add departments such as Food, Coffee or Bakery to give each its own menu, staff and preparation queue.
          </Empty>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {departments.map((d) => (
            <Card key={d.id} className={d.is_active ? '' : 'opacity-70'}>
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#faf6f2] border border-[#ebd7c5] flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {d.image_url ? <img src={d.image_url} alt="" className="w-full h-full object-cover" /> : <span className="font-black text-[#6d391d]">{d.code_prefix}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-gray-900">{d.name}</p>
                  <p className="text-[11px] text-stone-500 font-semibold">{d.category_label}</p>
                </div>
                {d.is_active ? <Badge tone="emerald">Active</Badge> : <Badge tone="red">Off</Badge>}
              </div>
              {d.description && <p className="text-xs text-stone-600 mt-3">{d.description}</p>}
              <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                <Mini icon={UtensilsCrossed} label="Products" value={d.product_count} />
                <Mini icon={Users} label="Staff" value={d.staff_count} />
                <Mini icon={ChefHat} label="Open tickets" value={d.open_tickets} />
              </div>
              <p className="text-[11px] text-stone-500 mt-3">Stages: {d.workflow.stages.map((s) => s.label).join(' → ')}</p>
              <div className="flex gap-2 mt-4">
                {allowed('PATCH /vendor/departments/:department_id', d.id) && (
                  <Button variant="secondary" className="flex-1 !py-2 !text-xs" onClick={() => setEditing(d)}><Pencil className="w-4 h-4" /> Manage</Button>
                )}
                {can('departments.delete') && (
                  <Button
                    variant="danger"
                    className="!py-2 !px-3"
                    aria-label={`Delete ${d.name}`}
                    busy={action.busy === d.id}
                    onClick={() => window.confirm(`Delete ${d.name}? Its dishes stay on your menu without a department.`) && action.run(d.id, () => kitchenApi.deleteDepartment(d.id))}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
      {sorting && <SortDishes departments={departments} onClose={() => setSorting(false)} onSaved={() => { setSorting(false); reload(); }} />}
      {editing && (
        <DepartmentForm
          department={editing === 'new' ? null : editing}
          categories={data?.categories || []}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

const Mini = ({ icon: Icon, label, value }) => (
  <div className="rounded-xl bg-stone-50 py-2">
    <Icon className="w-4 h-4 mx-auto text-stone-400" />
    <p className="font-black text-sm">{value}</p>
    <p className="text-[10px] text-stone-500 font-bold">{label}</p>
  </div>
);

function DepartmentForm({ department, categories, onClose, onSaved }) {
  const { can, allowed } = useVendor();
  const isNew = !department;
  const [form, setForm] = useState({
    name: department?.name || '',
    category: department?.category || 'restaurant',
    custom_category: department?.custom_category || '',
    description: department?.description || '',
    code_prefix: department?.code_prefix || '',
    is_active: department?.is_active ?? true,
    use_accept: department?.workflow?.use_accept ?? true,
    use_preparing: department?.workflow?.use_preparing ?? true,
    labels: department?.workflow?.labels || { pending: 'Pending', accepted: 'Accepted', preparing: 'Preparing', ready: 'Ready' },
    stations: (department?.stations || []).map((s) => s.name).join(', '),
    manager_staff_ids: department?.manager_staff_ids || [],
  });
  const canStaff = can('staff.view');
  const { data: staffData } = useLoad(() => (canStaff ? kitchenApi.staff() : Promise.resolve({ staff: [] })), [canStaff], { intervalMs: 60000 });
  const { data: detail } = useLoad(() => (department ? kitchenApi.department(department.id) : Promise.resolve(null)), [department?.id], { intervalMs: 60000 });
  const [members, setMembers] = useState(null);
  const memberIds = members ?? (detail?.staff || []).map((s) => s.id);
  const action = useAction();
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const toggleIn = (list, value) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const save = () =>
    action.run('save', async () => {
      const body = {
        name: form.name,
        category: form.category,
        custom_category: form.custom_category,
        description: form.description,
        is_active: form.is_active,
        workflow: { use_accept: form.use_accept, use_preparing: form.use_preparing, labels: form.labels },
        stations: form.stations.split(',').map((s) => s.trim()).filter(Boolean).map((name) => ({ name, id: (department?.stations || []).find((s) => s.name === name)?.id })),
        ...(form.code_prefix ? { code_prefix: form.code_prefix } : {}),
        ...(canStaff && can('staff.assign_roles') ? { manager_staff_ids: form.manager_staff_ids } : {}),
      };
      const saved = isNew ? await kitchenApi.createDepartment(body) : await kitchenApi.updateDepartment(department.id, body);
      if (members !== null && can('departments.manage_staff', saved.id)) await kitchenApi.setDepartmentStaff(saved.id, members);
      onSaved();
    });

  const staff = staffData?.staff || [];
  return (
    <Modal title={isNew ? 'Create department' : `Manage ${department.name}`} onClose={onClose} wide>
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Name"><input className={inputClass} value={form.name} onChange={set('name')} placeholder="Coffee Bar" autoFocus /></Field>
          <Field label="Category">
            <select className={inputClass} value={form.category} onChange={set('category')}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </Field>
          {form.category === 'custom' && <Field label="Your category name"><input className={inputClass} value={form.custom_category} onChange={set('custom_category')} placeholder="Ice cream" /></Field>}
          <Field label="Ticket letters"><input className={inputClass} value={form.code_prefix} onChange={set('code_prefix')} maxLength={3} placeholder="Auto" /></Field>
        </div>
        <Field label="Description"><textarea className={inputClass} rows={2} value={form.description} onChange={set('description')} /></Field>
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.is_active} onChange={set('is_active')} /> Active (its dishes show on the menu)</label>

        <div className="rounded-2xl border border-stone-200 p-4 space-y-3">
          <p className="font-black text-sm">Preparation stages</p>
          <div className="flex flex-wrap gap-4 text-sm font-semibold">
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.use_accept} onChange={set('use_accept')} /> Staff accept tickets first</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.use_preparing} onChange={set('use_preparing')} /> Use a "preparing" stage</label>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {['pending', 'accepted', 'preparing', 'ready'].map((stage) => (
              <Field key={stage} label={`Name for "${stage}"`}>
                <input className={inputClass} value={form.labels[stage] || ''} onChange={(e) => setForm((f) => ({ ...f, labels: { ...f.labels, [stage]: e.target.value } }))} />
              </Field>
            ))}
          </div>
          <Field label="Stations (comma separated, optional)"><input className={inputClass} value={form.stations} onChange={set('stations')} placeholder="Grill, Fryer, Espresso bar" /></Field>
        </div>

        {canStaff && staff.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-4">
            {!isNew && (
              <div>
                <p className="font-black text-sm mb-2">Employees in this department</p>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {staff.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={memberIds.includes(s.id)} onChange={() => setMembers(toggleIn(memberIds, s.id))} /> {s.name}</label>
                  ))}
                </div>
              </div>
            )}
            {can('staff.assign_roles') && (
              <div>
                <p className="font-black text-sm mb-2">Managers</p>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {staff.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.manager_staff_ids.includes(s.id)} onChange={() => setForm((f) => ({ ...f, manager_staff_ids: toggleIn(f.manager_staff_ids, s.id) }))} /> {s.name}</label>
                  ))}
                </div>
                <p className="text-[11px] text-stone-400 mt-1">Managers run this department's queue, menu, stock and reports, nothing else.</p>
              </div>
            )}
          </div>
        )}
        <ErrorNote message={action.error} />
        <Button className="w-full" busy={action.busy === 'save'} onClick={save}>{isNew ? 'Create department' : 'Save changes'}</Button>
      </div>
    </Modal>
  );
}

/** Choose the departments, then which one makes each dish (a guess from the name to start). */
function SortDishes({ departments, onClose, onSaved }) {
  const menu = useLoad(() => vendorApi.listMenu({ limit: 100 }), []);
  const dishes = menu.data?.items || [];
  const existing = departments.map((d) => d.category).filter((c) => KINDS.some((k) => k.id === c));
  const [kinds, setKinds] = useState(existing.length ? [...new Set(existing)] : ['restaurant']);
  const [picked, setPicked] = useState({});
  const action = useAction();
  const categoryOf = (dish) => {
    if (picked[dish.id] && kinds.includes(picked[dish.id])) return picked[dish.id];
    const current = departments.find((d) => d.id === dish.department_id)?.category;
    return current && kinds.includes(current) ? current : guessKind(dish.name, kinds);
  };
  const toggle = (id) => setKinds((list) => (list.includes(id) ? (list.length > 1 ? list.filter((k) => k !== id) : list) : [...list, id]));
  const save = () => action.run('save', async () => {
    await kitchenApi.setupDepartments({ departments: kinds, dishes: dishes.map((d) => ({ menu_item_id: d.id, category: categoryOf(d) })) });
    onSaved();
  });

  return (
    <Modal title="Who makes what" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-stone-500 mb-2">Your teams</p>
          <div className="flex flex-wrap gap-2">
            {KINDS.map((k) => (
              <button key={k.id} type="button" onClick={() => toggle(k.id)} className={`px-3 py-1.5 rounded-full text-sm font-bold border ${kinds.includes(k.id) ? 'bg-[#2b1206] text-white border-[#2b1206]' : 'bg-white text-stone-700 border-stone-200'}`}>{k.label}</button>
            ))}
          </div>
        </div>
        {menu.loading && !menu.data ? <Loading /> : (
          <div className="max-h-[45vh] overflow-y-auto divide-y divide-stone-100 rounded-2xl border border-stone-200">
            {dishes.map((dish) => (
              <div key={dish.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="text-sm font-semibold text-gray-900 truncate">{dish.name}</span>
                <select className={`${inputClass} !w-auto !py-1.5 text-sm`} value={categoryOf(dish)} onChange={(e) => setPicked((p) => ({ ...p, [dish.id]: e.target.value }))}>
                  {KINDS.filter((k) => kinds.includes(k.id)).map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
                </select>
              </div>
            ))}
            {!dishes.length && <p className="px-3 py-4 text-sm text-stone-500">Add dishes to your menu first.</p>}
          </div>
        )}
        <ErrorNote message={menu.error || action.error} />
        <Button className="w-full" busy={action.busy === 'save'} disabled={!dishes.length} onClick={save}>Save</Button>
      </div>
    </Modal>
  );
}
