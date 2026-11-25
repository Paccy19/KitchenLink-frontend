import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, Gift } from 'lucide-react';
import { formatOfferDay, offerCountdown } from '../../utils/offerDays';

/**
 * The dark promotion banner beside the top kitchens. It only ever shows what
 * really exists, never an invented discount:
 *  1. the next "Offer Day" a kitchen announced (its own words), else
 *  2. a "Tomorrow's Special" a kitchen announced, else
 *  3. the pre-order specials invitation (a real feature).
 */
function promotion(offers = [], specials = []) {
  const offer = offers.find((entry) => entry?.vendor?.id && entry.title);
  if (offer) {
    return {
      badge: `Offer Day · ${offerCountdown(offer.offerDate)}`,
      icon: Gift,
      eyebrow: offer.vendor.name,
      title: offer.title,
      text: offer.details || `On ${formatOfferDay(offer.offerDate, { long: true })}.`,
      cta: 'See the offer',
      to: `/vendor/${offer.vendor.id}`,
      image: offer.vendor.bannerUrl,
    };
  }
  const special = specials.find((entry) => entry?.vendor?.id && entry.special?.text);
  if (special) {
    return {
      badge: "Tomorrow's Special",
      icon: CalendarDays,
      eyebrow: special.vendor.name,
      title: special.special.text,
      text: 'Pre-order today and get it fresh tomorrow.',
      cta: 'Pre-order now',
      to: `/vendor/${special.vendor.id}`,
      image: special.vendor.bannerUrl,
    };
  }
  // Big Events has its own banner higher up: here, the pre-order specials.
  return {
    badge: 'Pre-order',
    icon: CalendarDays,
    eyebrow: "Tomorrow's specials",
    title: 'Fresh tomorrow, ordered today',
    text: 'Pre-order home-cooked specials from local kitchens and get them fresh tomorrow.',
    cta: 'Browse specials',
    to: '/vendors?filter=preorder',
    image: '',
  };
}

export default function PromoBanner({ offers, specials }) {
  const promo = promotion(offers, specials);
  const Icon = promo.icon;
  return (
    <Link
      to={promo.to}
      className="group relative flex min-h-[300px] lg:min-h-full overflow-hidden rounded-3xl bg-[#2b1206] text-white shadow-xl shadow-[#2b1206]/25 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#f28c18]/40"
    >
      <img
        src={promo.image || '/images/home/promo-pizza.jpg'}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        onError={(event) => { event.currentTarget.src = '/images/home/promo-pizza.jpg'; }}
        className="absolute inset-y-0 right-0 h-full w-[78%] object-cover object-center transition-transform duration-700 group-hover:scale-105"
      />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-[#2b1206] from-35% via-[#2b1206]/85 via-55% to-[#2b1206]/10" />
      <div className="relative flex flex-col p-6 sm:p-7 max-w-[78%] sm:max-w-[70%]">
        <span className="self-start inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f28c18] text-white text-[11px] font-black uppercase tracking-wide shadow">
          <Icon className="w-3.5 h-3.5" aria-hidden="true" />
          {promo.badge}
        </span>
        <p className="mt-4 text-[11px] font-bold uppercase tracking-wider text-[#f7c089] line-clamp-1">{promo.eyebrow}</p>
        <h3 className="mt-1 text-2xl sm:text-[28px] font-black leading-tight line-clamp-3">{promo.title}</h3>
        <p className="mt-2 text-sm text-[#ebd7c5] leading-relaxed line-clamp-3">{promo.text}</p>
        <span className="mt-auto pt-6 self-start inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#f28c18] group-hover:bg-[#e07b0c] text-white text-sm font-extrabold shadow-lg shadow-black/20 transition">
          {promo.cta}
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}
