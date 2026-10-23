import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Building2, CheckCircle2, Pencil, Smartphone, X } from 'lucide-react';
import {
  PHONE_MAX_LENGTH,
  PHONE_PLACEHOLDER,
  formatNameInput,
  isValidRwandaPhone,
  sanitizePhoneInput,
  toLocalRwandaPhone,
} from '../../utils/validation';
import { fetchBanks } from '../../api/endpoints';

export const PAYOUT_METHODS = [
  { id: 'MTN Mobile Money', kind: 'momo', network: 'mtn', hint: '078 / 079', icon: Smartphone },
  { id: 'Airtel Money', kind: 'momo', network: 'airtel', hint: '072 / 073', icon: Smartphone },
  { id: 'Bank Transfer', kind: 'bank', hint: 'Any bank in Rwanda', icon: Building2 },
];

// Used if the bank list can't be loaded: any bank, 6–30 digits.
const GENERAL_LENGTH = { min: 6, max: 30, exact: false };

/** Banks and their account-number lengths, as set by admins (GET /banks). */
function useBanks(enabled) {
  const [data, setData] = useState({ banks: [], general: GENERAL_LENGTH });
  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    fetchBanks()
      .then((result) => {
        if (!cancelled) setData({ banks: result?.banks ?? [], general: { ...GENERAL_LENGTH, ...(result?.general ?? {}) } });
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, [enabled]);
  return data;
}

const lengthText = ({ min, max, exact }) => (exact ? `${min} digits` : `${min}–${max} digits`);

const NETWORK_LABEL = { mtn: 'MTN', airtel: 'Airtel' };
const networkOf = (phone) => {
  const local = toLocalRwandaPhone(phone);
  if (/^07[89]/.test(local)) return 'mtn';
  if (/^07[23]/.test(local)) return 'airtel';
  return null;
};
const pretty = (phone) => {
  const local = toLocalRwandaPhone(phone);
  return local.length === 10 ? `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}` : phone;
};

/** An empty choice: mobile money (MTN) to the registered number, not yet confirmed. */
export const emptyPayoutDestination = () => ({
  method: PAYOUT_METHODS[0].id,
  phone: '',
  phoneConfirmed: false,
  bank: null,
});

/** Whether the choice is complete enough to withdraw. */
export function payoutDestinationReady(value) {
  const method = PAYOUT_METHODS.find((option) => option.id === value.method);
  if (!method) return false;
  if (method.kind === 'bank') return Boolean(value.bank?.bank_name && value.bank?.account_number && value.bank?.account_name);
  return value.phoneConfirmed && isValidRwandaPhone(value.phone) && networkOf(value.phone) === method.network;
}

/** The request fields for the withdrawal API. */
export function payoutDestinationPayload(value) {
  const method = PAYOUT_METHODS.find((option) => option.id === value.method);
  if (method?.kind === 'bank') return { method: value.method, ...value.bank };
  return { method: value.method, phone: toLocalRwandaPhone(value.phone) };
}

/** "MTN Mobile Money 0788 123 456" / "Bank of Kigali account 0004…" for confirmations. */
export function payoutDestinationText(value) {
  const method = PAYOUT_METHODS.find((option) => option.id === value.method);
  if (method?.kind === 'bank' && value.bank) return `${value.bank.bank_name} account ${value.bank.account_number} (${value.bank.account_name})`;
  return `${value.method} ${pretty(value.phone)}`;
}

const THEMES = {
  brown: {
    active: 'border-[#542813] bg-[#faf6f2] text-[#3d1b0c]',
    icon: 'text-[#8a5332]',
    check: 'text-[#542813]',
    focus: 'focus:border-[#542813]',
    button: 'bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] text-white',
  },
  moss: {
    active: 'border-[#3b5327] bg-emerald-50/60 text-[#1c2b12]',
    icon: 'text-[#3b5327]',
    check: 'text-[#3b5327]',
    focus: 'focus:border-[#3b5327]',
    button: 'bg-gradient-to-r from-[#1c2b12] to-[#12200b] text-white',
  },
};

/**
 * Where a withdrawal is paid. Mobile money suggests the phone the account
 * registered with and asks the person to confirm it (or enter another number
 * on the same network); a bank transfer opens a popup for the bank details.
 *
 * `value`/`onChange` hold { method, phone, phoneConfirmed, bank }.
 */
export default function PayoutDestinationPicker({ value, onChange, registeredPhone = '', defaultName = '', theme = 'brown' }) {
  const t = THEMES[theme] || THEMES.brown;
  const method = PAYOUT_METHODS.find((option) => option.id === value.method) || PAYOUT_METHODS[0];
  const registeredNetwork = networkOf(registeredPhone);
  const registeredFits = Boolean(registeredPhone) && registeredNetwork === method.network;
  const [editingPhone, setEditingPhone] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);

  const set = (patch) => onChange({ ...value, ...patch });

  // Picking a mobile money method suggests the registered number (if it is on that network).
  useEffect(() => {
    if (method.kind !== 'momo') return;
    if (registeredFits && !value.phone) set({ phone: toLocalRwandaPhone(registeredPhone), phoneConfirmed: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method.id, registeredPhone]);

  const choose = (option) => {
    setEditingPhone(false);
    if (option.kind === 'bank') {
      onChange({ ...value, method: option.id });
      setBankOpen(true);
      return;
    }
    const fits = networkOf(registeredPhone) === option.network;
    onChange({
      ...value,
      method: option.id,
      phone: fits ? toLocalRwandaPhone(registeredPhone) : '',
      phoneConfirmed: false,
    });
  };

  const typedNetwork = networkOf(value.phone);
  const phoneError =
    value.phone && !isValidRwandaPhone(value.phone)
      ? 'Enter a valid number, e.g. 0788123456.'
      : value.phone && typedNetwork && typedNetwork !== method.network
        ? `That is an ${NETWORK_LABEL[typedNetwork]} number. Enter your ${NETWORK_LABEL[method.network]} number (${method.hint}).`
        : '';
  const usingRegistered = registeredFits && toLocalRwandaPhone(value.phone) === toLocalRwandaPhone(registeredPhone);

  return (
    <div className="space-y-3">
      <div>
        <span className="text-xs font-bold text-stone-500 block mb-1.5">Payout method</span>
        <div className="space-y-2">
          {PAYOUT_METHODS.map((option) => {
            const Icon = option.icon;
            const active = option.id === method.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => choose(option)}
                aria-pressed={active}
                className={clsx(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-xs font-bold transition',
                  active ? t.active : 'border-stone-200 text-stone-600 hover:bg-stone-50',
                )}
              >
                <Icon className={clsx('w-4 h-4', t.icon)} />
                {option.id}
                <span className="text-[10px] font-medium text-stone-400">{option.hint}</span>
                {active && <CheckCircle2 className={clsx('w-4 h-4 ml-auto', t.check)} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile money: confirm the registered number, or enter another one */}
      {method.kind === 'momo' && (
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3 space-y-2.5">
          {value.phoneConfirmed && !phoneError ? (
            <div className="flex items-start gap-2">
              <CheckCircle2 className={clsx('w-4 h-4 mt-0.5 flex-shrink-0', t.check)} />
              <div className="min-w-0 flex-1 text-xs">
                <p className="font-bold text-gray-900">Money goes to {pretty(value.phone)}</p>
                <p className="text-stone-500">{usingRegistered ? 'Your registered number' : `${method.id} number you entered`}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  set({ phoneConfirmed: false });
                  setEditingPhone(true);
                }}
                className="text-[11px] font-bold text-stone-600 hover:underline inline-flex items-center gap-1"
              >
                <Pencil className="w-3 h-3" /> Change
              </button>
            </div>
          ) : registeredFits && !editingPhone ? (
            <>
              <p className="text-xs text-stone-600">
                Send the money to the number you registered with?
              </p>
              <p className="text-base font-black text-gray-900 tracking-wide">{pretty(registeredPhone)}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => set({ phone: toLocalRwandaPhone(registeredPhone), phoneConfirmed: true })}
                  className={clsx('px-3.5 py-2 rounded-xl text-xs font-bold', t.button)}
                >
                  Yes, use this number
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingPhone(true);
                    set({ phone: '', phoneConfirmed: false });
                  }}
                  className="px-3.5 py-2 rounded-xl border border-stone-200 bg-white text-xs font-bold text-stone-700 hover:bg-stone-100"
                >
                  Use another number
                </button>
              </div>
            </>
          ) : (
            <>
              <label htmlFor="payout-phone" className="text-xs text-stone-600 block">
                {registeredPhone && !registeredFits && !editingPhone
                  ? `Your registered number ${pretty(registeredPhone)} is not ${NETWORK_LABEL[method.network]}. Enter your ${method.id} number:`
                  : `Enter the ${method.id} number to send the money to:`}
              </label>
              <input
                id="payout-phone"
                type="tel"
                inputMode="tel"
                maxLength={PHONE_MAX_LENGTH}
                value={value.phone}
                onChange={(event) => set({ phone: sanitizePhoneInput(event.target.value), phoneConfirmed: false })}
                placeholder={method.network === 'airtel' ? '073XXXXXXX' : PHONE_PLACEHOLDER}
                className={clsx(
                  'w-full text-sm p-3 rounded-xl border outline-none transition bg-white',
                  phoneError ? 'border-red-300 focus:border-red-400' : clsx('border-stone-200', t.focus),
                )}
              />
              {phoneError && <p className="text-[11px] text-red-500 font-semibold">{phoneError}</p>}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!value.phone || Boolean(phoneError)}
                  onClick={() => {
                    set({ phoneConfirmed: true });
                    setEditingPhone(false);
                  }}
                  className={clsx('px-3.5 py-2 rounded-xl text-xs font-bold disabled:opacity-50', t.button)}
                >
                  Confirm this number
                </button>
                {registeredFits && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPhone(false);
                      set({ phone: toLocalRwandaPhone(registeredPhone), phoneConfirmed: false });
                    }}
                    className="px-3.5 py-2 rounded-xl border border-stone-200 bg-white text-xs font-bold text-stone-700 hover:bg-stone-100"
                  >
                    Use my registered number
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Bank: the details entered in the popup */}
      {method.kind === 'bank' && (
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3">
          {value.bank ? (
            <div className="flex items-start gap-2">
              <CheckCircle2 className={clsx('w-4 h-4 mt-0.5 flex-shrink-0', t.check)} />
              <div className="min-w-0 flex-1 text-xs">
                <p className="font-bold text-gray-900">{value.bank.bank_name}</p>
                <p className="text-stone-600 font-mono">{value.bank.account_number}</p>
                <p className="text-stone-500">{value.bank.account_name}</p>
              </div>
              <button type="button" onClick={() => setBankOpen(true)} className="text-[11px] font-bold text-stone-600 hover:underline inline-flex items-center gap-1">
                <Pencil className="w-3 h-3" /> Edit
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-stone-600">Add the bank account the money should be sent to.</p>
              <button type="button" onClick={() => setBankOpen(true)} className={clsx('px-3.5 py-2 rounded-xl text-xs font-bold flex-shrink-0', t.button)}>
                Add bank details
              </button>
            </div>
          )}
        </div>
      )}

      <BankDetailsModal
        open={bankOpen}
        initial={value.bank}
        defaultName={defaultName}
        theme={t}
        onClose={() => setBankOpen(false)}
        onSave={(bank) => {
          set({ bank });
          setBankOpen(false);
        }}
      />
    </div>
  );
}

function BankDetailsModal({ open, initial, defaultName, theme, onClose, onSave }) {
  const [bankChoice, setBankChoice] = useState('');
  const [otherBank, setOtherBank] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [error, setError] = useState('');
  const { banks, general } = useBanks(open);
  const bankNames = banks.map((bank) => bank.name);
  const selectedName = bankChoice === 'other' ? otherBank.trim() : bankChoice;
  // The chosen bank's account-number length; "other" banks use the general rule.
  const rule = banks.find((bank) => bank.name === selectedName) || general;
  const digits = accountNumber.replace(/\D/g, '');
  const lengthOk = digits.length >= rule.min && digits.length <= rule.max;

  useEffect(() => {
    if (!open) return;
    const known = initial?.bank_name && bankNames.includes(initial.bank_name);
    setBankChoice(initial?.bank_name ? (known ? initial.bank_name : 'other') : '');
    setOtherBank(initial?.bank_name && !known ? initial.bank_name : '');
    setAccountName(initial?.account_name || defaultName || '');
    setAccountNumber(initial?.account_number || '');
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial, defaultName, banks.length]);

  // Switching to a bank with shorter account numbers trims what was typed.
  useEffect(() => {
    if (accountNumber.length > rule.max) setAccountNumber(accountNumber.slice(0, rule.max));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rule.max]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const save = (event) => {
    event.preventDefault();
    const bankName = selectedName;
    if (bankName.length < 2) return setError('Choose your bank.');
    if (accountName.trim().length < 2) return setError('Enter the name on the bank account.');
    if (!lengthOk) {
      return setError(`${bankName} account numbers have ${lengthText(rule)}. You entered ${digits.length}.`);
    }
    onSave({ bank_name: bankName, account_name: accountName.trim(), account_number: digits });
    return undefined;
  };

  const field = clsx('w-full text-sm p-3 rounded-xl border border-stone-200 outline-none bg-white', theme.focus);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <form onSubmit={save} role="dialog" aria-modal="true" aria-label="Bank account details" className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-black text-gray-900 flex items-center gap-2">
              <Building2 className={clsx('w-5 h-5', theme.icon)} /> Bank account
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">Enter the account the money should be sent to.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-xl flex items-center justify-center text-stone-500 hover:bg-stone-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <label className="block">
          <span className="text-xs font-bold text-stone-500 block mb-1.5">Bank</span>
          <select value={bankChoice} onChange={(event) => setBankChoice(event.target.value)} className={field}>
            <option value="">Choose your bank…</option>
            {bankNames.map((bank) => (
              <option key={bank} value={bank}>
                {bank}
              </option>
            ))}
            <option value="other">Other bank…</option>
          </select>
        </label>
        {bankChoice === 'other' && (
          <input
            value={otherBank}
            onChange={(event) => setOtherBank(event.target.value.slice(0, 60))}
            placeholder="Bank name"
            className={field}
          />
        )}

        <label className="block">
          <span className="text-xs font-bold text-stone-500 block mb-1.5">Account holder name</span>
          <input
            value={accountName}
            onChange={(event) => setAccountName(formatNameInput(event.target.value).slice(0, 80))}
            placeholder="Name on the account"
            className={field}
          />
        </label>

        <label className="block">
          <span className="flex items-baseline justify-between gap-2 mb-1.5">
            <span className="text-xs font-bold text-stone-500">Account number</span>
            {selectedName && (
              <span className={clsx('text-[11px] font-bold', digits.length === 0 ? 'text-stone-400' : lengthOk ? 'text-emerald-700' : 'text-amber-700')}>
                {rule.exact ? `${digits.length} / ${rule.max} digits` : `${digits.length} digits · ${lengthText(rule)}`}
              </span>
            )}
          </span>
          <input
            value={accountNumber}
            onChange={(event) => setAccountNumber(event.target.value.replace(/\D/g, '').slice(0, rule.max))}
            inputMode="numeric"
            maxLength={rule.max}
            disabled={!selectedName}
            placeholder={selectedName ? (rule.exact ? `${rule.max} digits` : 'Digits only') : 'Choose your bank first'}
            className={clsx(field, 'font-mono tracking-wide disabled:bg-stone-50')}
          />
          {selectedName && (
            <span className="text-[11px] text-stone-400 mt-1 block">
              {rule.exact
                ? `${selectedName} account numbers have exactly ${rule.max} digits. Type them without spaces or dashes.`
                : `Type the full account number without spaces or dashes (${lengthText(rule)}).`}
            </span>
          )}
        </label>

        {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
        <p className="text-[11px] text-stone-400">Check the number carefully — the money is sent to exactly this account.</p>

        <div className="flex gap-2">
          <button type="submit" className={clsx('flex-1 py-3 rounded-xl text-sm font-bold', theme.button)}>
            Save bank details
          </button>
          <button type="button" onClick={onClose} className="px-4 py-3 rounded-xl border border-stone-200 text-sm font-bold text-stone-700 hover:bg-stone-100">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
