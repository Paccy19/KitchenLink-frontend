import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarClock, ChevronLeft, ChevronRight, Clock, Gift } from 'lucide-react';
import BigEventsBanner from './BigEventsBanner';
import VendorTypeBadge from '../common/VendorTypeBadge';
import { useCart } from '../../context/CartContext';
import { buildPreorderSpecial, formatScheduledFor } from '../../utils/schedule';
import { formatOfferDay, offerCountdown } from '../../utils/offerDays';

const SWIPE_PX = 40;
const DOTS =
  'bg-[radial-gradient(circle,#f7a23b_1.5px,transparent_2px),radial-gradient(circle,#fff3_1px,transparent_1.5px)] bg-[length:46px_46px,31px_31px] bg-[position:8px_12px,20px_4px]';

/** Tracks the "reduce motion" accessibility setting, live. */
function useReducedMotion() {
  const query = '(prefers-reduced-motion: reduce)';
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && Boolean(window.matchMedia?.(query).matches),
  );
  useEffect(() => {
    const media = window.matchMedia?.(query);
    if (!media) return undefined;
    const onChange = () => setReduced(media.matches);
    media.addEventListener?.('change', onChange);
    return () => media.removeEventListener?.('change', onChange);
  }, []);
  return reduced;
}

/** Shared frame of a Tomorrow's Special / Offer Day slide: brown, dotted, photo on the right. */
function OfferSlideFrame({ image, imageAlt, children }) {
  return (
    <div className="relative h-full overflow-hidden bg-[#2b1206] text-white">
      <div aria-hidden="true" className={`absolute inset-0 opacity-50 ${DOTS} [mask-image:linear-gradient(90deg,#000_0%,transparent_45%)]`} />
      <div aria-hidden="true" className="absolute -left-12 -top-16 w-56 h-56 rounded-full bg-[#f28c18]/20 blur-3xl" />

      {/* The dish photo fills the right ~35% and fades into the brown. */}
      <div className="absolute inset-y-0 right-0 w-[35%]">
        {image && (
          <img src={image} alt={imageAlt} loading="lazy" className="h-full w-full object-cover" />
        )}
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-[#2b1206] via-[#2b1206]/45 to-transparent" />
      </div>

      <div className="relative flex h-full w-[68%] sm:w-[65%] flex-col justify-center pl-12 pr-2 sm:pl-16 sm:pr-4 py-5">
        {children}
      </div>
    </div>
  );
}

function KitchenLine({ vendor }) {
  return (
    <div className="mt-2.5 flex min-w-0 items-center gap-2">
      <span className="min-w-0 truncate text-sm font-extrabold text-[#ebd7c5]">{vendor.name}</span>
      {(vendor.typeCode || vendor.type) && (
        <VendorTypeBadge type={vendor.typeCode || vendor.type} size="xs" className="flex-shrink-0" />
      )}
    </div>
  );
}

const ctaClass =
  'mt-3.5 self-start inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#f28c18] hover:bg-[#e07b0c] text-white text-sm font-extrabold shadow-lg shadow-[#f28c18]/30 transition active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#f28c18]/40';

/** A kitchen's Tomorrow's Special: pre-ordering primes the basket, like SpecialCard. */
function SpecialSlide({ vendor, special }) {
  const navigate = useNavigate();
  const { setOrderType, setPreorderSpecial } = useCart();
  const handlePreorder = () => {
    setPreorderSpecial(buildPreorderSpecial(vendor, special));
    setOrderType('preorder');
    navigate(`/vendor/${vendor.id}`);
  };

  return (
    <OfferSlideFrame image={vendor.bannerUrl || vendor.avatarUrl} imageAlt={`${vendor.name} special`}>
      <span className="self-start px-2.5 py-1 rounded-full bg-[#f28c18]/20 border border-[#f28c18]/40 text-[#ffc27a] text-[10px] font-black uppercase tracking-[0.14em]">
        Tomorrow's Special
      </span>
      <KitchenLine vendor={vendor} />
      <h2 className="mt-1 text-lg sm:text-2xl font-black tracking-tight leading-tight text-white line-clamp-2">
        {special.text}
      </h2>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] sm:text-xs font-semibold text-[#d9bda6]">
        {special.cutoffAt && (
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#f7a23b]" aria-hidden="true" />
            Order before {formatScheduledFor(special.cutoffAt)}
          </span>
        )}
        {special.deliveryAt && (
          <span className="flex items-center gap-1.5">
            <CalendarClock className="w-3.5 h-3.5 text-[#f7a23b]" aria-hidden="true" />
            Arrives {formatScheduledFor(special.deliveryAt)}
          </span>
        )}
      </div>
      {special.isOrderable === false ? (
        <Link to={`/vendor/${vendor.id}`} className={ctaClass}>
          View kitchen
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>
      ) : (
        <button type="button" onClick={handlePreorder} className={ctaClass}>
          Pre-order now
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </button>
      )}
    </OfferSlideFrame>
  );
}

/** A kitchen's Offer Day (the other half of the Tomorrow's Specials list). */
function OfferSlide({ offer }) {
  const { vendor } = offer;
  return (
    <OfferSlideFrame image={vendor.bannerUrl || vendor.avatarUrl} imageAlt={`${vendor.name} offer`}>
      <span className="self-start inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-200 text-[10px] font-black uppercase tracking-[0.14em]">
        <Gift className="w-3 h-3" aria-hidden="true" />
        Offer Day · {offerCountdown(offer.offerDate)}
      </span>
      <KitchenLine vendor={vendor} />
      <h2 className="mt-1 text-lg sm:text-2xl font-black tracking-tight leading-tight text-white line-clamp-2">
        {offer.title}
      </h2>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] sm:text-xs font-semibold text-[#d9bda6]">
        <span className="flex items-center gap-1.5">
          <CalendarClock className="w-3.5 h-3.5 text-[#f7a23b]" aria-hidden="true" />
          {formatOfferDay(offer.offerDate, { long: true })}
        </span>
        {offer.details && <span className="hidden sm:block min-w-0 truncate max-w-full">{offer.details}</span>}
      </div>
      <Link to={`/vendor/${vendor.id}`} className={ctaClass}>
        View kitchen
        <ArrowRight className="w-4 h-4" aria-hidden="true" />
      </Link>
    </OfferSlideFrame>
  );
}

/**
 * The homepage hero carousel: the Big Events banner first, then one slide per
 * Tomorrow's Special and Offer Day (the same lists the specials page shows).
 * Auto-advances every `intervalMs` in a ping-pong (to the last slide, then
 * back to the first), pauses on hover or keyboard focus, never
 * auto-advances under "reduce motion", restarts its timer after a manual
 * change, and supports touch swipes.
 *
 * @param {{ specials?: Array<{vendor:Object, special:Object}>, offers?: Array<Object>,
 *           intervalMs?: number, fill?: boolean, className?: string }} props
 *
 * `fill`: from lg up the slide grows to the height its parent gives it
 * (never under 250px), so it can end level with a neighbouring column.
 */
export default function HeroSlider({ specials = [], offers = [], intervalMs = 6000, fill = false, className = '' }) {
  const slides = [
    { key: 'big-events', label: 'KitchenLink Big Events', kitchen: 'Big Events', node: <BigEventsBanner compact /> },
    ...specials
      .filter((entry) => entry?.vendor?.id && entry.special)
      .map((entry) => ({
        key: `special-${entry.vendor.id}`,
        label: `${entry.vendor.name}: ${entry.special.text}`,
        kitchen: entry.vendor.name,
        node: <SpecialSlide vendor={entry.vendor} special={entry.special} />,
      })),
    ...offers
      .filter((offer) => offer?.vendor?.id)
      .map((offer) => ({
        key: `offer-${offer.id}`,
        label: `${offer.vendor.name}: ${offer.title}`,
        kitchen: offer.vendor.name,
        node: <OfferSlide offer={offer} />,
      })),
  ];
  const count = slides.length;

  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  // Bumped on every manual change so the auto-advance timer starts over.
  const [manualTick, setManualTick] = useState(0);
  const reducedMotion = useReducedMotion();
  const touchStartX = useRef(null);
  // 1 = auto-slide forward, -1 = backward (it reverses at either end).
  const direction = useRef(1);

  const current = Math.min(index, count - 1);
  const autoPlaying = count > 1 && !reducedMotion && !hovered && !focused;

  useEffect(() => {
    if (index > count - 1) setIndex(Math.max(0, count - 1));
  }, [count, index]);

  useEffect(() => {
    if (!autoPlaying) return undefined;
    // Ping-pong: forward to the last slide, then back to the first, and so on.
    const timer = window.setTimeout(() => {
      if (current + direction.current > count - 1 || current + direction.current < 0) {
        direction.current = -direction.current;
      }
      setIndex(current + direction.current);
    }, intervalMs);
    return () => window.clearTimeout(timer);
  }, [autoPlaying, current, count, intervalMs, manualTick]);

  // `dir`: the way an arrow or swipe went; auto-slide carries on that way.
  const goTo = useCallback(
    (next, dir) => {
      setIndex(((next % count) + count) % count);
      if (dir) direction.current = dir;
      setManualTick((tick) => tick + 1);
    },
    [count],
  );

  const onTouchStart = (event) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (event) => {
    if (touchStartX.current == null) return;
    const dx = (event.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) >= SWIPE_PX) goTo(current + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
  };

  const arrowClass =
    'absolute top-1/2 -translate-y-1/2 z-10 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/15 hover:bg-white/30 border border-white/25 backdrop-blur-sm text-white flex items-center justify-center shadow-lg transition active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#f28c18]/50';

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Big Events and Tomorrow's Specials"
      className={`flex flex-col ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
    >
      <div
        className={`relative h-[250px] ${fill ? 'lg:h-auto lg:min-h-[250px] lg:flex-1' : ''} overflow-hidden rounded-3xl bg-[#2b1206] shadow-xl shadow-[#2b1206]/20`}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="flex h-full transition-transform duration-500 ease-out motion-reduce:transition-none"
          style={{ transform: `translateX(-${current * 100}%)` }}
          aria-live={autoPlaying ? 'off' : 'polite'}
        >
          {slides.map((slide, i) => (
            <div
              key={slide.key}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}: ${slide.label}`}
              aria-hidden={i === current ? undefined : true}
              // Off-screen slides can't be tabbed into.
              inert={i === current ? undefined : ''}
              className="h-full w-full flex-shrink-0"
            >
              {slide.node}
            </div>
          ))}
        </div>

        {count > 1 && (
          <>
            <button type="button" onClick={() => goTo(current - 1, -1)} aria-label="Previous slide" className={`${arrowClass} left-2 sm:left-3`}>
              <ChevronLeft className="w-5 h-5" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => goTo(current + 1, 1)} aria-label="Next slide" className={`${arrowClass} right-2 sm:right-3`}>
              <ChevronRight className="w-5 h-5" aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            {slides.map((slide, i) => (
              <button
                key={slide.key}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}: ${slide.label}`}
                aria-current={i === current ? 'true' : undefined}
                className="group p-1 -m-1 focus:outline-none"
              >
                <span
                  className={`block h-2 rounded-full transition-all duration-300 group-focus-visible:ring-2 group-focus-visible:ring-[#f28c18]/50 ${
                    i === current ? 'w-6 bg-[#f28c18]' : 'w-2 bg-[#ebd7c5] group-hover:bg-[#d9bda6]'
                  }`}
                />
              </button>
            ))}
          </div>
          <p className="min-w-0 truncate text-[11px] font-semibold text-stone-400">
            <span className="font-black text-stone-500">{current + 1} / {count}</span>
            {' · '}
            {slides[current]?.kitchen}
            <span className="hidden sm:inline">
              {' · '}
              {reducedMotion ? 'auto-slide off' : `auto-slides every ${Math.round(intervalMs / 1000)}s`}
            </span>
          </p>
        </div>
      )}
    </section>
  );
}
