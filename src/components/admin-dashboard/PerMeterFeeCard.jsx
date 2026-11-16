import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ruler } from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import { useAdmin } from '../../context/AdminContext';
import { Badge, Button, Card, ErrorNote, Field, Input, formatDate, formatRwf } from './ui';
import { formatDistance } from '../../utils/distance';

// Same rules as the server (src/utils/perMeterPricing.js).
const PLATFORM_MIN_FEE = 500;
const MAX_FEE = 100000;
const SAMPLE_METERS = [500, 1000, 2000, 5000, 10000];

const wholeInput = (value) => value.replace(/[^\d]/g, '').slice(0, 6);
const rateInput = (value) => {
  const cleaned = value.replace(/[^\d.]/g, '');
  const [whole, ...rest] = cleaned.split('.');
  return rest.length ? `${whole}.${rest.join('').slice(0, 3)}` : whole;
};

const toForm = (pm) => ({
  enabled: Boolean(pm?.enabled),
  base_fee_rwf: String(pm?.base_fee_rwf ?? ''),
  per_meter_rwf: String(pm?.per_meter_rwf ?? ''),
  min_fee_rwf: String(pm?.min_fee_rwf ?? PLATFORM_MIN_FEE),
  max_fee_rwf: pm?.max_fee_rwf == null ? '' : String(pm.max_fee_rwf),
  route_deviation_alert_percent: String(pm?.route_deviation_alert_percent ?? 50),
});

const parse = (form) => ({
  enabled: form.enabled,
  base_fee_rwf: form.base_fee_rwf === '' ? NaN : Number(form.base_fee_rwf),
  per_meter_rwf: form.per_meter_rwf === '' ? NaN : Number(form.per_meter_rwf),
  min_fee_rwf: form.min_fee_rwf === '' ? NaN : Number(form.min_fee_rwf),
  max_fee_rwf: form.max_fee_rwf === '' ? null : Number(form.max_fee_rwf),
  route_deviation_alert_percent: form.route_deviation_alert_percent === '' ? 50 : Number(form.route_deviation_alert_percent),
});

function problemsOf(s) {
  const problems = [];
  if (!Number.isInteger(s.base_fee_rwf) || s.base_fee_rwf < 0 || s.base_fee_rwf > MAX_FEE) problems.push('Enter a base fee (whole RWF).');
  if (!Number.isFinite(s.per_meter_rwf) || s.per_meter_rwf < 0 || s.per_meter_rwf > 100) problems.push('Enter a price per meter from 0 to 100 RWF.');
  if (!Number.isInteger(s.min_fee_rwf) || s.min_fee_rwf < PLATFORM_MIN_FEE || s.min_fee_rwf > MAX_FEE) problems.push(`The minimum fee must be at least ${PLATFORM_MIN_FEE} RWF.`);
  if (s.max_fee_rwf !== null && (!Number.isInteger(s.max_fee_rwf) || s.max_fee_rwf < s.min_fee_rwf || s.max_fee_rwf > MAX_FEE)) {
    problems.push('The maximum fee must be empty (no maximum) or at least the minimum fee.');
  }
  if (!Number.isInteger(s.route_deviation_alert_percent) || s.route_deviation_alert_percent < 10 || s.route_deviation_alert_percent > 500) {
    problems.push('The route alert must be from 10% to 500%.');
  }
  return problems;
}

/** Same calculation as the server: base + meters x rate, between min and max. */
function feeFor(meters, s) {
  const raw = Math.round(s.base_fee_rwf + meters * s.per_meter_rwf);
  let fee = Math.max(s.min_fee_rwf, raw);
  if (s.max_fee_rwf !== null) fee = Math.min(s.max_fee_rwf, fee);
  return { fee, raw };
}

/**
 * Admin: the standard platform delivery fee by road meters —
 * base fee + distance in meters x price per meter, kept between a minimum and
 * an optional maximum. Distances come from a road-routing service, never a
 * straight line. Orders already placed keep the fee they were charged.
 */
export default function PerMeterFeeCard() {
  const { can } = useAdmin();
  const canEdit = can('deliveries:write');
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['admin', 'delivery-fees'], queryFn: () => adminApi.deliveryFees() });
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(false);
  const [tryMeters, setTryMeters] = useState('2000');

  useEffect(() => {
    if (query.data && !form) setForm(toForm(query.data.per_meter));
  }, [query.data, form]);

  const mutation = useMutation({
    mutationFn: (per_meter) => adminApi.saveDeliveryFees({ per_meter }),
    onSuccess: (data) => {
      setSaved(true);
      setForm(toForm(data.per_meter));
      queryClient.setQueryData(['admin', 'delivery-fees'], data);
      queryClient.invalidateQueries({ queryKey: ['admin', 'operations-rules'] });
    },
  });

  const update = (patch) => {
    setSaved(false);
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const settings = form ? parse(form) : null;
  const problems = settings ? problemsOf(settings) : [];
  const live = query.data?.per_meter;
  const inUse = query.data?.mode === 'per_meter';
  const tried = Number(tryMeters);

  return (
    <Card
      title="Delivery fee per meter"
      description="Customers pay a base fee plus a price for every meter of road from the kitchen to their address. The road distance is measured by a routing service when they check out; the delivery worker's route never changes it."
      action={<Ruler className="w-5 h-5 text-stone-400" />}
    >
      {query.error ? (
        <ErrorNote error={query.error} />
      ) : !form ? (
        <p className="text-sm text-stone-400">Loading…</p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {inUse ? <Badge tone="green">In use for new orders</Badge> : <Badge>Off — {query.data?.mode === 'ranges' ? 'distance ranges' : 'standard formula'} in use</Badge>}
            {live && !query.data?.per_meter_saved && <span className="text-[11px] text-stone-400">Starting values from the server settings (500 RWF + 0.3 RWF per meter unless changed)</span>}
          </div>

          <label className="flex items-center gap-2 text-sm font-bold text-gray-900">
            <input
              type="checkbox"
              checked={form.enabled}
              disabled={!canEdit}
              onChange={(event) => update({ enabled: event.target.checked })}
              className="w-4 h-4 accent-[#542813]"
            />
            Price standard deliveries per meter
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Base fee (RWF)" hint="Charged on every delivery">
              <Input inputMode="numeric" value={form.base_fee_rwf} disabled={!canEdit} onChange={(e) => update({ base_fee_rwf: wholeInput(e.target.value) })} />
            </Field>
            <Field label="Price per meter (RWF)" hint="e.g. 1, or 0.25 (up to 3 decimals)">
              <Input inputMode="decimal" value={form.per_meter_rwf} disabled={!canEdit} onChange={(e) => update({ per_meter_rwf: rateInput(e.target.value) })} />
            </Field>
            <Field label="Minimum fee (RWF)" hint={`At least ${PLATFORM_MIN_FEE} RWF`}>
              <Input inputMode="numeric" value={form.min_fee_rwf} disabled={!canEdit} onChange={(e) => update({ min_fee_rwf: wholeInput(e.target.value) })} />
            </Field>
            <Field label="Maximum fee (RWF)" hint="Leave empty for no maximum">
              <Input inputMode="numeric" value={form.max_fee_rwf} disabled={!canEdit} onChange={(e) => update({ max_fee_rwf: wholeInput(e.target.value) })} />
            </Field>
            <Field label="Route alert (%)" hint="Flag a delivery whose tracked trip is this much longer than the approved route">
              <Input inputMode="numeric" value={form.route_deviation_alert_percent} disabled={!canEdit} onChange={(e) => update({ route_deviation_alert_percent: wholeInput(e.target.value).slice(0, 3) })} />
            </Field>
          </div>

          {problems.length > 0 ? (
            <ul className="text-xs font-semibold text-red-700 space-y-0.5">
              {problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          ) : (
            <div className="rounded-2xl bg-stone-50 border border-stone-100 p-3 text-sm text-stone-700 space-y-1">
              <p className="text-xs font-black uppercase tracking-wider text-stone-400 mb-1">Customers will pay</p>
              <p className="text-xs text-stone-500">
                {formatRwf(settings.base_fee_rwf)} + {settings.per_meter_rwf} RWF × meters
                {`, at least ${formatRwf(settings.min_fee_rwf)}`}
                {settings.max_fee_rwf !== null ? ` and at most ${formatRwf(settings.max_fee_rwf)}` : ''}
              </p>
              {SAMPLE_METERS.map((meters) => (
                <p key={meters}>
                  {formatDistance(meters)}: <strong>{formatRwf(feeFor(meters, settings).fee)}</strong>
                </p>
              ))}
              <p className="flex flex-wrap items-center gap-1.5 pt-1">
                <span>Try</span>
                <Input inputMode="numeric" value={tryMeters} onChange={(e) => setTryMeters(wholeInput(e.target.value))} className="w-24" aria-label="Distance to try (meters)" />
                <span>m:</span>
                <strong>{tryMeters === '' ? '—' : formatRwf(feeFor(tried, settings).fee)}</strong>
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            {canEdit ? (
              <Button onClick={() => mutation.mutate(settings)} disabled={problems.length > 0 || mutation.isPending}>
                {mutation.isPending ? 'Saving…' : 'Save per-meter pricing'}
              </Button>
            ) : (
              <Badge>View only</Badge>
            )}
            {saved && <span className="text-xs font-bold text-emerald-700">Saved. New orders use these prices.</span>}
            {query.data?.updated_at && <span className="text-[11px] text-stone-400">Last changed {formatDate(query.data.updated_at)}</span>}
          </div>
          <p className="text-[11px] text-stone-400">
            While this is on, the distance ranges below are not used. If the routing service can't measure a road distance, customers are asked to try again or choose pickup — they are never charged a guess. Orders already placed keep the fee they were charged.
          </p>
          {mutation.isError && <ErrorNote error={mutation.error} />}
        </div>
      )}
    </Card>
  );
}
