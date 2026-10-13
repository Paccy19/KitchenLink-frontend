import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquareWarning, Plus, Search } from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import useFocusParam from '../../components/admin-dashboard/useFocusParam';
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
  Pagination,
  Select,
  StatCard,
  StatusBadge,
  Table,
  Textarea,
  formatDate,
  toTitle,
} from '../../components/admin-dashboard/ui';

const STATUSES = ['open', 'in_review', 'resolved', 'rejected'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const CATEGORIES = ['order', 'delivery', 'payment', 'vendor', 'driver', 'account', 'other'];
const EMPTY = { items: [], total: 0, page: 1, limit: 20, counts: {} };

const PRIORITY_TONE = { low: 'slate', medium: 'blue', high: 'amber', urgent: 'red' };

export default function AdminComplaintsPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ status: '', category: '', priority: '' });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    subject: '',
    description: '',
    category: 'other',
    priority: 'medium',
    name: '',
    phone: '',
  });
  const [update, setUpdate] = useState({ status: '', priority: '', note: '' });
  const focusId = useFocusParam('complaint');

  useEffect(() => {
    if (focusId) setDetailId(focusId);
  }, [focusId]);

  const listQuery = useQuery({
    queryKey: ['admin', 'complaints', { ...filters, page }],
    queryFn: () => adminApi.listComplaints({ ...filters, page, limit: 20 }),
  });
  const detailQuery = useQuery({
    queryKey: ['admin', 'complaint', detailId],
    queryFn: () => adminApi.getComplaint(detailId),
    enabled: Boolean(detailId),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      adminApi.createComplaint({
        subject: createForm.subject.trim(),
        description: createForm.description.trim(),
        category: createForm.category,
        priority: createForm.priority,
        name: createForm.name.trim(),
        phone: createForm.phone.trim(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'complaints'] });
      setCreateOpen(false);
      setCreateForm({ subject: '', description: '', category: 'other', priority: 'medium', name: '', phone: '' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      const payload = {};
      if (update.status) payload.status = update.status;
      if (update.priority) payload.priority = update.priority;
      if (update.note.trim()) payload.note = update.note.trim();
      return adminApi.updateComplaint(detailId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'complaints'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'complaint', detailId] });
      setUpdate({ status: '', priority: '', note: '' });
    },
  });

  const data = listQuery.data || EMPTY;
  const complaint = detailQuery.data?.complaint;

  const applyFilter = (patch) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Complaints"
        description="Track and resolve customer, vendor and delivery worker issues."
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" /> Log complaint
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STATUSES.map((status) => (
          <StatCard key={status} label={toTitle(status)} value={data.counts?.[status] ?? 0} />
        ))}
      </div>

      <Card title="Filters" bodyClassName="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              applyFilter({ search: search.trim() });
            }}
            className="relative"
          >
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search subject or reference…"
              className="pl-9"
            />
          </form>
          <Select value={filters.status} onChange={(event) => applyFilter({ status: event.target.value })}>
            <option value="">All statuses</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {toTitle(status)}
              </option>
            ))}
          </Select>
          <Select value={filters.category} onChange={(event) => applyFilter({ category: event.target.value })}>
            <option value="">All categories</option>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {toTitle(category)}
              </option>
            ))}
          </Select>
          <Select value={filters.priority} onChange={(event) => applyFilter({ priority: event.target.value })}>
            <option value="">All priorities</option>
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {toTitle(priority)}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <Card bodyClassName="p-4 sm:p-5">
        {listQuery.isLoading ? (
          <LoadingBlock />
        ) : listQuery.error ? (
          <ErrorNote error={listQuery.error} />
        ) : data.items.length === 0 ? (
          <EmptyState icon={MessageSquareWarning} title="No complaints" description="All clear for now." />
        ) : (
          <>
            <Table
              columns={[
                { key: 'subject', label: 'Subject' },
                { key: 'category', label: 'Category' },
                { key: 'priority', label: 'Priority' },
                { key: 'status', label: 'Status' },
                { key: 'created', label: 'Created' },
                { key: 'actions', label: '', className: 'text-right' },
              ]}
            >
              {data.items.map((row) => (
                <tr key={row.id} className="hover:bg-stone-50/60">
                  <td className="px-4 py-3">
                    <p className="font-bold text-gray-900">{row.subject}</p>
                    <p className="text-[11px] text-stone-400">{row.reference}</p>
                  </td>
                  <td className="px-4 py-3 text-stone-600">{toTitle(row.category)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={PRIORITY_TONE[row.priority]}>{toTitle(row.priority)}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-500">{formatDate(row.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="secondary" size="sm" onClick={() => setDetailId(row.id)}>
                      Open
                    </Button>
                  </td>
                </tr>
              ))}
            </Table>
            <Pagination page={data.page} limit={data.limit} total={data.total} onPage={setPage} />
          </>
        )}
      </Card>

      <Modal
        open={createOpen}
        title="Log a complaint"
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (createForm.subject.trim().length < 3) return;
                createMutation.mutate();
              }}
              disabled={createMutation.isPending || createForm.subject.trim().length < 3}
            >
              {createMutation.isPending ? 'Saving…' : 'Create'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Subject">
            <Input
              value={createForm.subject}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, subject: event.target.value }))}
              placeholder="Brief summary"
            />
          </Field>
          <Field label="Description">
            <Textarea
              value={createForm.description}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <Select
                value={createForm.category}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, category: event.target.value }))}
              >
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {toTitle(category)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Priority">
              <Select
                value={createForm.priority}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, priority: event.target.value }))}
              >
                {PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {toTitle(priority)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Reporter name (optional)">
              <Input
                value={createForm.name}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </Field>
            <Field label="Reporter phone (optional)">
              <Input
                value={createForm.phone}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, phone: event.target.value }))}
              />
            </Field>
          </div>
          {createMutation.isError && <ErrorNote error={createMutation.error} />}
        </div>
      </Modal>

      <Modal
        open={Boolean(detailId)}
        title={complaint ? complaint.reference : 'Complaint'}
        onClose={() => setDetailId(null)}
        width="max-w-2xl"
      >
        {detailQuery.isLoading ? (
          <LoadingBlock />
        ) : detailQuery.error ? (
          <ErrorNote error={detailQuery.error} />
        ) : complaint ? (
          <div className="space-y-5">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={complaint.status} />
                <Badge tone={PRIORITY_TONE[complaint.priority]}>{toTitle(complaint.priority)}</Badge>
                <Badge tone="violet">{toTitle(complaint.category)}</Badge>
              </div>
              <h3 className="mt-2 text-base font-black text-gray-900">{complaint.subject}</h3>
              <p className="text-sm text-stone-600 mt-1 whitespace-pre-line">{complaint.description || '—'}</p>
              <p className="text-[11px] text-stone-400 mt-2">
                Raised by {complaint.raised_by.name || toTitle(complaint.raised_by.role)} ·{' '}
                {formatDate(complaint.created_at)}
              </p>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-wider text-stone-400 mb-2">Notes</p>
              <div className="space-y-2">
                {complaint.notes.length === 0 && (
                  <p className="text-sm text-stone-400">No notes yet.</p>
                )}
                {complaint.notes.map((note, index) => (
                  <div key={index} className="rounded-xl bg-stone-50 px-3 py-2">
                    <p className="text-sm text-gray-800">{note.body}</p>
                    <p className="text-[10px] text-stone-400 mt-0.5">
                      {note.author_name} · {formatDate(note.at)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-stone-100 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Status">
                  <Select value={update.status} onChange={(event) => setUpdate((prev) => ({ ...prev, status: event.target.value }))}>
                    <option value="">No change</option>
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {toTitle(status)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Priority">
                  <Select value={update.priority} onChange={(event) => setUpdate((prev) => ({ ...prev, priority: event.target.value }))}>
                    <option value="">No change</option>
                    {PRIORITIES.map((priority) => (
                      <option key={priority} value={priority}>
                        {toTitle(priority)}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field label="Add a note">
                <Textarea
                  value={update.note}
                  onChange={(event) => setUpdate((prev) => ({ ...prev, note: event.target.value }))}
                  placeholder="Internal resolution notes…"
                />
              </Field>
              <div className="flex justify-end">
                <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Saving…' : 'Save changes'}
                </Button>
              </div>
              {updateMutation.isError && <ErrorNote error={updateMutation.error} />}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
