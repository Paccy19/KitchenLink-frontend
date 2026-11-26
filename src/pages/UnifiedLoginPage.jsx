import React, { useEffect, useState } from 'react';
import { staffLogin } from '../api/vendorApi';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Bike, Check, Eye, EyeOff, Store, UtensilsCrossed, User } from 'lucide-react';
import { sendUnifiedLoginOtp, verifyUnifiedLoginOtp } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { useVendor } from '../context/VendorContext';
import { useDriver } from '../context/DriverContext';
import { useAdmin } from '../context/AdminContext';
import { IDENTIFIER_ERROR, IDENTIFIER_MAX_LENGTH, IDENTIFIER_PLACEHOLDER, isValidIdentifier, looksLikeEmail, sanitizeIdentifierInput } from '../utils/validation';

const ROLE_OPTIONS = [
  { role: 'customer', label: 'Customer', Icon: User, color: 'text-[#542813]', background: 'bg-[#faf6f2]' },
  { role: 'vendor', label: 'Vendor', Icon: Store, color: 'text-[#6d391d]', background: 'bg-[#f5ebe1]' },
  { role: 'driver', label: 'Delivery Worker', Icon: Bike, color: 'text-[#3b5327]', background: 'bg-[#f2f8ee]' },
];

export default function UnifiedLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { acceptUnifiedCustomerSession } = useAuth();
  const { acceptUnifiedLogin: acceptVendorSession } = useVendor();
  const { acceptUnifiedLogin: acceptDriverSession } = useDriver();
  const { login: adminLogin } = useAdmin();

  const [identifier, setIdentifier] = useState('');
  const [pendingIdentifier, setPendingIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('');
  const [availableRoles, setAvailableRoles] = useState([]);
  const [step, setStep] = useState('identifier');
  const [devOtp, setDevOtp] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // 'staff': a kitchen employee with the username and password their kitchen gave them.
  const [mode, setMode] = useState('code');

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const timer = setTimeout(() => setResendCooldown((remaining) => Math.max(0, remaining - 1)), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const submitIdentifier = async (event) => {
    event.preventDefault();
    if (!isValidIdentifier(identifier)) {
      setError(IDENTIFIER_ERROR);
      return;
    }
    if (availableRoles.length > 1 && !role) {
      setError('Choose which account you want to sign in to.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const result = await sendUnifiedLoginOtp(identifier.trim(), role || undefined);
      if (result.requires_role_selection) {
        setAvailableRoles(result.roles || []);
        setRole('');
        return;
      }
      setPendingIdentifier(result.identifier || identifier.trim());
      setRole(result.role);
      if (result.requires_password && result.role === 'admin') {
        setStep('password');
        return;
      }
      setDevOtp(result.dev_otp || '');
      setResendCooldown(result.resend_after_seconds || 30);
      setStep('otp');
    } catch (requestError) {
      setError(requestError.message || 'Could not send a sign-in code.');
    } finally {
      setBusy(false);
    }
  };

  const submitPassword = async (event) => {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get('password') || '');
    if (!password) {
      setError('Enter your administrator password.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      await adminLogin(pendingIdentifier, password);
      navigate('/admin-dashboard', { replace: true });
    } catch (requestError) {
      setError(requestError.message || 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  };

  const resendCode = async () => {
    if (busy || resendCooldown > 0) return;
    setBusy(true);
    setError('');
    try {
      const result = await sendUnifiedLoginOtp(pendingIdentifier, role);
      if (result.requires_password && result.role === 'admin') {
        setStep('password');
        return;
      }
      setDevOtp(result.dev_otp || '');
      setResendCooldown(result.resend_after_seconds || 30);
    } catch (requestError) {
      setError(requestError.message || 'Could not resend the sign-in code.');
      setResendCooldown(requestError.details?.retry_after_seconds || 0);
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (event) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit verification code.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const result = await verifyUnifiedLoginOtp(pendingIdentifier, code, role);
      if (result.admin_verification_required) {
        navigate('/admin-verify', {
          state: {
            challengeToken: result.challenge_token,
            expiresInSeconds: result.expires_in_seconds,
          },
        });
        return;
      }

      if (result.role === 'customer') {
        acceptUnifiedCustomerSession(result);
        const from = location.state?.from?.pathname;
        navigate(from && from !== '/login' && from !== '/signup' ? from : '/', { replace: true });
      } else if (result.role === 'vendor') {
        acceptVendorSession(result);
        navigate('/vendor-dashboard', { replace: true });
      } else if (result.role === 'driver') {
        acceptDriverSession(result);
        navigate('/driver-dashboard', { replace: true });
      } else {
        setError('The account type could not be verified. Please try again.');
      }
    } catch (requestError) {
      setError(requestError.message || 'Could not verify the sign-in code.');
    } finally {
      setBusy(false);
    }
  };

  const changeIdentifier = () => {
    setStep('identifier');
    setPendingIdentifier('');
    setCode('');
    setDevOtp('');
    setResendCooldown(0);
    setRole('');
    setAvailableRoles([]);
    setError('');
  };

  return (
    <div className="min-h-[65vh] flex items-center justify-center bg-[#faf7f4] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#2b1206] via-[#481f0d] to-[#1c0a03] mx-auto flex items-center justify-center shadow-md">
            <UtensilsCrossed className="w-7 h-7 text-[#f5ebe1]" />
          </div>
          <h1 className="mt-4 text-2xl font-black text-[#172033] tracking-tight">Sign in to KitchenLink</h1>
          <p className="mt-1 text-sm text-stone-500">
            {step === 'identifier'
              ? 'Enter your phone number or email to continue.'
              : step === 'password'
                ? `Enter the administrator password for ${pendingIdentifier}.`
                : `Enter the 6-digit code sent to ${pendingIdentifier}.`}
          </p>
        </div>

        {mode === 'staff' ? (
          <StaffLoginForm
            onSignedIn={(result) => {
              acceptVendorSession(result);
              navigate('/vendor-dashboard', { replace: true });
            }}
          />
        ) : (
        <form
          onSubmit={step === 'identifier' ? submitIdentifier : step === 'password' ? submitPassword : submitCode}
          className="bg-white rounded-3xl border border-stone-200/80 shadow-sm p-6 sm:p-8 space-y-4"
        >
          {step === 'identifier' ? (
            <>
              <div>
                <label htmlFor="login-identifier" className="text-xs font-bold text-stone-500 block mb-1.5">
                  Phone number or email
                </label>
                <input
                  id="login-identifier"
                  type="text"
                  inputMode={looksLikeEmail(identifier) ? 'email' : 'tel'}
                  autoCapitalize="none"
                  spellCheck={false}
                  autoComplete="username"
                  maxLength={IDENTIFIER_MAX_LENGTH}
                  value={identifier}
                  onChange={(event) => {
                    setIdentifier(sanitizeIdentifierInput(event.target.value));
                    setAvailableRoles([]);
                    setRole('');
                    setError('');
                  }}
                  placeholder={IDENTIFIER_PLACEHOLDER}
                  required
                  className="w-full px-3 py-3 text-sm rounded-xl border border-stone-200 focus:border-[#542813] focus:ring-2 focus:ring-[#542813]/10 outline-none"
                />
              </div>

              {availableRoles.length > 1 && (
                <fieldset className="space-y-2">
                  <legend className="text-xs font-bold text-stone-600 mb-2">
                    This identifier is linked to more than one account. Choose which account to verify.
                  </legend>
                  {ROLE_OPTIONS.filter((option) => availableRoles.includes(option.role)).map(({ role: optionRole, label, Icon, color, background }) => (
                    <button
                      key={optionRole}
                      type="button"
                      aria-pressed={role === optionRole}
                      onClick={() => {
                        setRole(optionRole);
                        setError('');
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition ${
                        role === optionRole ? 'border-[#8a5332] ring-2 ring-[#8a5332]/15' : 'border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${background} ${color}`}>
                        <Icon className="w-4 h-4" aria-hidden="true" />
                      </span>
                      <span className="flex-1 text-sm font-bold text-gray-800">{label}</span>
                      {role === optionRole && <Check className="w-4 h-4 text-[#542813]" aria-hidden="true" />}
                    </button>
                  ))}
                </fieldset>
              )}
            </>
          ) : step === 'password' ? (
            <>
              <div>
                <label htmlFor="login-password" className="text-xs font-bold text-stone-500 block mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    autoFocus
                    required
                    className="w-full px-3 py-3 pr-12 text-sm rounded-xl border border-stone-200 focus:border-[#542813] focus:ring-2 focus:ring-[#542813]/10 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((shown) => !shown)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-800"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={changeIdentifier}
                className="w-full text-xs font-bold text-[#542813] hover:text-[#2b1206]"
              >
                Back
              </button>
            </>
          ) : (
            <>
              <div>
                <label htmlFor="login-code" className="text-xs font-bold text-stone-500 block mb-1.5">
                  6-digit verification code
                </label>
                <input
                  id="login-code"
                  type="text"
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  required
                  className="w-full px-3 py-3 text-center tracking-[0.5em] text-lg rounded-xl border border-stone-200 focus:border-[#542813] focus:ring-2 focus:ring-[#542813]/10 outline-none"
                />
              </div>
              {devOtp && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                  Development code: <strong>{devOtp}</strong>
                </p>
              )}
              <button
                type="button"
                onClick={changeIdentifier}
                className="w-full text-xs font-bold text-[#542813] hover:text-[#2b1206]"
              >
                Change phone or email
              </button>
              <button
                type="button"
                onClick={resendCode}
                disabled={busy || resendCooldown > 0}
                className="w-full text-xs font-bold text-[#542813] hover:text-[#2b1206] disabled:text-stone-400 disabled:cursor-not-allowed"
              >
                {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
              </button>
            </>
          )}

          {error && (
            <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] hover:from-[#3d1b0c] text-white font-bold text-sm shadow-md transition active:scale-95 disabled:opacity-60"
          >
            {busy ? 'Please wait…' : step === 'identifier' ? 'Continue' : step === 'password' ? 'Sign in' : 'Verify & sign in'}
            {step === 'otp' ? <Check className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
          </button>
        </form>
        )}

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setMode((m) => (m === 'staff' ? 'code' : 'staff'));
              setError('');
            }}
            className="text-xs font-bold text-[#542813] hover:text-[#2b1206] underline underline-offset-2"
          >
            {mode === 'staff' ? 'Sign in with a phone number or email instead' : 'Kitchen team member? Sign in with your username'}
          </button>
        </div>

        <p className="mt-5 text-center text-xs text-stone-500">
          Don’t have an account?{' '}
          <Link to="/signup" className="font-bold text-[#542813] hover:text-[#2b1206] underline underline-offset-2">
            Create Account
          </Link>
        </p>
      </div>
    </div>
  );
}

/** A kitchen employee: the username and password their kitchen administrator gave them. */
function StaffLoginForm({ onSignedIn }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      onSignedIn(await staffLogin(username.trim(), password));
    } catch (err) {
      setError(err.message || 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  };
  const input = 'w-full px-3 py-3 text-sm rounded-xl border border-stone-200 focus:border-[#542813] focus:ring-2 focus:ring-[#542813]/10 outline-none';
  return (
    <form onSubmit={submit} className="bg-white rounded-3xl border border-stone-200/80 shadow-sm p-6 sm:p-8 space-y-4">
      <p className="text-sm font-bold text-gray-800">Kitchen team sign-in</p>
      <div>
        <label htmlFor="staff-username" className="text-xs font-bold text-stone-500 block mb-1.5">Username</label>
        <input id="staff-username" className={input} value={username} onChange={(e) => setUsername(e.target.value)} autoCapitalize="none" spellCheck={false} autoComplete="username" required autoFocus placeholder="e.g. aline.barista" />
      </div>
      <div>
        <label htmlFor="staff-password" className="text-xs font-bold text-stone-500 block mb-1.5">Password</label>
        <div className="relative">
          <input id="staff-password" className={`${input} pr-16`} type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-500">{show ? 'Hide' : 'Show'}</button>
        </div>
      </div>
      {error && <p role="alert" className="text-sm font-semibold text-red-600">{error}</p>}
      <button type="submit" disabled={busy} className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] text-white font-bold text-sm shadow-md disabled:opacity-60">
        {busy ? 'Please wait…' : 'Sign in'}
      </button>
      <p className="text-[11px] text-stone-400 text-center">Your kitchen administrator gives you these. Forgot them? Ask them to set a new password.</p>
    </form>
  );
}
