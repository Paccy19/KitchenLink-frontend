import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Bike, Check, Store, UtensilsCrossed, User } from 'lucide-react';
import { sendUnifiedLoginOtp, verifyUnifiedLoginOtp } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { useVendor } from '../context/VendorContext';
import { useDriver } from '../context/DriverContext';
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

  const [identifier, setIdentifier] = useState('');
  const [pendingIdentifier, setPendingIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [role, setRole] = useState('');
  const [availableRoles, setAvailableRoles] = useState([]);
  const [step, setStep] = useState('identifier');
  const [devOtp, setDevOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

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
      setDevOtp(result.dev_otp || '');
      setStep('otp');
    } catch (requestError) {
      setError(requestError.message || 'Could not send a sign-in code.');
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
              ? 'Enter your phone number or email. We’ll identify your account and send a sign-in code.'
              : `Enter the 6-digit code sent to ${pendingIdentifier}.`}
          </p>
        </div>

        <form
          onSubmit={step === 'identifier' ? submitIdentifier : submitCode}
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
            {busy ? 'Please wait…' : step === 'identifier' ? 'Send sign-in code' : 'Verify & sign in'}
            {step === 'otp' ? <Check className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-stone-500">
          Don’t have an account?{' '}
          <Link to="/signup" className="font-bold text-[#542813] hover:text-[#2b1206] underline underline-offset-2">
            Create Account
          </Link>
        </p>
        <p className="mt-3 text-center text-[11px] text-stone-400">
          Administrator? <Link to="/admin-login" className="font-semibold text-stone-500 hover:text-[#542813]">Admin sign in</Link>
        </p>
      </div>
    </div>
  );
}
