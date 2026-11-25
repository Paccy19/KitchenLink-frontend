import React, { useRef } from 'react';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import FadeImage from '../common/FadeImage';
import { scrollBehavior } from '../../utils/motion';

/**
 * The homepage's photo-card row: a heading with the orange accent bar,
 * prev/next buttons, and a horizontally scrolling, snapping list. Shared by
 * the category row and the "Kitchens Near You" row so both look the same.
 *
 * @param {{ ariaLabel:string, title:string, subtitle?:string, scrollLabel:string,
 *           listProps?:Object, children:React.ReactNode }} props
 */
export default function HomeCardRow({ ariaLabel, title, subtitle, scrollLabel, listProps = {}, children }) {
  const scrollerRef = useRef(null);
  const scrollBy = (amount) => {
    scrollerRef.current?.scrollBy({ left: amount, behavior: scrollBehavior() });
  };
  const arrowClass =
    'w-9 h-9 rounded-full bg-white border border-stone-200 text-stone-600 hover:text-[#542813] hover:border-[#d9bda6] flex items-center justify-center transition shadow-sm active:scale-95';

  return (
    <section aria-label={ariaLabel} className="relative">
      <RowHeading title={title} subtitle={subtitle}>
        <div className="hidden sm:flex items-center gap-1.5">
          <button type="button" onClick={() => scrollBy(-320)} aria-label={`Scroll ${scrollLabel} left`} className={arrowClass}>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => scrollBy(320)} aria-label={`Scroll ${scrollLabel} right`} className={arrowClass}>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </RowHeading>

      <div
        ref={scrollerRef}
        className="flex gap-3 sm:gap-4 overflow-x-auto pt-1 pb-3 -mx-4 px-4 sm:mx-0 sm:px-1 snap-x scrollbar-none"
        {...listProps}
      >
        {children}
      </div>
    </section>
  );
}

/** A homepage section heading: orange accent bar, title, subtitle; `children` go on the right. */
export function RowHeading({ title, subtitle, children }) {
  return (
    <div className="flex items-end justify-between gap-3 mb-4">
      <div className="flex items-stretch gap-3 min-w-0">
        <span aria-hidden="true" className="w-1.5 flex-shrink-0 rounded-full bg-[#f28c18]" />
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">{title}</h2>
          {subtitle && <p className="text-xs sm:text-sm text-stone-500 font-medium mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

/** The card shell: size, radius, shadow and hover lift. `active` = the brown tile. */
export const rowCardClass = (active) =>
  clsx(
    'group flex-shrink-0 w-[112px] sm:w-[134px] snap-start rounded-[20px] overflow-hidden flex flex-col transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#542813]/25 active:scale-95',
    active
      ? 'bg-[#6d391d] text-white shadow-lg shadow-[#2b1206]/30'
      : 'bg-white text-gray-900 shadow-[0_2px_10px_rgba(43,18,6,0.08)] hover:-translate-y-1 hover:shadow-[0_10px_24px_rgba(43,18,6,0.14)]',
  );

/** The "All" tile's icon area, in place of a photo. */
export function RowCardIcon({ icon: Icon, active }) {
  return (
    <span className="flex w-full aspect-[4/3] items-center justify-center">
      <span className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center">
        <Icon className={clsx('w-6 h-6 sm:w-7 sm:h-7', active ? 'text-[#ffc27a]' : 'text-[#f28c18]')} aria-hidden="true" />
      </span>
    </span>
  );
}

/** The photo area of a card; `children` sit on top of it (e.g. a badge). */
export function RowCardImage({ src, children }) {
  return (
    <span className="relative block w-full aspect-[4/3] overflow-hidden bg-[#f5ebe1]">
      <FadeImage
        src={src}
        alt=""
        aria-hidden="true"
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        fallback={<span className="block w-full h-full bg-[#f5ebe1]" />}
      />
      {children}
    </span>
  );
}
