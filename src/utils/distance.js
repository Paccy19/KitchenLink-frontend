/**
 * Road distance for people: "850 m" under a kilometre, "2.35 km" above
 * (delivery is priced by the meter, so a few decimals are kept).
 * Falls back to km when only `distance_km` is known.
 */
export function formatDistance(meters, km = null) {
  const m = Number(meters);
  if (meters != null && Number.isFinite(m)) {
    if (m < 1000) return `${Math.round(m).toLocaleString()} m`;
    return `${(m / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 })} km`;
  }
  const k = Number(km);
  return km != null && Number.isFinite(k) ? `${k.toLocaleString(undefined, { maximumFractionDigits: 1 })} km` : '';
}
