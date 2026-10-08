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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl p-6 sm:p-8 relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-2"
        >
          <X className="w-5 h-5" />
        </button>

        {authStep === 'phone' ? (
          <div>
            <div className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mb-5">
              <Phone className="w-7 h-7" />
            </div>

            <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-1">
              Welcome to Food Kitchen
            </h3>
            <p className="text-xs text-gray-500 mb-6 font-medium">
              Enter your phone number to sign in or create your customer account
            </p>

            {error && (
              <div className="p-3 mb-4 rounded-xl bg-red-50 text-red-600 text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Full Name"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-sm font-semibold outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                  Phone Number (MTN / Airtel)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+250 788 000 000"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-sm font-semibold outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-sm shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 transition"
              >
                <span>Continue & Send OTP</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        ) : (
          <div>
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-5">
              <ShieldCheck className="w-7 h-7" />
            </div>

            <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-1">
              Verify OTP Code
            </h3>
            <p className="text-xs text-gray-500 mb-4 font-medium">
              We sent a verification SMS to <span className="font-bold text-gray-800">{pendingPhone}</span>
            </p>

            {/* Test hint for convenience */}
            <div className="p-3 mb-4 rounded-xl bg-orange-50 border border-orange-200 text-orange-800 text-xs flex items-center justify-between">
              <span>Demo Quick Code:</span>
              <button
                type="button"
                onClick={() => setOtpCode('1234')}
                className="font-black underline text-orange-600"
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
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                  Enter 4-Digit Code
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="••••"
                  autoFocus
                  className="w-full text-center tracking-[1em] text-2xl font-black py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-extrabold text-sm shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 transition"
              >
                <UserCheck className="w-4 h-4" />
                <span>Verify & Sign In</span>
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
