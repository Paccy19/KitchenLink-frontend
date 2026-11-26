import React, { useState } from 'react';
import { History } from 'lucide-react';
import { kitchenApi } from '../../api/kitchenApi';
import { PageHeader, Card, Badge, ErrorNote, Empty, Loading, Button, useLoad, when } from '../../components/vendor-dashboard/ops/ui';

const AREAS = [
  { id: '', label: 'Everything' },
  { id: 'ticket', label: 'Preparation' },
  { id: 'service', label: 'Service' },
  { id: 'invoice', label: 'Payments' },
  { id: 'staff', label: 'Staff' },
  { id: 'role', label: 'Roles' },
  { id: 'inventory', label: 'Stock' },
  { id: 'table', label: 'Tables' },
  { id: 'department', label: 'Departments' },
];

/** Who did what in the kitchen, newest first (never edited). */
export default function VendorActivityPage() {
  const [area, setArea] = useState('');
  const [limit, setLimit] = useState(50);
  const { data, error, loading } = useLoad(() => kitchenApi.activity({ action: area || undefined, limit }), [area, limit], { intervalMs: 20000 });
  const items = data?.items || [];
  return (
    <div className="space-y-5">
      <PageHeader title="Activity log" subtitle="Every important action, with who did it and when." />
      <div className="flex gap-2 overflow-x-auto pb-1">
        {AREAS.map((a) => (
          <button key={a.id || 'all'} type="button" onClick={() => setArea(a.id)} className={`flex-shrink-0 px-3.5 py-2 rounded-full text-xs font-bold border ${area === a.id ? 'bg-[#2b1206] text-white border-[#2b1206]' : 'bg-white text-stone-600 border-stone-200'}`}>
            {a.label}
          </button>
        ))}
      </div>
      <ErrorNote message={error} />
      <Card className="!p-0 overflow-hidden">
        {loading && !data ? <Loading /> : items.length === 0 ? <Empty icon={History} title="Nothing recorded yet" /> : (
          <div className="divide-y divide-stone-100">
            {items.map((e) => (
              <div key={e.id} className="px-4 py-2.5 flex items-start gap-3 text-sm">
                <Badge tone={e.actor.type === 'staff' ? 'blue' : e.actor.type === 'owner' ? 'brown' : 'stone'}>{e.actor.name || e.actor.type}</Badge>
                <p className="flex-1 min-w-0 text-gray-800">{e.summary || e.action}</p>
                <span className="text-[11px] text-stone-400 whitespace-nowrap">{when(e.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
      {data && data.meta.total > items.length && <Button variant="secondary" onClick={() => setLimit((n) => Math.min(100, n + 50))} disabled={limit >= 100}>Show more</Button>}
    </div>
  );
}
