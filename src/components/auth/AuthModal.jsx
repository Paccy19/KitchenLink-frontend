import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Phone, ShieldCheck, ArrowRight, UserCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  NAME_MAX_LENGTH, formatNameInput, PHONE_ERROR, PHONE_MAX_LENGTH, PHONE_PLACEHOLDER, isValidRwandaPhone, sanitizePhoneInput,
  IDENTIFIER_ERROR, IDENTIFIER_MAX_LENGTH, IDENTIFIER_PLACEHOLDER, isValidIdentifier, looksLikeEmail, sanitizeIdentifierInput,
} from '../../utils/validation';

export default function AuthModal() {
  const navigate = useNavigate();
  const {
    isAuthModalOpen,
    closeAuthModal,
    authStep,
    sendOtp,
    verifyOtp,
    pendingPhone,
    pendingName,
    otpPreview,
    authError
  } = useAuth();

  // One field: a phone number or an email address (the server decides which).
  const [identifier, setIdentifier] = useState('');
  // Email sign-up only: an optional phone (checked by the server, saved unverified).
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');

  if (!isAuthModalOpen) return null;

  const handlePhoneSubmit = (e) => {
    e.preventDefault();
    if (!isValidIdentifier(identifier)) {
      setError(IDENTIFIER_ERROR);
      return;
    }
    const emailMode = looksLikeEmail(identifier);
    if (emailMode && phone && !isValidRwandaPhone(phone)) {
      setError(PHONE_ERROR);
      return;
    }
    setError('');
    sendOtp(identifier.trim(), name, emailMode ? phone : '').catch((requestError) => {
      setError(requestError.message);
    });
  };

  const handleOtpSubmit = (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(otpCode)) {
      setError('Please enter the 6-digit OTP code');
      return;
    }
    verifyOtp(otpCode, pendingName || name)
      .then((success) => {
        // The server identified an admin: their email + password come next.
        // The one-time challenge travels in router state only (not stored).
        if (success?.adminVerificationRequired) {
          navigate('/admin-verify', { state: { challengeToken: success.challengeToken, expiresInSeconds: success.expiresInSeconds } });
          return;
        }
        if (!success) setError('Invalid verification code.');
      })
      .catch((requestError) => setError(requestError.message));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl p-6 sm:p-8 relative animate-scale-in border border-stone-100">
        
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 p-2 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {authStep === 'phone' ? (
          <div>
            <div className="w-14 h-14 rounded-2xl bg-[#faf6f2] text-[#542813] border border-[#ebd7c5] flex items-center justify-center mb-5 shadow-sm">
              <Phone className="w-7 h-7 text-[#6d391d]" />
            </div>

            <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-1">
              Create your customer account
            </h3>
            <p className="text-xs text-stone-500 mb-6 font-medium">
              Enter your name and phone number or email. We’ll send you a one-time verification code.
            </p>

            {(error || authError) && (
              <div className="p-3 mb-4 rounded-xl bg-red-50 text-red-600 text-xs font-semibold">
                {error || authError}
              </div>
            )}

            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-stone-500 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  maxLength={NAME_MAX_LENGTH}
                  onChange={(e) => setName(formatNameInput(e.target.value))}
                  placeholder="Your Full Name"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-[#542813] focus:ring-2 focus:ring-[#542813]/20 text-sm font-semibold outline-none transition"
                />
                <p className="mt-1 text-[11px] text-stone-400">
                  Also a kitchen or delivery worker on KitchenLink? Use the same name you registered with.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-stone-500 mb-1">
                  Phone Number or Email
                </label>
                <input
                  type="text"
                  inputMode={looksLikeEmail(identifier) ? 'email' : 'tel'}
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={IDENTIFIER_MAX_LENGTH}
                  value={identifier}
                  onChange={(e) => setIdentifier(sanitizeIdentifierInput(e.target.value))}
                  placeholder={IDENTIFIER_PLACEHOLDER}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-[#542813] focus:ring-2 focus:ring-[#542813]/20 text-sm font-semibold outline-none transition"
                />
              </div>

              {looksLikeEmail(identifier) && (
                <div>
                  <label className="block text-xs font-bold uppercase text-stone-500 mb-1">
                    Phone Number (optional, MTN / Airtel)
                  </label>
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    maxLength={PHONE_MAX_LENGTH}
                    value={phone}
                    onChange={(e) => setPhone(sanitizePhoneInput(e.target.value))}
                    placeholder={PHONE_PLACEHOLDER}
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-[#542813] focus:ring-2 focus:ring-[#542813]/20 text-sm font-semibold outline-none transition"
                  />
                  <p className="mt-1 text-[11px] text-stone-400">
                    New accounts only. You verify it with a code later in your profile.
                  </p>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] hover:from-[#3d1b0c] hover:via-[#5c2810] hover:to-[#2c1206] text-white font-extrabold text-sm shadow-xl shadow-[#2b1206]/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-95"
              >
                <span>Continue & Send OTP</span>
                <ArrowRight className="w-4 h-4 text-[#d9bda6]" />
              </button>
            </form>
            <p className="mt-4 text-center text-xs text-stone-500">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  closeAuthModal();
                  navigate('/login');
                }}
                className="font-bold text-[#542813] hover:text-[#2b1206] underline underline-offset-2"
              >
                Sign in
              </button>
            </p>
          </div>
        ) : (
          <div>
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-5 shadow-sm">
              <ShieldCheck className="w-7 h-7" />
            </div>

            <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-1">
              Verify OTP Code
            </h3>
            <p className="text-xs text-stone-500 mb-4 font-medium">
              We sent a verification code to <span className="font-bold text-gray-800">{pendingPhone}</span>
            </p>

            {otpPreview && (
              <div className="p-3 mb-4 rounded-xl bg-[#faf6f2] border border-[#ebd7c5] text-[#3d1b0c] text-xs flex items-center justify-between">
                <span>Development OTP: {otpPreview}</span>
                <button
                  type="button"
                  onClick={() => setOtpCode(otpPreview)}
                  className="font-black underline text-[#542813]"
                >
                  Insert code
                </button>
              </div>
            )}

            {(error || authError) && (
              <div className="p-3 mb-4 rounded-xl bg-red-50 text-red-600 text-xs font-semibold">
                {error || authError}
              </div>
            )}

            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                  Enter 6-Digit Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="••••"
                  autoFocus
                  className="w-full text-center tracking-[1em] text-2xl font-black py-3 rounded-xl border border-stone-200 focus:border-[#542813] focus:ring-2 focus:ring-[#542813]/20 outline-none transition"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] hover:from-[#3d1b0c] hover:via-[#5c2810] hover:to-[#2c1206] text-white font-extrabold text-sm shadow-xl shadow-[#2b1206]/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-95"
              >
                <UserCheck className="w-4 h-4 text-[#d9bda6]" />
                <span>Verify & Sign In</span>
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
