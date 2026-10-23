import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bike, Plus, Trash2 } from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import { useAdmin } from '../../context/AdminContext';
import { Badge, Button, Card, ErrorNote, Input, formatDate, formatRwf } from './ui';

const MIN_FEE = 500;

/**
 * Admin: delivery fee by distance, e.g. 0–3 km: 500 RWF, 3–6 km: 1,000 RWF,
 * 6 km and more: 1,500 RWF. Each range starts where the previous one ends, the
 * last one has no end, and no fee can be below 500 RWF. The delivery worker
 * still receives the whole fee.
 */
export default function DeliveryFeesCard() {
  const { can } = useAdmin();
  const canEdit = can('deliveries:write');
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['admin', 'delivery-fees'], queryFn: () => adminApi.deliveryFees() });
  // Each row: where the range ends (blank on the last, open-ended row) and its fee.
  const [rows, setRows] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!query.data || rows) return;
    const ranges = query.data.ranges || [];
    setRows(
      ranges.length
        ? ranges.map((range) => ({ to: range.to_km == null ? '' : String(range.to_km), fee: String(range.fee_rwf) }))
        : [
            // Suggested start: same feel as today's formula.
            { to: '3', fee: '800' },
            { to: '6', fee: '1500' },
            { to: '', fee: '2500' },
          ],
    );
  }, [query.data, rows]);

  const ranges = (rows || []).map((row, index) => {
    const from = index === 0 ? 0 : Number(rows[index - 1].to) || 0;
    return { from, to: index === rows.length - 1 ? null : row.to === '' ? NaN : Number(row.to), fee: Number(row.fee) };
  });
  const problems = [];
  ranges.forEach((range, index) => {
    const label = `Range ${index + 1}`;
    if (range.to !== null && !(range.to > range.from)) problems.push(`${label}: the end must be more than ${range.from} km.`);
    if (!Number.isInteger(range.fee) || range.fee < MIN_FEE) problems.push(`${label}: the fee must be at least ${MIN_FEE} RWF.`);
  });

  const mutation = useMutation({
    mutationFn: (payload) => adminApi.saveDeliveryFees(payload),
    onSuccess: (data) => {
      setSaved(true);
      queryClient.setQueryData(['admin', 'delivery-fees'], data);
      queryClient.invalidateQueries({ queryKey: ['admin', 'operations-rules'] });
    },
  });

  const save = () =>
    mutation.mutate({ ranges: ranges.map((range) => ({ from_km: range.from, to_km: range.to, fee_rwf: range.fee })) });

  const update = (index, patch) => {
    setSaved(false);
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };
  const kmInput = (value) => value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1').slice(0, 5);
  const feeInput = (value) => value.replace(/\D/g, '').slice(0, 6);

  const addRange = () => {
    setSaved(false);
    setRows((prev) => {
      const last = prev[prev.length - 1];
      const lastFrom = prev.length > 1 ? Number(prev[prev.length - 2].to) || 0 : 0;
      // The old open range gets an end; a new open range follows it.
      return [...prev.slice(0, -1), { ...last, to: String(lastFrom + 3) }, { to: '', fee: last.fee }];
    });
  };
  const removeRange = (index) => {
    setSaved(false);
    setRows((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length) next[next.length - 1] = { ...next[next.length - 1], to: '' };
      return next;
    });
  };

  const usingRanges = (query.data?.ranges || []).length > 0;

  return (
    <Card
      title="Delivery fee by distance"
      description="Set the delivery fee for each distance range, from the kitchen to the customer by road. The delivery worker keeps the whole fee. No fee can be below 500 RWF."
      action={<Bike className="w-5 h-5 text-stone-400" />}
    >
      {query.error ? (
        <ErrorNote error={query.error} />
      ) : !rows ? (
        <p className="text-sm text-stone-400">Loading…</p>
      ) : (
        <div className="space-y-4">
          {!usingRanges && (
            <p className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              Not set yet — fees use the standard formula (500 RWF + 200 RWF per km, at least 800 RWF). Save ranges below to use your own prices.
            </p>
          )}

          <div className="space-y-2">
            {rows.map((row, index) => {
              const range = ranges[index];
              const isLast = index === rows.length - 1;
              return (
                <div key={index} className="flex flex-wrap items-center gap-2 rounded-xl border border-stone-200 px-3 py-2.5">
                  <span className="text-sm font-bold text-gray-900 w-20">From {range.from} km</span>
                  {isLast ? (
                    <span className="text-sm font-bold text-stone-600 w-32">and more</span>
                  ) : (
                    <span className="flex items-center gap-1.5 w-32">
                      <span className="text-sm text-stone-500">to</span>
                      <Input
                        inputMode="decimal"
                        value={row.to}
                        disabled={!canEdit}
                        onChange={(event) => update(index, { to: kmInput(event.target.value) })}
                        className="w-16"
                        aria-label={`Range ${index + 1} ends at (km)`}
                      />
                      <span className="text-sm text-stone-500">km</span>
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Input
                      inputMode="numeric"
                      value={row.fee}
                      disabled={!canEdit}
                      onChange={(event) => update(index, { fee: feeInput(event.target.value) })}
                      className="w-24"
                      aria-label={`Range ${index + 1} fee (RWF)`}
                    />
                    <span className="text-sm text-stone-500">RWF</span>
                  </span>
                  {Number(row.fee) > 0 && Number(row.fee) < MIN_FEE && <Badge tone="red">Below 500 RWF</Badge>}
                  {canEdit && rows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRange(index)}
                      aria-label={`Remove range ${index + 1}`}
                      className="ml-auto p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {canEdit && (
            <button type="button" onClick={addRange} className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:underline">
              <Plus className="w-3.5 h-3.5" /> Add a range
            </button>
          )}

          {problems.length > 0 ? (
            <ul className="text-xs font-semibold text-red-700 space-y-0.5">
              {problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          ) : (
            <div className="rounded-2xl bg-stone-50 border border-stone-100 p-3 text-sm text-stone-700 space-y-0.5">
              <p className="text-xs font-black uppercase tracking-wider text-stone-400 mb-1">Customers will pay</p>
              {ranges.map((range, index) => (
                <p key={index}>
                  {range.to === null ? `${range.from} km and more` : `${range.from} km up to ${range.to} km`}:{' '}
                  <strong>{formatRwf(range.fee)}</strong>
                </p>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            {canEdit ? (
              <Button onClick={save} disabled={problems.length > 0 || mutation.isPending}>
                {mutation.isPending ? 'Saving…' : 'Save delivery fees'}
              </Button>
            ) : (
              <Badge>View only</Badge>
            )}
            {saved && <span className="text-xs font-bold text-emerald-700">Saved. New orders use these fees.</span>}
            {query.data?.updated_at && <span className="text-[11px] text-stone-400">Last changed {formatDate(query.data.updated_at)}</span>}
          </div>
          <p className="text-[11px] text-stone-400">
            A distance exactly on the edge (e.g. 3 km) uses the next range. Orders already placed keep the fee they were charged.
          </p>
          {mutation.isError && <ErrorNote error={mutation.error} />}
        </div>
      )}
    </Card>
  );
}
