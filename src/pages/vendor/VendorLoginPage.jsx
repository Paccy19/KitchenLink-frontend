import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Phone, User, ArrowRight, ShieldCheck, ChefHat, Check, Ban, Mail } from 'lucide-react';
import { useVendor } from '../../context/VendorContext';
import { BLOCKED_VENDOR_CODES } from '../../api/vendorApi';
import { PHONE_ERROR, PHONE_MAX_LENGTH, PHONE_PLACEHOLDER, isValidRwandaPhone, sanitizePhoneInput } from '../../utils/validation';

const formatDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : '';
};

/** Shown instead of the login form when the vendor is suspended or rejected. */
function AccountBlockedNotice({ block, onBack }) {
  const suspended = block.status === 'suspended';
  const since = suspended ? formatDate(block.suspended_at) : '';
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#faf7f4] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl border border-red-200 shadow-sm p-6 sm:p-8 space-y-5">
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 mx-auto flex items-center justify-center">
              <Ban className="w-7 h-7 text-red-600" />
            </div>
            <h1 className="mt-4 text-xl font-black text-gray-900 tracking-tight">
              {suspended ? 'Your account is suspended' : 'Your application was rejected'}
            </h1>
            <p className="mt-1 text-sm text-stone-500">
              {suspended
                ? `You can't sign in to the Vendor Dashboard${since ? ` (suspended on ${since})` : ''}.`
                : "You can't sign in to the Vendor Dashboard until this is resolved."}
            </p>
          </div>

          <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-xs font-bold text-red-700 uppercase tracking-wide">Reason</p>
            <p className="mt-1 text-sm text-red-900 whitespace-pre-line">
              {block.reason || 'No reason was given. Contact the support team for details.'}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-stone-600">
              To solve this, contact our support team. They will review your account with you.
            </p>
            {block.support_phone && (
              <a
                href={`tel:${block.support_phone.replace(/\s/g, '')}`}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] hover:from-[#3d1b0c] text-white font-bold text-sm shadow-md transition active:scale-95"
              >
                <Phone className="w-4 h-4" />
                Call support: {block.support_phone}
              </a>
            )}
            {block.support_email && (
              <a
                href={`mailto:${block.support_email}`}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-stone-200 text-[#542813] font-bold text-sm hover:bg-stone-50"
              >
                <Mail className="w-4 h-4" />
                {block.support_email}
              </a>
            )}
          </div>

          <button
            type="button"
            onClick={onBack}
            className="w-full text-xs font-bold text-[#542813] hover:text-[#2b1206]"
          >
            Back to login
          </button>
        </div>

        <div className="mt-4 text-center text-xs font-bold text-stone-500">
          <Link to="/" className="hover:text-[#542813] inline-flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            Back to marketplace
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VendorLoginPage() {
  const navigate = useNavigate();
  const {
    requestLoginOtp,
    verifyLoginOtp,
    pendingLoginPhone,
    loginOtpPreview,
    accountBlock,
    clearAccountBlock,
    authBusy,
    error: contextError,
  } = useVendor();

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('phone');
  const [error, setError] = useState('');

  const submitPhone = async (event) => {
    event.preventDefault();
    if (!isValidRwandaPhone(phone)) {
      setError(PHONE_ERROR);
      return;
    }
    setError('');
    try {
      await requestLoginOtp(phone.trim());
      setStep('otp');
    } catch (err) {
      if (!BLOCKED_VENDOR_CODES.includes(err?.code)) {
        setError(err?.message || 'Could not send a verification code.');
      }
    }
  };

  const submitCode = async (event) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit verification code.');
      return;
    }
    setError('');
    try {
      await verifyLoginOtp(code);
      navigate('/vendor-dashboard');
    } catch (err) {
      if (BLOCKED_VENDOR_CODES.includes(err?.code)) {
        setStep('phone');
        setCode('');
      } else {
        setError(err?.message || 'Could not verify the code.');
      }
    }
  };

  if (accountBlock) {
    return (
      <AccountBlockedNotice
        block={accountBlock}
        onBack={() => {
          clearAccountBlock();
          setStep('phone');
          setCode('');
          setError('');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#faf7f4] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#2b1206] via-[#481f0d] to-[#1c0a03] mx-auto flex items-center justify-center shadow-md">
            <ChefHat className="w-7 h-7 text-[#f5ebe1]" />
          </div>
          <h1 className="mt-4 text-2xl font-black text-gray-900 tracking-tight">Vendor Login</h1>
          <p className="mt-1 text-sm text-stone-500">
            Sign in securely using a one-time code sent to your vendor phone.
          </p>
        </div>

        <form
          onSubmit={step === 'phone' ? submitPhone : submitCode}
          className="bg-white rounded-3xl border border-stone-200/80 shadow-sm p-6 sm:p-8 space-y-4"
        >
          {step === 'phone' ? (
            <div>
              <label className="text-xs font-bold text-stone-500 block mb-1.5">Vendor phone number</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-3.5" />
                <input
                  type="tel"
                  inputMode="tel"
                  maxLength={PHONE_MAX_LENGTH}
                  value={phone}
                  onChange={(event) => setPhone(sanitizePhoneInput(event.target.value))}
                  placeholder={PHONE_PLACEHOLDER}
                  autoComplete="tel"
                  required
                  className="w-full pl-9 pr-3 py-3 text-sm rounded-xl border border-stone-200 focus:border-[#542813] focus:ring-2 focus:ring-[#542813]/10 outline-none"
                />
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="text-xs font-bold text-stone-500 block mb-1.5">6-digit verification code</label>
                <input
                  type="text"
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  className="w-full px-3 py-3 text-center tracking-[0.5em] text-lg rounded-xl border border-stone-200 focus:border-[#542813] focus:ring-2 focus:ring-[#542813]/10 outline-none"
                />
                <p className="mt-2 text-xs text-stone-500">Code sent to {pendingLoginPhone}</p>
              </div>
              {loginOtpPreview && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                  Development code: <strong>{loginOtpPreview}</strong>
                </p>
              )}
            </>
          )}

          {(error || contextError) && (
            <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {error || contextError}
            </p>
          )}

          <button
            type="submit"
            disabled={authBusy}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] hover:from-[#3d1b0c] text-white font-bold text-sm shadow-md transition active:scale-95 disabled:opacity-60"
          >
            {authBusy ? 'Please wait…' : step === 'phone' ? 'Send verification code' : 'Verify & sign in'}
            {step === 'otp' ? <Check className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
          </button>
          {step === 'otp' && (
            <button
              type="button"
              onClick={() => {
                setStep('phone');
                setCode('');
                setError('');
              }}
              className="w-full text-xs font-bold text-[#542813] hover:text-[#2b1206]"
            >
              Change phone number
            </button>
          )}
        </form>

        <div className="mt-4 flex items-center justify-between text-xs font-bold text-stone-500">
          <Link to="/vendor-register" className="hover:text-[#542813] inline-flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            Create a vendor account
          </Link>
          <Link to="/" className="hover:text-[#542813] inline-flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            Back to marketplace
          </Link>
        </div>
      </div>
    </div>
  );
}
