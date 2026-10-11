import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, ShieldCheck, Store } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { login, authBusy, error: contextError } = useAdmin();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setError('');
    try {
      await login(email.trim(), password);
      navigate('/admin-dashboard');
    } catch (err) {
      setError(err?.message || 'Could not sign in.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f6f8] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#111827] via-[#1f2937] to-[#0b1220] mx-auto flex items-center justify-center shadow-md">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <h1 className="mt-4 text-2xl font-black text-gray-900 tracking-tight">Admin Sign In</h1>
          <p className="mt-1 text-sm text-stone-500">
            Secure access to the FoodKitchen admin panel.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="bg-white rounded-3xl border border-stone-200/80 shadow-sm p-6 sm:p-8 space-y-4"
        >
          <div>
            <label className="text-xs font-bold text-stone-500 block mb-1.5">Email address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3.5" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@foodkitchen.rw"
                autoComplete="username"
                required
                className="w-full pl-9 pr-3 py-3 text-sm rounded-xl border border-stone-200 focus:border-[#1f2937] focus:ring-2 focus:ring-[#1f2937]/10 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-stone-500 block mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3.5" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                className="w-full pl-9 pr-3 py-3 text-sm rounded-xl border border-stone-200 focus:border-[#1f2937] focus:ring-2 focus:ring-[#1f2937]/10 outline-none"
              />
            </div>
          </div>

          {(error || contextError) && (
            <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {error || contextError}
            </p>
          )}

          <button
            type="submit"
            disabled={authBusy}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#111827] via-[#1f2937] to-[#0b1220] hover:from-[#1f2937] text-white font-bold text-sm shadow-md transition active:scale-95 disabled:opacity-60"
          >
            {authBusy ? 'Signing in…' : 'Sign in'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-4 text-center text-xs font-bold text-stone-500">
          <Link to="/" className="hover:text-[#1f2937] inline-flex items-center gap-1.5">
            <Store className="w-3.5 h-3.5" />
            Back to marketplace
          </Link>
        </div>
      </div>
    </div>
  );
}
