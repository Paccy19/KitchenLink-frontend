import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck, Store, User } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { useAuth } from '../../context/AuthContext';
import { EMAIL_ERROR, EMAIL_MAX_LENGTH, isValidEmail, sanitizeEmailInput } from '../../utils/validation';

/**
 * Stage 2 of the admin sign-in that starts at the customer phone login. The
 * server already verified the phone and said it belongs to an admin; it gave
 * a one-time challenge (kept only in this page's router state). Here the
 * admin proves it is them with their own email and password — the server
 * checks both belong to the same admin as the phone, then opens the
 * dashboard. Nothing on this page decides who is an admin.
 */
export default function AdminVerifyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { completePhoneLogin, authBusy } = useAdmin();
  const { continueAsCustomer } = useAuth();
  const challengeToken = location.state?.challengeToken || '';
  const expiresInSeconds = location.state?.expiresInSeconds || 300;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [expired, setExpired] = useState(!challengeToken);
  const [switching, setSwitching] = useState(false);

  // The challenge only lives a few minutes on the server.
  useEffect(() => {
    if (!challengeToken) return undefined;
    const timer = setTimeout(() => setExpired(true), expiresInSeconds * 1000);
    return () => clearTimeout(timer);
  }, [challengeToken, expiresInSeconds]);

  // Don't keep the one-time token in the browser history entry.
  useEffect(() => {
    if (challengeToken) window.history.replaceState({}, document.title);
  }, [challengeToken]);

  const submit = async (event) => {
    event.preventDefault();
    if (!email.trim() || !password) return setError('Enter your administrator email and password.');
    if (!isValidEmail(email)) return setError(EMAIL_ERROR);
    if (password.length < 8) return setError('Your password has at least 8 characters.');
    setError('');
    try {
      await completePhoneLogin(challengeToken, email.trim(), password);
      navigate('/admin-dashboard', { replace: true });
    } catch (err) {
      if (err?.code === 'CHALLENGE_EXPIRED') setExpired(true);
      setPassword('');
      setError(err?.message || 'Could not verify your credentials.');
    }
  };

  const asCustomer = async () => {
    setSwitching(true);
    setError('');
    try {
      await continueAsCustomer(challengeToken);
      navigate('/', { replace: true });
    } catch (err) {
      if (err?.code === 'CHALLENGE_EXPIRED') setExpired(true);
      setError(err?.message || 'Could not sign you in.');
    } finally {
      setSwitching(false);
    }
  };

  const inputClass =
    'w-full pl-9 pr-3 py-3 text-sm rounded-xl border border-stone-200 focus:border-[#1f2937] focus:ring-2 focus:ring-[#1f2937]/10 outline-none';

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f6f8] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#111827] via-[#1f2937] to-[#0b1220] mx-auto flex items-center justify-center shadow-md">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <h1 className="mt-4 text-2xl font-black text-gray-900 tracking-tight">Administrator Verification</h1>
          <p className="mt-1 text-sm text-stone-500">
            Verify your administrator credentials to access the KitchenLink management dashboard.
          </p>
        </div>

        {expired ? (
          <div className="bg-white rounded-3xl border border-stone-200/80 shadow-sm p-6 sm:p-8 space-y-4 text-center">
            <p className="text-sm text-stone-600">
              Your phone verification has expired or was already used. Sign in again with your phone number.
            </p>
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#111827] via-[#1f2937] to-[#0b1220] text-white font-bold text-sm shadow-md"
            >
              <ArrowLeft className="w-4 h-4" /> Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="bg-white rounded-3xl border border-stone-200/80 shadow-sm p-6 sm:p-8 space-y-4" noValidate>
            <div>
              <label htmlFor="admin-verify-email" className="text-xs font-bold text-stone-500 block mb-1.5">
                Administrator email address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3.5" />
                <input
                  id="admin-verify-email"
                  type="email"
                  maxLength={EMAIL_MAX_LENGTH}
                  value={email}
                  onChange={(event) => setEmail(sanitizeEmailInput(event.target.value))}
                  autoComplete="username"
                  autoFocus
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label htmlFor="admin-verify-password" className="text-xs font-bold text-stone-500 block mb-1.5">
                Administrator password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3.5" />
                <input
                  id="admin-verify-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  className={`${inputClass} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((shown) => !shown)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2 top-2 w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-[#1f2937]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={authBusy || switching}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#111827] via-[#1f2937] to-[#0b1220] hover:from-[#1f2937] text-white font-bold text-sm shadow-md transition active:scale-95 disabled:opacity-60"
            >
              {authBusy ? 'Verifying…' : 'Verify & open dashboard'}
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={asCustomer}
              disabled={authBusy || switching}
              className="w-full inline-flex items-center justify-center gap-2 text-xs font-bold text-stone-500 hover:text-[#1f2937] disabled:opacity-60"
            >
              <User className="w-3.5 h-3.5" />
              {switching ? 'Signing you in…' : 'Continue as a customer instead'}
            </button>
          </form>
        )}

        <div className="mt-4 text-center text-xs font-bold text-stone-500">
          <Link to="/" className="hover:text-[#1f2937] inline-flex items-center gap-1.5">
            <Store className="w-3.5 h-3.5" />
            Cancel and go back to the marketplace
          </Link>
        </div>
      </div>
    </div>
  );
}
