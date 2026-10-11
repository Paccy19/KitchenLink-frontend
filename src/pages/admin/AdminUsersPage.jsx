import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Users } from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import {
  Button,
  Card,
  EmptyState,
  ErrorNote,
  Input,
  LoadingBlock,
  PageHeader,
  Pagination,
  Select,
  StatusBadge,
  Table,
  formatDate,
  toTitle,
} from '../../components/admin-dashboard/ui';
import StatusModal from '../../components/admin-dashboard/StatusModal';

const ROLE_STATUSES = {
  customer: ['active', 'suspended'],
  vendor: ['pending', 'approved', 'rejected', 'suspended'],
  driver: ['pending', 'approved', 'rejected', 'suspended'],
};

const EMPTY = { items: [], total: 0, page: 1, limit: 20 };

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ role: '', status: '', search: '' });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState(null);
  const [toast, setToast] = useState('');

  const { data = EMPTY, isLoading, error } = useQuery({
    queryKey: ['admin', 'users', { ...filters, page }],
    queryFn: () => adminApi.listUsers({ ...filters, page, limit: 20 }),
  });

  const mutation = useMutation({
    mutationFn: ({ user, payload }) => adminApi.setUserStatus(user.id, { role: user.role, ...payload }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setTarget(null);
      setToast(`${toTitle(variables.user.role)} status updated.`);
    },
  });

  const applyFilter = (patch) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Users" description="Every customer, vendor and driver in one place." />

      {toast && (
        <div className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
          {toast}
        </div>
      )}

      <Card
        bodyClassName="p-4"
        title="Filters"
        action={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilters({ role: '', status: '', search: '' });
              setSearch('');
              setPage(1);
            }}
          >
            Reset
          </Button>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              applyFilter({ search: search.trim() });
            }}
            className="lg:col-span-2 relative"
          >
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name or phone…"
              className="pl-9"
            />
          </form>
          <Select value={filters.role} onChange={(event) => applyFilter({ role: event.target.value })}>
            <option value="">All roles</option>
            <option value="customer">Customers</option>
            <option value="vendor">Vendors</option>
            <option value="driver">Drivers</option>
          </Select>
          <Select value={filters.status} onChange={(event) => applyFilter({ status: event.target.value })}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </Select>
        </div>
      </Card>

      <Card bodyClassName="p-4 sm:p-5">
        {isLoading ? (
          <LoadingBlock />
        ) : error ? (
          <ErrorNote error={error} />
        ) : data.items.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No users found"
            description="Try a different role, status or search term."
          />
        ) : (
          <>
            <Table
              columns={[
                { key: 'name', label: 'Name' },
                { key: 'role', label: 'Role' },
                { key: 'contact', label: 'Contact' },
                { key: 'status', label: 'Status' },
                { key: 'created', label: 'Joined' },
                { key: 'actions', label: '', className: 'text-right' },
              ]}
            >
              {data.items.map((user) => (
                <tr key={`${user.role}-${user.id}`} className="hover:bg-stone-50/60">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <span className="w-8 h-8 rounded-full bg-stone-200 text-stone-600 flex items-center justify-center text-[11px] font-black">
                          {String(user.name || 'U').slice(0, 2).toUpperCase()}
                        </span>
                      )}
                      <span className="font-bold text-gray-900">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-bold text-stone-600">{toTitle(user.role)}</span>
                    {user.secondary && (
                      <span className="block text-[11px] text-stone-400">{toTitle(user.secondary)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-stone-600">{user.identifier || '—'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={user.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-500">{formatDate(user.created_at, { withTime: false })}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="secondary" size="sm" onClick={() => setTarget(user)}>
                      Change status
                    </Button>
                  </td>
                </tr>
              ))}
            </Table>
            <Pagination page={data.page} limit={data.limit} total={data.total} onPage={setPage} />
          </>
        )}
      </Card>

      <StatusModal
        open={Boolean(target)}
        title={target ? `Change status · ${target.name}` : 'Change status'}
        statuses={target ? ROLE_STATUSES[target.role] : []}
        current={target?.status}
        submitting={mutation.isPending}
        onClose={() => setTarget(null)}
        onSubmit={(payload) => mutation.mutate({ user: target, payload })}
      />
      {mutation.isError && (
        <ErrorNote error={mutation.error} className="fixed bottom-4 right-4 max-w-sm shadow-lg" />
      )}
    </div>
  );
}
