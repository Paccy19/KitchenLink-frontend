import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Store,
  User,
  Phone,
  FileText,
  Camera,
  BadgeCheck,
  MapPin,
  ExternalLink,
  Check,
  LogOut,
} from 'lucide-react';
import { useVendor } from '../../context/VendorContext';
import VendorTypeBadge from '../../components/common/VendorTypeBadge';
import KitchenLocationCard from '../../components/vendor-dashboard/KitchenLocationCard';
import VendorTypeCard from '../../components/vendor-dashboard/VendorTypeCard';
import { NAME_MAX_LENGTH, formatNameInput, PHONE_ERROR, PHONE_MAX_LENGTH, PHONE_PLACEHOLDER, isValidRwandaPhone, sanitizePhoneInput } from '../../utils/validation';

export default function VendorProfilePage() {
  const navigate = useNavigate();
  const { vendor, updateVendorProfile, logout } = useVendor();
  const [form, setForm] = useState({ name: '', ownerName: '', phone: '', description: '' });
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const avatarInputRef = useRef(null);

  useEffect(() => {
    if (!vendor) return;
    setForm({
      name: vendor.name || '',
      ownerName: vendor.ownerName || '',
      phone: vendor.phone || '',
      description: vendor.description || '',
    });
    setAvatarUrl(vendor.avatar || '');
  }, [vendor]);

  if (!vendor) return null;

  const update = (patch) => {
    setSaved(false);
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !/^image\/(jpeg|png|webp|gif)$/i.test(file.type)) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUri = String(reader.result);
      setAvatarUrl(dataUri);
      updateVendorProfile({ avatar: dataUri }).catch(() => setAvatarUrl(vendor.avatar || ''));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!isValidRwandaPhone(form.phone)) {
      setError(PHONE_ERROR);
      return;
    }
    setError('');
    setSaving(true);
    try {
      await updateVendorProfile({
        name: form.name,
        ownerName: form.ownerName,
        phone: form.phone,
        description: form.description,
      });
      setSaved(true);
    } catch (err) {
      setError(err?.message || 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-200 focus:border-[#542813] focus:ring-2 focus:ring-[#542813]/10 outline-none';

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-gray-900 tracking-tight">Kitchen Profile</h1>

      {/* Identity card */}
      <div className="rounded-3xl bg-gradient-to-br from-[#2b1206] via-[#481f0d] to-[#1c0a03] text-white shadow-md p-6 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="relative">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={vendor.name}
                className="w-16 h-16 rounded-3xl object-cover ring-1 ring-white/30"
              />
            ) : (
              <div className="w-16 h-16 rounded-3xl bg-white/15 ring-1 ring-white/30 flex items-center justify-center text-2xl font-black">
                {(vendor.name || 'K').slice(0, 1).toUpperCase()}
              </div>
            )}
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              title="Upload kitchen logo / profile picture"
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white text-[#542813] flex items-center justify-center shadow-md hover:bg-[#faf6f2] transition active:scale-90"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xl font-black truncate">{vendor.name}</p>
            <p className="text-sm text-white/70 font-medium flex flex-wrap items-center gap-2 mt-1">
              <VendorTypeBadge type={vendor.typeCode || vendor.type} />
              {vendor.ownerName ? <span>{vendor.ownerName}</span> : null}
            </p>
            <p className="text-xs text-white/60 mt-0.5 flex items-center gap-1.5">
              <BadgeCheck className="w-3.5 h-3.5" />
              {vendor.verificationStatus} Vendor
            </p>
          </div>
          <Link
            to={`/vendor/${vendor.id}`}
            className="inline-flex items-center gap-2 self-start sm:self-center rounded-full bg-white/10 hover:bg-white/20 border border-white/15 px-4 py-2 text-xs font-bold transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View public storefront
          </Link>
        </div>
      </div>

      <form onSubmit={handleSave} className="rounded-3xl bg-white border border-stone-200/80 shadow-sm p-5 sm:p-6 space-y-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Account details</p>

        {error && (
          <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-stone-500 block mb-1.5 flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5" /> Kitchen name
            </label>
            <input
              type="text"
              value={form.name}
              maxLength={NAME_MAX_LENGTH}
              onChange={(e) => update({ name: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-stone-500 block mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Owner name
            </label>
            <input
              type="text"
              value={form.ownerName}
              maxLength={NAME_MAX_LENGTH}
              onChange={(e) => update({ ownerName: formatNameInput(e.target.value) })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-stone-500 block mb-1.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> Phone
            </label>
            <input
              type="tel"
              inputMode="tel"
              maxLength={PHONE_MAX_LENGTH}
              placeholder={PHONE_PLACEHOLDER}
              value={form.phone}
              onChange={(e) => update({ phone: sanitizePhoneInput(e.target.value) })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-stone-500 block mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" /> Location
            </label>
            <input type="text" value={vendor.location || ''} disabled className={`${inputClass} bg-stone-50 text-stone-500`} />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-stone-500 block mb-1.5 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" /> Description
          </label>
          <textarea
            value={form.description}
            onChange={(e) => update({ description: e.target.value })}
            rows={4}
            className={`${inputClass} resize-none`}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] hover:from-[#3d1b0c] text-white font-bold text-sm shadow-md transition active:scale-95 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
              <Check className="w-4 h-4" /> Saved
            </span>
          )}
        </div>
      </form>

      <VendorTypeCard />

      <KitchenLocationCard />

      <button
        type="button"
        onClick={() => {
          logout();
          navigate('/vendor-login');
        }}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-3xl bg-red-50 border border-red-200 text-red-700 text-sm font-black hover:bg-red-100 transition active:scale-95"
      >
        <LogOut className="w-4 h-4" />
        Sign out
      </button>
    </div>
  );
}
