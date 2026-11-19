import React from 'react';
import { ChefHat, HeartHandshake, Salad, Smartphone } from 'lucide-react';

const MESSAGES = [
  { icon: ChefHat, title: 'Cook Local', text: 'Home cooks and kitchens from your neighbourhood' },
  { icon: Salad, title: 'Eat Better', text: 'Fresh meals made the day you order' },
  { icon: Smartphone, title: 'Order Easily', text: 'Order now, or pre-order for tomorrow' },
  { icon: HeartHandshake, title: 'Support Local Business', text: 'Every order goes to a local kitchen' },
];

/** The dark-brown brand band at the end of the homepage, just above the footer. */
export default function BrandStrip() {
  return (
    <section aria-label="What KitchenLink stands for" className="rounded-[28px] bg-[#2b1206] bg-[radial-gradient(ellipse_at_bottom_right,rgba(242,140,24,0.16),transparent_60%)] px-5 sm:px-8 py-7 sm:py-9 shadow-xl shadow-[#2b1206]/20">
      <ul className="grid grid-cols-2 lg:grid-cols-4 gap-y-6 gap-x-4 lg:divide-x lg:divide-white/10">
        {MESSAGES.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 lg:px-6 first:lg:pl-0">
            <span className="flex-shrink-0 w-12 h-12 rounded-2xl bg-[#f28c18]/15 border border-[#f28c18]/30 flex items-center justify-center text-[#f7a23b]">
              <Icon className="w-6 h-6" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm sm:text-base font-extrabold text-white leading-tight">{title}</span>
              <span className="block text-[11px] sm:text-xs text-[#d9bda6] mt-1 leading-snug">{text}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
