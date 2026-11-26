import React from 'react';
import { Tags, Pencil, Trash2 } from 'lucide-react';
import { kitchenApi } from '../../api/kitchenApi';
import { useVendor } from '../../context/VendorContext';
import { useLoad, useAction } from './ops/ui';

/**
 * Categories this kitchen created. They are shared on KitchenLink, so a
 * kitchen may rename or delete only its own, while no other kitchen uses them.
 */
export default function MyCategoriesCard() {
  const { can, vendor, loadCategories } = useVendor();
  const allowed = can('menu.categories_edit') || can('menu.categories_delete');
  const { data, reload } = useLoad(() => (allowed ? kitchenApi.menuCategories() : Promise.resolve({ categories: [] })), [allowed], { intervalMs: 120000 });
  const action = useAction();
  const mine = (data?.categories || []).filter((c) => c.created_by_vendor_id && c.created_by_vendor_id === vendor?.id);
  if (!allowed || !mine.length) return null;
  const done = async () => {
    reload();
    await loadCategories?.();
  };
  return (
    <div className="rounded-3xl bg-white border border-stone-200/80 shadow-sm p-5">
      <h3 className="font-black text-gray-900 flex items-center gap-2"><Tags className="w-4 h-4 text-[#6d391d]" /> Categories you created</h3>
      {action.error && <p role="alert" className="mt-2 text-xs font-semibold text-red-600">{action.error}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {mine.map((c) => (
          <span key={c.id} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#faf6f2] border border-[#ebd7c5] text-sm font-semibold">
            {c.name}
            {can('menu.categories_edit') && (
              <button type="button" aria-label={`Rename ${c.name}`} onClick={() => { const name = window.prompt('New name', c.name); if (name && name !== c.name) action.run(c.id, async () => { await kitchenApi.renameMenuCategory(c.id, name); await done(); }); }}><Pencil className="w-3.5 h-3.5" /></button>
            )}
            {can('menu.categories_delete') && (
              <button type="button" aria-label={`Delete ${c.name}`} className="text-red-600" onClick={() => window.confirm(`Delete ${c.name}? Your dishes in it become uncategorised.`) && action.run(c.id, async () => { await kitchenApi.deleteMenuCategory(c.id); await done(); })}><Trash2 className="w-3.5 h-3.5" /></button>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
