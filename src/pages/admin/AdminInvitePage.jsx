import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, Store, ArrowRight, Smartphone, CheckCircle2, AlertTriangle } from 'lucide-react';
import { adminApi } from '../../api/adminApi';

/**
 * Opens the emailed invitation link (`/admin-invite?token=…`). The member sets
 * their name, verifies their phone with an SMS code, and chooses their own
 * password. They then sign in normally at `/admin-login`.
 */
export default function AdminInvitePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const inviteQuery = useQuery({
    queryKey: ['admin', 'invitation', token],
    queryFn: () => adminApi.getInvitation(token),
    enabled: Boolean(token),
    retry: false,
  });

  if (!token) {
    return <Shell><Problem message="This link is missing its invitation token. Open the link exactly as it was emailed to you." /></Shell>;
  }
  if (inviteQuery.isLoading) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 text-stone-500 py-8">
          <div className="w-10 h-10 rounded-full border-2 border-stone-200 border-t-[#1f2937] animate-spin" />
          <p className="text-sm font-bold">Checking your invitation…</p>
        </div>
      </Shell>
    );
  }
  if (inviteQuery.error) {
    return <Shell><Problem message={inviteQuery.error.message || 'This invitation link is not valid.'} /></Shell>;
  }

  return <Shell><AcceptForm token={token} invitation={inviteQuery.data.invitation} /></Shell>;
}

function Shell({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f6f8] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#111827] via-[#1f2937] to-[#0b1220] mx-auto flex items-center justify-center shadow-md">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <h1 className="mt-4 text-2xl font-black text-gray-900 tracking-tight">Join the admin team</h1>
        </div>
        {children}
        <div className="mt-4 text-center text-xs font-bold text-stone-500">
          <Link to="/" className="hover:text-[#1f2937] inline-flex items-center gap-1.5">
            <Store className="w-3.5 h-3.5" /> Back to marketplace
          </Link>
        </div>
      </div>
    </div>
  );
}

function Problem({ message }) {
  return (
    <div className="bg-white rounded-3xl border border-stone-200/80 shadow-sm p-6 sm:p-8 text-center space-y-3">
      <AlertTriangle className="w-9 h-9 text-amber-500 mx-auto" />
      <p className="text-sm text-stone-600">{message}</p>
      <p className="text-xs text-stone-400">Ask the owner to send you a new invitation.</p>
      <Link to="/admin-login" className="inline-block text-sm font-bold text-[#1f2937] underline">Go to sign in</Link>
    </div>
  );
}

function AcceptForm({ token, invitation }) {
  const [name, setName] = useState(invitation.name || '');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [devCode, setDevCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="bg-white rounded-3xl border border-stone-200/80 shadow-sm p-6 sm:p-8 text-center space-y-3">
        <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
        <h2 className="text-lg font-black text-gray-900">You're all set</h2>
        <p className="text-sm text-stone-600">
          Your password is saved. Sign in at the admin page with <strong className="text-gray-900">{invitation.email}</strong>. A code will be sent to your phone each time.
        </p>
        <Link
          to="/admin-login"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#111827] via-[#1f2937] to-[#0b1220] text-white font-bold text-sm shadow-md"
        >
          Go to admin sign in <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const sendCode = async () => {
    if (!phone.trim()) {
      setError('Enter your phone number first.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await adminApi.sendInvitationCode(token, phone.trim());
      setCodeSent(true);
      setDevCode(result.dev_otp || '');
    } catch (err) {
      setError(err?.message || 'Could not send the code.');
    } finally {
      setBusy(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (name.trim().length < 2) {
      setError('Enter your full name.');
      return;
    }
    if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      setError('Use at least 8 characters with letters and numbers.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (!codeSent) {
      setError('Request a code to your phone first.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await adminApi.acceptInvitation(token, { name: name.trim(), phone: phone.trim(), password, code });
      setDone(true);
    } catch (err) {
      setError(err?.message || 'Could not finish setting up your account.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-white rounded-3xl border border-stone-200/80 shadow-sm p-6 sm:p-8 space-y-4">
      <div className="rounded-2xl bg-stone-100 border border-stone-200 p-3 text-sm">
        <p className="text-stone-500 text-[11px] font-bold uppercase tracking-wider">You were invited as</p>
        <p className="font-black text-gray-900">{invitation.role_label}</p>
        <p className="text-[11px] text-stone-500 mt-0.5 leading-snug">{invitation.role_description}</p>
        <p className="text-[11px] text-stone-400 mt-1">for {invitation.email}</p>
      </div>

      <label className="block">
        <span className="text-xs font-bold text-stone-500 block mb-1.5">Full name</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Aline Uwase"
          className="w-full px-3 py-3 text-sm rounded-xl border border-stone-200 focus:border-[#1f2937] focus:ring-2 focus:ring-[#1f2937]/10 outline-none"
        />
      </label>

      <label className="block">
        <span className="text-xs font-bold text-stone-500 block mb-1.5">Phone number (for sign-in codes)</span>
        <div className="flex gap-2">
          <input
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="0788123456"
            className="flex-1 px-3 py-3 text-sm rounded-xl border border-stone-200 focus:border-[#1f2937] focus:ring-2 focus:ring-[#1f2937]/10 outline-none"
          />
          <button
            type="button"
            onClick={sendCode}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold text-stone-700 hover:bg-stone-50 disabled:opacity-60 whitespace-nowrap"
          >
            <Smartphone className="w-4 h-4" />
            {codeSent ? 'Resend' : 'Send code'}
          </button>
        </div>
      </label>

      {codeSent && (
        <label className="block">
          <span className="text-xs font-bold text-stone-500 block mb-1.5">Code sent to your phone</span>
          <input
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
            placeholder="123456"
            className="w-full px-3 py-3 text-center text-lg tracking-[0.4em] font-bold rounded-xl border border-stone-200 focus:border-[#1f2937] focus:ring-2 focus:ring-[#1f2937]/10 outline-none"
          />
          {devCode && <span className="text-[11px] text-stone-400">Development code: {devCode}</span>}
        </label>
      )}

      <label className="block">
        <span className="text-xs font-bold text-stone-500 block mb-1.5">Create a password</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="At least 8 characters, letters and numbers"
          className="w-full px-3 py-3 text-sm rounded-xl border border-stone-200 focus:border-[#1f2937] focus:ring-2 focus:ring-[#1f2937]/10 outline-none"
        />
      </label>

      <label className="block">
        <span className="text-xs font-bold text-stone-500 block mb-1.5">Confirm password</span>
        <input
          type="password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          placeholder="Repeat your password"
          className="w-full px-3 py-3 text-sm rounded-xl border border-stone-200 focus:border-[#1f2937] focus:ring-2 focus:ring-[#1f2937]/10 outline-none"
        />
      </label>

      {error && (
        <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#111827] via-[#1f2937] to-[#0b1220] hover:from-[#1f2937] text-white font-bold text-sm shadow-md transition active:scale-95 disabled:opacity-60"
      >
        {busy ? 'Finishing…' : 'Create my account'}
        <ArrowRight className="w-4 h-4" />
      </button>
    </form>
  );
}
