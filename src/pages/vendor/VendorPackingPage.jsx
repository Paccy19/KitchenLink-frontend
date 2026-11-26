import React, { useState } from 'react';
import { Package, PackageCheck, Truck, ShoppingBag, Soup, AlertTriangle } from 'lucide-react';
import { kitchenApi } from '../../api/kitchenApi';
import { useVendor } from '../../context/VendorContext';
import { PageHeader, Card, Button, Badge, ErrorNote, Empty, Loading, Modal, inputClass, useLoad, useAction } from '../../components/vendor-dashboard/ops/ui';

const KIND = {
  leftover: { label: 'Leftovers', icon: Soup, tone: 'stone', note: 'Already paid · no charge' },
  takeaway: { label: 'Takeaway', icon: ShoppingBag, tone: 'brown', note: 'On the table bill' },
  delivery: { label: 'Delivery', icon: Truck, tone: 'blue', note: 'Dispatched once packed' },
  pickup: { label: 'Pickup', icon: Package, tone: 'amber', note: 'The customer collects it' },
};
const TABS = [
  { id: '', label: 'Everything' },
  { id: 'delivery', label: 'Delivery' },
  { id: 'takeaway', label: 'Takeaway' },
  { id: 'leftover', label: 'Leftovers' },
  { id: 'pickup', label: 'Pickup' },
];

/** The packing station: what to pack, what is packed and waiting, and problems. */
export default function VendorPackingPage() {
  const { can } = useVendor();
  const [kind, setKind] = useState('');
  const { data, error, loading, reload } = useLoad(() => kitchenApi.packing({ kind }), [kind], { intervalMs: 8000 });
  const action = useAction();
  const [issue, setIssue] = useState(null);
  const tasks = data?.tasks || [];
  const columns = [
    { id: 'requested', title: 'To pack', items: tasks.filter((t) => t.status === 'requested') },
    { id: 'packed', title: 'Packed, waiting', items: tasks.filter((t) => t.status === 'packed') },
  ];
  const act = (key, fn) => action.run(key, fn).then(reload);

  if (loading && !data) return <Loading />;
  return (
    <div className="space-y-5">
      <PageHeader title="Packing" />
      <div className="flex gap-2 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.id || 'all'} type="button" onClick={() => setKind(t.id)} className={`flex-shrink-0 px-3.5 py-2 rounded-full text-xs font-bold border ${kind === t.id ? 'bg-[#2b1206] text-white border-[#2b1206]' : 'bg-white text-stone-600 border-stone-200'}`}>{t.label}</button>
        ))}
      </div>
      <ErrorNote message={error || action.error} />
      <div className="grid md:grid-cols-2 gap-4 items-start">
        {columns.map((col) => (
          <div key={col.id} className="rounded-3xl bg-[#fdfaf6] border border-stone-200/80 p-3">
            <p className="font-black text-gray-900 px-2 py-1 flex items-center justify-between">{col.title} <Badge>{col.items.length}</Badge></p>
            {!col.items.length ? (
              <Empty icon={col.id === 'requested' ? Package : PackageCheck} title={col.id === 'requested' ? 'Nothing to pack' : 'Nothing waiting'} />
            ) : (
              <div className="space-y-2 mt-2">
                {col.items.map((t, i) => {
                  const k = KIND[t.kind];
                  const Icon = k.icon;
                  return (
                    <Card key={t.id} className="!p-4 kl-rise" >
                      <div style={{ animationDelay: `${i * 30}ms` }} className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-black text-gray-900 flex items-center gap-2"><Icon className="w-4 h-4 text-[#6d391d]" /> {t.table_label || t.order_number}</p>
                          <p className="text-[11px] text-stone-500">{k.label} · {k.note} · {t.waiting_minutes} min</p>
                        </div>
                        <Badge tone={k.tone}>{k.label}</Badge>
                      </div>
                      <ul className="mt-2 text-sm text-stone-700 space-y-0.5">
                        {t.items.map((it) => <li key={it.item_id}>{it.quantity}× {it.name}</li>)}
                      </ul>
                      {t.instructions && <p className="text-xs text-stone-600 mt-1.5">“{t.instructions}”</p>}
                      {t.issue && <p className="text-xs font-semibold text-red-700 mt-1.5 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {t.issue}</p>}
                      <div className="flex flex-wrap gap-2 mt-3">
                        {t.status === 'requested' && can('packing.pack') && <Button className="!py-1.5 !text-xs" busy={action.busy === `p${t.id}`} onClick={() => act(`p${t.id}`, () => kitchenApi.packTask(t.id))}>Packed</Button>}
                        {t.status === 'packed' && can('packing.handover') && <Button variant="success" className="!py-1.5 !text-xs" busy={action.busy === `h${t.id}`} onClick={() => act(`h${t.id}`, () => kitchenApi.handOverTask(t.id))}>Handed over</Button>}
                        {(can('packing.report_issue') || can('packing.pack')) && <Button variant="secondary" className="!py-1.5 !text-xs" onClick={() => setIssue(t)}>Problem</Button>}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
      {issue && <IssueModal task={issue} onClose={() => setIssue(null)} onDone={() => { setIssue(null); reload(); }} />}
    </div>
  );
}

function IssueModal({ task, onClose, onDone }) {
  const [text, setText] = useState('');
  const action = useAction();
  const canWithdraw = ['leftover', 'takeaway'].includes(task.kind);
  return (
    <Modal title={`Problem with ${task.table_label || task.order_number}`} onClose={onClose}>
      <div className="space-y-3">
        <textarea className={`${inputClass} min-h-[90px]`} value={text} onChange={(e) => setText(e.target.value)} maxLength={200} placeholder="Missing item, no containers, spilled…" />
        <ErrorNote message={action.error} />
        <div className="flex gap-2">
          <Button className="flex-1" disabled={!text.trim()} busy={action.busy === 'i'} onClick={() => action.run('i', async () => { await kitchenApi.packingIssue(task.id, { issue: text }); onDone(); })}>Tell the team</Button>
          {canWithdraw && <Button variant="danger" busy={action.busy === 'c'} onClick={() => action.run('c', async () => { await kitchenApi.packingIssue(task.id, { issue: text, cancel: true }); onDone(); })}>Withdraw</Button>}
        </div>
      </div>
    </Modal>
  );
}
