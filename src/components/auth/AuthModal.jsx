import React, { useState } from 'react';
import { X, Phone, ShieldCheck, ArrowRight, UserCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AuthModal() {
  const {
    isAuthModalOpen,
    closeAuthModal,
    authStep,
    sendOtp,
    verifyOtp,
    pendingPhone
  } = useAuth();

  const [phone, setPhone] = useState('+250 788 123 456');
  const [name, setName] = useState('Kevin Mugabo');
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');

  if (!isAuthModalOpen) return null;

  const handlePhoneSubmit = (e) => {
    e.preventDefault();
    if (!phone || phone.length < 8) {
      setError('Please provide a valid phone number');
      return;
    }
    setError('');
    sendOtp(phone);
  };

  const handleOtpSubmit = (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 4) {
      setError('Please enter the 4-digit OTP code');
      return;
    }
    const success = verifyOtp(otpCode, name);
    if (!success) {
      setError('Invalid code. Please use 1234.');
    }
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
              Welcome to Food Kitchen
            </h3>
            <p className="text-xs text-stone-500 mb-6 font-medium">
              Enter your phone number to sign in or create your customer account
            </p>

            {error && (
              <div className="p-3 mb-4 rounded-xl bg-red-50 text-red-600 text-xs font-semibold">
                {error}
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
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Full Name"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-[#542813] focus:ring-2 focus:ring-[#542813]/20 text-sm font-semibold outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-stone-500 mb-1">
                  Phone Number (MTN / Airtel)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+250 788 000 000"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-[#542813] focus:ring-2 focus:ring-[#542813]/20 text-sm font-semibold outline-none transition"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] hover:from-[#3d1b0c] hover:via-[#5c2810] hover:to-[#2c1206] text-white font-extrabold text-sm shadow-xl shadow-[#2b1206]/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-95"
              >
                <span>Continue & Send OTP</span>
                <ArrowRight className="w-4 h-4 text-[#d9bda6]" />
              </button>
            </form>
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
              We sent a verification SMS to <span className="font-bold text-gray-800">{pendingPhone}</span>
            </p>

            {/* Test hint for convenience */}
            <div className="p-3 mb-4 rounded-xl bg-[#faf6f2] border border-[#ebd7c5] text-[#3d1b0c] text-xs flex items-center justify-between">
              <span>Demo Quick Code:</span>
              <button
                type="button"
                onClick={() => setOtpCode('1234')}
                className="font-black underline text-[#542813]"
              >
                Insert 1234
              </button>
            </div>

            {error && (
              <div className="p-3 mb-4 rounded-xl bg-red-50 text-red-600 text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-stone-500 mb-1">
                  Enter 4-Digit Code
                </label>
                <input
                  type="text"
                  maxLength={4}
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
