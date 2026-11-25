import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ShieldCheck, Store, ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle, Phone, KeyRound, Lock, Eye, EyeOff,
} from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import {
  PHONE_ERROR, PHONE_MAX_LENGTH, PHONE_PLACEHOLDER, isValidRwandaPhone, sanitizePhoneInput,
} from '../../utils/validation';

/**
 * Opens the emailed invitation link (`/admin-invite?token=…`). Joining takes
 * three steps: the member's phone number, the SMS code sent to it, then their
 * password. The server enforces the order (the password is refused until the
 * phone is verified, and it keeps the verified number itself), so this page
 * only shows where the member is; reopening the link resumes at the right step.
 */
export default function AdminInvitePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const inviteQuery = useQuery({
    queryKey: ['admin', 'invitation', token],
    queryFn: () => adminApi.getInvitation(token),
    enabled: Boolean(token),
    retry: false,
    refetchOnWindowFocus: false,
  });

  if (!token) {
    return <Shell><Problem message="This link is missing its invitation token. Open the link exactly as it was emailed to you." /></Shell>;
  }
  if (inviteQuery.isLoading) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 text-stone-500 py-8">
          <Spinner />
          <p className="text-sm font-bold">Checking your invitation…</p>
        </div>
      </Shell>
    );
  }
  if (inviteQuery.error) {
    return <Shell><Problem message={inviteQuery.error.message || 'This invitation link is not valid.'} /></Shell>;
  }

  return <Shell><JoinFlow token={token} invitation={inviteQuery.data.invitation} /></Shell>;
}

function Shell({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f6f8] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#111827] via-[#1f2937] to-[#0b1220] mx-auto flex items-center justify-center shadow-md">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
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

function Spinner({ small = false }) {
  return (
    <span
      aria-hidden="true"
      className={`${small ? 'w-4 h-4 border-white/40 border-t-white' : 'w-10 h-10 border-stone-200 border-t-[#1f2937]'} inline-block rounded-full border-2 animate-spin`}
    />
  );
}

function Problem({ message }) {
  return (
    <div className="bg-white rounded-3xl border border-stone-200/80 shadow-sm p-6 sm:p-8 text-center space-y-3">
      <AlertTriangle className="w-9 h-9 text-amber-500 mx-auto" />
      <p className="text-sm text-stone-600">{message}</p>
      <p className="text-xs text-stone-400">Ask the owner to send you a new invitation.</p>
    </div>
  );
}

const STEPS = [
  { key: 'phone', label: 'Phone' },
  { key: 'code', label: 'Verify' },
  { key: 'password', label: 'Password' },
];

function Steps({ current }) {
  const index = STEPS.findIndex((step) => step.key === current);
  return (
    <ol className="flex items-center gap-2 mb-5" aria-label="Account setup steps">
      {STEPS.map((step, i) => {
        const done = i < index;
        const active = i === index;
        return (
          <li key={step.key} className="flex-1 flex items-center gap-2 min-w-0">
            <span
              className={`w-6 h-6 shrink-0 rounded-full text-[11px] font-black flex items-center justify-center ${
                done ? 'bg-emerald-600 text-white' : active ? 'bg-[#1f2937] text-white' : 'bg-stone-200 text-stone-500'
              }`}
              aria-current={active ? 'step' : undefined}
            >
              {done ? '✓' : i + 1}
            </span>
            <span className={`text-[11px] font-bold truncate ${active ? 'text-gray-900' : 'text-stone-400'}`}>{step.label}</span>
            {i < STEPS.length - 1 && <span className="flex-1 h-px bg-stone-200" />}
          </li>
        );
      })}
    </ol>
  );
}

/** Seconds left until `until` (a timestamp), ticking every second. */
function useSecondsLeft(until) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!until) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [until]);
  return until ? Math.max(0, Math.ceil((until - now) / 1000)) : 0;
}

const formatSeconds = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

const inputClass =
  'w-full pl-9 pr-3 py-3 text-sm rounded-xl border border-stone-200 focus:border-[#1f2937] focus:ring-2 focus:ring-[#1f2937]/10 outline-none';
const primaryButton =
  'w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#111827] via-[#1f2937] to-[#0b1220] hover:from-[#1f2937] text-white font-bold text-sm shadow-md transition active:scale-95 disabled:opacity-60';
const card = 'bg-white rounded-3xl border border-stone-200/80 shadow-sm p-6 sm:p-8 space-y-4';

function ErrorNote({ message }) {
  if (!message) return null;
  return <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{message}</p>;
}

function JoinFlow({ token, invitation }) {
  const [stage, setStage] = useState(invitation.phone_verified ? 'password' : 'phone');
  const [phone, setPhone] = useState('');
  const [verifiedPhone, setVerifiedPhone] = useState(invitation.verified_phone || '');
  const [codeInfo, setCodeInfo] = useState(null); // { sentTo, expiresAt, resendAt, devOtp }
  const [acceptedEmail, setAcceptedEmail] = useState('');

  const sendCode = async (number) => {
    const sent = await adminApi.sendInvitePhoneCode(token, number);
    const now = Date.now();
    setCodeInfo({
      sentTo: sent.sent_to,
      expiresAt: now + (sent.expires_in_seconds || 300) * 1000,
      resendAt: now + (sent.resend_after_seconds || 30) * 1000,
      devOtp: sent.dev_otp || '',
    });
    setStage('code');
  };

  if (stage === 'done') return <Done email={acceptedEmail} />;

  return (
    <div className={card}>
      <Steps current={stage} />
      <div className="rounded-2xl bg-stone-100 border border-stone-200 p-3 text-sm">
        <p className="text-stone-500 text-[11px] font-bold uppercase tracking-wider">You were invited as</p>
        <p className="font-black text-gray-900">{invitation.role_label}</p>
        <p className="text-[11px] text-stone-500 mt-0.5 leading-snug">{invitation.role_description}</p>
        <p className="text-[11px] text-stone-400 mt-1">for {invitation.email}</p>
      </div>

      {stage === 'phone' && <PhoneStage phone={phone} setPhone={setPhone} onSend={sendCode} />}
      {stage === 'code' && codeInfo && (
        <CodeStage
          token={token}
          codeInfo={codeInfo}
          onResend={() => sendCode(phone)}
          onChangeNumber={() => setStage('phone')}
          onVerified={(masked) => {
            setVerifiedPhone(masked);
            setStage('password');
          }}
        />
      )}
      {stage === 'password' && (
        <PasswordStage
          token={token}
          verifiedPhone={verifiedPhone}
          onNeedsPhone={() => setStage('phone')}
          onDone={(email) => {
            setAcceptedEmail(email || invitation.email);
            setStage('done');
          }}
        />
      )}
    </div>
  );
}

function PhoneStage({ phone, setPhone, onSend }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    if (!phone.trim()) return setError('Enter your phone number.');
    if (!isValidRwandaPhone(phone)) return setError(PHONE_ERROR);
    setBusy(true);
    setError('');
    try {
      await onSend(phone.trim());
    } catch (err) {
      const wait = err?.details?.retry_after_seconds;
      setError(wait ? `${err.message} (about ${wait} seconds)` : err?.message || 'Could not send the code.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <h1 className="text-xl font-black text-gray-900 tracking-tight">Welcome to KitchenLink</h1>
        <p className="mt-1 text-sm text-stone-500">
          You&apos;ve been invited to join the KitchenLink administration team. Complete your account setup to get started.
        </p>
      </div>
      <div>
        <label htmlFor="invite-phone" className="text-xs font-bold text-stone-500 block mb-1.5">Phone number</label>
        <div className="relative">
          <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-3.5" />
          <input
            id="invite-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={PHONE_MAX_LENGTH}
            value={phone}
            onChange={(event) => setPhone(sanitizePhoneInput(event.target.value))}
            placeholder={PHONE_PLACEHOLDER}
            required
            autoFocus
            aria-invalid={Boolean(error)}
            className={inputClass}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-stone-400">
          Rwanda (+250), MTN or Airtel: 07XXXXXXXX or +2507XXXXXXXX. We send a verification code by SMS.
        </p>
      </div>
      <ErrorNote message={error} />
      <button type="submit" disabled={busy} className={primaryButton}>
        {busy ? <><Spinner small /> Sending code…</> : <>Send Verification Code <ArrowRight className="w-4 h-4" /></>}
      </button>
    </form>
  );
}

function CodeStage({ token, codeInfo, onResend, onChangeNumber, onVerified }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [resendAt, setResendAt] = useState(codeInfo.resendAt);
  const expiresIn = useSecondsLeft(codeInfo.expiresAt);
  const resendIn = useSecondsLeft(resendAt);

  useEffect(() => {
    setResendAt(codeInfo.resendAt);
    setCode('');
  }, [codeInfo]);

  const submit = async (event) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) return setError('Enter the 6-digit code sent to your phone.');
    if (expiresIn === 0) return setError('This code has expired. Request a new one.');
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await adminApi.verifyInvitePhone(token, code);
      onVerified(result.verified_phone);
    } catch (err) {
      setCode('');
      const left = err?.details?.attempts_remaining;
      setError(left !== undefined ? `${err.message} ${left} attempt${left === 1 ? '' : 's'} left.` : err?.message || 'Could not verify the code.');
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setResending(true);
    setError('');
    setNotice('');
    try {
      await onResend();
      setNotice('A new code was sent.');
    } catch (err) {
      const wait = err?.details?.retry_after_seconds;
      if (wait) setResendAt(Date.now() + wait * 1000);
      setError(err?.message || 'Could not send a new code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <h1 className="text-xl font-black text-gray-900 tracking-tight">Verify your phone number</h1>
        <p className="mt-1 text-sm text-stone-500">
          Enter the 6-digit code we sent to <strong className="text-gray-900">{codeInfo.sentTo}</strong>.
        </p>
      </div>
      {codeInfo.devOtp && (
        <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          Development server: your code is <strong>{codeInfo.devOtp}</strong>.
        </p>
      )}
      <div>
        <label htmlFor="invite-code" className="text-xs font-bold text-stone-500 block mb-1.5">Verification code</label>
        <div className="relative">
          <KeyRound className="w-4 h-4 text-stone-400 absolute left-3 top-3.5" />
          <input
            id="invite-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            autoFocus
            className={`${inputClass} tracking-[0.4em] font-bold`}
          />
        </div>
        <p className={`mt-1.5 text-[11px] ${expiresIn === 0 ? 'text-red-600 font-bold' : 'text-stone-400'}`}>
          {expiresIn === 0 ? 'This code has expired. Request a new one.' : `The code expires in ${formatSeconds(expiresIn)}.`}
        </p>
      </div>
      <ErrorNote message={error} />
      {notice && <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">{notice}</p>}
      <button type="submit" disabled={busy || expiresIn === 0} className={primaryButton}>
        {busy ? <><Spinner small /> Verifying…</> : <>Verify Code <ArrowRight className="w-4 h-4" /></>}
      </button>
      <div className="flex items-center justify-between text-xs font-bold">
        <button type="button" onClick={onChangeNumber} className="inline-flex items-center gap-1 text-stone-500 hover:text-[#1f2937]">
          <ArrowLeft className="w-3.5 h-3.5" /> Change number
        </button>
        <button
          type="button"
          onClick={resend}
          disabled={resendIn > 0 || resending}
          className="text-[#1f2937] underline disabled:no-underline disabled:text-stone-400"
        >
          {resending ? 'Sending…' : resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
        </button>
      </div>
    </form>
  );
}

function PasswordField({ id, label, value, onChange, placeholder, autoFocus = false }) {
  const [shown, setShown] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="text-xs font-bold text-stone-500 block mb-1.5">{label}</label>
      <div className="relative">
        <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3.5" />
        <input
          id={id}
          type={shown ? 'text' : 'password'}
          autoComplete="new-password"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          required
          className={`${inputClass} pr-10`}
        />
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-label={shown ? 'Hide password' : 'Show password'}
          className="absolute right-2 top-2 w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-[#1f2937]"
        >
          {shown ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

function PasswordStage({ token, verifiedPhone, onNeedsPhone, onDone }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    if (!password || !confirm) return setError('Enter your password and confirm it.');
    if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      return setError('Use at least 8 characters with letters and numbers.');
    }
    if (password !== confirm) return setError('Passwords do not match.');
    setBusy(true);
    setError('');
    try {
      const result = await adminApi.acceptInvitation(token, { password, confirm_password: confirm });
      onDone(result.email);
    } catch (err) {
      if (err?.code === 'PHONE_VERIFICATION_REQUIRED') {
        onNeedsPhone();
        return;
      }
      setError(err?.message || 'Could not finish setting up your account.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <p className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        Phone number verified{verifiedPhone ? ` (${verifiedPhone})` : ''}.
      </p>
      <div>
        <h1 className="text-xl font-black text-gray-900 tracking-tight">Create Your Administrator Password</h1>
        <p className="mt-1 text-sm text-stone-500">At least 8 characters, with letters and numbers.</p>
      </div>
      <PasswordField id="invite-password" label="Password" value={password} onChange={setPassword} placeholder="At least 8 characters, letters and numbers" autoFocus />
      <PasswordField id="invite-password-confirm" label="Confirm Password" value={confirm} onChange={setConfirm} placeholder="Repeat your password" />
      <ErrorNote message={error} />
      <button type="submit" disabled={busy} className={primaryButton}>
        {busy ? <><Spinner small /> Completing…</> : <>Complete Registration <ArrowRight className="w-4 h-4" /></>}
      </button>
    </form>
  );
}

function Done({ email }) {
  const navigate = useNavigate();
  const goToSignIn = () => {
    navigate('/admin-login', { replace: true });
  };
  return (
    <div className="bg-white rounded-3xl border border-stone-200/80 shadow-sm p-6 sm:p-8 text-center space-y-3">
      <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
      <h1 className="text-lg font-black text-gray-900">Registration complete</h1>
      <p className="text-sm text-stone-600">
        Your administrator account is active. Sign in with your admin email <strong className="text-gray-900">{email}</strong> and password.
        If two-factor authentication is enabled, enter the verification code sent to your phone.
      </p>
      <button type="button" onClick={goToSignIn} className={primaryButton.replace('w-full ', '')}>
        Admin sign in <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
