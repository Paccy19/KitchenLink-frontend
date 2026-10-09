import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Store,
  User,
  Phone,
  MapPin,
  FileText,
  Clock,
  CreditCard,
  Upload,
  Check,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BadgeCheck,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { useVendor } from '../../context/VendorContext';
import { useToast } from '../../components/common/Toast';
import {
  VENDOR_TYPE_OPTIONS,
  FOOD_CATEGORY_OPTIONS,
} from '../../data/vendorMockData';

const STEPS = [
  { id: 1, label: 'Business', icon: Store },
  { id: 2, label: 'Operations', icon: MapPin },
  { id: 3, label: 'Verification', icon: ShieldCheck },
];

const INITIAL = {
  name: '',
  type: VENDOR_TYPE_OPTIONS[0],
  ownerName: '',
  phone: '',
  email: '',
  description: '',
  location: '',
  address: '',
  foodCategories: [],
  openTime: '08:00',
  closeTime: '20:00',
  payoutMethod: 'MTN Mobile Money',
  payoutNumber: '',
  documents: [],
  sampleData: true,
  agree: false,
};

export default function VendorRegisterPage() {
  const navigate = useNavigate();
  const { registerVendor } = useVendor();
  const { success } = useToast();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [created, setCreated] = useState(null);

  const update = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const toggleCategory = (category) => {
    update({
      foodCategories: form.foodCategories.includes(category)
        ? form.foodCategories.filter((entry) => entry !== category)
        : [...form.foodCategories, category],
    });
  };

  const handleDocuments = (event) => {
    const files = Array.from(event.target.files || []).map((file) => file.name);
    update({ documents: [...new Set([...form.documents, ...files])] });
  };

  const validateStep = (current) => {
    const next = {};
    if (current === 1) {
      if (!form.name.trim()) next.name = 'Business name is required.';
      if (!form.ownerName.trim()) next.ownerName = 'Owner name is required.';
      if (!form.phone.trim()) next.phone = 'Phone number is required.';
      else if (form.phone.replace(/\D/g, '').length < 9) next.phone = 'Enter a valid phone number.';
    }
    if (current === 2) {
      if (!form.location.trim()) next.location = 'Location is required.';
      if (form.foodCategories.length === 0) next.foodCategories = 'Select at least one food category.';
    }
    if (current === 3) {
      if (!form.payoutNumber.trim()) next.payoutNumber = 'Payout number/account is required.';
      if (!form.agree) next.agree = 'Please accept the vendor agreement.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    setStep((prev) => Math.min(3, prev + 1));
  };
  const goBack = () => {
    setErrors({});
    setStep((prev) => Math.max(1, prev - 1));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validateStep(3)) return;

    const operatingHours = `${formatTime(form.openTime)} – ${formatTime(form.closeTime)}`;
    const vendor = registerVendor(
      {
        ...form,
        operatingHours,
      },
      { sampleData: form.sampleData },
    );

    setCreated(vendor);
    success('Vendor account created successfully!');
  };

  if (created) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 animate-fade-in">
        <div className="bg-white rounded-3xl border border-stone-200/80 shadow-sm p-8 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
            <BadgeCheck className="w-9 h-9" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">You're all set, {created.name}!</h1>
            <p className="text-sm text-stone-500 mt-1 max-w-md mx-auto">
              Your vendor account has been created and is now{' '}
              <span className="font-bold text-amber-600">pending verification</span>. You can already explore your
              dashboard and set up your menu.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            <Summary label="Vendor type" value={created.type} />
            <Summary label="Location" value={created.location} />
            <Summary label="Status" value={created.verificationStatus} />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              to="/vendor-dashboard"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] text-white font-bold text-sm shadow-md transition active:scale-95"
            >
              Go to Vendor Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-sm transition active:scale-95"
            >
              Back to marketplace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 animate-fade-in">
      <div className="text-center mb-8">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#faf6f2] text-[#3d1b0c] border border-[#ebd7c5] text-[11px] font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          Turn your cooking into a business
        </span>
        <h1 className="mt-3 text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
          Become a Vendor
        </h1>
        <p className="mt-1 text-sm text-stone-500 max-w-lg mx-auto">
          Create your digital storefront on Online Food Kitchen in a few steps — no restaurant required.
        </p>
      </div>

      {/* Steps */}
      <div className="flex items-center justify-between mb-8">
        {STEPS.map((entry, index) => {
          const Icon = entry.icon;
          const isActive = step === entry.id;
          const isDone = step > entry.id;
          return (
            <React.Fragment key={entry.id}>
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black transition ${
                    isDone
                      ? 'bg-emerald-500 text-white'
                      : isActive
                      ? 'bg-gradient-to-br from-[#2b1206] to-[#542813] text-white shadow-md'
                      : 'bg-white text-stone-400 border border-stone-200'
                  }`}
                >
                  {isDone ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </div>
                <span className={`text-[11px] font-bold ${isActive || isDone ? 'text-[#542813]' : 'text-stone-400'}`}>
                  {entry.label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 sm:mx-4 ${step > entry.id ? 'bg-emerald-400' : 'bg-stone-200'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-stone-200/80 shadow-sm p-6 sm:p-8 space-y-6">
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <StepHeader title="Business details" subtitle="Tell customers who you are" />
            <Field label="Business / vendor name" error={errors.name} icon={Store}>
              <input
                type="text"
                value={form.name}
                onChange={(event) => update({ name: event.target.value })}
                placeholder="e.g. Mama Grace Kitchen"
                className={inputClass(errors.name)}
              />
            </Field>

            <Field label="Vendor type">
              <select value={form.type} onChange={(event) => update({ type: event.target.value })} className={inputClass()}>
                {VENDOR_TYPE_OPTIONS.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Owner name" error={errors.ownerName} icon={User}>
                <input
                  type="text"
                  value={form.ownerName}
                  onChange={(event) => update({ ownerName: event.target.value })}
                  placeholder="Full name"
                  className={inputClass(errors.ownerName)}
                />
              </Field>
              <Field label="Phone number" error={errors.phone} icon={Phone}>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(event) => update({ phone: event.target.value })}
                  placeholder="+250 7XX XXX XXX"
                  className={inputClass(errors.phone)}
                />
              </Field>
            </div>

            <Field label="Email (optional)">
              <input
                type="email"
                value={form.email}
                onChange={(event) => update({ email: event.target.value })}
                placeholder="you@example.rw"
                className={inputClass()}
              />
            </Field>

            <Field label="Description" icon={FileText}>
              <textarea
                value={form.description}
                onChange={(event) => update({ description: event.target.value })}
                rows={3}
                placeholder="Describe your food, story and what makes it special…"
                className={`${inputClass()} resize-none`}
              />
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <StepHeader title="Operations" subtitle="Where you cook and what you serve" />
            <Field label="Location / area" error={errors.location} icon={MapPin}>
              <input
                type="text"
                value={form.location}
                onChange={(event) => update({ location: event.target.value })}
                placeholder="e.g. Kimironko, Kigali"
                className={inputClass(errors.location)}
              />
            </Field>

            <Field label="Full address (optional)">
              <input
                type="text"
                value={form.address}
                onChange={(event) => update({ address: event.target.value })}
                placeholder="Street, landmark"
                className={inputClass()}
              />
            </Field>

            <div>
              <label className="text-xs font-bold text-stone-500 block mb-2">Food categories</label>
              <div className="flex flex-wrap gap-2">
                {FOOD_CATEGORY_OPTIONS.map((category) => {
                  const active = form.foodCategories.includes(category);
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => toggleCategory(category)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition active:scale-95 ${
                        active
                          ? 'bg-[#542813] text-white border-transparent'
                          : 'bg-white text-stone-600 border-stone-200 hover:border-[#d9bda6] hover:text-[#542813]'
                      }`}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>
              {errors.foodCategories && (
                <p className="text-[11px] text-red-500 font-semibold mt-1.5">{errors.foodCategories}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Opens at" icon={Clock}>
                <input
                  type="time"
                  value={form.openTime}
                  onChange={(event) => update({ openTime: event.target.value })}
                  className={inputClass()}
                />
              </Field>
              <Field label="Closes at" icon={Clock}>
                <input
                  type="time"
                  value={form.closeTime}
                  onChange={(event) => update({ closeTime: event.target.value })}
                  className={inputClass()}
                />
              </Field>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <StepHeader title="Verification & payout" subtitle="Build trust and get paid" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Payout method" icon={CreditCard}>
                <select
                  value={form.payoutMethod}
                  onChange={(event) => update({ payoutMethod: event.target.value })}
                  className={inputClass()}
                >
                  <option>MTN Mobile Money</option>
                  <option>Airtel Money</option>
                  <option>Bank Transfer</option>
                </select>
              </Field>
              <Field label="Payout number / account" error={errors.payoutNumber}>
                <input
                  type="text"
                  value={form.payoutNumber}
                  onChange={(event) => update({ payoutNumber: event.target.value })}
                  placeholder="e.g. 0788 123 456"
                  className={inputClass(errors.payoutNumber)}
                />
              </Field>
            </div>

            <div>
              <label className="text-xs font-bold text-stone-500 block mb-2">
                Verification documents (ID, food permit…)
              </label>
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-stone-300 hover:border-[#8a5332] hover:bg-[#faf6f2] rounded-2xl py-6 cursor-pointer transition">
                <Upload className="w-6 h-6 text-[#8a5332]" />
                <span className="text-xs font-bold text-stone-600">Click to upload documents</span>
                <span className="text-[11px] text-stone-400">PDF, JPG or PNG (max 5 MB each)</span>
                <input type="file" multiple accept="image/*,.pdf" className="hidden" onChange={handleDocuments} />
              </label>
              {form.documents.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {form.documents.map((name) => (
                    <li key={name} className="flex items-center gap-2 text-xs text-stone-600 font-medium">
                      <FileText className="w-3.5 h-3.5 text-[#8a5332]" />
                      {name}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <label className="flex items-start gap-3 p-4 rounded-2xl bg-[#faf6f2] border border-[#ebd7c5] cursor-pointer">
              <input
                type="checkbox"
                checked={form.sampleData}
                onChange={(event) => update({ sampleData: event.target.checked })}
                className="mt-0.5 w-4 h-4 accent-[#542813]"
              />
              <span className="text-xs text-[#3d1b0c] font-medium">
                <span className="font-bold block">Preload sample menu & orders</span>
                Explore the dashboard right away with demo dishes and orders. Uncheck to start with a clean kitchen.
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.agree}
                onChange={(event) => update({ agree: event.target.checked })}
                className="mt-0.5 w-4 h-4 accent-[#542813]"
              />
              <span className="text-xs text-stone-600 font-medium">
                I confirm the information is accurate and agree to the Online Food Kitchen vendor terms & commission
                policy.
              </span>
            </label>
            {errors.agree && <p className="text-[11px] text-red-500 font-semibold">{errors.agree}</p>}
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-stone-100">
          {step > 1 ? (
            <button
              type="button"
              onClick={goBack}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-sm transition active:scale-95"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          ) : (
            <Link
              to="/"
              className="text-xs font-bold text-stone-500 hover:text-[#542813] transition"
            >
              Cancel
            </Link>
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={goNext}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] hover:from-[#3d1b0c] text-white font-bold text-sm shadow-md transition active:scale-95"
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] hover:from-[#3d1b0c] text-white font-bold text-sm shadow-md transition active:scale-95"
            >
              <BadgeCheck className="w-4 h-4 text-[#d9bda6]" />
              Create Vendor Account
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function StepHeader({ title, subtitle }) {
  return (
    <div>
      <h2 className="text-lg font-black text-gray-900">{title}</h2>
      <p className="text-xs text-stone-400 font-medium">{subtitle}</p>
    </div>
  );
}

function Field({ label, error, icon: Icon, children }) {
  return (
    <div>
      <label className="text-xs font-bold text-stone-500 block mb-1.5">{label}</label>
      <div className="relative">
        {Icon && <Icon className="w-4 h-4 text-stone-400 absolute left-3 top-3.5 pointer-events-none" />}
        <div className={Icon ? '[&_input]:pl-9 [&_select]:pl-9 [&_textarea]:pl-9' : ''}>{children}</div>
      </div>
      {error && <p className="text-[11px] text-red-500 font-semibold mt-1">{error}</p>}
    </div>
  );
}

function Summary({ label, value }) {
  return (
    <div className="rounded-2xl bg-stone-50 border border-stone-100 p-3">
      <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">{label}</p>
      <p className="mt-1 text-sm font-bold text-gray-900 truncate">{value}</p>
    </div>
  );
}

function inputClass(error) {
  return `w-full text-sm p-3 rounded-xl border outline-none transition ${
    error ? 'border-red-300 focus:border-red-400' : 'border-stone-200 focus:border-[#542813] focus:ring-2 focus:ring-[#542813]/10'
  }`;
}

function formatTime(value) {
  if (!value) return '';
  const [hour, minute] = value.split(':').map(Number);
  const period = hour >= 12 ? 'PM' : 'AM';
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(display).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${period}`;
}
