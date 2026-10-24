import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Radar } from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import { useAdmin } from '../../context/AdminContext';
import { Badge, Button, Card, ErrorNote, Field, Input, formatDate } from './ui';

// Each editable rule: where it lives in the rules response and how it reads.
const RULES = [
  { field: 'radius_km', group: 'dispatch', from: 'radius_km', label: 'Notify delivery workers within', unit: 'km of the kitchen', step: '0.1' },
  { field: 'max_offer_recipients', group: 'dispatch', from: 'max_drivers_per_broadcast', label: 'Most workers notified per order', unit: 'workers' },
  { field: 'location_max_age_minutes', group: 'dispatch', from: 'driver_location_max_age_minutes', label: 'Their location must be newer than', unit: 'minutes' },
  { field: 'rebroadcast_every_seconds', group: 'dispatch', from: 'rebroadcast_every_seconds', label: 'Re-offer open orders every', unit: 'seconds' },
  { field: 'max_active_deliveries', group: 'dispatch', from: 'max_active_deliveries_per_driver', label: 'Max deliveries at once per worker', unit: 'deliveries' },
  { field: 'pickup_code_max_attempts', group: 'customer_pickup', from: 'max_wrong_codes', label: 'Wrong pickup codes before the order locks', unit: 'tries' },
];

const formFrom = (rules) => Object.fromEntries(RULES.map((rule) => [rule.field, String(rules[rule.group][rule.from])]));

function RuleRow({ label, value, warn = false }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-stone-50 last:border-0">
      <span className="text-sm text-stone-600">{label}</span>
      <span className={`text-sm font-bold text-right ${warn ? 'text-amber-700' : 'text-gray-900'}`}>{value}</span>
    </div>
  );
}

/**
 * Admin: the dispatch and customer-pickup rules the system runs with. Saved
 * values take effect right away — new orders are offered to workers inside
 * the radius set here, and so on.
 */
export default function DeliveryRulesCard() {
  const { can } = useAdmin();
  const canEdit = can('deliveries:write');
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['admin', 'operations-rules'],
    queryFn: () => adminApi.operationsRules(),
    staleTime: 5 * 60 * 1000,
  });
  const rules = query.data;

  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (rules && !form) setForm(formFrom(rules));
  }, [rules, form]);

  const mutation = useMutation({
    mutationFn: () => adminApi.saveOperationsRules(Object.fromEntries(RULES.map((rule) => [rule.field, Number(form[rule.field])]))),
    onSuccess: (next) => {
      setSaved(true);
      queryClient.setQueryData(['admin', 'operations-rules'], next);
      setForm(formFrom(next));
    },
  });

  const set = (field, value) => {
    setSaved(false);
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const limits = rules?.limits || {};
  const problem = form
    ? RULES.find((rule) => {
        const [min, max, decimals] = limits[rule.field] || [];
        const n = Number(form[rule.field]);
        return form[rule.field] === '' || !Number.isFinite(n) || (!decimals && !Number.isInteger(n)) || n < min || n > max;
      })
    : null;

  return (
    <Card
      title="Delivery & pickup rules"
      description="How orders are dispatched, collected and tracked. Changes apply as soon as you save."
      action={<Radar className="w-5 h-5 text-stone-400" />}
    >
      {query.error ? (
        <ErrorNote error={query.error} />
      ) : !rules || !form ? (
        <p className="text-sm text-stone-400">Loading…</p>
      ) : (
        <div className="space-y-6">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-stone-400 mb-1">Dispatch</p>
            <p className="text-xs text-stone-500 mb-3">{rules.dispatch.offered_when}</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {RULES.filter((rule) => rule.group === 'dispatch').map((rule) => {
                const [min, max] = limits[rule.field] || [];
                return (
                  <Field key={rule.field} label={rule.label} hint={`${rule.unit} (${min}–${max})`}>
                    <Input
                      type="number"
                      min={min}
                      max={max}
                      step={rule.step || '1'}
                      value={form[rule.field]}
                      disabled={!canEdit}
                      onChange={(event) => set(rule.field, event.target.value)}
                    />
                  </Field>
                );
              })}
            </div>
            <p className="mt-3 rounded-2xl bg-stone-50 border border-stone-100 p-3 text-sm text-stone-700">
              A new order is sent to up to <strong>{form.max_offer_recipients || '…'}</strong> online delivery workers within{' '}
              <strong>{form.radius_km || '…'} km</strong> of the kitchen whose location is less than{' '}
              <strong>{form.location_max_age_minutes || '…'} min</strong> old and who carry fewer than{' '}
              <strong>{form.max_active_deliveries || '…'}</strong> deliveries. Workers further away can't take it. If nobody accepts, it is
              offered again every <strong>{form.rebroadcast_every_seconds || '…'} s</strong> to anyone who has come into range.
            </p>
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-wider text-stone-400 mb-1">Customer pickup</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {RULES.filter((rule) => rule.group === 'customer_pickup').map((rule) => {
                const [min, max] = limits[rule.field] || [];
                return (
                  <Field key={rule.field} label={rule.label} hint={`${rule.unit} (${min}–${max})`}>
                    <Input
                      type="number"
                      min={min}
                      max={max}
                      value={form[rule.field]}
                      disabled={!canEdit}
                      onChange={(event) => set(rule.field, event.target.value)}
                    />
                  </Field>
                );
              })}
            </div>
            <RuleRow label="Delivery fee" value="None" />
            <RuleRow label="Pickup code" value={`${rules.customer_pickup.code_digits} digits, given when the order is placed`} />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {canEdit ? (
              <Button onClick={() => mutation.mutate()} disabled={Boolean(problem) || mutation.isPending}>
                {mutation.isPending ? 'Saving…' : 'Save rules'}
              </Button>
            ) : (
              <Badge>View only — ask an operations manager or the owner to change it</Badge>
            )}
            {saved && <span className="text-xs font-bold text-emerald-700">Saved. The system uses these rules now.</span>}
            {problem && <span className="text-xs font-bold text-red-700">Check “{problem.label}”.</span>}
            {rules.dispatch.updated_at && (
              <span className="text-[11px] text-stone-400">Last changed {formatDate(rules.dispatch.updated_at)}</span>
            )}
          </div>
          {mutation.isError && <ErrorNote error={mutation.error} />}

          <div className="grid gap-6 lg:grid-cols-2 pt-2 border-t border-stone-100">
            <div>
              <div className="flex items-center justify-between mt-3 mb-1">
                <p className="text-xs font-black uppercase tracking-wider text-stone-400">Pickup clock (delivery workers)</p>
                <Link to="/admin-dashboard/settings/delivery-timing" className="text-[11px] font-bold text-[#1f2937] hover:underline">
                  Edit in Delivery timing
                </Link>
              </div>
              <RuleRow label="Reminder after" value={`${rules.pickup_clock.warning_after_minutes} min`} />
              <RuleRow label="Counts as late after" value={`${rules.pickup_clock.grace_minutes} min`} />
              <RuleRow
                label="Given to another worker after"
                value={rules.pickup_clock.reassign_after_minutes ? `${rules.pickup_clock.reassign_after_minutes} min` : 'Off'}
              />
              <RuleRow label="Late-pickup charge" value="None" />

              <div className="flex items-center justify-between mt-4 mb-1">
                <p className="text-xs font-black uppercase tracking-wider text-stone-400">Delivery fee</p>
                <Link to="/admin-dashboard/settings/delivery-fees" className="text-[11px] font-bold text-[#1f2937] hover:underline">
                  Edit in Delivery fee by distance
                </Link>
              </div>
              {(rules.fees.ranges || []).length > 0 ? (
                rules.fees.ranges.map((range) => (
                  <RuleRow
                    key={range.from_km}
                    label={range.to_km == null ? `${range.from_km} km and more` : `${range.from_km}–${range.to_km} km`}
                    value={`${Number(range.fee_rwf).toLocaleString()} RWF`}
                  />
                ))
              ) : (
                <RuleRow
                  label="Price"
                  value={`${rules.fees.base_rwf} RWF + ${rules.fees.per_km_rwf} RWF/km (min ${rules.fees.minimum_rwf} RWF)`}
                />
              )}
              <RuleRow label="Share paid to the delivery worker" value={`${rules.fees.driver_share_percent}%`} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-stone-400 mt-3 mb-1">Maps & messages</p>
              <RuleRow label="Routes & live tracking" value={rules.tracking.routes_provider} warn={!rules.tracking.google_key_configured} />
              <RuleRow label="Place search" value={rules.tracking.place_search_provider} />
              <RuleRow label="SMS" value={rules.sms.note} warn={!rules.sms.configured} />
              <p className="mt-2 text-[11px] text-stone-400">
                These depend on the map and SMS service keys in the server configuration, so they can't be changed here.
              </p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
