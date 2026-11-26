import React, { useState } from 'react';
import { Users, Plus, Pencil, Trash2, ShieldCheck, KeyRound, Power, Copy, Check } from 'lucide-react';
import { kitchenApi } from '../../api/kitchenApi';
import { useVendor } from '../../context/VendorContext';
import { PageHeader, Card, Button, Badge, ErrorNote, Empty, Loading, Modal, Field, inputClass, useLoad, useAction, when } from '../../components/vendor-dashboard/ops/ui';

/**
 * The kitchen's team: employee accounts (they sign in with a code sent to
 * their phone or email) and the roles that decide what each one may do.
 */
export default function VendorStaffPage() {
  const { can } = useVendor();
  const [tab, setTab] = useState(can('staff.view') ? 'staff' : 'roles');
  return (
    <div className="space-y-5">
      <PageHeader title="Staff & roles" subtitle="Create accounts for your team, make any role you need, and tick exactly what each role can do." />
      <div className="flex rounded-xl bg-stone-100 p-1 w-fit">
        {can('staff.view') && <TabButton active={tab === 'staff'} onClick={() => setTab('staff')}>Employees</TabButton>}
        <TabButton active={tab === 'roles'} onClick={() => setTab('roles')}>Roles & permissions</TabButton>
      </div>
      {tab === 'staff' ? <StaffTab /> : <RolesTab />}
    </div>
  );
}

const TabButton = ({ active, onClick, children }) => (
  <button type="button" onClick={onClick} className={`px-4 py-2 rounded-lg text-xs font-bold ${active ? 'bg-white shadow text-gray-900' : 'text-stone-500'}`}>
    {children}
  </button>
);

function StaffTab() {
  const { can, workspace } = useVendor();
  const { data, error, loading, reload } = useLoad(() => kitchenApi.staff(), []);
  const { data: roleData } = useLoad(() => kitchenApi.roles(), [], { intervalMs: 60000 });
  const [editing, setEditing] = useState(null);
  const [credentials, setCredentials] = useState(null);
  const action = useAction();
  const staff = data?.staff || [];
  const me = workspace?.actor?.type === 'staff' ? workspace.actor.id : null;
  const resetPassword = (s) =>
    window.confirm(`Make a new password for ${s.name}? Their old password stops working and they are signed out.`) &&
    action.run(`p:${s.id}`, async () => {
      const saved = await kitchenApi.updateStaff(s.id, { generate_password: true, ...(s.username ? {} : { username: suggestUsername(s.name) }) });
      if (saved.credentials) setCredentials({ name: saved.name, ...saved.credentials });
      reload();
    });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">{can('staff.create') && <Button onClick={() => setEditing('new')}><Plus className="w-4 h-4" /> Add employee</Button>}</div>
      <ErrorNote message={error || action.error} />
      {loading && !data ? (
        <Loading />
      ) : staff.length === 0 ? (
        <Card><Empty icon={Users} title="No employees yet">Add your team so each person signs in with their own account and sees only their work.</Empty></Card>
      ) : (
        <Card className="!p-0 overflow-hidden">
          <div className="divide-y divide-stone-100">
            {staff.map((s) => (
              <div key={s.id} className={`px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 ${s.is_active ? '' : 'opacity-60'}`}>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm text-gray-900 flex items-center gap-2">
                    {s.name} {s.is_admin && <Badge tone="brown"><ShieldCheck className="w-3 h-3" /> Administrator</Badge>} {!s.is_active && <Badge tone="red">Deactivated</Badge>}
                  </p>
                  <p className="text-[11px] text-stone-500">{[s.username ? `@${s.username}` : '', s.job_title, s.phone, s.email].filter(Boolean).join(' · ')}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {s.roles.map((r) => <Badge key={r.id}>{r.name}</Badge>)}
                    {s.departments.map((d) => <Badge key={d.id} tone="blue">{d.name}</Badge>)}
                    {!s.departments.length && !s.is_admin && <span className="text-[11px] text-stone-400">All departments</span>}
                  </div>
                </div>
                <p className="text-[11px] text-stone-400 sm:w-32">Last sign-in {s.last_login_at ? when(s.last_login_at) : 'never'}</p>
                {s.id !== me && (
                  <div className="flex gap-2">
                    {(can('staff.edit') || can('staff.assign_roles')) && <Button variant="secondary" className="!py-2 !px-3" aria-label={`Edit ${s.name}`} onClick={() => setEditing(s)}><Pencil className="w-4 h-4" /></Button>}
                    {can('staff.edit') && (
                      <Button variant="secondary" className="!py-2 !px-3" aria-label={`New password for ${s.name}`} title="New password" busy={action.busy === `p:${s.id}`} onClick={() => resetPassword(s)}>
                        <KeyRound className="w-4 h-4" />
                      </Button>
                    )}
                    {can('staff.deactivate') && (
                      <>
                        <Button variant="secondary" className="!py-2 !px-3" aria-label={s.is_active ? 'Deactivate' : 'Reactivate'} busy={action.busy === `a:${s.id}`} onClick={() => action.run(`a:${s.id}`, async () => { await kitchenApi.setStaffActive(s.id, !s.is_active); reload(); })}>
                          <Power className="w-4 h-4" />
                        </Button>
                        <Button variant="danger" className="!py-2 !px-3" aria-label={`Remove ${s.name}`} busy={action.busy === `d:${s.id}`} onClick={() => window.confirm(`Remove ${s.name} from your team? They are signed out at once.`) && action.run(`d:${s.id}`, async () => { await kitchenApi.deleteStaff(s.id); reload(); })}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
      {editing && (
        <StaffForm
          member={editing === 'new' ? null : editing}
          roles={roleData?.roles || []}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setEditing(null);
            if (saved?.credentials) setCredentials({ name: saved.name, ...saved.credentials });
            reload();
          }}
        />
      )}
      {credentials && <CredentialsCard credentials={credentials} onClose={() => setCredentials(null)} />}
    </div>
  );
}

function StaffForm({ member, roles, onClose, onSaved }) {
  const { can, isKitchenAdmin, workspace } = useVendor();
  const isNew = !member;
  const [form, setForm] = useState({
    name: member?.name || '',
    phone: member?.phone ? `0${member.phone.slice(4)}` : '',
    email: member?.email || '',
    username: member?.username || '',
    password: '',
    job_title: member?.job_title || '',
    role_ids: member?.role_ids || [],
    department_ids: member?.department_ids || [],
    is_admin: member?.is_admin || false,
  });
  const action = useAction();
  const departments = workspace?.departments || [];
  const toggle = (key, value) => setForm((f) => ({ ...f, [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value] }));
  const save = () =>
    action.run('save', async () => {
      const body = { name: form.name, phone: form.phone || null, email: form.email || null, username: form.username.trim() || null, job_title: form.job_title, department_ids: form.department_ids };
      if (form.password) body.password = form.password;
      if (can('staff.assign_roles')) body.role_ids = form.role_ids;
      if (isKitchenAdmin) body.is_admin = form.is_admin;
      const saved = isNew ? await kitchenApi.createStaff(body) : await kitchenApi.updateStaff(member.id, body);
      onSaved(saved);
    });
  return (
    <Modal title={isNew ? 'Add employee' : `Edit ${member.name}`} onClose={onClose} wide>
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Full name"><input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus /></Field>
          <Field label="Job title (optional)"><input className={inputClass} value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} placeholder="Head barista" /></Field>
        </div>
        <div className="rounded-2xl bg-[#faf6f2] border border-[#ebd7c5] p-4 space-y-3">
          <p className="font-black text-sm">Sign-in details you give them</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Username" hint="Letters, numbers, dots or dashes. Unique on KitchenLink.">
              <div className="flex gap-2">
                <input className={inputClass} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s+/g, '.') })} placeholder="aline.barista" autoCapitalize="none" spellCheck={false} />
                {!form.username && form.name.trim().length > 1 && (
                  <Button variant="secondary" className="!px-3 !text-xs flex-shrink-0" onClick={() => setForm({ ...form, username: suggestUsername(form.name) })}>Suggest</Button>
                )}
              </div>
            </Field>
            <Field label={isNew ? 'Password' : 'New password (optional)'} hint={isNew ? 'Leave empty and we make one you can copy.' : member?.has_password ? 'Leave empty to keep the current one.' : 'Leave empty and we make one.'}>
              <input className={inputClass} type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="8 characters or more" autoComplete="new-password" />
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Phone (optional)" hint="They can also sign in with a code sent here."><input className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="078…" /></Field>
            <Field label="Email (optional)"><input className={inputClass} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          </div>
        </div>
        {can('staff.assign_roles') && (
          <div>
            <p className="font-black text-sm mb-2">Roles</p>
            <div className="grid sm:grid-cols-3 gap-1.5">
              {roles.map((r) => (
                <label key={r.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.role_ids.includes(r.id)} onChange={() => toggle('role_ids', r.id)} /> {r.name}</label>
              ))}
            </div>
          </div>
        )}
        {departments.length > 0 && (
          <div>
            <p className="font-black text-sm mb-1">Departments</p>
            <p className="text-[11px] text-stone-400 mb-2">Their department permissions only cover these. Leave empty for the whole kitchen.</p>
            <div className="flex flex-wrap gap-3">
              {departments.map((d) => (
                <label key={d.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.department_ids.includes(d.id)} onChange={() => toggle('department_ids', d.id)} /> {d.name}</label>
              ))}
            </div>
          </div>
        )}
        {isKitchenAdmin && (
          <label className="flex items-start gap-2 text-sm rounded-2xl bg-[#faf6f2] border border-[#ebd7c5] p-3">
            <input type="checkbox" className="mt-1" checked={form.is_admin} onChange={(e) => setForm({ ...form, is_admin: e.target.checked })} />
            <span><b>Kitchen administrator.</b> Full control of the kitchen, including staff, money and settings.</span>
          </label>
        )}
        <ErrorNote message={action.error} />
        <Button className="w-full" busy={action.busy === 'save'} onClick={save}>{isNew ? 'Add employee' : 'Save'}</Button>
      </div>
    </Modal>
  );
}

/** "Aline Uwase" -> "aline.uwase" (the server says if it's taken). */
function suggestUsername(name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 32) || 'staff';
}

/** Shown once after creating an account or a new password: only the hash is kept. */
function CredentialsCard({ credentials, onClose }) {
  const [copied, setCopied] = useState(false);
  const text = `KitchenLink sign-in for ${credentials.name}\nWebsite: ${window.location.origin}/login (choose "Kitchen team member")\nUsername: ${credentials.username}\nPassword: ${credentials.password}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  return (
    <Modal title={`Sign-in details for ${credentials.name}`} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-stone-600">Give these to {credentials.name}. For safety this password is shown only now; you can always make a new one.</p>
        <div className="rounded-2xl bg-stone-50 border border-stone-200 p-4 font-mono text-sm space-y-1">
          <p><span className="text-stone-500">Username:</span> <b>{credentials.username}</b></p>
          <p><span className="text-stone-500">Password:</span> <b>{credentials.password}</b></p>
        </div>
        <p className="text-[11px] text-stone-500">They sign in at {window.location.origin}/login → "Kitchen team member", and can change the password afterwards.</p>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={copy}>{copied ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy details</>}</Button>
          <Button className="flex-1" onClick={onClose}>Done</Button>
        </div>
      </div>
    </Modal>
  );
}

function RolesTab() {
  const { can } = useVendor();
  const { data, error, loading, reload } = useLoad(() => kitchenApi.roles(), []);
  const [editing, setEditing] = useState(null);
  const action = useAction();
  const roles = data?.roles || [];
  return (
    <div className="space-y-4">
      <div className="flex justify-end">{can('staff.manage_permissions') && <Button onClick={() => setEditing('new')}><Plus className="w-4 h-4" /> Create new role</Button>}</div>
      <ErrorNote message={error || action.error} />
      {loading && !data ? (
        <Loading />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {roles.map((r) => (
            <Card key={r.id}>
              <div className="flex items-start justify-between gap-2">
                <p className="font-black text-gray-900 flex items-center gap-1.5"><KeyRound className="w-4 h-4 text-[#6d391d]" /> {r.name}</p>
                <Badge>{r.staff_count} {r.staff_count === 1 ? 'person' : 'people'}</Badge>
              </div>
              {r.description && <p className="text-xs text-stone-600 mt-2">{r.description}</p>}
              <p className="text-[11px] text-stone-500 mt-2">{r.permissions.length} permission{r.permissions.length === 1 ? '' : 's'}{r.department_ids.length ? ` · ${r.department_ids.length} department${r.department_ids.length === 1 ? '' : 's'} only` : ''}</p>
              {can('staff.manage_permissions') && (
                <div className="flex gap-2 mt-3">
                  <Button variant="secondary" className="flex-1 !py-2 !text-xs" onClick={() => setEditing(r)}><Pencil className="w-4 h-4" /> Edit</Button>
                  <Button variant="danger" className="!py-2 !px-3" aria-label={`Delete ${r.name}`} busy={action.busy === r.id} onClick={() => window.confirm(`Delete the role ${r.name}?`) && action.run(r.id, async () => { await kitchenApi.deleteRole(r.id); reload(); })}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
      {editing && data && <RoleForm role={editing === 'new' ? null : editing} catalogue={data.catalogue} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
    </div>
  );
}

function RoleForm({ role, catalogue, onClose, onSaved }) {
  const { workspace } = useVendor();
  const [form, setForm] = useState({ name: role?.name || '', description: role?.description || '', permissions: role?.permissions || [], department_ids: role?.department_ids || [] });
  const action = useAction();
  const toggle = (key, value) => setForm((f) => ({ ...f, [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value] }));
  const setGroup = (group, on) =>
    setForm((f) => {
      const keys = group.permissions.filter((p) => !p.admin_only).map((p) => p.key);
      return { ...f, permissions: on ? [...new Set([...f.permissions, ...keys])] : f.permissions.filter((p) => !keys.includes(p)) };
    });
  const save = () => action.run('save', async () => { if (role) await kitchenApi.updateRole(role.id, form); else await kitchenApi.createRole(form); onSaved(); });
  return (
    <Modal title={role ? `Edit role: ${role.name}` : 'Create new role'} onClose={onClose} wide>
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Role name"><input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Pastry chef" autoFocus /></Field>
          <Field label="Description"><input className={inputClass} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        </div>
        {(workspace?.departments || []).length > 0 && (
          <div>
            <p className="font-black text-sm mb-1">Only for these departments (optional)</p>
            <p className="text-[11px] text-stone-400 mb-2">Leave empty to use each employee's own departments, or the whole kitchen.</p>
            <div className="flex flex-wrap gap-3">
              {workspace.departments.map((d) => (
                <label key={d.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.department_ids.includes(d.id)} onChange={() => toggle('department_ids', d.id)} /> {d.name}</label>
              ))}
            </div>
          </div>
        )}
        <div className="grid md:grid-cols-2 gap-3">
          {catalogue.groups.map((group) => {
            const assignable = group.permissions.filter((p) => !p.admin_only);
            if (!assignable.length) return null;
            const all = assignable.every((p) => form.permissions.includes(p.key));
            return (
              <div key={group.id} className="rounded-2xl border border-stone-200 p-3">
                <label className="flex items-center gap-2 font-black text-sm mb-2">
                  <input type="checkbox" checked={all} onChange={(e) => setGroup(group, e.target.checked)} /> {group.label}
                </label>
                <div className="space-y-1 pl-1">
                  {assignable.map((p) => (
                    <label key={p.key} className="flex items-center gap-2 text-[13px] text-stone-700">
                      <input type="checkbox" checked={form.permissions.includes(p.key)} onChange={() => toggle('permissions', p.key)} /> {p.label}
                      {p.scoped && <span className="text-[10px] text-sky-600 font-bold">per department</span>}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-stone-400">Wallet, payouts and kitchen settings always stay with kitchen administrators. Changes apply to everyone with this role at once.</p>
        <ErrorNote message={action.error} />
        <Button className="w-full" busy={action.busy === 'save'} onClick={save}>{role ? 'Save role' : 'Create role'}</Button>
      </div>
    </Modal>
  );
}
