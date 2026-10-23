import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ShieldCheck, AlertTriangle, Smartphone } from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import { useAdmin } from '../../context/AdminContext';
import ActionCodeField from '../../components/admin-dashboard/ActionCodeField';
import Can from '../../components/admin-dashboard/Can';
import DeliveryTimingCard from '../../components/admin-dashboard/DeliveryTimingCard';
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

export default function AdminSettingsPage() {
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
      <PageHeader title="Settings" description="Your admin profile and account security." />

      {admin?.uses_default_password && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>
            You are still using the <strong>default admin password</strong>. Anyone who knows it can sign in.
            Change it below; moving platform money stays blocked until you do.
          </span>
        </div>
      )}

      <TwoFactorCard admin={admin} onChanged={refreshProfile} />

      <Can permission="deliveries:read">
        <DeliveryTimingCard />
      </Can>

      <Can permission="dashboard:read">
        <OperationsRulesCard />
      </Can>

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
/**
 * The delivery, pickup, tracking and SMS rules the platform is running with
 * (from the server configuration; read-only here).
 */
function RuleRow({ label, value, warn = false }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-stone-50 last:border-0">
      <span className="text-sm text-stone-600">{label}</span>
      <span className={`text-sm font-bold text-right ${warn ? 'text-amber-700' : 'text-gray-900'}`}>{value}</span>
    </div>
  );
}

function OperationsRulesCard() {
  const { data: rules, error } = useQuery({
    queryKey: ['admin', 'operations-rules'],
    queryFn: () => adminApi.operationsRules(),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <Card
      title="Delivery & pickup rules"
      description="How orders are dispatched, collected and tracked right now. These come from the server configuration."
    >
      {error ? (
        <ErrorNote error={error} />
      ) : !rules ? (
        <p className="text-sm text-stone-400">Loading…</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-stone-400 mb-1">Dispatch</p>
            <RuleRow label="Delivery workers notified within" value={`${rules.dispatch.radius_km} km of the kitchen`} />
            <RuleRow label="When" value={rules.dispatch.offered_when} />
            <RuleRow label="Their location must be newer than" value={`${rules.dispatch.driver_location_max_age_minutes} min`} />
            <RuleRow label="Open orders re-offered every" value={`${rules.dispatch.rebroadcast_every_seconds} s`} />
            <RuleRow label="Max deliveries at once per worker" value={rules.dispatch.max_active_deliveries_per_driver} />

            <p className="text-xs font-black uppercase tracking-wider text-stone-400 mt-4 mb-1">Pickup clock (delivery workers)</p>
            <RuleRow label="Reminder after" value={`${rules.pickup_clock.warning_after_minutes} min`} />
            <RuleRow label="Counts as late after" value={`${rules.pickup_clock.grace_minutes} min`} />
            <RuleRow
              label="Given to another worker after"
              value={rules.pickup_clock.reassign_after_minutes ? `${rules.pickup_clock.reassign_after_minutes} min` : 'Off'}
            />
            <RuleRow label="Late-pickup charge" value="None" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-stone-400 mb-1">Customer pickup</p>
            <RuleRow label="Delivery fee" value="None" />
            <RuleRow label="Pickup code" value={`${rules.customer_pickup.code_digits} digits, sent when ready`} />
            <RuleRow label="Wrong codes before the order locks" value={rules.customer_pickup.max_wrong_codes} />

            <p className="text-xs font-black uppercase tracking-wider text-stone-400 mt-4 mb-1">Delivery fee</p>
            <RuleRow
              label="Price"
              value={`${rules.fees.base_rwf} RWF + ${rules.fees.per_km_rwf} RWF/km (min ${rules.fees.minimum_rwf} RWF)`}
            />
            <RuleRow label="Share paid to the delivery worker" value={`${rules.fees.driver_share_percent}%`} />

            <p className="text-xs font-black uppercase tracking-wider text-stone-400 mt-4 mb-1">Maps & messages</p>
            <RuleRow label="Routes & live tracking" value={rules.tracking.routes_provider} warn={!rules.tracking.google_key_configured} />
            <RuleRow label="Place search" value={rules.tracking.place_search_provider} />
            <RuleRow label="SMS" value={rules.sms.note} warn={!rules.sms.configured} />
          </div>
        </div>
      )}
    </Card>
  );
}

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
