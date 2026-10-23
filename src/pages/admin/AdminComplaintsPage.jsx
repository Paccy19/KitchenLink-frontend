import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquareWarning, Plus, Search } from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import Can from '../../components/admin-dashboard/Can';
import { useAdmin } from '../../context/AdminContext';
import useFocusParam from '../../components/admin-dashboard/useFocusParam';
import { NAME_MAX_LENGTH, formatNameInput, PHONE_MAX_LENGTH, PHONE_PLACEHOLDER, isValidRwandaPhone, sanitizePhoneInput } from '../../utils/validation';
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
const CATEGORIES = ['order', 'delivery', 'payment', 'refund', 'vendor', 'driver', 'account', 'app', 'other'];
const ROLE_LABEL = { customer: 'Customer', vendor: 'Vendor', driver: 'Delivery worker', admin: 'Admin', guest: 'Guest' };
const ROLE_TONE = { customer: 'blue', vendor: 'violet', driver: 'green' };
const canReply = (complaint) =>
  Boolean(complaint?.raised_by?.user_id) && ['customer', 'vendor', 'driver'].includes(complaint.raised_by.role);
const EMPTY = { items: [], total: 0, page: 1, limit: 20, counts: {} };

const PRIORITY_TONE = { low: 'slate', medium: 'blue', high: 'amber', urgent: 'red' };

export default function AdminComplaintsPage() {
  const queryClient = useQueryClient();
  const { can } = useAdmin();
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
  const [update, setUpdate] = useState({ status: '', priority: '', note: '', reply: '' });
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
      if (update.reply.trim()) payload.reply = update.reply.trim();
      return adminApi.updateComplaint(detailId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'complaints'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'complaint', detailId] });
      setUpdate({ status: '', priority: '', note: '', reply: '' });
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
        title="Support & Complaints"
        description="Conversations with customers, vendors and delivery workers who need help. Unread ones are on top."
        action={
          <Can permission="complaints:write">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4" /> Log complaint
            </Button>
          </Can>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="New messages" value={data.counts?.unread ?? 0} tone="red" />
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
                { key: 'from', label: 'From' },
                { key: 'category', label: 'Category' },
                { key: 'priority', label: 'Priority' },
                { key: 'status', label: 'Status' },
                { key: 'created', label: 'Last activity' },
                { key: 'actions', label: '', className: 'text-right' },
              ]}
            >
              {data.items.map((row) => (
                <tr key={row.id} className="hover:bg-stone-50/60">
                  <td className="px-4 py-3">
                    <p className="font-bold text-gray-900 flex items-center gap-1.5">
                      {row.unread && <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" aria-label="new message" />}
                      {row.subject}
                    </p>
                    <p className="text-[11px] text-stone-400">
                      {row.reference}
                      {row.messages?.length ? ` · ${row.messages.length} message${row.messages.length > 1 ? 's' : ''}` : ''}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={ROLE_TONE[row.raised_by.role] || 'slate'}>{ROLE_LABEL[row.raised_by.role] || 'Guest'}</Badge>
                    <p className="text-[11px] text-stone-500 mt-0.5">{row.raised_by.name || row.raised_by.phone || ''}</p>
                  </td>
                  <td className="px-4 py-3 text-stone-600">{toTitle(row.category)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={PRIORITY_TONE[row.priority]}>{toTitle(row.priority)}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-500">{formatDate(row.last_message_at || row.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant={row.unread ? 'primary' : 'secondary'} size="sm" onClick={() => setDetailId(row.id)}>
                      {row.unread ? 'Reply' : 'Open'}
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
              disabled={createMutation.isPending || createForm.subject.trim().length < 3 || (Boolean(createForm.phone) && !isValidRwandaPhone(createForm.phone))}
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
                maxLength={NAME_MAX_LENGTH}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, name: formatNameInput(event.target.value) }))}
              />
            </Field>
            <Field label="Reporter phone (optional)">
              <Input
                value={createForm.phone}
                type="tel"
                inputMode="tel"
                maxLength={PHONE_MAX_LENGTH}
                placeholder={PHONE_PLACEHOLDER}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, phone: sanitizePhoneInput(event.target.value) }))}
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
              {complaint.messages.length === 0 && (
                <p className="text-sm text-stone-600 mt-1 whitespace-pre-line">{complaint.description || '—'}</p>
              )}
              <p className="text-[11px] text-stone-400 mt-2">
                Raised by {ROLE_LABEL[complaint.raised_by.role] || 'Guest'}{' '}
                {complaint.raised_by.name ? <strong className="text-stone-600">{complaint.raised_by.name}</strong> : null}
                {complaint.raised_by.phone ? ` · ${complaint.raised_by.phone}` : ''} · {formatDate(complaint.created_at)}
              </p>
            </div>

            {complaint.messages.length > 0 && (
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-stone-400 mb-2">Conversation</p>
                <div className="space-y-2 max-h-72 overflow-y-auto rounded-xl bg-[#fcfaf8] border border-stone-100 p-3">
                  {complaint.messages.map((message) => {
                    const fromSupport = message.author_role === 'admin';
                    return (
                      <div key={message.id} className={`flex ${fromSupport ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl px-3 py-2 ${fromSupport ? 'bg-[#542813] text-white' : 'bg-white border border-stone-200'}`}>
                          <p className={`text-[10px] font-black ${fromSupport ? 'text-white/70' : 'text-[#542813]'}`}>
                            {fromSupport ? `Support · ${message.author_name}` : message.author_name || ROLE_LABEL[message.author_role]}
                          </p>
                          <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>
                          <p className={`text-[10px] mt-0.5 ${fromSupport ? 'text-white/60' : 'text-stone-400'}`}>{formatDate(message.at)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {canReply(complaint) && can('complaints:write') && (
              <Field label={`Reply to ${complaint.raised_by.name || 'the user'} (they see this and get notified)`}>
                <Textarea
                  value={update.reply}
                  onChange={(event) => setUpdate((prev) => ({ ...prev, reply: event.target.value }))}
                  placeholder="Write your answer…"
                />
              </Field>
            )}

            <div>
              <p className="text-xs font-black uppercase tracking-wider text-stone-400 mb-2">Internal notes (only the support team sees these)</p>
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

            {can('complaints:write') && (
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
              <Field label="Add an internal note">
                <Textarea
                  value={update.note}
                  onChange={(event) => setUpdate((prev) => ({ ...prev, note: event.target.value }))}
                  placeholder="Internal resolution notes…"
                />
              </Field>
              <div className="flex justify-end">
                <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Saving…' : update.reply.trim() ? 'Send reply' : 'Save changes'}
                </Button>
              </div>
              {updateMutation.isError && <ErrorNote error={updateMutation.error} />}
            </div>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
