import React, { useMemo, useState } from 'react';
import { Plus, Search, Pencil, Trash2, Clock, Layers, ImageOff, UtensilsCrossed, PackageOpen } from 'lucide-react';
import { useVendor } from '../../context/VendorContext';
import { useToast } from '../../components/common/Toast';
import MenuItemFormModal from '../../components/vendor-dashboard/MenuItemFormModal';
import ConfirmDialog from '../../components/vendor-dashboard/ConfirmDialog';
import EmptyState from '../../components/common/EmptyState';

export default function VendorMenuPage() {
  const { menuItems, categoryNames, addMenuItem, updateMenuItem, deleteMenuItem, toggleItemAvailability } = useVendor();
  const { success, error } = useToast();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return menuItems.filter((item) => {
      const matchesCategory = category === 'all' || item.category === category;
      const matchesTerm =
        !term || item.name.toLowerCase().includes(term) || item.description.toLowerCase().includes(term);
      return matchesCategory && matchesTerm;
    });
  }, [menuItems, query, category]);

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setFormOpen(true);
  };

  const handleSubmit = async (data) => {
    try {
      if (editing) {
        await updateMenuItem(editing.id, data);
        success(`${data.name} updated.`);
      } else {
        await addMenuItem(data);
        success(`${data.name} added to your menu.`);
      }
    } catch (err) {
      error(err?.message || 'Could not save this dish.');
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteMenuItem(pendingDelete.id);
      success(`${pendingDelete.name} deleted.`);
    } catch (err) {
      error(err?.message || 'Could not delete this dish.');
    }
    setPendingDelete(null);
  };

  const handleToggle = async (item) => {
    try {
      await toggleItemAvailability(item.id);
    } catch (err) {
      error(err?.message || 'Could not update availability.');
    }
  };

  const availableCount = menuItems.filter((item) => item.isAvailable).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Menu Management</h2>
          <p className="text-xs text-stone-500 font-medium">
            {menuItems.length} dishes · {availableCount} available
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] hover:from-[#3d1b0c] text-white font-bold text-sm shadow-md shadow-[#2b1206]/20 transition active:scale-95"
        >
          <Plus className="w-4 h-4 text-[#d9bda6]" />
          Add Dish
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search your dishes…"
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-stone-200 focus:border-[#542813] focus:ring-2 focus:ring-[#542813]/10 outline-none transition bg-white"
          />
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
        </div>
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="px-4 py-2.5 text-sm rounded-xl border border-stone-200 focus:border-[#542813] outline-none transition bg-white font-semibold text-stone-700"
        >
          <option value="all">All categories</option>
          {categoryNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<PackageOpen className="w-8 h-8 text-[#542813]" />}
          title={menuItems.length === 0 ? 'Your menu is empty' : 'No matching dishes'}
          message={
            menuItems.length === 0
              ? 'Add your first dish to start selling to hungry customers.'
              : 'Try a different search or category filter.'
          }
          actionLabel={menuItems.length === 0 ? 'Add your first dish' : undefined}
          onAction={menuItems.length === 0 ? openAdd : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={`group bg-white rounded-3xl border shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md ${
                item.isAvailable ? 'border-stone-200/80 hover:border-[#ebd7c5]' : 'border-stone-200/80 opacity-80'
              }`}
            >
              <div className="relative h-40 bg-stone-100">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-300">
                    <ImageOff className="w-8 h-8" />
                  </div>
                )}
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-white/90 backdrop-blur text-[#3d1b0c] shadow-sm">
                    {item.category}
                  </span>
                  {item.popular && (
                    <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[#542813] text-white shadow-sm">
                      Popular
                    </span>
                  )}
                  {item.isPreorder && (
                    <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-sky-600 text-white shadow-sm">
                      Pre-order
                    </span>
                  )}
                </div>
                {!item.isAvailable && (
                  <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                    <span className="text-xs font-black uppercase tracking-wider text-white border border-white/60 px-3 py-1 rounded-full">
                      Unavailable
                    </span>
                  </div>
                )}
              </div>

              <div className="p-4 space-y-3">
                <div>
                  <h3 className="font-black text-sm text-gray-900 leading-snug line-clamp-1">{item.name}</h3>
                  <p className="mt-0.5 text-[11px] text-stone-500 line-clamp-2 min-h-[28px]">{item.description}</p>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-lg font-black text-[#4e2410]">{item.price.toLocaleString()} RWF</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-stone-600 bg-stone-100 px-2 py-1 rounded-lg">
                    <Clock className="w-3 h-3 text-[#8a5332]" />
                    {item.prepTime || '—'}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-stone-500 font-medium">
                  <Layers className="w-3.5 h-3.5 text-[#8a5332]" />
                  {item.options?.length
                    ? `${item.options.length} option${item.options.length > 1 ? 's' : ''}: ${item.options
                        .map((option) => option.name)
                        .join(', ')}`
                    : 'No options'}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-stone-100">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={item.isAvailable}
                    onClick={() => handleToggle(item)}
                    className="flex items-center gap-2"
                  >
                    <span
                      className={`relative w-10 h-[22px] rounded-full transition-colors ${
                        item.isAvailable ? 'bg-emerald-500' : 'bg-stone-300'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-[18px] h-[18px] rounded-full bg-white shadow transition-transform ${
                          item.isAvailable ? 'translate-x-[18px]' : ''
                        }`}
                      />
                    </span>
                    <span className={`text-[11px] font-bold ${item.isAvailable ? 'text-emerald-700' : 'text-stone-500'}`}>
                      {item.isAvailable ? 'Available' : 'Hidden'}
                    </span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      aria-label={`Edit ${item.name}`}
                      className="p-2 rounded-xl text-stone-500 hover:text-[#542813] hover:bg-[#faf6f2] transition"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(item)}
                      aria-label={`Delete ${item.name}`}
                      className="p-2 rounded-xl text-stone-500 hover:text-red-600 hover:bg-red-50 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={openAdd}
            className="min-h-[220px] rounded-3xl border-2 border-dashed border-stone-300 hover:border-[#8a5332] hover:bg-[#faf6f2] transition flex flex-col items-center justify-center gap-2 text-stone-500 hover:text-[#542813] group"
          >
            <span className="w-12 h-12 rounded-2xl bg-stone-100 group-hover:bg-white border border-stone-200 flex items-center justify-center transition">
              <UtensilsCrossed className="w-6 h-6" />
            </span>
            <span className="text-sm font-bold">Add another dish</span>
          </button>
        </div>
      )}

      <MenuItemFormModal
        isOpen={formOpen}
        item={editing}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        title="Delete this dish?"
        message={pendingDelete ? `"${pendingDelete.name}" will be permanently removed from your menu.` : ''}
        confirmLabel="Delete Dish"
        tone="danger"
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
