import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { fetchPlaceDetails } from '../../api/endpoints';
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
