import React, { useState } from 'react';
import { AlertTriangle, Clock, CheckCircle2, Loader2 } from 'lucide-react';

const money = (value) => `RWF ${Math.round(Number(value) || 0).toLocaleString('en-US')}`;

/**
 * What the kitchen told the customer about this order: a dish running late,
 * or one it can't make with the choices the server allows (continue without
 * it, choose something else, cancel). The server decides the choices and
 * what each one costs; this only shows them and sends the one picked.
 *
 * `onRespond(issueId, choice)` returns a promise; `onSwap()` runs after
 * "Choose something else" (the table page scrolls to its menu).
 */
export default function OrderIssues({ issues = [], onRespond, onSwap }) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  if (!issues.length) return null;

  const answer = async (issue, choice) => {
    if (choice === 'cancel' && !window.confirm('Cancel this order?')) return;
    setBusy(`${issue.id}:${choice}`);
    setError('');
    try {
      await onRespond(issue.id, choice);
      if (choice === 'swap') onSwap?.();
    } catch (err) {
      setError(err?.message || 'That did not work. Try again.');
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="space-y-2">
      {issues.map((issue) => {
        const waiting = issue.status === 'open' && issue.choices.length > 0;
        const tone = issue.kind === 'delayed' ? 'bg-amber-50 border-amber-200 text-amber-900' : waiting ? 'bg-red-50 border-red-200 text-red-900' : 'bg-stone-50 border-stone-200 text-stone-700';
        const Icon = issue.kind === 'delayed' ? Clock : issue.status === 'answered' ? CheckCircle2 : AlertTriangle;
        return (
          <div key={issue.id} role={waiting ? 'alert' : undefined} className={`rounded-2xl border px-4 py-3 text-sm ${tone}`}>
            <p className="font-bold flex items-start gap-2">
              <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{issue.message}</span>
            </p>
            {issue.note && <p className="text-xs mt-1 ml-6 opacity-80">{issue.note}</p>}
            {issue.status === 'answered' && (
              <p className="text-xs mt-1 ml-6 font-semibold">
                You chose: {issue.choice_label}
                {issue.refund_rwf > 0 ? ` · ${money(issue.refund_rwf)} goes back to you` : ''}
              </p>
            )}
            {waiting && (
              <div className="flex flex-wrap gap-2 mt-3 ml-6">
                {issue.choices.map((choice) => (
                  <button
                    key={choice.id}
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={() => answer(issue, choice.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold border transition disabled:opacity-50 ${
                      choice.id === 'cancel' ? 'bg-white border-red-300 text-red-700 hover:bg-red-50' : 'bg-[#2b1206] border-[#2b1206] text-white hover:bg-[#3d1b0c]'
                    }`}
                  >
                    {busy === `${issue.id}:${choice.id}` && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {choice.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
      {error && <p role="alert" className="text-xs font-semibold text-red-600">{error}</p>}
    </div>
  );
}
