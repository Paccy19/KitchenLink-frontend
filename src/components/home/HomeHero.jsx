import React from 'react';
import SearchBar from './SearchBar';

/**
 * Homepage hero: a chef photograph on the right, a deep-brown overlay on the
 * left for the headline, and the main search (the same SearchBar, with its
 * recent searches and suggestions, so search keeps working exactly as before).
 *
 * Photo: Emediong Umoh on Unsplash (Unsplash License), self-hosted in
 * public/images/home so the page doesn't depend on another site.
 */
export default function HomeHero({ query, onQueryChange, onSubmit }) {
  return (
    <section
      aria-label="Welcome"
      className="relative overflow-hidden rounded-[28px] sm:rounded-[32px] bg-[#2b1206] shadow-xl shadow-[#2b1206]/20"
    >
      {/* Photo: full width on phones, the right two-thirds on wide screens. */}
      <picture>
        <source media="(min-width: 768px)" srcSet="/images/home/hero-chef.jpg" />
        <img
          src="/images/home/hero-chef-sm.jpg"
          alt="A smiling chef in a white uniform and hat preparing desserts in a kitchen"
          fetchpriority="high"
          decoding="async"
          className="absolute inset-y-0 right-0 h-full w-full md:w-[72%] lg:w-[66%] object-cover object-[60%_25%] md:object-[50%_28%]"
        />
      </picture>
      {/* Readable text: dark brown over the left side (and over the whole photo on phones). */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-[#1c0a03]/95 via-[#2b1206]/75 to-[#2b1206]/30 md:bg-gradient-to-r md:from-[#2b1206] md:from-30% md:via-[#2b1206]/80 md:via-45% md:to-transparent md:to-75%"
      />
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(242,140,24,0.18),transparent_55%)]" />

      <div className="relative px-5 sm:px-10 lg:px-14 pt-40 sm:pt-48 md:pt-16 lg:pt-20 pb-20 sm:pb-24 lg:pb-28 md:min-h-[440px] lg:min-h-[480px] flex flex-col justify-center">
        <div className="max-w-xl">
          <h1 className="text-[34px] leading-[1.08] sm:text-5xl lg:text-[56px] font-black tracking-tight text-white drop-shadow-sm">
            Experience the Best
            <br />
            Food <span className="text-[#f7a23b]">in Kigali</span>
          </h1>
          <p className="mt-4 sm:mt-5 text-base sm:text-xl text-[#f5ebe1] font-medium leading-snug max-w-md">
            From home cooks to top restaurants, find what you crave.
          </p>
          <SearchBar
            variant="hero"
            inputId="hero-search"
            value={query}
            onChange={onQueryChange}
            onSubmit={onSubmit}
            placeholder="Search for meals, restaurants or cuisines..."
            className="mt-6 sm:mt-8 w-full max-w-xl"
          />
        </div>
      </div>
    </section>
  );
}
