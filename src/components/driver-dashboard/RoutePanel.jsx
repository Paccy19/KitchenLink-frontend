import React from 'react';
import { ExternalLink, MapPin, Navigation, Store, AlertTriangle } from 'lucide-react';

/**
 * Visual route panel between the vendor pickup (origin) and the customer drop-off.
 * Embeds an OpenStreetMap iframe (no API key, no new dependency) and offers a
 * one-tap "Open in Google Maps" directions fallback.
 *
 * @param {{pickup?: {lat:number, lng:number, address?:string},
 *          dropoff?: {lat:number, lng:number, address?:string},
 *          className?: string}} props
 */
export default function RoutePanel({ pickup, dropoff, className }) {
  const origin = pickup && pickup.lat != null && pickup.lng != null
    ? { lat: pickup.lat, lng: pickup.lng }
    : null;
  const destination = dropoff && dropoff.lat != null && dropoff.lng != null
    ? { lat: dropoff.lat, lng: dropoff.lng }
    : null;

  if (!origin || !destination) {
    return (
      <div className={`rounded-3xl bg-amber-50 border border-amber-200 p-5 flex items-start gap-3 ${className || ''}`}>
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
        <p className="text-sm text-amber-800 font-medium">
          Location coordinates are missing for this delivery, so live directions are unavailable.
        </p>
      </div>
    );
  }

  const mapEmbedSrc = (() => {
    const midLat = (origin.lat + destination.lat) / 2;
    const midLng = (origin.lng + destination.lng) / 2;
    const dLat = Math.abs(origin.lat - destination.lat);
    const dLng = Math.abs(origin.lng - destination.lng);
    const padY = Math.max(0.01, dLat * 0.5 + 0.015);
    const padX = Math.max(0.01, dLng * 0.5 + 0.015);
    const bbox = [
      midLng - padX,
      midLat - padY,
      midLng + padX,
      midLat + padY,
    ]
      .map((n) => n.toFixed(6))
      .join(',');
    const marker = destination.lat.toFixed(6).concat(',').concat(destination.lng.toFixed(6));
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${marker}`;
  })();

  const gmapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&travelmode=driving`;

  return (
    <div className={`rounded-3xl bg-white border border-stone-200/80 shadow-sm p-5 ${className || ''}`}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Route</p>
        <a
          href={gmapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#3b5327] hover:text-[#1c2b12]"
        >
          <ExternalLink className="w-3.5 h-3.5" /> Open in Google Maps
        </a>
      </div>

      <div className="flex items-center gap-2 text-xs font-bold text-stone-500 mb-3 flex-wrap">
        <span className="inline-flex items-center gap-1.5 text-[#3b5327]">
          <Store className="w-4 h-4 text-[#3b5327]" /> Vendor
        </span>
        <span className="h-px w-5 bg-stone-300 mx-1" />
        <span className="inline-flex items-center gap-1.5 text-emerald-700">
          <MapPin className="w-4 h-4 text-emerald-600" /> Customer
        </span>
      </div>

      <div className="relative aspect-[16/9] rounded-2xl overflow-hidden bg-stone-100">
        <iframe
          title="Pickup to drop-off map"
          src={mapEmbedSrc}
          className="absolute inset-0 w-full h-full border-0"
          loading="lazy"
          allowFullScreen
        />
        <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/90 text-[11px] font-bold text-stone-600 shadow-sm">
          <Navigation className="w-3 h-3 text-emerald-600" />
          Drop-off marker
        </span>
      </div>
    </div>
  );
}