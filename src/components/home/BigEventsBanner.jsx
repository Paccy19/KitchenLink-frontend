import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, Sparkles } from 'lucide-react';

/**
 * "KitchenLink Big Events": the compact banner near the top of the homepage.
 * It opens the existing Big Events listing (every kitchen that
 * takes event orders, /vendors?events=1), as the old "Big Event" button did.
 *
 * `compact`: the first slide of the homepage HeroSlider. It fills its parent
 * (the slider sets the height and the rounded corners), with smaller padding,
 * text and calendar. Without it the banner is the full-width section it was.
 *
 * @param {{ compact?: boolean }} props
 */
export default function BigEventsBanner({ compact = false }) {
  if (compact) {
    return (
      <Link
        to="/vendors?events=1"
        className="group relative block h-full overflow-hidden bg-[#2b1206] text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-[#f28c18]/50"
      >
        <img
          src="/images/home/food/spread.jpg"
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="absolute inset-y-0 right-0 h-full w-1/2 object-cover opacity-20 mix-blend-luminosity"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-[#2b1206] via-[#2b1206]/95 to-[#2b1206]/60" />
        <div aria-hidden="true" className="absolute -left-10 -top-16 w-56 h-56 rounded-full bg-[#f28c18]/20 blur-3xl" />
        <div aria-hidden="true" className="absolute right-16 -bottom-20 w-64 h-64 rounded-full bg-[#f28c18]/15 blur-3xl" />
        <div aria-hidden="true" className="absolute inset-0 opacity-60 bg-[radial-gradient(circle,#f7a23b_1.5px,transparent_2px),radial-gradient(circle,#fff3_1px,transparent_1.5px)] bg-[length:46px_46px,31px_31px] bg-[position:8px_12px,20px_4px] [mask-image:linear-gradient(90deg,#000_0%,transparent_30%,transparent_65%,#000_100%)]" />

        <div className="relative flex h-full items-center gap-6 pl-12 pr-12 sm:pl-16 sm:pr-16 py-5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <span className="relative flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-[#f7a23b] to-[#e07b0c] flex items-center justify-center shadow-lg shadow-black/30 rotate-[-6deg] group-hover:rotate-0 transition-transform duration-300">
                <img src="/icons/party-popper.png" alt="" aria-hidden="true" className="w-6 h-6 drop-shadow" />
                <Sparkles className="absolute -top-1.5 -right-1.5 w-4 h-4 text-[#ffd59a]" aria-hidden="true" />
              </span>
              <span className="min-w-0 text-sm sm:text-base font-black leading-tight tracking-tight">
                KitchenLink <span className="text-[#f7a23b]">Big Events</span>
              </span>
              <span className="hidden sm:inline-block flex-shrink-0 px-2 py-0.5 rounded-full bg-[#f28c18]/20 border border-[#f28c18]/40 text-[#ffc27a] text-[9px] font-black uppercase tracking-[0.14em]">
                Special experiences
              </span>
            </div>
            <h2 className="mt-3 text-xl sm:text-2xl font-black tracking-tight leading-tight text-white">
              Planning something special?
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-[#ebd7c5] leading-relaxed max-w-md line-clamp-2">
              Discover food events, catering experiences and special occasions hosted by local kitchens.
            </p>
            <span className="mt-3.5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#f28c18] group-hover:bg-[#e07b0c] text-white text-sm font-extrabold shadow-lg shadow-[#f28c18]/30 transition">
              Explore Big Events
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </span>
          </div>

          <span aria-hidden="true" className="hidden sm:block relative w-20 h-20 mr-2 flex-shrink-0">
            <span className="absolute inset-0 rounded-[18px] bg-white shadow-xl rotate-6 group-hover:rotate-3 transition-transform duration-300 overflow-hidden">
              <span className="block h-6 bg-gradient-to-r from-[#f28c18] to-[#e07b0c]" />
              <span className="absolute left-2.5 right-2.5 top-8 grid grid-cols-4 gap-1">
                {Array.from({ length: 12 }, (_, i) => (
                  <span key={i} className={`h-2 rounded-[3px] ${i === 6 ? 'bg-[#f28c18]' : 'bg-[#f1e2d2]'}`} />
                ))}
              </span>
            </span>
            <span className="absolute -top-2 left-4 w-2 h-4 rounded-full bg-[#3d1b0c] rotate-6" />
            <span className="absolute -top-2 right-5 w-2 h-4 rounded-full bg-[#3d1b0c] rotate-6" />
            <CalendarDays className="absolute -bottom-3 -left-3 w-8 h-8 p-1.5 rounded-xl bg-[#3d1b0c] text-[#f7a23b] shadow-lg" />
          </span>
        </div>
      </Link>
    );
  }

  return (
    <section aria-label="KitchenLink Big Events" className="mt-5 sm:mt-6">
      <Link
        to="/vendors?events=1"
        className="group relative block overflow-hidden rounded-[26px] bg-[#2b1206] text-white shadow-xl shadow-[#2b1206]/20 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#f28c18]/40"
      >
        {/* Decoration: warm glows, a faint food photo and confetti dots. */}
        <img
          src="/images/home/food/spread.jpg"
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="absolute inset-y-0 right-0 h-full w-1/2 object-cover opacity-20 mix-blend-luminosity"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-[#2b1206] via-[#2b1206]/95 to-[#2b1206]/60" />
        <div aria-hidden="true" className="absolute -left-10 -top-16 w-64 h-64 rounded-full bg-[#f28c18]/20 blur-3xl" />
        <div aria-hidden="true" className="absolute right-24 -bottom-20 w-72 h-72 rounded-full bg-[#f28c18]/15 blur-3xl" />
        <div aria-hidden="true" className="absolute inset-0 opacity-60 bg-[radial-gradient(circle,#f7a23b_1.5px,transparent_2px),radial-gradient(circle,#fff3_1px,transparent_1.5px)] bg-[length:46px_46px,31px_31px] bg-[position:8px_12px,20px_4px] [mask-image:linear-gradient(90deg,#000_0%,transparent_30%,transparent_65%,#000_100%)]" />

        <div className="relative flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-8 px-5 sm:px-8 lg:px-10 py-6 sm:py-7">
          {/* Left: the event mark and the feature's name. */}
          <div className="flex items-center gap-3.5 lg:w-[230px] flex-shrink-0">
            <span className="relative flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-[#f7a23b] to-[#e07b0c] flex items-center justify-center shadow-lg shadow-black/30 rotate-[-6deg] group-hover:rotate-0 transition-transform duration-300">
              <img src="/icons/party-popper.png" alt="" aria-hidden="true" className="w-8 h-8 sm:w-9 sm:h-9 drop-shadow" />
              <Sparkles className="absolute -top-2 -right-2 w-5 h-5 text-[#ffd59a]" aria-hidden="true" />
            </span>
            <span className="text-lg sm:text-xl font-black leading-tight tracking-tight">
              KitchenLink
              <span className="block text-[#f7a23b]">Big Events</span>
            </span>
          </div>

          {/* Middle: the message. */}
          <div className="flex-1 min-w-0 lg:border-l lg:border-white/10 lg:pl-8">
            <span className="inline-block px-2.5 py-1 rounded-full bg-[#f28c18]/20 border border-[#f28c18]/40 text-[#ffc27a] text-[10px] font-black uppercase tracking-[0.14em]">
              Special experiences
            </span>
            <h2 className="mt-2 text-xl sm:text-2xl lg:text-[28px] font-black tracking-tight leading-tight text-white">
              Planning something special?
            </h2>
            <p className="mt-1.5 text-sm text-[#ebd7c5] leading-relaxed max-w-xl">
              Discover food events, catering experiences and special occasions hosted by local kitchens.
            </p>
          </div>

          {/* Right: the action, with a calendar illustration on wide screens. */}
          <div className="flex items-center gap-6 flex-shrink-0">
            <span className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#f28c18] group-hover:bg-[#e07b0c] text-white text-sm sm:text-base font-extrabold shadow-lg shadow-[#f28c18]/30 transition">
              Explore Big Events
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </span>
            <span aria-hidden="true" className="hidden lg:block relative w-24 h-24 flex-shrink-0">
              <span className="absolute inset-0 rounded-[22px] bg-white shadow-xl rotate-6 group-hover:rotate-3 transition-transform duration-300 overflow-hidden">
                <span className="block h-7 bg-gradient-to-r from-[#f28c18] to-[#e07b0c]" />
                <span className="absolute left-3 right-3 top-9 grid grid-cols-4 gap-1">
                  {Array.from({ length: 12 }, (_, i) => (
                    <span key={i} className={`h-2.5 rounded-[3px] ${i === 6 ? 'bg-[#f28c18]' : 'bg-[#f1e2d2]'}`} />
                  ))}
                </span>
              </span>
              <span className="absolute -top-2 left-5 w-2 h-5 rounded-full bg-[#3d1b0c] rotate-6" />
              <span className="absolute -top-2 right-6 w-2 h-5 rounded-full bg-[#3d1b0c] rotate-6" />
              <CalendarDays className="absolute -bottom-3 -left-3 w-9 h-9 p-1.5 rounded-xl bg-[#3d1b0c] text-[#f7a23b] shadow-lg" />
            </span>
          </div>
        </div>
      </Link>
    </section>
  );
}
