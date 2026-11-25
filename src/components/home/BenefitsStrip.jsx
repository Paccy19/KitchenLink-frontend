import React from 'react';
import { Link } from 'react-router-dom';
import { Bike, Headset, ShieldCheck, Store } from 'lucide-react';

// Each item opens the page that backs it up.
const BENEFITS = [
  { icon: Bike, title: 'Fast Delivery', text: 'Get your food quickly', to: '/vendors/map' },
  { icon: ShieldCheck, title: 'Secure Payments', text: 'Shop with confidence', to: '/orders' },
  { icon: Store, title: 'Local Kitchens', text: 'Support local cooks', to: '/vendors' },
  { icon: Headset, title: '24/7 Support', text: "We're here to help", to: '/support' },
];

/** The cream benefits strip that overlaps the bottom of the hero. */
export default function BenefitsStrip() {
  return (
    <section
      aria-label="Why KitchenLink"
      className="relative z-10 -mt-12 sm:-mt-14 mx-2 sm:mx-6 lg:mx-10 rounded-3xl bg-[#faf6f2] border border-[#f1e2d2] shadow-lg shadow-[#2b1206]/10"
    >
      <ul className="grid grid-cols-2 lg:grid-cols-4">
        {BENEFITS.map(({ icon: Icon, title, text, to }, index) => (
          <li
            key={title}
            className={[
              'border-[#ead7c3]',
              index % 2 === 0 ? 'border-r' : '',
              index < 2 ? 'border-b lg:border-b-0' : '',
              index === 1 ? 'lg:border-r' : '',
              index === 3 ? 'lg:border-r-0' : '',
            ].join(' ')}
          >
            <Link
              to={to}
              className="group flex items-center gap-3 sm:gap-4 px-3.5 sm:px-6 py-4 sm:py-5 h-full rounded-3xl hover:bg-white/60 transition"
            >
              <span className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white border border-[#f3dcc1] shadow-sm flex items-center justify-center text-[#f28c18] group-hover:scale-105 transition-transform">
                <Icon className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] sm:text-[15px] font-extrabold text-gray-900 leading-tight">{title}</span>
                <span className="block text-[11px] sm:text-xs text-stone-500 font-medium mt-0.5">{text}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
