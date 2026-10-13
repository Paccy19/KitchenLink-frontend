import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bike, Search } from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import Can from '../../components/admin-dashboard/Can';
import useFocusParam from '../../components/admin-dashboard/useFocusParam';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorNote,
  Input,
  LoadingBlock,
  PageHeader,
  Pagination,
  Select,
  StatCard,
  StatusBadge,
  Table,
  formatDate,
  formatRwf,
  toTitle,
} from '../../components/admin-dashboard/ui';
import StatusModal from '../../components/admin-dashboard/StatusModal';

const EMPTY = { items: [], total: 0, page: 1, limit: 20 };

export default function AdminDriversPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ status: '', online: '' });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState(null);
  const [toast, setToast] = useState('');
  const focusId = useFocusParam('driver');

  const listQuery = useQuery({
    queryKey: ['admin', 'drivers', { ...filters, page }],
    queryFn: () => adminApi.listDrivers({ ...filters, page, limit: 20 }),
  });
  const countsQuery = useQuery({
    queryKey: ['admin', 'drivers', 'counts'],
    queryFn: () => adminApi.driverCounts(),
  });
  const focusQuery = useQuery({
    queryKey: ['admin', 'driver', focusId],
    queryFn: () => adminApi.getDriver(focusId),
    enabled: Boolean(focusId),
  });

  useEffect(() => {
    if (focusQuery.data?.driver) setTarget(focusQuery.data.driver);
  }, [focusQuery.data]);

  const mutation = useMutation({
    mutationFn: ({ driver, payload }) => adminApi.setDriverStatus(driver.id, payload),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'drivers'] });
      setTarget(null);
      setToast(
        result.released_deliveries > 0
          ? `Delivery worker updated. ${result.released_deliveries} delivery(ies) released.`
          : 'Delivery worker status updated.',
      );
    },
  });

  const data = listQuery.data || EMPTY;
  const counts = countsQuery.data;

  const applyFilter = (patch) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Delivery Workers" description="Verify, monitor and suspend delivery workers." />

      {toast && (
        <div className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
          {toast}
        </div>
      )}

      {counts && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total" value={counts.total} />
          <StatCard label="Online" value={counts.online} tone="green" />
          <StatCard label="Pending" value={counts.pending} tone="amber" />
          <StatCard label="Suspended" value={counts.suspended} tone="red" />
        </div>
      )}

      <Card title="Filters" bodyClassName="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              applyFilter({ search: search.trim() });
            }}
            className="relative sm:col-span-2"
          >
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search delivery workers by name or phone…"
              className="pl-9"
            />
          </form>
          <Select value={filters.status} onChange={(event) => applyFilter({ status: event.target.value })}>
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="suspended">Suspended</option>
          </Select>
          <Select value={filters.online} onChange={(event) => applyFilter({ online: event.target.value })}>
            <option value="">Any availability</option>
            <option value="true">Online</option>
            <option value="false">Offline</option>
          </Select>
        </div>
      </Card>

      <Card bodyClassName="p-4 sm:p-5">
        {listQuery.isLoading ? (
          <LoadingBlock />
        ) : listQuery.error ? (
          <ErrorNote error={listQuery.error} />
        ) : data.items.length === 0 ? (
          <EmptyState icon={Bike} title="No delivery workers found" description="Adjust the filters above." />
        ) : (
          <>
            <Table
              columns={[
                { key: 'name', label: 'Delivery worker' },
                { key: 'contact', label: 'Contact' },
                { key: 'status', label: 'Status' },
                { key: 'online', label: 'Availability' },
                { key: 'earnings', label: 'Earnings' },
                { key: 'actions', label: '', className: 'text-right' },
              ]}
            >
              {data.items.map((driver) => (
                <tr key={driver.id} className="hover:bg-stone-50/60">
                  <td className="px-4 py-3">
                    <p className="font-bold text-gray-900">{driver.name}</p>
                    <p className="text-[11px] text-stone-400">
                      {toTitle(driver.vehicle_type)}
                      {driver.plate_number ? ` · ${driver.plate_number}` : ''}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-stone-600">{driver.phone || driver.email || '—'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={driver.verification_status} />
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={driver.is_online ? 'green' : 'slate'}>
                      {driver.is_online ? 'Online' : 'Offline'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold text-gray-900">{formatRwf(driver.total_earnings_rwf)}</p>
                    <p className="text-[11px] text-stone-400">
                      {driver.completed_deliveries} deliveries · joined{' '}
                      {formatDate(driver.created_at, { withTime: false })}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Can permission="drivers:write">
                      <Button variant="secondary" size="sm" onClick={() => setTarget(driver)}>
                        Change status
                      </Button>
                    </Can>
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
        statuses={['pending', 'approved', 'rejected', 'suspended']}
        current={target?.verification_status}
        submitting={mutation.isPending}
        onClose={() => setTarget(null)}
        onSubmit={(payload) => mutation.mutate({ driver: target, payload })}
      />
      {mutation.isError && <ErrorNote error={mutation.error} />}
    </div>
  );
}
