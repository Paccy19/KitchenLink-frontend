import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Leaf } from 'lucide-react';
import SearchBar from './SearchBar';
import useParallax from '../../hooks/useParallax';

/**
 * Homepage hero, warm and quiet: a serif headline on cream, the search, two
 * actions, and the chef photo in an arch that drifts slowly as you scroll.
 * The small facts under the headline come from the live feed (no made-up numbers).
 *
 * Photo: Emediong Umoh on Unsplash (Unsplash License), self-hosted in public/images/home.
 */
export default function HomeHero({ query, onQueryChange, onSubmit, kitchens = 0, dishes = 0 }) {
  const photo = useParallax(0.08);
  const plate = useParallax(-0.14);
  return (
    <section aria-label="Welcome" className="relative overflow-hidden rounded-[2.25rem] bg-[#f6ecdf] border border-[#ecdcc8]">
      <div aria-hidden="true" className="absolute -left-24 -top-24 w-80 h-80 rounded-full bg-[radial-gradient(circle,rgba(232,133,50,0.22),transparent_65%)]" />
      <div className="relative grid md:grid-cols-[1.05fr_1fr] items-center gap-6 px-6 sm:px-10 lg:px-14 pt-10 pb-12 md:py-14">
        <div className="kl-rise min-w-0">
          <p className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.28em] text-[#b5652b]">Kigali's kitchens, one table</p>
          <h1 className="font-display text-[40px] leading-[1.02] sm:text-6xl lg:text-[68px] text-[#2b1206] mt-3">
            Good food,
            <br />
            <span className="italic text-[#b5652b] kl-swash">made with love</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-[#6b4a35] max-w-md leading-relaxed">From home cooks to the city's best restaurants. Order in, pick up, or book a table.</p>
          <SearchBar
            variant="hero"
            inputId="hero-search"
            value={query}
            onChange={onQueryChange}
            onSubmit={onSubmit}
            placeholder="Search a dish or a kitchen…"
            className="mt-6 w-full max-w-lg"
          />
          <div className="mt-5 flex flex-wrap gap-3">
            <a href="#popular" className="group inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#2b1206] text-white font-bold text-sm shadow-lg shadow-[#2b1206]/20 hover:bg-[#4a2210] transition">
              Order now <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </a>
            <Link to="/vendors" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full border border-[#2b1206]/80 text-[#2b1206] font-bold text-sm hover:bg-[#2b1206] hover:text-white transition">
              View kitchens
            </Link>
          </div>
          {(kitchens > 0 || dishes > 0) && (
            <p className="mt-6 text-xs font-semibold text-[#8a6a52] flex flex-wrap gap-x-4 gap-y-1">
              {kitchens > 0 && <span>{kitchens}+ kitchens near you</span>}
              {dishes > 0 && <span>{dishes} favourites today</span>}
            </p>
          )}
        </div>

        <div className="relative min-w-0 h-[340px] sm:h-[420px] md:h-[480px]">
          <div ref={photo} className="absolute inset-x-6 sm:inset-x-10 md:inset-x-4 top-0 bottom-0 will-change-transform">
            <div className="h-full rounded-t-[999px] rounded-b-[2.5rem] overflow-hidden bg-[#2b1206] shadow-[0_40px_80px_-40px_rgba(43,18,6,0.6)]">
              <picture>
                <source media="(min-width: 768px)" srcSet="/images/home/hero-chef.jpg" />
                <img src="/images/home/hero-chef-sm.jpg" alt="A smiling chef preparing desserts" fetchpriority="high" decoding="async" className="w-full h-full object-cover object-[55%_25%]" />
              </picture>
            </div>
          </div>
          <div ref={plate} className="absolute -left-2 sm:left-0 bottom-8 w-28 h-28 sm:w-36 sm:h-36 will-change-transform">
            <img src="/images/home/food/spread.jpg" alt="" className="w-full h-full object-cover rounded-full border-[6px] border-[#f6ecdf] shadow-xl kl-spin-slow" />
          </div>
          <div className="absolute right-0 sm:right-2 top-10 kl-float">
            <Badge icon={Leaf} title="Fresh daily" text="Cooked to order" />
          </div>

        </div>
      </div>
    </section>
  );
}

function Badge({ icon: Icon, title, text }) {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl bg-white/95 backdrop-blur px-3.5 py-2.5 shadow-lg">
      <span className="w-9 h-9 rounded-full bg-[#fbeee0] flex items-center justify-center"><Icon className="w-4.5 h-4.5 text-[#b5652b]" /></span>
      <span>
        <span className="block text-xs font-black text-[#2b1206]">{title}</span>
        <span className="block text-[11px] text-stone-500">{text}</span>
      </span>
    </div>
  );
}
