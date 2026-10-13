import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, TrendingUp, Users, Wallet } from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import {
  Card,
  EmptyState,
  ErrorNote,
  Input,
  LoadingBlock,
  PageHeader,
  Select,
  StatCard,
  Table,
  formatDate,
  formatRwf,
  toTitle,
} from '../../components/admin-dashboard/ui';

const isoDaysAgo = (days) => new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

export default function AdminAnalyticsPage() {
  const [range, setRange] = useState({ from: isoDaysAgo(30), to: new Date().toISOString().slice(0, 10) });
  const [granularity, setGranularity] = useState('day');

  const params = {
    from: range.from ? `${range.from}T00:00:00` : '',
    to: range.to ? `${range.to}T23:59:59` : '',
  };

  const overviewQuery = useQuery({
    queryKey: ['admin', 'analytics', 'overview', range],
    queryFn: () => adminApi.analyticsOverview(params),
  });
  const salesQuery = useQuery({
    queryKey: ['admin', 'analytics', 'sales', range, granularity],
    queryFn: () => adminApi.analyticsSales({ ...params, granularity }),
  });
  const payoutsQuery = useQuery({
    queryKey: ['admin', 'analytics', 'payouts', range],
    queryFn: () => adminApi.analyticsPayouts(params),
  });

  const overview = overviewQuery.data;
  const sales = salesQuery.data;
  const payouts = payoutsQuery.data;
  const maxSeries = Math.max(1, ...(sales?.series || []).map((point) => point.gross_rwf || 0));

  return (
    <div className="space-y-5">
      <PageHeader title="Analytics" description="Revenue, growth and payout insights for the selected period." />

      <Card title="Date range" bodyClassName="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            type="date"
            value={range.from}
            max={range.to}
            onChange={(event) => setRange((prev) => ({ ...prev, from: event.target.value }))}
          />
          <Input
            type="date"
            value={range.to}
            min={range.from}
            onChange={(event) => setRange((prev) => ({ ...prev, to: event.target.value }))}
          />
          <Select value={granularity} onChange={(event) => setGranularity(event.target.value)}>
            <option value="day">Daily</option>
            <option value="hour">Hourly</option>
          </Select>
        </div>
      </Card>

      {overviewQuery.isLoading ? (
        <LoadingBlock />
      ) : overviewQuery.error ? (
        <ErrorNote error={overviewQuery.error} />
      ) : overview ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Gross Sales" value={formatRwf(overview.sales.gross_rwf)} icon={TrendingUp} tone="green" />
            <StatCard label="Completed Orders" value={overview.sales.orders} icon={BarChart3} tone="blue" />
            <StatCard
              label="Commission"
              value={formatRwf(overview.sales.commission_rwf)}
              hint={`${overview.sales.commission_percent}%`}
              tone="violet"
            />
            <StatCard label="Delivery Fees" value={formatRwf(overview.sales.delivery_fees_rwf)} icon={Wallet} tone="amber" />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="New Customers" value={overview.signups.customers} icon={Users} />
            <StatCard label="New Vendors" value={overview.signups.vendors} />
            <StatCard label="New Delivery Workers" value={overview.signups.drivers} />
            <StatCard label="Orders Created" value={overview.orders_created} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card title="Sales Trend" className="lg:col-span-2">
              {salesQuery.isLoading ? (
                <LoadingBlock />
              ) : salesQuery.error ? (
                <ErrorNote error={salesQuery.error} />
              ) : (sales?.series || []).length === 0 ? (
                <EmptyState icon={BarChart3} title="No sales in this period" />
              ) : (
                <div className="space-y-2">
                  {sales.series.map((point) => (
                    <div key={point.period} className="flex items-center gap-3">
                      <span className="w-24 text-[11px] font-bold text-stone-500 truncate">
                        {point.period}
                      </span>
                      <div className="flex-1 h-2.5 rounded-full bg-stone-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#1f2937] to-[#4b5563]"
                          style={{ width: `${Math.max(2, (point.gross_rwf / maxSeries) * 100)}%` }}
                        />
                      </div>
                      <span className="w-28 text-right text-[11px] font-bold text-gray-700">
                        {formatRwf(point.gross_rwf)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card title="Top Vendors">
              <div className="space-y-2">
                {overview.top_vendors.length === 0 && (
                  <p className="text-sm text-stone-400">No vendor sales yet.</p>
                )}
                {overview.top_vendors.map((vendor) => (
                  <div key={vendor.vendor_id || vendor.name} className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-gray-800 truncate">{vendor.name}</span>
                    <span className="text-xs text-stone-500 flex-shrink-0">
                      {vendor.orders} · {formatRwf(vendor.gross_rwf)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card title="Deliveries by Status">
              <Breakdown entries={Object.entries(overview.deliveries_by_status || {})} />
            </Card>
            <Card title="Complaints by Status">
              <Breakdown entries={Object.entries(overview.complaints_by_status || {})} />
            </Card>
          </div>
        </>
      ) : null}

      {payouts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card title="Payouts by Status" bodyClassName="p-4 sm:p-5">
            {(payouts.withdrawals_by_status || []).length === 0 ? (
              <EmptyState icon={Wallet} title="No withdrawal activity" />
            ) : (
              <Table
                columns={[
                  { key: 'status', label: 'Status' },
                  { key: 'count', label: 'Count' },
                  { key: 'total', label: 'Total' },
                ]}
              >
                {payouts.withdrawals_by_status.map((row) => (
                  <tr key={row.status}>
                    <td className="px-4 py-2.5 text-stone-700">{toTitle(row.status)}</td>
                    <td className="px-4 py-2.5 text-stone-600">{row.count}</td>
                    <td className="px-4 py-2.5 font-bold text-gray-900">{formatRwf(row.total_rwf)}</td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
          <Card title="Top Vendor Balances">
            <div className="space-y-2">
              {(payouts.top_vendor_balances || []).length === 0 && (
                <p className="text-sm text-stone-400">No balances.</p>
              )}
              {payouts.top_vendor_balances.map((vendor) => (
                <div key={vendor.vendor_id} className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-gray-800 truncate">{vendor.name}</span>
                  <span className="text-xs text-stone-500 flex-shrink-0">
                    {formatRwf(vendor.available_balance_rwf)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function Breakdown({ entries }) {
  if (!entries.length) return <p className="text-sm text-stone-400">No data.</p>;
  return (
    <div className="space-y-2">
      {entries.map(([key, value]) => (
        <div key={key} className="flex items-center justify-between">
          <span className="text-sm text-stone-600">{toTitle(key)}</span>
          <span className="text-sm font-bold text-gray-900">{value}</span>
        </div>
      ))}
    </div>
  );
}
