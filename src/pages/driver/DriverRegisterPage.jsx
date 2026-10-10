import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bike, Phone, ArrowRight, User, Truck, ShieldCheck } from 'lucide-react';
import { useDriver } from '../../context/DriverContext';
import { DRIVER_VEHICLES } from '../../api/driverApi';

export default function DriverRegisterPage() {
  const navigate = useNavigate();
  const { registerDriver, authBusy, error: contextError } = useDriver();

  const [form, setForm] = useState({
    name: '',
    phone: '',
    vehicleType: 'motorcycle',
    plateNumber: '',
    email: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    if (form.name.trim().length < 2) {
      setError('Enter your full name.');
      return;
    }
    if (form.phone.replace(/\D/g, '').length < 9) {
      setError('Enter a valid phone number.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      await registerDriver({ ...form, name: form.name.trim(), email: form.email.trim() });
      navigate('/driver-login');
    } catch (err) {
      setError(err?.message || 'Could not create your account.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#faf7f4] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1c2b12] via-[#3b5327] to-[#12200b] mx-auto flex items-center justify-center shadow-md">
            <Bike className="w-7 h-7 text-[#eef5e5]" />
          </div>
          <h1 className="mt-4 text-2xl font-black text-gray-900 tracking-tight">Become a Driver</h1>
          <p className="mt-1 text-sm text-stone-500">
            Deliver orders and earn on every trip. Sign in with a code when you’re done.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="bg-white rounded-3xl border border-stone-200/80 shadow-sm p-6 sm:p-8 space-y-4"
        >
          <div>
            <label className="text-xs font-bold text-stone-500 block mb-1.5">Full name</label>
            <input
              type="text"
              value={form.name}
              onChange={set('name')}
              placeholder="e.g. Eric Uwimana"
              autoComplete="name"
              required
              className="w-full px-3 py-3 text-sm rounded-xl border border-stone-200 focus:border-[#3b5327] focus:ring-2 focus:ring-[#3b5327]/10 outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-stone-500 block mb-1.5">Phone number</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-3.5" />
              <input
                type="tel"
                value={form.phone}
                onChange={set('phone')}
                placeholder="+250 788 000 000"
                autoComplete="tel"
                required
                className="w-full pl-9 pr-3 py-3 text-sm rounded-xl border border-stone-200 focus:border-[#3b5327] focus:ring-2 focus:ring-[#3b5327]/10 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-stone-500 block mb-1.5">Vehicle</label>
              <select
                value={form.vehicleType}
                onChange={set('vehicleType')}
                className="w-full px-3 py-3 text-sm rounded-xl border border-stone-200 focus:border-[#3b5327] focus:ring-2 focus:ring-[#3b5327]/10 outline-none bg-white"
              >
                {DRIVER_VEHICLES.map((vehicle) => (
                  <option key={vehicle} value={vehicle}>
                    {vehicle.charAt(0).toUpperCase() + vehicle.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-stone-500 block mb-1.5">Plate number</label>
              <div className="relative">
                <Truck className="w-4 h-4 text-stone-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  value={form.plateNumber}
                  onChange={set('plateNumber')}
                  placeholder="RAD 101 A"
                  className="w-full pl-9 pr-3 py-3 text-sm rounded-xl border border-stone-200 focus:border-[#3b5327] focus:ring-2 focus:ring-[#3b5327]/10 outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-stone-500 block mb-1.5">
              Email <span className="font-medium text-stone-400">(optional)</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={set('email')}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full px-3 py-3 text-sm rounded-xl border border-stone-200 focus:border-[#3b5327] focus:ring-2 focus:ring-[#3b5327]/10 outline-none"
            />
          </div>

          {(error || contextError) && (
            <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {error || contextError}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || authBusy}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#1c2b12] via-[#3b5327] to-[#12200b] hover:from-[#2a3f1b] text-white font-bold text-sm shadow-md transition active:scale-95 disabled:opacity-60"
          >
            {busy ? 'Creating account…' : 'Create driver account'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-xs font-bold text-stone-500">
          <Link to="/driver-login" className="hover:text-[#3b5327] inline-flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" /> Already a driver? Log in
          </Link>
          <Link to="/" className="hover:text-[#3b5327] inline-flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" /> Back to marketplace
          </Link>
        </div>
      </div>
    </div>
  );
}