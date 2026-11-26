import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { UtensilsCrossed, Users, Bell, Wallet, PackageCheck, ArrowRight } from 'lucide-react';
import { kitchenApi } from '../../api/kitchenApi';
import { useVendor } from '../../context/VendorContext';
import SessionPanel, { SESSION_STATUS } from '../../components/vendor-dashboard/ops/SessionPanel';
import { PageHeader, Card, Badge, ErrorNote, Empty, Loading, money, useLoad } from '../../components/vendor-dashboard/ops/ui';

/**
 * A server's own tables: who is sitting where, what is ready at the counter,
 * guests calling, what they still owe. Tap a table to take an order, ask
 * for packing or close it.
 */
export default function VendorMyTablesPage() {
  const { can, workspace } = useVendor();
  const staff = workspace?.actor?.type === 'staff';
  const { data, error, loading, reload } = useLoad(() => kitchenApi.tableSessions(staff ? { mine: 'true' } : {}), [staff], { intervalMs: 8000 });
  const packing = useLoad(() => (can('packing.view') ? kitchenApi.packing() : Promise.resolve({ tasks: [] })), [], { intervalMs: 10000 });
  const [open, setOpen] = useState(null);
  const sessions = data?.sessions || [];
  const ready = sessions.reduce((n, s) => n + s.ready_items, 0);
  const packed = (packing.data?.tasks || []).filter((t) => t.status === 'packed' && ['leftover', 'takeaway'].includes(t.kind) && sessions.some((s) => s.id === t.session_id));

  if (loading && !data) return <Loading />;
  return (
    <div className="space-y-5">
      <PageHeader title={staff ? 'My tables' : 'Tables now'} />
      <ErrorNote message={error} />
      {ready > 0 && can('service.view_ready') && (
        <Link to="/vendor-dashboard/service" className="kl-rise flex items-center justify-between rounded-3xl bg-gradient-to-r from-[#2b1206] to-[#6d391d] text-white px-5 py-4 shadow-md">
          <span className="font-bold flex items-center gap-2"><Bell className="w-5 h-5" /> {ready} item{ready === 1 ? '' : 's'} ready to serve</span>
          <ArrowRight className="w-5 h-5" />
        </Link>
      )}
      {packed.length > 0 && (
        <Card className="!p-4">
          <p className="font-black text-gray-900 mb-2 flex items-center gap-2"><PackageCheck className="w-4 h-4" /> Packed, ready to hand over</p>
          <div className="space-y-1.5">
            {packed.map((t) => (
              <div key={t.id} className="flex items-center justify-between text-sm">
                <span>{t.table_label} · {t.kind === 'leftover' ? 'Leftovers' : 'Takeaway'}: {t.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}</span>
                <button type="button" className="text-xs font-bold text-[#6d391d] hover:underline" onClick={() => kitchenApi.handOverTask(t.id).then(() => { packing.reload(); reload(); })}>Handed over</button>
              </div>
            ))}
          </div>
        </Card>
      )}
      {!sessions.length ? (
        <Card><Empty icon={UtensilsCrossed} title="No tables right now">When the host seats guests at your tables, they show here.</Empty></Card>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {sessions.map((s, i) => (
            <button key={s.id} type="button" style={{ animationDelay: `${i * 40}ms` }} onClick={() => setOpen(s.id)} className="kl-rise text-left rounded-3xl bg-white border border-stone-200/80 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition">
              <div className="flex items-start justify-between">
                <p className="font-display text-3xl text-gray-900 leading-none">{s.table.label}</p>
                <Badge tone={SESSION_STATUS[s.status]?.tone}>{SESSION_STATUS[s.status]?.label}</Badge>
              </div>
              <p className="text-xs text-stone-500 mt-2 flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {s.guest_count || '?'} guests · {s.minutes} min{s.customer_name ? ` · ${s.customer_name}` : ''}</p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {s.ready_items > 0 && <Badge tone="amber"><Bell className="w-3 h-3" /> {s.ready_items} ready</Badge>}
                {s.open_requests > 0 && <Badge tone="red">Guests calling</Badge>}
                {s.open_flags > 0 && <Badge tone="red">Kitchen problem</Badge>}
                {s.packing_open > 0 && <Badge tone="blue">Packing</Badge>}
                {s.balance_due_rwf > 0 && <Badge tone="brown"><Wallet className="w-3 h-3" /> {money(s.balance_due_rwf)}</Badge>}
                {s.can_close && <Badge tone="emerald">Ready to close</Badge>}
              </div>
            </button>
          ))}
        </div>
      )}
      {open && <SessionPanel sessionId={open} onClose={() => setOpen(null)} onChanged={reload} />}
    </div>
  );
}
