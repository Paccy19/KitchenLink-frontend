import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Lightbulb, LocateFixed } from 'lucide-react';
import { useVendor } from '../../context/VendorContext';
import VendorTypeBadge from '../common/VendorTypeBadge';
import { TYPE_FEATURES, getVendorType } from '../../data/vendorTypes';

/**
 * Kitchen dashboard: the features that suit this kitchen's type best (e.g.
 * Tomorrow's Special for Home Cooks, Offer Days for Caterers). Suggestions
 * only — every kitchen can use every feature.
 */
export default function TypeTipsCard() {
  const { vendor, updateVendorProfile } = useVendor();
  const [moveStatus, setMoveStatus] = useState('');
  if (!vendor) return null;
  const type = getVendorType(vendor.typeCode || vendor.type);
  const tips = (type.features || []).map((key) => ({ key, ...TYPE_FEATURES[key] })).filter((tip) => tip.label);

  const go = (event, to) => {
    // Same-page targets (#special, #offer-days) scroll instead of navigating.
    const hash = to.split('#')[1];
    if (!hash) return;
    const target = document.getElementById(hash);
    if (target) {
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Food trucks move: on the owner's click, set the kitchen's map position
  // to where the truck is parked now (only read when asked).
  const moveHere = () => {
    if (!navigator.geolocation) {
      setMoveStatus('Your browser cannot share your location. Set it in Profile instead.');
      return;
    }
    setMoveStatus('Finding where you are…');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await updateVendorProfile({
            location: { latitude: position.coords.latitude, longitude: position.coords.longitude },
          });
          setMoveStatus('Location updated — customers now see your new spot on the map.');
        } catch (error) {
          setMoveStatus(error.message || 'Could not update your location.');
        }
      },
      () => setMoveStatus('Location permission was denied. Set it in Profile instead.'),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  return (
    <div className="rounded-3xl bg-white border border-stone-200/80 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-1">
        <Lightbulb className="w-4 h-4 text-[#8a5332]" />
        <h3 className="font-black text-sm text-gray-900">Made for your kitchen type</h3>
      </div>
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <VendorTypeBadge type={type.code} size="xs" />
        <span className="text-[11px] text-stone-500">{type.note}</span>
      </div>
      <ul className="space-y-2">
        {tips.map((tip) => (
          <li key={tip.key}>
            <Link
              to={tip.to}
              onClick={(event) => go(event, tip.to)}
              className="flex items-start gap-2 rounded-2xl border border-stone-100 hover:border-[#ebd7c5] hover:bg-[#faf6f2] px-3 py-2.5 transition"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-black text-gray-900">{tip.label}</span>
                <span className="block text-[11px] text-stone-500 leading-snug">{tip.hint}</span>
              </span>
              <ArrowUpRight className="w-3.5 h-3.5 text-stone-400 flex-shrink-0 mt-0.5" />
            </Link>
          </li>
        ))}
      </ul>
      {type.code === 'food_truck' && (
        <div className="mt-3 rounded-2xl bg-[#faf6f2] border border-[#ebd7c5] px-3 py-2.5">
          <button
            type="button"
            onClick={moveHere}
            className="inline-flex items-center gap-1.5 text-xs font-black text-[#3d1b0c] hover:underline"
          >
            <LocateFixed className="w-3.5 h-3.5" /> I've moved — use where I am now
          </button>
          <p className="text-[11px] text-stone-500 mt-0.5">
            {moveStatus || 'Update your spot each time you park so customers can find you.'}
          </p>
        </div>
      )}
      {type.lessSuited?.length > 0 && (
        <p className="mt-3 text-[11px] text-stone-400">
          Less typical for your type: {type.lessSuited.join(', ').toLowerCase()}.
        </p>
      )}
    </div>
  );
}
