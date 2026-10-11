import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import { useAdmin } from '../../context/AdminContext';
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
  const { admin } = useAdmin();
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
