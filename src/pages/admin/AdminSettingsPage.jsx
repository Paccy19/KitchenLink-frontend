import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Navigate, useParams } from 'react-router-dom';
import { ShieldCheck, AlertTriangle, Smartphone } from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import { useAdmin } from '../../context/AdminContext';
import ActionCodeField from '../../components/admin-dashboard/ActionCodeField';
import DeliveryTimingCard from '../../components/admin-dashboard/DeliveryTimingCard';
import BankFormatsCard from '../../components/admin-dashboard/BankFormatsCard';
import DeliveryFeesCard from '../../components/admin-dashboard/DeliveryFeesCard';
import DeliveryRulesCard from '../../components/admin-dashboard/DeliveryRulesCard';
import { PHONE_ERROR, PHONE_MAX_LENGTH, PHONE_PLACEHOLDER, isValidRwandaPhone, sanitizePhoneInput } from '../../utils/validation';
import {
  Badge,
  Button,
  Card,
  ErrorNote,
  Field,
  Input,
  PageHeader,
  formatDate,
  toTitle,
} from '../../components/admin-dashboard/ui';

/** Each Settings dropdown option (sidebar) opens one of these. */
const SECTIONS = {
  profile: { label: 'Profile & account security', Body: ProfileSection },
  rules: { label: 'Delivery & pickup rules', Body: DeliveryRulesCard },
  'bank-accounts': { label: 'Bank account numbers', Body: BankFormatsCard },
  'delivery-fees': { label: 'Delivery fee by distance', Body: DeliveryFeesCard },
  'delivery-timing': { label: 'Delivery timing', Body: DeliveryTimingCard },
};

export default function AdminSettingsPage() {
  const { section } = useParams();
  const current = SECTIONS[section];
  if (!current) return <Navigate to="/admin-dashboard/settings/profile" replace />;
  const { label, Body } = current;

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" description={label} />
      <Body />
    </div>
  );
}

function ProfileSection() {
  const { admin, refreshProfile } = useAdmin();
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      adminApi.changePassword({
        current_password: form.current_password,
        new_password: form.new_password,
      }),
    onSuccess: () => {
      setDone(true);
      setForm({ current_password: '', new_password: '', confirm: '' });
      refreshProfile().catch(() => null);
    },
  });

  const submit = () => {
    setDone(false);
    if (form.new_password.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (form.new_password !== form.confirm) {
      setError('New passwords do not match.');
      return;
    }
    setError('');
    mutation.mutate();
  };

  return (
    <div className="space-y-5">
      {admin?.uses_default_password && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>
            You are still using the <strong>default admin password</strong>. Anyone who knows it can sign in.
            Change it below; moving platform money stays blocked until you do.
          </span>
        </div>
      )}

      <Card title="Profile">
        <div className="flex items-center gap-4">
          <span className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#111827] via-[#1f2937] to-[#0b1220] flex items-center justify-center">
            <ShieldCheck className="w-7 h-7 text-white" />
          </span>
          <div>
            <p className="text-lg font-black text-gray-900">{admin?.name}</p>
            <p className="text-sm text-stone-500">{admin?.email}</p>
            <div className="mt-1.5 flex items-center gap-2">
              <Badge tone="violet">{toTitle(admin?.role)}</Badge>
              <Badge tone={admin?.is_active ? 'green' : 'red'}>
                {admin?.is_active ? 'Active' : 'Disabled'}
              </Badge>
            </div>
          </div>
        </div>
        <p className="mt-4 text-xs text-stone-400">
          Last login: {formatDate(admin?.last_login_at)}
        </p>
        {admin?.permissions?.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-black uppercase tracking-wider text-stone-400 mb-2">Permissions</p>
            <div className="flex flex-wrap gap-1.5">
              {admin.permissions.map((permission) => (
                <Badge key={permission}>{permission}</Badge>
              ))}
            </div>
          </div>
        )}
      </Card>

      <TwoFactorCard admin={admin} onChanged={refreshProfile} />

      <Card title="Change password">
        <div className="max-w-md space-y-4">
          <Field label="Current password">
            <Input
              type="password"
              value={form.current_password}
              onChange={(event) => setForm((prev) => ({ ...prev, current_password: event.target.value }))}
            />
          </Field>
          <Field label="New password" hint="At least 8 characters.">
            <Input
              type="password"
              value={form.new_password}
              onChange={(event) => setForm((prev) => ({ ...prev, new_password: event.target.value }))}
            />
          </Field>
          <Field label="Confirm new password">
            <Input
              type="password"
              value={form.confirm}
              onChange={(event) => setForm((prev) => ({ ...prev, confirm: event.target.value }))}
            />
          </Field>

          {error && <ErrorNote error={error} />}
          {mutation.isError && <ErrorNote error={mutation.error} />}
          {done && (
            <p className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
              Password updated.
            </p>
          )}

          <Button onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending ? 'Updating…' : 'Update password'}
          </Button>
        </div>
      </Card>
    </div>
  );
}

/** Turn SMS codes on (verify a phone) or off (confirmed with a code). */
function TwoFactorCard({ admin, onChanged }) {
  const enabled = Boolean(admin?.two_factor_enabled);
  const [phone, setPhone] = useState(admin?.phone || '');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const run = async (action, success) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await action();
      setCode('');
      setMessage(success);
      await onChanged();
    } catch (err) {
      setError(err?.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="SMS codes (two-step sign-in)">
      <div className="max-w-md space-y-4">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center flex-shrink-0">
            <Smartphone className="w-5 h-5 text-stone-700" />
          </span>
          <p className="text-sm text-stone-600">
            {enabled ? (
              <>Codes go to <strong className="text-gray-900">{admin.phone}</strong>. You need one to sign in and to confirm every money action.</>
            ) : (
              <>
                Get a code on your phone when you sign in and before money actions. <strong>Required</strong>{' '}
                {admin?.is_owner ? 'to withdraw platform commission and manage your team' : 'to send refunds or payouts of 50,000 RWF or more'}.
              </>
            )}
          </p>
          <Badge tone={enabled ? 'green' : 'amber'}>{enabled ? 'On' : 'Off'}</Badge>
        </div>

        {!enabled ? (
          <>
            <Field
              label="Your phone number"
              hint={phone && !isValidRwandaPhone(phone) ? <span className="text-red-500 font-semibold">{PHONE_ERROR}</span> : null}
            >
              <Input
                type="tel"
                inputMode="tel"
                maxLength={PHONE_MAX_LENGTH}
                value={phone}
                onChange={(event) => setPhone(sanitizePhoneInput(event.target.value))}
                placeholder={PHONE_PLACEHOLDER}
              />
            </Field>
            <ActionCodeField
              label="Code sent to that phone"
              value={code}
              onChange={setCode}
              send={() => {
                if (!phone.trim()) throw new Error('Enter your phone number first.');
                if (!isValidRwandaPhone(phone)) throw new Error(PHONE_ERROR);
                return adminApi.startTwoFactor(phone.trim());
              }}
            />
            <Button
              onClick={() => run(() => adminApi.enableTwoFactor(phone.trim(), code), 'SMS codes are on.')}
              disabled={busy || code.length !== 6}
            >
              {busy ? 'Turning on…' : 'Turn on SMS codes'}
            </Button>
          </>
        ) : (
          <>
            <ActionCodeField purpose="disable_2fa" value={code} onChange={setCode} />
            <Button
              variant="danger"
              onClick={() => run(() => adminApi.disableTwoFactor(code), 'SMS codes are off.')}
              disabled={busy || code.length !== 6}
            >
              {busy ? 'Turning off…' : 'Turn off SMS codes'}
            </Button>
          </>
        )}
        {error && <ErrorNote error={error} />}
        {message && (
          <p className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">{message}</p>
        )}
      </div>
    </Card>
  );
}
