import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus, Trash2 } from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import { useAdmin } from '../../context/AdminContext';
import { Badge, Button, Card, ErrorNote, Input, formatDate } from './ui';

/**
 * Admin: the banks kitchens and delivery workers can withdraw to, and how many
 * digits each bank's account numbers have. The withdraw popup limits the
 * account number to the chosen bank's length, and the server checks it again.
 * Leave the digits empty when a bank's length isn't known yet (6–30 allowed).
 */
export default function BankFormatsCard() {
  const { can } = useAdmin();
  const canEdit = can('payouts:write');
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['admin', 'banks'], queryFn: () => adminApi.bankFormats() });
  const [rows, setRows] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (query.data && !rows) {
      setRows(
        query.data.banks.map((bank) => ({
          name: bank.name,
          min: bank.digits_min == null ? '' : String(bank.digits_min),
          max: bank.digits_max == null ? '' : String(bank.digits_max),
        })),
      );
    }
  }, [query.data, rows]);

  const mutation = useMutation({
    mutationFn: () =>
      adminApi.saveBankFormats({
        banks: rows
          .filter((row) => row.name.trim())
          .map((row) => ({
            name: row.name.trim(),
            digits_min: row.min === '' ? null : Number(row.min),
            // Only one number typed means an exact length.
            digits_max: row.max === '' ? (row.min === '' ? null : Number(row.min)) : Number(row.max),
          })),
      }),
    onSuccess: (data) => {
      setSaved(true);
      queryClient.setQueryData(['admin', 'banks'], data);
    },
  });

  const update = (index, patch) => {
    setSaved(false);
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };
  const digitsOnly = (value) => value.replace(/\D/g, '').slice(0, 2);

  return (
    <Card
      title="Bank account numbers"
      description="Banks people can withdraw to and how many digits each bank's account numbers have. The withdraw popup only accepts that many digits."
      action={<Building2 className="w-5 h-5 text-stone-400" />}
    >
      {query.error ? (
        <ErrorNote error={query.error} />
      ) : !rows ? (
        <p className="text-sm text-stone-400">Loading…</p>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-black uppercase tracking-wider text-stone-400">
                  <th className="py-2 pr-3">Bank</th>
                  <th className="py-2 pr-3 w-24">Digits</th>
                  <th className="py-2 pr-3 w-24">Up to</th>
                  <th className="py-2 pr-3">Rule</th>
                  <th className="py-2 w-10" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const min = row.min === '' ? null : Number(row.min);
                  const max = row.max === '' ? min : Number(row.max);
                  return (
                    <tr key={index} className="border-t border-stone-100">
                      <td className="py-2 pr-3">
                        <Input value={row.name} disabled={!canEdit} onChange={(event) => update(index, { name: event.target.value.slice(0, 60) })} />
                      </td>
                      <td className="py-2 pr-3">
                        <Input inputMode="numeric" value={row.min} disabled={!canEdit} placeholder="?" onChange={(event) => update(index, { min: digitsOnly(event.target.value) })} />
                      </td>
                      <td className="py-2 pr-3">
                        <Input inputMode="numeric" value={row.max} disabled={!canEdit} placeholder="same" onChange={(event) => update(index, { max: digitsOnly(event.target.value) })} />
                      </td>
                      <td className="py-2 pr-3 text-xs">
                        {min == null ? (
                          <Badge tone="amber">Not set · 6–30 digits</Badge>
                        ) : max != null && max < min ? (
                          <Badge tone="red">Check the numbers</Badge>
                        ) : (
                          <Badge tone="green">{max === min ? `Exactly ${min} digits` : `${min}–${max} digits`}</Badge>
                        )}
                      </td>
                      <td className="py-2 text-right">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
                            aria-label={`Remove ${row.name}`}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {canEdit && (
            <button
              type="button"
              onClick={() => setRows((prev) => [...prev, { name: '', min: '', max: '' }])}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:underline"
            >
              <Plus className="w-3.5 h-3.5" /> Add a bank
            </button>
          )}

          <div className="flex flex-wrap items-center gap-3">
            {canEdit ? (
              <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
                {mutation.isPending ? 'Saving…' : 'Save banks'}
              </Button>
            ) : (
              <Badge>View only</Badge>
            )}
            {saved && <span className="text-xs font-bold text-emerald-700">Saved. The withdraw popup uses these now.</span>}
            {query.data?.updated_at && <span className="text-[11px] text-stone-400">Last changed {formatDate(query.data.updated_at)}</span>}
          </div>
          <p className="text-[11px] text-stone-400">
            Bank of Kigali (14 digits) and I&amp;M (16 digits) come from real account numbers; confirm the others with each bank before setting them.
            Type one number for an exact length, or both for a range. Banks not in the list (“Other bank”) accept 6–30 digits.
          </p>
          {mutation.isError && <ErrorNote error={mutation.error} />}
        </div>
      )}
    </Card>
  );
}
