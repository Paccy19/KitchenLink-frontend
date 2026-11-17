import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Route } from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import { Badge, Card, ErrorNote, Pagination, StatCard, Table, formatDate, formatRwf } from './ui';
import { formatDistance } from '../../utils/distance';

const LIMIT = 20;

const MODE_LABELS = { per_meter: 'Per meter', ranges: 'Distance range', formula: 'Standard formula' };
const SOURCE_LABELS = { google: 'Google Routes', osrm: 'OSRM (OpenStreetMap)', estimate: 'Estimate' };

/** How an order's fee was calculated, in one line. */
function priceText(row) {
  if (row.mode === 'per_meter') {
    const limit =
      row.formula_fee_rwf != null && row.formula_fee_rwf !== row.fee_rwf
        ? ` → ${row.fee_rwf > row.formula_fee_rwf ? 'minimum' : 'maximum'}`
        : '';
    return `${formatRwf(row.base_fee_rwf)} + ${row.per_meter_rwf} RWF × ${Number(row.distance_m).toLocaleString()} m${limit}`;
  }
  if (row.mode === 'ranges' && row.range) {
    return `${row.range.from_km}–${row.range.to_km ?? '∞'} km range`;
  }
  if (row.mode === 'formula') return `${formatRwf(row.base_fee_rwf)} + ${row.per_km_fee_rwf} RWF/km`;
  return '—';
}

/**
 * Admin: every order charged the standard delivery fee, with the approved
 * road distance, the prices used (kept with the order, so later price changes
 * never alter it) and route monitoring (worker's tracked trip vs the approved
 * route). A flagged detour never changes what the customer paid.
 */
export default function DeliveryFeeRecordsCard() {
  const [page, setPage] = useState(1);
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const query = useQuery({
    queryKey: ['admin', 'delivery-fee-records', page, flaggedOnly],
    queryFn: () => adminApi.deliveryFeeRecords({ page, limit: LIMIT, ...(flaggedOnly ? { flagged: 'true' } : {}) }),
    placeholderData: (previous) => previous,
  });
  const data = query.data;
  const summary = data?.summary;

  return (
    <Card
      title="Delivery fee records"
      description="Orders charged the standard delivery fee: the road distance approved at checkout, how the fee was calculated, and the delivery worker's tracked trip."
      action={<Route className="w-5 h-5 text-stone-400" />}
    >
      {query.error ? (
        <ErrorNote error={query.error} />
      ) : !data ? (
        <p className="text-sm text-stone-400">Loading…</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard label="Orders" value={(summary?.orders ?? 0).toLocaleString()} />
            <StatCard label="Average distance" value={summary?.avg_distance_m == null ? '—' : formatDistance(summary.avg_distance_m)} />
            <StatCard label="Average fee" value={summary?.avg_fee_rwf == null ? '—' : formatRwf(summary.avg_fee_rwf)} hint={`${formatRwf(summary?.fees_rwf)} in total`} />
          </div>

          <label className="flex items-center gap-2 text-xs font-bold text-stone-600">
            <input
              type="checkbox"
              checked={flaggedOnly}
              onChange={(event) => {
                setFlaggedOnly(event.target.checked);
                setPage(1);
              }}
              className="w-4 h-4 accent-[#542813]"
            />
            Only deliveries flagged for a long detour
          </label>

          {data.items.length === 0 ? (
            <p className="text-sm text-stone-400">{flaggedOnly ? 'No flagged deliveries.' : 'No orders yet.'}</p>
          ) : (
            <Table
              columns={[
                { key: 'order', label: 'Order' },
                { key: 'distance', label: 'Approved distance' },
                { key: 'price', label: 'Calculation' },
                { key: 'fee', label: 'Fee' },
                { key: 'route', label: 'Worker’s trip' },
              ]}
            >
              {data.items.map((row) => {
                const monitor = row.route_monitoring;
                return (
                  <tr key={row.order_id} className="align-top">
                    <td className="px-4 py-3">
                      <p className="font-bold text-gray-900">{row.order_number}</p>
                      <p className="text-[11px] text-stone-500">{row.vendor?.name || '—'}</p>
                      <p className="text-[11px] text-stone-400">{formatDate(row.priced_at)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold">{formatDistance(row.distance_m)}</p>
                      <p className="text-[11px] text-stone-400">{SOURCE_LABELS[row.distance_source] || row.distance_source}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs">{priceText(row)}</p>
                      <p className="text-[11px] text-stone-400">{MODE_LABELS[row.mode] || row.mode}</p>
                    </td>
                    <td className="px-4 py-3 font-black whitespace-nowrap">{formatRwf(row.fee_rwf)}</td>
                    <td className="px-4 py-3">
                      {!monitor || !monitor.tracked_distance_m ? (
                        <span className="text-[11px] text-stone-400">Not tracked yet</span>
                      ) : (
                        <>
                          <p className="text-xs">
                            {formatDistance(monitor.tracked_distance_m)}
                            {monitor.deviation_ratio != null && <span className="text-stone-400"> (×{monitor.deviation_ratio})</span>}
                          </p>
                          {monitor.flagged_at && <Badge tone="red">Long detour</Badge>}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </Table>
          )}
          <Pagination page={data.page} limit={data.limit} total={data.total} onPage={setPage} />
          <p className="text-[11px] text-stone-400">
            A detour flag is for review only: the customer's fee and the worker's pay were fixed when the order was placed.
          </p>
        </div>
      )}
    </Card>
  );
}
