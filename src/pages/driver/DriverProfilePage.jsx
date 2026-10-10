import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bike, User, Phone, Mail, Truck, Star, Power, LogOut, MapPin, Camera } from 'lucide-react';
import { useDriver } from '../../context/DriverContext';

const VEHICLE_LABEL = {
  motorcycle: 'Motorcycle',
  scooter: 'Scooter',
  bicycle: 'Bicycle',
  car: 'Car',
  foot: 'On foot',
  bike: 'Bike',
  truck: 'Truck',
};

export default function DriverProfilePage() {
  const navigate = useNavigate();
  const { driver, stats, toggleOnline, shareLocation, sharingLocation, logout, updateDriverProfile } = useDriver();
  const [avatarUrl, setAvatarUrl] = useState(driver?.avatar || '');
  const avatarInputRef = useRef(null);

  if (!driver) return null;

  const goOnline = async () => {
    await toggleOnline().catch(() => {});
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !/^image\/(jpeg|png|webp|gif)$/i.test(file.type)) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUri = String(reader.result);
      setAvatarUrl(dataUri);
      updateDriverProfile({ avatar: dataUri }).catch(() => setAvatarUrl(driver.avatar || ''));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-gray-900 tracking-tight">Profile & Settings</h1>

      {/* Identity card */}
      <div className="rounded-3xl bg-gradient-to-br from-[#1c2b12] via-[#3b5327] to-[#12200b] text-white shadow-md p-6 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="relative">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={driver.name}
                className="w-16 h-16 rounded-3xl object-cover ring-1 ring-white/30"
              />
            ) : (
              <div className="w-16 h-16 rounded-3xl bg-white/15 ring-1 ring-white/30 flex items-center justify-center text-2xl font-black">
                {driver.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              title="Upload profile picture"
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white text-[#3b5327] flex items-center justify-center shadow-md hover:bg-[#f2f7ef] transition active:scale-90"
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
            <p className="text-xl font-black truncate">{driver.name}</p>
            <p className="text-sm text-white/70 font-medium">
              {VEHICLE_LABEL[driver.vehicleType] || driver.vehicleType}
              {driver.plateNumber ? ` · ${driver.plateNumber}` : ''}
            </p>
            <p className="text-xs text-white/60 mt-0.5">{driver.phone}</p>
          </div>
          <div className="flex items-center gap-4 text-center sm:text-right">
            <div>
              <p className="text-2xl font-black">{stats.completedTotal}</p>
              <p className="text-[11px] text-white/70 font-bold uppercase">Trips</p>
            </div>
            <div>
              <p className="text-2xl font-black">{stats.rating?.toFixed(1)}</p>
              <p className="text-[11px] text-white/70 font-bold uppercase">Rating</p>
            </div>
            <div>
              <p className="text-2xl font-black">{stats.earningsTotal.toLocaleString()}</p>
              <p className="text-[11px] text-white/70 font-bold uppercase">RWF earned</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Contact details */}
        <div className="rounded-3xl bg-white border border-stone-200/80 shadow-sm p-5 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Details</p>
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-stone-100 text-stone-500 flex items-center justify-center"><User className="w-4 h-4" /></span>
            <div>
              <p className="text-xs text-stone-400 font-bold">Name</p>
              <p className="text-sm font-bold text-gray-900">{driver.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-stone-100 text-stone-500 flex items-center justify-center"><Phone className="w-4 h-4" /></span>
            <div>
              <p className="text-xs text-stone-400 font-bold">Phone</p>
              <p className="text-sm font-bold text-gray-900">{driver.phone}</p>
            </div>
          </div>
          {driver.email && (
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-stone-100 text-stone-500 flex items-center justify-center"><Mail className="w-4 h-4" /></span>
              <div>
                <p className="text-xs text-stone-400 font-bold">Email</p>
                <p className="text-sm font-bold text-gray-900">{driver.email}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-stone-100 text-stone-500 flex items-center justify-center"><Truck className="w-4 h-4" /></span>
            <div>
              <p className="text-xs text-stone-400 font-bold">Vehicle</p>
              <p className="text-sm font-bold text-gray-900">
                {VEHICLE_LABEL[driver.vehicleType] || driver.vehicleType}
                {driver.plateNumber ? ` · ${driver.plateNumber}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-stone-100 text-stone-500 flex items-center justify-center"><Star className="w-4 h-4" /></span>
            <div>
              <p className="text-xs text-stone-400 font-bold">Verification</p>
              <p className="text-sm font-bold text-gray-900">{driver.verificationStatus}</p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-4">
          <div className="rounded-3xl bg-white border border-stone-200/80 shadow-sm p-5 space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Availability</p>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-gray-900">
                  {stats.isOnline ? 'Online — receiving offers' : 'Offline'}
                </p>
                <p className="text-xs text-stone-500 font-medium">
                  {stats.isOnline
                    ? `${stats.activeDeliveries} active · max ${driver.maxActiveDeliveries}`
                    : 'Going offline reassigns your active deliveries'}
                </p>
              </div>
              <span
                className={`w-12 h-7 rounded-full relative transition-colors ${
                  stats.isOnline ? 'bg-emerald-600' : 'bg-stone-300'
                }`}
              >
                <span
                  className="absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform"
                  style={{ transform: stats.isOnline ? 'translateX(20px)' : 'translateX(0)' }}
                />
              </span>
            </div>
            <button
              type="button"
              onClick={goOnline}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-stone-900 text-white text-sm font-black transition active:scale-95"
            >
              <Power className="w-4 h-4" />
              {stats.isOnline ? 'Go offline' : 'Go online'}
            </button>
          </div>

          <div className="rounded-3xl bg-white border border-stone-200/80 shadow-sm p-5 space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Location</p>
            {driver.currentLocation?.latitude != null ? (
              <div className="flex items-start gap-3">
                <span className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center"><MapPin className="w-4 h-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-gray-900">
                    {driver.currentLocation.latitude.toFixed(5)}, {driver.currentLocation.longitude.toFixed(5)}
                  </p>
                  <p className="text-xs text-stone-500 font-medium">Last location shared</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-stone-500 font-medium">No location shared yet.</p>
            )}
            <button
              type="button"
              onClick={() => shareLocation().catch(() => {})}
              disabled={sharingLocation}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-[#f5f8f2] border border-[#d9e5d0] text-[#3b5327] text-sm font-black transition active:scale-95 disabled:opacity-60"
            >
              <Bike className="w-4 h-4" />
              {sharingLocation ? 'Sharing…' : 'Share my current location'}
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/driver-login');
            }}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-3xl bg-red-50 border border-red-200 text-red-700 text-sm font-black hover:bg-red-100 transition active:scale-95"
          >
            <LogOut className="w-4 h-4" />
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}