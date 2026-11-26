import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Inbox, Send, BellOff, CheckCheck } from 'lucide-react';
import { kitchenApi } from '../../api/kitchenApi';
import { useVendor } from '../../context/VendorContext';
import { PageHeader, Card, Button, Badge, ErrorNote, Empty, Loading, Modal, Field, inputClass, useLoad, useAction, when } from '../../components/vendor-dashboard/ops/ui';

/** Messages from the kitchen's administrators and automatic alerts (new orders, ready items …). */
export default function VendorInboxPage() {
  const { can, workspace } = useVendor();
  const [kind, setKind] = useState('');
  const { data, error, loading, reload } = useLoad(() => kitchenApi.inbox({ kind: kind || undefined, limit: 60 }), [kind], { intervalMs: 10000 });
  const action = useAction();
  const [composing, setComposing] = useState(false);
  const [prefs, setPrefs] = useState(false);
  const items = data?.items || [];
  return (
    <div className="space-y-5">
      <PageHeader
        title="Team inbox"
        actions={
          <>
            {workspace?.actor?.type === 'staff' && can('notifications.preferences') && <Button variant="secondary" onClick={() => setPrefs(true)}><BellOff className="w-4 h-4" /> Alerts I get</Button>}
            <Button variant="secondary" busy={action.busy === 'all'} onClick={() => action.run('all', async () => { await kitchenApi.readAllMessages(); reload(); })}><CheckCheck className="w-4 h-4" /> Mark all read</Button>
            {can('notifications.internal') && <Button onClick={() => setComposing(true)}><Send className="w-4 h-4" /> Send a message</Button>}
          </>
        }
      />
      <div className="flex gap-2">
        {[['', 'Everything'], ['message', 'Messages'], ['alert', 'Alerts']].map(([id, label]) => (
          <button key={id || 'all'} type="button" onClick={() => setKind(id)} className={`px-3.5 py-2 rounded-full text-xs font-bold border ${kind === id ? 'bg-[#2b1206] text-white border-[#2b1206]' : 'bg-white text-stone-600 border-stone-200'}`}>{label}</button>
        ))}
      </div>
      <ErrorNote message={error || action.error} />
      <Card className="!p-0 overflow-hidden">
        {loading && !data ? <Loading /> : items.length === 0 ? <Empty icon={Inbox} title="Nothing here yet" /> : (
          <div className="divide-y divide-stone-100">
            {items.map((n) => (
              <div key={n.id} className={`px-4 py-3 flex gap-3 ${n.read ? '' : 'bg-[#faf6f2]'}`}>
                <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${n.read ? 'bg-transparent' : 'bg-[#f28c18]'}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-900">{n.title}</p>
                  {n.body && <p className="text-sm text-stone-600 whitespace-pre-line">{n.body}</p>}
                  <p className="text-[11px] text-stone-400 mt-1">{n.kind === 'alert' ? 'Alert' : `From ${n.from}`} · {when(n.created_at)}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {n.link && <Link to={n.link} onClick={() => !n.read && kitchenApi.readMessage(n.id)} className="text-xs font-bold text-[#6d391d] underline">Open</Link>}
                  {!n.read && <button type="button" className="text-[11px] text-stone-500" onClick={() => action.run(n.id, async () => { await kitchenApi.readMessage(n.id); reload(); })}>Mark read</button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      {composing && <Compose onClose={() => setComposing(false)} onSent={() => { setComposing(false); reload(); }} />}
      {prefs && <Preferences onClose={() => setPrefs(false)} />}
    </div>
  );
}

function Compose({ onClose, onSent }) {
  const { workspace, can } = useVendor();
  const { data: roleData } = useLoad(() => (can('roles.view') || can('staff.view') ? kitchenApi.roles() : Promise.resolve({ roles: [] })), [], { intervalMs: 120000 });
  const { data: staffData } = useLoad(() => (can('staff.view') ? kitchenApi.staff() : Promise.resolve({ staff: [] })), [], { intervalMs: 120000 });
  const [form, setForm] = useState({ title: '', body: '', all: true, role_ids: [], department_ids: [], staff_ids: [] });
  const action = useAction();
  const toggle = (key, value) => setForm((f) => ({ ...f, [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value] }));
  const send = () =>
    action.run('send', async () => {
      await kitchenApi.sendMessage({ title: form.title, body: form.body, to: form.all ? { all: true } : { role_ids: form.role_ids, department_ids: form.department_ids, staff_ids: form.staff_ids } });
      onSent();
    });
  const Picker = ({ title, list, keyName }) =>
    list.length > 0 && (
      <div>
        <p className="text-xs font-black text-stone-500 mb-1">{title}</p>
        <div className="flex flex-wrap gap-2">
          {list.map((x) => (
            <label key={x.id} className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={form[keyName].includes(x.id)} onChange={() => toggle(keyName, x.id)} /> {x.name}</label>
          ))}
        </div>
      </div>
    );
  return (
    <Modal title="Send a message to the team" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Title"><input className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus /></Field>
        <Field label="Message"><textarea className={inputClass} rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></Field>
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.all} onChange={(e) => setForm({ ...form, all: e.target.checked })} /> Everyone in the kitchen</label>
        {!form.all && (
          <div className="space-y-3 rounded-2xl border border-stone-200 p-3">
            <Picker title="Roles" list={roleData?.roles || []} keyName="role_ids" />
            <Picker title="Departments" list={workspace?.departments || []} keyName="department_ids" />
            <Picker title="People" list={staffData?.staff || []} keyName="staff_ids" />
          </div>
        )}
        <ErrorNote message={action.error} />
        <Button className="w-full" busy={action.busy === 'send'} onClick={send}><Send className="w-4 h-4" /> Send</Button>
      </div>
    </Modal>
  );
}

function Preferences({ onClose }) {
  const { data, error } = useLoad(() => kitchenApi.inboxPreferences(), [], { intervalMs: 600000 });
  const [muted, setMuted] = useState(null);
  const action = useAction();
  const current = muted ?? data?.muted ?? [];
  return (
    <Modal title="Alerts I get" onClose={onClose}>
      <div className="space-y-3">
        <ErrorNote message={error || action.error} />
        {(data?.alert_types || []).map((t) => (
          <label key={t.id} className="flex items-center justify-between gap-3 text-sm">
            <span>{t.label}</span>
            <input type="checkbox" checked={!current.includes(t.id)} onChange={() => setMuted(current.includes(t.id) ? current.filter((x) => x !== t.id) : [...current, t.id])} />
          </label>
        ))}
        <Button className="w-full" busy={action.busy === 'save'} onClick={() => action.run('save', async () => { await kitchenApi.saveInboxPreferences(current); onClose(); })}>Save</Button>
        <Badge>Ticked = you get them</Badge>
      </div>
    </Modal>
  );
}
