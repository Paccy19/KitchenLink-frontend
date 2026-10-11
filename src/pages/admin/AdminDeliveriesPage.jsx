import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bike } from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import {
  Card,
  EmptyState,
  ErrorNote,
  LoadingBlock,
  PageHeader,
  Pagination,
  StatusBadge,
  Table,
  formatDate,
} from '../../components/admin-dashboard/ui';

const EMPTY = { items: [], total: 0, page: 1, limit: 20 };

export default function AdminDeliveriesPage() {
  const [page, setPage] = useState(1);
  const { data = EMPTY, isLoading, error } = useQuery({
    queryKey: ['admin', 'deliveries', page],
    queryFn: () => adminApi.liveDeliveries({ page, limit: 20 }),
    refetchInterval: 15000,
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Live Deliveries"
        description="Active deliveries currently in progress. Auto-refreshes every 15s."
      />

      <Card bodyClassName="p-4 sm:p-5">
        {isLoading ? (
          <LoadingBlock />
        ) : error ? (
          <ErrorNote error={error} />
        ) : data.items.length === 0 ? (
          <EmptyState icon={Bike} title="No active deliveries" description="Nothing in transit right now." />
        ) : (
          <>
            <Table
              columns={[
                { key: 'order', label: 'Order' },
                { key: 'vendor', label: 'Vendor' },
                { key: 'driver', label: 'Driver' },
                { key: 'customer', label: 'Customer' },
                { key: 'status', label: 'Status' },
                { key: 'updated', label: 'Updated' },
              ]}
            >
              {data.items.map((delivery) => (
                <tr key={delivery.id} className="hover:bg-stone-50/60">
                  <td className="px-4 py-3 font-bold text-gray-900">{delivery.order_number}</td>
                  <td className="px-4 py-3 text-stone-600">{delivery.vendor?.name || '—'}</td>
                  <td className="px-4 py-3 text-stone-600">{delivery.driver_id ? 'Assigned' : 'Unassigned'}</td>
                  <td className="px-4 py-3 text-stone-600">{delivery.customer?.name || '—'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={delivery.status_label || delivery.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-500">{formatDate(delivery.updated_at)}</td>
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
