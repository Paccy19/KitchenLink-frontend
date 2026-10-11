import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ScrollText } from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import {
  Badge,
  Card,
  EmptyState,
  ErrorNote,
  Input,
  LoadingBlock,
  PageHeader,
  Pagination,
  Table,
  formatDate,
  toTitle,
} from '../../components/admin-dashboard/ui';

const EMPTY = { items: [], total: 0, page: 1, limit: 25 };

export default function AdminAuditPage() {
  const [filters, setFilters] = useState({ action: '', target_type: '' });
  const [page, setPage] = useState(1);

  const { data = EMPTY, isLoading, error } = useQuery({
    queryKey: ['admin', 'actions', { ...filters, page }],
    queryFn: () => adminApi.listActions({ ...filters, page, limit: 25 }),
  });

  const applyFilter = (patch) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Audit Log" description="Every admin action, recorded for accountability." />

      <Card title="Filters" bodyClassName="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            value={filters.action}
            onChange={(event) => applyFilter({ action: event.target.value })}
            placeholder="Filter by action (e.g. vendor.suspended)…"
          />
          <Input
            value={filters.target_type}
            onChange={(event) => applyFilter({ target_type: event.target.value })}
            placeholder="Filter by target type (vendor, order, payout…)"
          />
        </div>
      </Card>

      <Card bodyClassName="p-4 sm:p-5">
        {isLoading ? (
          <LoadingBlock />
        ) : error ? (
          <ErrorNote error={error} />
        ) : data.items.length === 0 ? (
          <EmptyState icon={ScrollText} title="No audit entries" description="Admin actions will appear here." />
        ) : (
          <>
            <Table
              columns={[
                { key: 'admin', label: 'Admin' },
                { key: 'action', label: 'Action' },
                { key: 'target', label: 'Target' },
                { key: 'ip', label: 'IP' },
                { key: 'at', label: 'When' },
              ]}
            >
              {data.items.map((log) => (
                <tr key={log.id} className="hover:bg-stone-50/60">
                  <td className="px-4 py-3">
                    <p className="font-bold text-gray-900">{log.admin_name || '—'}</p>
                    <p className="text-[11px] text-stone-400">{log.admin_email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone="violet">{log.action}</Badge>
                  </td>
                  <td className="px-4 py-3 text-stone-600">
                    <p className="text-sm">{toTitle(log.target_type)}</p>
                    {log.target_label && <p className="text-[11px] text-stone-400">{log.target_label}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-500">{log.ip || '—'}</td>
                  <td className="px-4 py-3 text-xs text-stone-500">{formatDate(log.created_at)}</td>
                </tr>
              ))}
            </Table>
            <Pagination page={data.page} limit={data.limit} total={data.total} onPage={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
