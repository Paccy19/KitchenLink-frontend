import React from 'react';
import { Link } from 'react-router-dom';
import { UtensilsCrossed } from 'lucide-react';

// Explicit colours (not stone-*), so the dark theme leaves the footer as it is.
const LINKS = [
  { to: '/vendors', label: 'Kitchens' },
  { to: '/orders', label: 'My orders' },
  { to: '/support', label: 'Help' },
  { to: '/vendor-register', label: 'Sell on KitchenLink' },
  { to: '/login', label: 'Sign in' },
];

/** One compact band: brand, the few links people use, copyright. */
export default function Footer() {
  return (
    <footer className="bg-[#2b1206] text-[#d9bda6] border-t-2 border-[#f28c18]/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <Link to="/" className="inline-flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-[#3d1b0c] border border-[#f28c18]/25 flex items-center justify-center">
            <UtensilsCrossed className="w-4 h-4 text-[#f7a23b]" />
          </span>
          <span className="font-extrabold text-white">
            Kitchen<span className="text-[#f28c18]">Link</span>
          </span>
        </Link>
        <nav aria-label="Footer" className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-semibold">
          {LINKS.map((link) => (
            <Link key={link.to} to={link.to} className="hover:text-[#f7a23b] transition">
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="text-[11px] text-[#b39580]">© {new Date().getFullYear()} KitchenLink · Kigali, Rwanda</p>
      </div>
    </footer>
  );
}
