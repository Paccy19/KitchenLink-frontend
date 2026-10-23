import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Lightbulb } from 'lucide-react';
import { useVendor } from '../../context/VendorContext';
import VendorTypeBadge from '../common/VendorTypeBadge';
import { TYPE_FEATURES, getVendorType } from '../../data/vendorTypes';

/**
 * Kitchen dashboard: the features that suit this kitchen's type best (e.g.
 * Tomorrow's Special for Home Cooks, Offer Days for Caterers). Suggestions
 * only — every kitchen can use every feature.
 */
export default function TypeTipsCard() {
  const { vendor } = useVendor();
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
      {type.lessSuited?.length > 0 && (
        <p className="mt-3 text-[11px] text-stone-400">
          Less typical for your type: {type.lessSuited.join(', ').toLowerCase()}. You can still do it — it's a suggestion only.
        </p>
      )}
    </div>
  );
}
