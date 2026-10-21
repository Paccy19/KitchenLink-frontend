import React, { useState } from 'react';
import { Crosshair, Info, Loader2 } from 'lucide-react';
import { fetchPlaceAt, fetchPlaceDetails } from '../../api/endpoints';
import KitchenCoordinatesPicker from './KitchenCoordinatesPicker';
import PlaceSearchInput from './PlaceSearchInput';

// An area found only as a point (no outline or box) is shown as this circle.
const APPROX_AREA_KM = 1;

function approxCircle({ lat, lng }, radiusKm) {
  const dLat = radiusKm / 110.574;
  const dLng = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  const ring = Array.from({ length: 49 }, (_, i) => {
    const angle = (i / 48) * 2 * Math.PI;
    return [lng + dLng * Math.cos(angle), lat + dLat * Math.sin(angle)];
  });
  return { type: 'Polygon', coordinates: [ring] };
}

// Above this GPS uncertainty the vendor is asked to check the pin.
const ROUGH_FIX_M = 50;

/** The device's GPS position, only when the vendor asks for it. */
function detectPosition() {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      reject(new Error('Location detection needs a secure (https) connection. Search or tap the map instead.'));
      return;
    }
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('This browser cannot detect your location. Search or tap the map instead.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracyM: Math.round(position.coords.accuracy ?? 0),
        }),
      (geoError) => {
        const messages = {
          1: 'Location permission was denied. Allow location for this site, or search / tap the map instead.',
          2: 'Your location is unavailable right now. Turn on GPS / location services and try again.',
          3: 'Detecting your location took too long. Move to an open area and try again.',
        };
        reject(new Error(messages[geoError?.code] || 'Could not detect your location. Please try again.'));
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  });
}

/** Full place for a suggestion; falls back to what the suggestion already has. */
async function resolvePlace(suggestion) {
  try {
    const { place } = await fetchPlaceDetails(suggestion.id);
    if (Number.isFinite(place?.lat) && Number.isFinite(place?.lng)) return place;
  } catch {
    // Outline lookup failed: the suggestion's own position is still usable.
  }
  return Number.isFinite(suggestion.lat) ? suggestion : null;
}

/**
 * The kitchen location inputs used at registration and in profile settings,
 * working like a maps search: typing the area shows its whole zone on the
 * map; picking the street zooms to it and drops the pin there, which sets the
 * coordinates. The vendor can then drag the pin to the exact door.
 *
 * Values: `area`, `address` (text) and `coords` ({ lat, lng } strings);
 * `onChange(patch)` receives any of them.
 */
export default function KitchenLocationFields({
  area,
  address,
  coords,
  onChange,
  errors = {},
  inputClass,
  areaLabel = 'Area / neighbourhood',
  addressLabel = 'Street address',
}) {
  const [focus, setFocus] = useState(null);
  const [areaCenter, setAreaCenter] = useState(null);
  const [notice, setNotice] = useState('');
  const [failed, setFailed] = useState('');
  const [locating, setLocating] = useState(false);

  // Optional: the vendor is at the kitchen now and lets the device detect it.
  const useCurrentLocation = async () => {
    setFailed('');
    setLocating(true);
    try {
      const here = await detectPosition();
      onChange({ coords: { lat: here.lat.toFixed(6), lng: here.lng.toFixed(6) } });
      setAreaCenter({ lat: here.lat, lng: here.lng });
      setFocus({ center: { lat: here.lat, lng: here.lng }, zoom: 17 });
      setNotice(
        here.accuracyM > ROUGH_FIX_M
          ? `Location detected, accurate to about ${here.accuracyM} m. Check the pin and drag it to your kitchen's exact spot.`
          : 'Location detected. Check the pin is on your kitchen and drag it if needed.',
      );
      // Fill in the area and street the map knows here, without replacing what was typed.
      try {
        const found = await fetchPlaceAt(here);
        const patch = {};
        if (!String(area ?? '').trim() && found?.area) patch.area = found.area;
        if (!String(address ?? '').trim() && found?.street) {
          patch.address = found.area ? `${found.street}, ${found.area}` : found.street;
        }
        if (Object.keys(patch).length) onChange(patch);
      } catch {
        // The coordinates are set; the vendor can still type the address.
      }
    } catch (err) {
      setFailed(err.message);
    } finally {
      setLocating(false);
    }
  };

  const pickArea = async (suggestion) => {
    onChange({ area: suggestion.name });
    setFailed('');
    const place = await resolvePlace(suggestion);
    if (!place) {
      setFailed('We could not show that area. Move the map to it yourself.');
      return;
    }
    const center = { lat: place.lat, lng: place.lng };
    setAreaCenter(center);
    if (place.zone) {
      setFocus({ bounds: place.bounds, center, zone: place.zone, maxZoom: 16 });
    } else if (place.bounds && place.kind === 'area') {
      setFocus({ bounds: place.bounds, center, maxZoom: 16 });
    } else {
      setFocus({ center, zoom: 14, zone: approxCircle(center, APPROX_AREA_KM) });
    }
    setNotice(`Showing ${suggestion.name}. Now type your street to place your kitchen.`);
  };

  const pickStreet = async (suggestion) => {
    const where = (suggestion.secondary || '').split(', ').find((part) => part && part !== suggestion.name);
    onChange({ address: where ? `${suggestion.name}, ${where}` : suggestion.name });
    setFailed('');
    const place = await resolvePlace(suggestion);
    if (!place) {
      setFailed('We could not find that street on the map. Tap your kitchen on the map instead.');
      return;
    }
    onChange({ coords: { lat: Number(place.lat).toFixed(6), lng: Number(place.lng).toFixed(6) } });
    setFocus({ center: { lat: place.lat, lng: place.lng }, zoom: 17, line: place.line ?? null });
    setNotice(
      `Pin placed on ${suggestion.name}. Drag it (or tap the map) to your kitchen's exact spot.`,
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 rounded-2xl border border-[#ebd7c5] bg-[#faf6f2] p-3">
        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={locating}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#d9bda6] text-[#542813] text-xs font-bold hover:bg-[#f5ebe1] transition active:scale-95 disabled:opacity-60 flex-shrink-0"
        >
          {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4" />}
          {locating ? 'Detecting your location…' : 'Use my current location'}
        </button>
        <p className="text-[11px] text-stone-500 leading-snug">
          At your kitchen right now? Detect it automatically. Otherwise, search your area and street below
          or tap the map.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-xs font-bold text-stone-500 block mb-1.5">{areaLabel}</span>
          <PlaceSearchInput
            value={area}
            onChange={(text) => onChange({ area: text })}
            onSelect={pickArea}
            placeholder="e.g. Kimironko"
            maxLength={120}
            className={inputClass(errors.area)}
          />
          {errors.area && <span className="block text-[11px] text-red-500 font-semibold mt-1">{errors.area}</span>}
        </label>
        <label className="block">
          <span className="text-xs font-bold text-stone-500 block mb-1.5">{addressLabel}</span>
          <PlaceSearchInput
            value={address}
            onChange={(text) => onChange({ address: text })}
            onSelect={pickStreet}
            near={areaCenter}
            placeholder="e.g. KG 11 Ave"
            maxLength={200}
            className={inputClass(errors.address)}
          />
          {errors.address && (
            <span className="block text-[11px] text-red-500 font-semibold mt-1">{errors.address}</span>
          )}
        </label>
      </div>

      {(notice || failed) && (
        <p
          role="status"
          className={`flex items-start gap-1.5 text-[11px] font-semibold rounded-xl px-3 py-2 border ${
            failed ? 'text-amber-800 bg-amber-50 border-amber-200' : 'text-[#542813] bg-[#faf6f2] border-[#ebd7c5]'
          }`}
        >
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
          {failed || notice}
        </p>
      )}

      <KitchenCoordinatesPicker
        value={coords}
        onChange={(next) => onChange({ coords: next })}
        focus={focus}
        error={errors.coords}
        inputClass={inputClass(errors.coords)}
      />
    </div>
  );
}
