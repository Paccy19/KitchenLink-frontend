import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Timer } from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import { useAdmin } from '../../context/AdminContext';
import { Badge, Button, Card, ErrorNote, Field, Input, formatDate } from './ui';

const clockAt = (base, minutes) =>
  new Date(base.getTime() + minutes * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/**
 * Admin: how long a delivery worker has to collect a ready order — when
 * they're reminded, when a late-pickup charge applies, and when the order is
 * taken away and given to another nearby worker. Workers see these rules
 * before they accept.
 */
export default function DeliveryTimingCard() {
  const { can } = useAdmin();
  const canEdit = can('deliveries:write');
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['admin', 'delivery-timing'], queryFn: () => adminApi.deliveryTiming() });
  const timing = query.data?.timing;

  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (timing && !form) {
      setForm({
        warning: String(timing.warning_minutes),
        charge: String(timing.charge_after_minutes),
        reassignOn: timing.reassign_after_minutes != null,
        reassign: String(timing.reassign_after_minutes ?? Number(timing.charge_after_minutes) * 2),
      });
    }
  }, [timing, form]);

  const mutation = useMutation({
    mutationFn: () =>
      adminApi.saveDeliveryTiming({
        warning_minutes: Number(form.warning),
        charge_after_minutes: Number(form.charge),
        reassign_after_minutes: form.reassignOn ? Number(form.reassign) : null,
      }),
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ['admin', 'delivery-timing'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'operations-rules'] });
    },
  });

  const set = (patch) => {
    setSaved(false);
    setForm((prev) => ({ ...prev, ...patch }));
  };

  // A worked example so the effect of the numbers is obvious.
  const example = new Date();
  example.setHours(12, 0, 0, 0);
  const valid =
    form &&
    Number(form.warning) > 0 &&
    Number(form.charge) > Number(form.warning) &&
    (!form.reassignOn || Number(form.reassign) > Number(form.charge));

  return (
    <Card
      title="Delivery timing"
      description="For delivery workers who delay collecting an order that is ready. Times count from when the kitchen marks the food ready. Workers see these rules before they accept."
      action={<Timer className="w-5 h-5 text-stone-400" />}
    >
      {query.error ? (
        <ErrorNote error={query.error} />
      ) : !form ? (
        <p className="text-sm text-stone-400">Loading…</p>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Remind the worker after" hint="minutes">
              <Input type="number" min="1" max="480" value={form.warning} disabled={!canEdit} onChange={(event) => set({ warning: event.target.value })} />
            </Field>
            <Field label="Late-pickup charge after" hint="minutes">
              <Input type="number" min="2" max="480" value={form.charge} disabled={!canEdit} onChange={(event) => set({ charge: event.target.value })} />
            </Field>
            <Field label="Give to another worker after" hint={form.reassignOn ? 'minutes' : 'switched off'}>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="3"
                  max="480"
                  value={form.reassign}
                  disabled={!canEdit || !form.reassignOn}
                  onChange={(event) => set({ reassign: event.target.value })}
                />
                <label className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={form.reassignOn}
                    disabled={!canEdit}
                    onChange={(event) => set({ reassignOn: event.target.checked })}
                  />
                  On
                </label>
              </div>
            </Field>
          </div>

          <div className="rounded-2xl bg-stone-50 border border-stone-100 p-4 text-sm text-stone-700 space-y-1">
            <p className="text-xs font-black uppercase tracking-wider text-stone-400 mb-1">Example: food ready at {clockAt(example, 0)}</p>
            {valid ? (
              <>
                <p>
                  <strong>{clockAt(example, Number(form.warning))}</strong> — the worker is reminded to collect it.
                </p>
                <p>
                  <strong>{clockAt(example, Number(form.charge))}</strong> — not collected: late pickup recorded, a charge applies, and support is alerted.
                </p>
                {form.reassignOn ? (
                  <p>
                    <strong>{clockAt(example, Number(form.reassign))}</strong> — still not collected: the order is taken away and offered to other
                    nearby workers (never back to the late one). The kitchen and customer are told.
                  </p>
                ) : (
                  <p className="text-stone-500">The order is never taken away automatically — support can still reassign it by phone.</p>
                )}
              </>
            ) : (
              <p className="text-red-700 font-semibold">
                The reminder must come before the charge{form.reassignOn ? ', and giving it to another worker must come after the charge' : ''}.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {canEdit ? (
              <Button onClick={() => mutation.mutate()} disabled={!valid || mutation.isPending}>
                {mutation.isPending ? 'Saving…' : 'Save timing'}
              </Button>
            ) : (
              <Badge>View only — ask an operations manager or the owner to change it</Badge>
            )}
            {saved && <span className="text-xs font-bold text-emerald-700">Saved. New pickups use these times.</span>}
            {timing?.updated_at && (
              <span className="text-[11px] text-stone-400">Last changed {formatDate(timing.updated_at)}</span>
            )}
          </div>
          <p className="text-[11px] text-stone-400">
            Changes apply to orders that become ready after you save. A worker who takes over a late order (assigned by support or re-offered) gets this time again from when they take it.
          </p>
          {mutation.isError && <ErrorNote error={mutation.error} />}
        </div>
      )}
    </Card>
  );
}
