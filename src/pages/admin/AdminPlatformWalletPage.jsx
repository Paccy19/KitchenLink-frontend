import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, AlertTriangle, Landmark, CalendarClock, Scale, Plus, Lock } from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import ActionCodeField from '../../components/admin-dashboard/ActionCodeField';
import { PHONE_ERROR, PHONE_MAX_LENGTH, PHONE_PLACEHOLDER, isValidRwandaPhone, sanitizePhoneInput } from '../../utils/validation';
import {
  Badge,
  Button,
  Card,
  ErrorNote,
  Field,
  Input,
  LoadingBlock,
  Modal,
  PageHeader,
  Select,
  StatCard,
  StatusBadge,
  Table,
  formatDate,
  formatRwf,
} from '../../components/admin-dashboard/ui';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const EMPTY_DEST = { type: 'bank', label: '', provider: '', account_name: '', account_number: '' };

/**
 * The owner's platform money: books, commission withdrawals to locked company
 * accounts (manual transfer confirmed by reference), adjustments, the weekly
 * sweep reminder and statement reconciliation. Super admin only.
 */
export default function AdminPlatformWalletPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const sweepAmount = Number(searchParams.get('sweep')) || 0;

  const query = useQuery({ queryKey: ['admin', 'owner'], queryFn: adminApi.ownerOverview });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin', 'owner'] });

  if (query.isLoading) return <LoadingBlock />;
  if (query.error) return <ErrorNote error={query.error} />;
  const data = query.data;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Platform Wallet"
        description="Your commission: what you can withdraw, where it goes, and whether the books match the real account."
      />
      <SecurityChecklist security={data.security} />
      <BooksCard books={data.books} onChanged={refresh} />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 space-y-5">
          <WithdrawCard data={data} sweepAmount={sweepAmount} onChanged={refresh} />
          <HistoryCard withdrawals={data.withdrawals} />
        </div>
        <div className="space-y-5">
          <PayoutSettingsCard settings={data.payout_settings} sweep={data.sweep} onChanged={refresh} />
          <DestinationsCard destinations={data.destinations} onChanged={refresh} />
        </div>
      </div>
      <ReconciliationCard books={data.books} checks={data.reconciliations} onChanged={refresh} />
    </div>
  );
}

function SecurityChecklist({ security }) {
  const items = [
    { ok: !security.uses_default_password, label: 'Admin password changed from the default', fix: 'Change it in Settings' },
    { ok: security.two_factor_enabled, label: 'SMS codes on (sign-in and money actions)', fix: 'Turn on in Settings' },
    { ok: !security.default_jwt_secret, label: 'Server secret (JWT_SECRET) set', fix: 'Set JWT_SECRET in the backend .env' },
  ];
  if (items.every((item) => item.ok)) return null;
  return (
    <Card title="Secure your account first">
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2 text-sm">
            {item.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-amber-600" />}
            <span className={item.ok ? 'text-stone-500' : 'text-gray-900 font-semibold'}>{item.label}</span>
            {!item.ok && (
              item.fix.startsWith('Set') ? (
                <span className="text-[11px] text-stone-400">· {item.fix}</span>
              ) : (
                <Link to="/admin-dashboard/settings" className="text-[11px] font-bold text-[#542813] hover:underline">· {item.fix}</Link>
              )
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function BooksCard({ books, onChanged }) {
  const [adjusting, setAdjusting] = useState(false);
  return (
    <Card
      title="The books"
      description="All customer money sits in the platform's account. It must equal what it is made of."
      action={books.balanced ? <Badge tone="green">Balanced</Badge> : <Badge tone="red">Off by {formatRwf(books.unreconciled_rwf)}</Badge>}
    >
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="Cash in account" value={formatRwf(books.cash_balance_rwf)} hint="Should be in the real account" />
        <StatCard label="Held" value={formatRwf(books.held_balance_rwf)} hint="Orders in progress" />
        <StatCard label="Owed to vendors" value={formatRwf(books.vendor_payable_rwf)} />
        <StatCard label="Owed to delivery workers" value={formatRwf(books.driver_payable_rwf)} />
        <StatCard label="Your balance" value={formatRwf(books.owner_balance_rwf)} hint={`Commission earned ${formatRwf(books.total_commission_rwf)}`} tone="violet" />
      </div>
      {!books.balanced && (
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span className="flex-1">
            {formatRwf(books.unreconciled_rwf)} is unaccounted for, so withdrawals are blocked. If the money was lost
            (e.g. paid out twice before the books were fixed), record an adjustment with the reason.
          </span>
          <Button variant="danger" onClick={() => setAdjusting(true)}>Record adjustment</Button>
        </div>
      )}
      <AdjustmentModal open={adjusting} suggested={books.unreconciled_rwf} onClose={() => setAdjusting(false)} onDone={onChanged} />
    </Card>
  );
}

function AdjustmentModal({ open, suggested, onClose, onDone }) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [code, setCode] = useState('');
  useEffect(() => {
    if (open) {
      setAmount(suggested ? String(suggested) : '');
      setReason('');
      setCode('');
    }
  }, [open, suggested]);
  const mutation = useMutation({
    mutationFn: () => adminApi.ownerAdjustment({ amount_rwf: Number(amount), reason, otp_code: code }),
    onSuccess: () => { onDone(); onClose(); },
  });
  return (
    <Modal
      open={open}
      title="Record adjustment"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || code.length !== 6 || reason.trim().length < 5 || !Number(amount)}>
            {mutation.isPending ? 'Saving…' : 'Record adjustment'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-stone-600">
          A negative amount reduces your balance (a write-off). It is recorded permanently on the ledger and in the audit log.
        </p>
        <Field label="Amount (RWF)"><Input type="number" value={amount} onChange={(event) => setAmount(event.target.value)} /></Field>
        <Field label="Reason (at least 5 characters)">
          <Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="e.g. Delivery fee paid twice on order OFK-…668BD3" />
        </Field>
        <ActionCodeField purpose="adjustment" value={code} onChange={setCode} />
        {mutation.isError && <ErrorNote error={mutation.error} />}
      </div>
    </Modal>
  );
}

function WithdrawCard({ data, sweepAmount, onChanged }) {
  const { withdrawable: w, blockers, destinations, withdrawals } = data;
  const readyDestinations = destinations.filter((d) => d.ready);
  const processing = withdrawals.find((entry) => entry.status === 'processing');
  const [amount, setAmount] = useState(sweepAmount ? String(Math.min(sweepAmount, w.max_now_rwf)) : '');
  const [destinationId, setDestinationId] = useState('');
  const [code, setCode] = useState('');
  useEffect(() => {
    if (!destinationId && readyDestinations[0]) setDestinationId(readyDestinations[0].id);
  }, [destinationId, readyDestinations]);

  const request = useMutation({
    mutationFn: () =>
      adminApi.ownerWithdraw({
        amount_rwf: Number(amount),
        destination_id: destinationId,
        otp_code: code,
        source: sweepAmount ? 'weekly_sweep' : 'manual',
      }),
    onSuccess: () => { setAmount(''); setCode(''); onChanged(); },
  });

  const numeric = Number(amount);
  const invalid = !Number.isInteger(numeric) || numeric <= 0 || numeric > w.max_now_rwf;

  return (
    <Card title="Withdraw commission" description="Requested here, transferred by you, then confirmed with the transfer reference.">
      <div className="grid grid-cols-2 gap-3 mb-4">
        <StatCard label="Available" value={formatRwf(w.available_rwf)} hint={`After ${w.reserve_percent}% reserve (${formatRwf(w.reserve_rwf)})`} tone="green" />
        <StatCard label="Max now" value={formatRwf(w.max_now_rwf)} hint={`Per withdrawal ≤ ${formatRwf(w.max_per_withdrawal_rwf)}`} />
        <StatCard label="This week" value={formatRwf(w.withdrawn_this_week_rwf)} hint={`Weekly limit ${formatRwf(w.max_weekly_rwf)}`} />
        <StatCard label="In progress" value={formatRwf(w.processing_rwf)} />
      </div>

      {sweepAmount > 0 && !processing && (
        <p className="mb-3 text-sm rounded-xl bg-violet-50 border border-violet-200 text-violet-800 px-3 py-2">
          <CalendarClock className="w-4 h-4 inline mr-1" />
          Weekly sweep: {formatRwf(sweepAmount)} was ready. The amount is pre-filled below.
        </p>
      )}

      {processing ? (
        <ProcessingWithdrawal withdrawal={processing} onChanged={onChanged} />
      ) : blockers.length > 0 ? (
        <ul className="space-y-1.5">
          {blockers.map((blocker) => (
            <li key={blocker.code} className="flex items-start gap-2 text-sm text-amber-800">
              <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {blocker.message}
            </li>
          ))}
        </ul>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Amount (RWF)">
            <div className="flex gap-2">
              <Input type="number" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0" />
              <Button variant="secondary" onClick={() => setAmount(String(w.max_now_rwf))}>Max</Button>
            </div>
          </Field>
          <Field label="To company account">
            <Select value={destinationId} onChange={(event) => setDestinationId(event.target.value)}>
              {readyDestinations.map((d) => (
                <option key={d.id} value={d.id}>{d.label} · {d.provider} {d.account_number}</option>
              ))}
            </Select>
          </Field>
          <div className="md:col-span-2">
            <ActionCodeField purpose="platform_withdrawal" value={code} onChange={setCode} />
          </div>
          <div className="md:col-span-2 flex items-center gap-3">
            <Button size="lg" onClick={() => request.mutate()} disabled={request.isPending || invalid || code.length !== 6 || !destinationId}>
              {request.isPending ? 'Requesting…' : `Request withdrawal${numeric > 0 ? ` of ${formatRwf(numeric)}` : ''}`}
            </Button>
            {amount && invalid && <span className="text-[11px] text-red-600">Enter a whole amount up to {formatRwf(w.max_now_rwf)}.</span>}
          </div>
          {request.isError && <div className="md:col-span-2"><ErrorNote error={request.error} /></div>}
        </div>
      )}
    </Card>
  );
}

function ProcessingWithdrawal({ withdrawal, onChanged }) {
  const [reference, setReference] = useState('');
  const [reason, setReason] = useState('');
  const complete = useMutation({
    mutationFn: () => adminApi.ownerCompleteWithdrawal(withdrawal.id, { reference }),
    onSuccess: onChanged,
  });
  const cancel = useMutation({
    mutationFn: () => adminApi.ownerCancelWithdrawal(withdrawal.id, { reason }),
    onSuccess: onChanged,
  });
  const d = withdrawal.destination || {};
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-3">
      <p className="text-sm text-stone-700">
        <strong className="text-gray-900">{withdrawal.source === 'auto' ? 'Automatic withdrawal: ' : 'Step 2: '}</strong> transfer <strong className="text-gray-900">{formatRwf(withdrawal.amount_rwf)}</strong> to{' '}
        <strong className="text-gray-900">{d.label}</strong> ({d.provider} · {d.account_name} · {d.account_number}) from the platform account, then confirm it here.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Transfer reference">
          <Input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Bank / MoMo transaction ID" />
        </Field>
        <div className="flex items-end">
          <Button onClick={() => complete.mutate()} disabled={complete.isPending || reference.trim().length < 3}>
            {complete.isPending ? 'Saving…' : 'I transferred it: confirm'}
          </Button>
        </div>
        <Field label="Or cancel (reason)">
          <Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="e.g. Bank closed" />
        </Field>
        <div className="flex items-end">
          <Button variant="secondary" onClick={() => cancel.mutate()} disabled={cancel.isPending}>Cancel withdrawal</Button>
        </div>
      </div>
      {complete.isError && <ErrorNote error={complete.error} />}
      {cancel.isError && <ErrorNote error={cancel.error} />}
    </div>
  );
}

function HistoryCard({ withdrawals }) {
  return (
    <Card title="Withdrawal history">
      {withdrawals.length === 0 ? (
        <p className="text-sm text-stone-500 py-4 text-center">No withdrawals yet.</p>
      ) : (
        <Table columns={[{ key: 'amount', label: 'Amount' }, { key: 'to', label: 'To' }, { key: 'status', label: 'Status' }, { key: 'ref', label: 'Reference' }, { key: 'date', label: 'Requested' }]}>
          {withdrawals.map((entry) => (
            <tr key={entry.id}>
              <td className="px-4 py-3 font-bold text-gray-900">{formatRwf(entry.amount_rwf)}</td>
              <td className="px-4 py-3 text-stone-600">{entry.destination?.label} · {entry.destination?.account_number}</td>
              <td className="px-4 py-3">
                <StatusBadge status={entry.status} />
                {entry.source === 'weekly_sweep' && <Badge tone="violet" className="ml-1">Sweep</Badge>}
                {entry.source === 'auto' && <Badge tone="violet" className="ml-1">Automatic</Badge>}
              </td>
              <td className="px-4 py-3 text-xs text-stone-500">{entry.reference || entry.failure_reason || '—'}</td>
              <td className="px-4 py-3 text-xs text-stone-500">{formatDate(entry.created_at)}</td>
            </tr>
          ))}
        </Table>
      )}
    </Card>
  );
}

function DestinationsCard({ destinations, onChanged }) {
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState(null);
  return (
    <Card
      title="Company payout accounts"
      description="Withdrawals can only go to these. New accounts unlock after a waiting period."
      action={<Button size="sm" onClick={() => setAdding(true)}><Plus className="w-3.5 h-3.5" /> Add</Button>}
    >
      {destinations.length === 0 ? (
        <p className="text-sm text-stone-500">No payout account yet. Add the company's bank account.</p>
      ) : (
        <ul className="space-y-2">
          {destinations.map((d) => (
            <li key={d.id} className="flex items-start gap-3 rounded-xl border border-stone-200 p-3">
              <Landmark className="w-5 h-5 text-stone-500 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-gray-900">{d.label}</p>
                <p className="text-[11px] text-stone-500">{d.provider} · {d.account_name} · {d.account_number}</p>
                {d.ready ? <Badge tone="green">Ready</Badge> : <Badge tone="amber">Unlocks {formatDate(d.activates_at)}</Badge>}
              </div>
              <Button size="sm" variant="ghost" onClick={() => setRemoving(d)}>Remove</Button>
            </li>
          ))}
        </ul>
      )}
      <AddDestinationModal open={adding} onClose={() => setAdding(false)} onDone={onChanged} />
      <RemoveDestinationModal destination={removing} onClose={() => setRemoving(null)} onDone={onChanged} />
    </Card>
  );
}

function AddDestinationModal({ open, onClose, onDone }) {
  const [form, setForm] = useState(EMPTY_DEST);
  const [code, setCode] = useState('');
  useEffect(() => { if (open) { setForm(EMPTY_DEST); setCode(''); } }, [open]);
  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));
  const mutation = useMutation({
    mutationFn: () => adminApi.ownerAddDestination({ ...form, otp_code: code }),
    onSuccess: () => { onDone(); onClose(); },
  });
  const accountNumberInvalid = form.type === 'mobile_money' && Boolean(form.account_number) && !isValidRwandaPhone(form.account_number);
  const complete = form.label && form.provider && form.account_name && form.account_number && !accountNumberInvalid && code.length === 6;
  return (
    <Modal
      open={open}
      title="Add company payout account"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !complete}>{mutation.isPending ? 'Adding…' : 'Add account'}</Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-stone-600">
          Use a <strong>company</strong> account, not a personal one. For your security it can receive withdrawals only after the waiting period, and you get an SMS alert.
        </p>
        <Field label="Type">
          <Select value={form.type} onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value, account_number: '' }))}>
            <option value="bank">Bank account</option>
            <option value="mobile_money">Business mobile money</option>
          </Select>
        </Field>
        <Field label="Name for this account"><Input value={form.label} onChange={set('label')} placeholder="e.g. Company BK account" /></Field>
        <Field label={form.type === 'bank' ? 'Bank' : 'Network'}><Input value={form.provider} onChange={set('provider')} placeholder={form.type === 'bank' ? 'e.g. Bank of Kigali' : 'e.g. MTN Mobile Money'} /></Field>
        <Field label="Account holder name"><Input value={form.account_name} onChange={set('account_name')} placeholder="e.g. KitchenLink Ltd" /></Field>
        <Field
          label={form.type === 'bank' ? 'Account number' : 'Phone number'}
          hint={accountNumberInvalid ? <span className="text-red-500 font-semibold">{PHONE_ERROR}</span> : null}
        >
          <Input
            inputMode={form.type === 'bank' ? 'numeric' : 'tel'}
            maxLength={form.type === 'bank' ? 20 : PHONE_MAX_LENGTH}
            value={form.account_number}
            onChange={(event) => {
              const value = event.target.value;
              setForm((prev) => ({
                ...prev,
                account_number: prev.type === 'bank' ? value.replace(/\D/g, '').slice(0, 20) : sanitizePhoneInput(value),
              }));
            }}
            placeholder={form.type === 'bank' ? 'Digits only' : PHONE_PLACEHOLDER}
          />
        </Field>
        <ActionCodeField purpose="payout_destination" value={code} onChange={setCode} />
        {mutation.isError && <ErrorNote error={mutation.error} />}
      </div>
    </Modal>
  );
}

function RemoveDestinationModal({ destination, onClose, onDone }) {
  const [code, setCode] = useState('');
  useEffect(() => { setCode(''); }, [destination]);
  const mutation = useMutation({
    mutationFn: () => adminApi.ownerRemoveDestination(destination.id, { otp_code: code }),
    onSuccess: () => { onDone(); onClose(); },
  });
  return (
    <Modal
      open={Boolean(destination)}
      title={`Remove ${destination?.label || 'account'}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Keep it</Button>
          <Button variant="danger" onClick={() => mutation.mutate()} disabled={mutation.isPending || code.length !== 6}>Remove</Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-stone-600">Withdrawals can no longer go to this account. Adding it back starts a new waiting period.</p>
        <ActionCodeField purpose="remove_destination" value={code} onChange={setCode} />
        {mutation.isError && <ErrorNote error={mutation.error} />}
      </div>
    </Modal>
  );
}

const formFromSettings = (settings) => {
  const account = settings?.account;
  const isPhone = settings?.method === 'mobile_money';
  return {
    method: settings?.method || 'bank',
    bank_name: !isPhone && account ? account.provider : '',
    network: isPhone && account ? account.provider : 'MTN Mobile Money',
    account_name: account?.account_name || '',
    account_number: !isPhone && account ? account.account_number : '',
    phone: isPhone && account ? account.account_number : '',
    schedule: {
      mode: settings?.schedule?.mode || 'reminder',
      frequency: settings?.schedule?.frequency || 'weekly',
      weekday: settings?.schedule?.weekday ?? 5,
      day_of_month: settings?.schedule?.day_of_month ?? 1,
      hour: settings?.schedule?.hour ?? 9,
      amount_mode: settings?.schedule?.amount_mode || 'all_available',
      fixed_amount_rwf: settings?.schedule?.fixed_amount_rwf || '',
    },
  };
};

/**
 * Where your commission goes (a bank account or a mobile money number) and
 * when it is withdrawn. Saved with an SMS code; the system remembers it.
 */
function PayoutSettingsCard({ settings, sweep, onChanged }) {
  const saved = formFromSettings(settings);
  const [form, setForm] = useState(saved);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  // Re-sync when the saved settings change (after a save or a reload).
  useEffect(() => { setForm(formFromSettings(settings)); }, [settings]);

  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));
  const setSchedule = (key, numeric = false) => (event) =>
    setForm((prev) => ({ ...prev, schedule: { ...prev.schedule, [key]: numeric ? Number(event.target.value) : event.target.value } }));

  const mutation = useMutation({
    mutationFn: () =>
      adminApi.ownerSavePayoutSettings({
        ...form,
        schedule: { ...form.schedule, fixed_amount_rwf: Number(form.schedule.fixed_amount_rwf) || 0 },
        otp_code: code,
      }),
    onSuccess: (result) => {
      setCode('');
      setMessage(
        result.account_changed
          ? 'Saved. Your new payout account unlocks after the waiting period. You will get an SMS.'
          : 'Saved.'
      );
      onChanged();
    },
  });

  const isBank = form.method === 'bank';
  const schedule = form.schedule;
  const account = settings?.account;
  const provider = settings?.provider;
  const accountComplete = isBank
    ? form.bank_name.trim() && form.account_name.trim() && /^[\d\s-]{6,}$/.test(form.account_number)
    : form.account_name.trim() && isValidRwandaPhone(form.phone);

  return (
    <Card
      title="Payout settings"
      description="Where your commission goes and when it is withdrawn."
      action={dirty ? <Badge tone="amber">Unsaved changes</Badge> : settings?.method ? <Badge tone="green">Saved</Badge> : null}
    >
      <div className="space-y-3">
        {account && (
          <div className="rounded-xl bg-stone-50 border border-stone-200 p-3 text-xs text-stone-600">
            <p className="font-bold text-gray-900">{account.provider} · {account.account_number}</p>
            <p>{account.account_name}</p>
            {account.ready ? <Badge tone="green" className="mt-1">Ready</Badge> : <Badge tone="amber" className="mt-1">Unlocks {formatDate(account.activates_at)}</Badge>}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Payout method">
          {[
            ['bank', 'Bank account'],
            ['mobile_money', 'Phone number (MoMo)'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={form.method === value}
              onClick={() => setForm((prev) => ({ ...prev, method: value }))}
              className={`px-3 py-2 rounded-xl border text-xs font-bold transition ${
                form.method === value ? 'border-[#542813] bg-[#faf6f2] text-[#3d1b0c]' : 'border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {isBank ? (
          <>
            <Field label="Bank"><Input value={form.bank_name} onChange={set('bank_name')} placeholder="e.g. Bank of Kigali" /></Field>
            <Field label="Account holder name"><Input value={form.account_name} onChange={set('account_name')} placeholder="e.g. KitchenLink Ltd" /></Field>
            <Field label="Bank account number"><Input inputMode="numeric" maxLength={20} value={form.account_number} onChange={(event) => setForm((prev) => ({ ...prev, account_number: event.target.value.replace(/\D/g, '').slice(0, 20) }))} placeholder="Digits only" /></Field>
          </>
        ) : (
          <>
            <Field label="Network">
              <Select value={form.network} onChange={set('network')}>
                <option>MTN Mobile Money</option>
                <option>Airtel Money</option>
              </Select>
            </Field>
            <Field label="Registered name"><Input value={form.account_name} onChange={set('account_name')} placeholder="Name on the MoMo account" /></Field>
            <Field
              label="Phone number"
              hint={form.phone && !isValidRwandaPhone(form.phone) ? <span className="text-red-500 font-semibold">{PHONE_ERROR}</span> : null}
            >
              <Input
                type="tel"
                inputMode="tel"
                maxLength={PHONE_MAX_LENGTH}
                value={form.phone}
                onChange={(event) => setForm((prev) => ({ ...prev, phone: sanitizePhoneInput(event.target.value) }))}
                placeholder={PHONE_PLACEHOLDER}
              />
            </Field>
          </>
        )}

        <Field label="Withdraw">
          <Select value={schedule.mode} onChange={setSchedule('mode')}>
            <option value="auto">Automatically, on schedule</option>
            <option value="reminder">Remind me only</option>
            <option value="off">Off</option>
          </Select>
        </Field>
        {schedule.mode !== 'off' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-2">
              <Field label="How often">
                <Select value={schedule.frequency} onChange={setSchedule('frequency')}>
                  <option value="weekly">Every week</option>
                  <option value="monthly">Every month</option>
                </Select>
              </Field>
              {schedule.frequency === 'weekly' ? (
                <Field label="Day">
                  <Select value={schedule.weekday} onChange={setSchedule('weekday', true)}>
                    {WEEKDAYS.map((day, index) => <option key={day} value={index}>{day}</option>)}
                  </Select>
                </Field>
              ) : (
                <Field label="Day of month">
                  <Select value={schedule.day_of_month} onChange={setSchedule('day_of_month', true)}>
                    {Array.from({ length: 28 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
                  </Select>
                </Field>
              )}
            </div>
            <Field label="Time (Kigali)">
              <Select value={schedule.hour} onChange={setSchedule('hour', true)}>
                {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
              </Select>
            </Field>
            {schedule.mode === 'auto' && (
              <>
                <Field label="Amount">
                  <Select value={schedule.amount_mode} onChange={setSchedule('amount_mode')}>
                    <option value="all_available">Everything available</option>
                    <option value="fixed">A fixed amount</option>
                  </Select>
                </Field>
                {schedule.amount_mode === 'fixed' && (
                  <Field label="Fixed amount (RWF)">
                    <Input type="number" value={schedule.fixed_amount_rwf} onChange={setSchedule('fixed_amount_rwf')} />
                  </Field>
                )}
                <p className="text-[11px] text-stone-500 leading-snug">
                  {provider?.automatic
                    ? `Withdrawals are sent automatically by ${provider.label}.`
                    : 'No payout service is connected yet: on schedule the system creates the withdrawal and texts you to transfer it and confirm with the reference. Once a payout service is connected, the money moves by itself.'}
                </p>
              </>
            )}
          </>
        )}

        <ActionCodeField purpose="payout_settings" value={code} onChange={setCode} />
        <Button onClick={() => { setMessage(''); mutation.mutate(); }} disabled={mutation.isPending || !accountComplete || code.length !== 6}>
          {mutation.isPending ? 'Saving…' : 'Save changes'}
        </Button>
        {mutation.isError && <ErrorNote error={mutation.error} />}
        {message && <p className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">{message}</p>}
        {sweep?.last_at && (
          <p className="text-[11px] text-stone-400 flex items-center gap-1">
            <CalendarClock className="w-3.5 h-3.5" />
            Last scheduled run {formatDate(sweep.last_at)}{sweep.last_amount_rwf ? ` · ${formatRwf(sweep.last_amount_rwf)}` : ''}
          </p>
        )}
      </div>
    </Card>
  );
}

function ReconciliationCard({ books, checks, onChanged }) {
  const [form, setForm] = useState({ account_label: 'Platform collection account', statement_date: new Date().toISOString().slice(0, 10), statement_balance_rwf: '', note: '' });
  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));
  const mutation = useMutation({
    mutationFn: () => adminApi.ownerReconciliation({ ...form, statement_balance_rwf: Number(form.statement_balance_rwf) }),
    onSuccess: () => { setForm((prev) => ({ ...prev, statement_balance_rwf: '', note: '' })); onChanged(); },
  });
  return (
    <Card title="Monthly reconciliation" description={`Compare the real bank / MoMo statement with the ${formatRwf(books.cash_balance_rwf)} the books say should be there.`}>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
        <Field label="Account"><Input value={form.account_label} onChange={set('account_label')} /></Field>
        <Field label="Statement date"><Input type="date" value={form.statement_date} onChange={set('statement_date')} /></Field>
        <Field label="Statement balance (RWF)"><Input type="number" value={form.statement_balance_rwf} onChange={set('statement_balance_rwf')} /></Field>
        <Field label="Note"><Input value={form.note} onChange={set('note')} placeholder="optional" /></Field>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || form.statement_balance_rwf === '' || !Number.isInteger(Number(form.statement_balance_rwf))}>
          <Scale className="w-4 h-4" /> Check
        </Button>
      </div>
      {mutation.isError && <div className="mt-3"><ErrorNote error={mutation.error} /></div>}
      {checks.length > 0 && (
        <div className="mt-4">
          <Table columns={[{ key: 'date', label: 'Statement' }, { key: 'acct', label: 'Account' }, { key: 'stmt', label: 'Statement balance' }, { key: 'sys', label: 'Books' }, { key: 'diff', label: 'Result' }]}>
            {checks.map((check) => (
              <tr key={check.id}>
                <td className="px-4 py-3 text-xs text-stone-500">{formatDate(check.statement_date)}</td>
                <td className="px-4 py-3 text-stone-600">{check.account_label}</td>
                <td className="px-4 py-3 font-bold text-gray-900">{formatRwf(check.statement_balance_rwf)}</td>
                <td className="px-4 py-3 text-stone-600">{formatRwf(check.system_cash_rwf)}</td>
                <td className="px-4 py-3">
                  {check.matches ? <Badge tone="green">Matches</Badge> : <Badge tone="red">{check.difference_rwf > 0 ? '+' : ''}{formatRwf(check.difference_rwf)}</Badge>}
                </td>
              </tr>
            ))}
          </Table>
        </div>
      )}
    </Card>
  );
}
