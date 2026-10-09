import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Phone, User, ArrowRight, ShieldCheck, ChefHat, Check } from 'lucide-react';
import { useVendor } from '../../context/VendorContext';

export default function VendorLoginPage() {
  const navigate = useNavigate();
  const {
    requestLoginOtp,
    verifyLoginOtp,
    pendingLoginPhone,
    loginOtpPreview,
    authBusy,
    error: contextError,
  } = useVendor();

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('phone');
  const [error, setError] = useState('');

  const submitPhone = async (event) => {
    event.preventDefault();
    if (phone.replace(/\D/g, '').length < 9) {
      setError('Enter a valid phone number.');
      return;
    }
    setError('');
    try {
      await requestLoginOtp(phone.trim());
      setStep('otp');
    } catch (err) {
      setError(err?.message || 'Could not send a verification code.');
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
      setError(err?.message || 'Could not verify the code.');
    }
  };

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
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+250 788 000 000"
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
