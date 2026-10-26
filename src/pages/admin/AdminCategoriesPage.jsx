import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Plus, Tags, Trash2 } from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import Can from '../../components/admin-dashboard/Can';
import FadeImage from '../../components/common/FadeImage';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorNote,
  Field,
  Input,
  LoadingBlock,
  Modal,
  PageHeader,
  Table,
  Textarea,
} from '../../components/admin-dashboard/ui';

const empty = { name: '', description: '', icon_url: '', sort_order: 0, is_active: true };

export default function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState('');

  const categoriesQuery = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: () => adminApi.listCategories(),
  });
  const categories = categoriesQuery.data?.items || [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        icon_url: form.icon_url.trim(),
        sort_order: Number(form.sort_order) || 0,
        is_active: Boolean(form.is_active),
      };
      return editing?.id
        ? adminApi.updateCategory(editing.id, payload)
        : adminApi.createCategory(payload);
    },
    onSuccess: () => {
      invalidate();
      setEditing(null);
      setToast('Category saved.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, force }) => adminApi.deleteCategory(id, force),
    onSuccess: () => {
      invalidate();
      setToast('Category deleted.');
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (items) => adminApi.reorderCategories(items),
    onSuccess: invalidate,
  });

  const openCreate = () => {
    setForm({ ...empty, sort_order: categories.length });
    setFormError('');
    setEditing({ id: null });
  };
  const openEdit = (category) => {
    setForm({
      name: category.name,
      description: category.description || '',
      icon_url: category.icon_url || '',
      sort_order: category.sort_order,
      is_active: category.is_active,
    });
    setFormError('');
    setEditing(category);
  };

  const submit = () => {
    if (form.name.trim().length < 2) {
      setFormError('Name must be at least 2 characters.');
      return;
    }
    setFormError('');
    saveMutation.mutate();
  };

  const move = (index, direction) => {
    const next = [...categories];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    reorderMutation.mutate(next.map((category, position) => ({ id: category.id, sort_order: position })));
  };

  const remove = async (category) => {
    if (!window.confirm(`Delete category “${category.name}”?`)) return;
    try {
      await deleteMutation.mutateAsync({ id: category.id, force: false });
    } catch {
      if (
        window.confirm(
          'This category is used by vendors. Force delete anyway? Vendors will lose this label.',
        )
      ) {
        deleteMutation.mutate({ id: category.id, force: true });
      }
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Categories"
        description="Organise how dishes and vendors are grouped across the marketplace."
        action={
          <Can permission="categories:write">
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4" /> New category
            </Button>
          </Can>
        }
      />

      {toast && (
        <div className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
          {toast}
        </div>
      )}

      <Card bodyClassName="p-4 sm:p-5">
        {categoriesQuery.isLoading ? (
          <LoadingBlock />
        ) : categoriesQuery.error ? (
          <ErrorNote error={categoriesQuery.error} />
        ) : categories.length === 0 ? (
          <EmptyState
            icon={Tags}
            title="No categories yet"
            description="Create your first category to organise the marketplace."
            action={<Can permission="categories:write"><Button onClick={openCreate}>New category</Button></Can>}
          />
        ) : (
          <Table
            columns={[
              { key: 'name', label: 'Category' },
              { key: 'order', label: 'Order' },
              { key: 'active', label: 'Status' },
              { key: 'actions', label: '', className: 'text-right' },
            ]}
          >
            {categories.map((category, index) => (
              <tr key={category.id} className="hover:bg-stone-50/60">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <FadeImage
                      src={category.icon_url}
                      className="w-8 h-8 rounded-lg object-cover"
                      fallback={
                        <span className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center">
                          <Tags className="w-4 h-4 text-stone-400" />
                        </span>
                      }
                    />
                    <div>
                      <p className="font-bold text-gray-900 flex items-center gap-1.5 flex-wrap">
                        {category.name}
                        {category.created_by_vendor && (
                          <span
                            title="Created by a kitchen from its menu"
                            className="px-1.5 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[10px] font-bold text-amber-700"
                          >
                            Added by {category.created_by_vendor.name}
                          </span>
                        )}
                      </p>
                      {category.description && (
                        <p className="text-[11px] text-stone-400 line-clamp-1">{category.description}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <Can permission="categories:write">
                    <Button variant="ghost" size="sm" onClick={() => move(index, -1)} disabled={index === 0}>
                      <ArrowUp className="w-3.5 h-3.5" />
                    </Button>
                    <span className="text-xs font-bold text-stone-500 w-6 text-center">
                      {category.sort_order}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => move(index, 1)}
                      disabled={index === categories.length - 1}
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </Button>
                    </Can>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={category.is_active ? 'green' : 'slate'}>
                    {category.is_active ? 'Active' : 'Hidden'}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Can permission="categories:write">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(category)}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => remove(category)}>
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </Button>
                  </div>
                  </Can>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal
        open={Boolean(editing)}
        title={editing?.id ? 'Edit category' : 'New category'}
        onClose={() => setEditing(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Name">
            <Input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="e.g. Breakfast"
            />
          </Field>
          <Field label="Description (optional)">
            <Textarea
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Sort order">
              <Input
                type="number"
                min="0"
                value={form.sort_order}
                onChange={(event) => setForm((prev) => ({ ...prev, sort_order: event.target.value }))}
              />
            </Field>
            <Field label="Visible">
              <label className="flex items-center gap-2 mt-1.5">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) => setForm((prev) => ({ ...prev, is_active: event.target.checked }))}
                  className="w-4 h-4 rounded border-stone-300 text-[#1f2937]"
                />
                <span className="text-sm text-stone-600">Show in marketplace</span>
              </label>
            </Field>
          </div>
          <Field label="Icon URL (optional)">
            <Input
              value={form.icon_url}
              onChange={(event) => setForm((prev) => ({ ...prev, icon_url: event.target.value }))}
              placeholder="https://…"
            />
          </Field>

          {formError && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{formError}</p>
          )}
          {saveMutation.isError && <ErrorNote error={saveMutation.error} />}
        </div>
      </Modal>

      {deleteMutation.isError && <ErrorNote error={deleteMutation.error} />}
    </div>
  );
}
