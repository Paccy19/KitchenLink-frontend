import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { useVendor } from '../../context/VendorContext';
import { parseCoords } from './KitchenCoordinatesPicker';
import KitchenLocationFields from './KitchenLocationFields';

const coordText = (value) => (value == null ? '' : Number(value).toFixed(6));

/**
 * Profile setting: where the kitchen is. The vendor registers the kitchen's
 * coordinates (typed or picked on the map) plus the address and neighbourhood
 * customers read, and can edit them whenever the kitchen moves. The store
 * shows on the map at these coordinates only while it is open.
 */
export default function KitchenLocationCard() {
  const { vendor, updateVendorProfile } = useVendor();
  const savedLat = coordText(vendor?.liveLocation?.lat);
  const savedLng = coordText(vendor?.liveLocation?.lng);

  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [point, setPoint] = useState({ lat: '', lng: '' });
  const [status, setStatus] = useState('idle'); // idle | saving | saved
  const [error, setError] = useState('');

  useEffect(() => {
    if (!vendor) return;
    setAddress(vendor.address || '');
    setNeighborhood(vendor.neighborhood || '');
  }, [vendor?.address, vendor?.neighborhood]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setPoint({ lat: savedLat, lng: savedLng });
  }, [savedLat, savedLng]);

  if (!vendor) return null;

  const coords = parseCoords(point);
  const savedCoords = parseCoords({ lat: savedLat, lng: savedLng });
  const coordsChanged =
    coords && savedCoords
      ? Math.abs(coords.latitude - savedCoords.latitude) > 1e-7 ||
        Math.abs(coords.longitude - savedCoords.longitude) > 1e-7
      : point.lat.trim() !== savedLat || point.lng.trim() !== savedLng;
  const dirty =
    coordsChanged ||
    address.trim() !== (vendor.address || '') ||
    neighborhood.trim() !== (vendor.neighborhood || '');

  const edited = (setter) => (next) => {
    setter(next);
    setStatus('idle');
  };

  const save = async (event) => {
    event.preventDefault();
    if (!coords) {
      setError('Enter valid latitude and longitude for your kitchen, or pick it on the map.');
      return;
    }
    if (address.trim().length < 3) {
      setError('Enter the street address customers should see.');
      return;
    }
    setError('');
    setStatus('saving');
    try {
      await updateVendorProfile({
        location: {
          ...(coordsChanged ? coords : {}),
          address: address.trim(),
          neighborhood: neighborhood.trim(),
        },
      });
      setStatus('saved');
    } catch (err) {
      setError(err?.message || 'Could not update your location.');
      setStatus('idle');
    }
  };

  const inputClass =
    'w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-200 focus:border-[#542813] focus:ring-2 focus:ring-[#542813]/10 outline-none';

  return (
    <form onSubmit={save} className="rounded-3xl bg-white border border-stone-200/80 shadow-sm p-5 sm:p-6 space-y-4">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Kitchen location</p>
        <p className="text-xs text-stone-500 mt-1">
          Type your neighbourhood to see it on the map, then your street to place the pin, and drag it to
          your exact spot. While your store is open, customers see your kitchen on the map here. Update it if
          your kitchen moves.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      <KitchenLocationFields
        area={neighborhood}
        address={address}
        coords={point}
        onChange={(patch) => {
          if (patch.area !== undefined) setNeighborhood(patch.area);
          if (patch.address !== undefined) setAddress(patch.address);
          if (patch.coords !== undefined) setPoint(patch.coords);
          setStatus('idle');
        }}
        inputClass={() => inputClass}
        areaLabel="Neighbourhood"
      />

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!dirty || status === 'saving'}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] hover:from-[#3d1b0c] text-white font-bold text-sm shadow-md transition active:scale-95 disabled:opacity-50"
        >
          {status === 'saving' ? 'Saving…' : 'Save location'}
        </button>
        {status === 'saved' && !dirty && (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
            <Check className="w-4 h-4" /> Location updated
          </span>
        )}
        {coordsChanged && (
          <button
            type="button"
            onClick={() => edited(setPoint)({ lat: savedLat, lng: savedLng })}
            className="text-xs font-bold text-stone-500 hover:text-stone-700"
          >
            Undo coordinate change
          </button>
        )}
      </div>
    </form>
  );
}
