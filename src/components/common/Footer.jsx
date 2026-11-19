import React from 'react';
import { Link } from 'react-router-dom';
import { UtensilsCrossed, MapPin, Heart } from 'lucide-react';
import { KIGALI_DISTRICTS } from '../../utils/kigaliAreas';

// The homepage palette: deep brown, warm orange, cream text. Explicit colours
// (not stone-*), so the dark theme leaves the footer as it is.
const heading = 'text-sm font-extrabold text-white uppercase tracking-wider mb-4 flex items-center gap-2';
const headingMark = <span aria-hidden="true" className="w-1.5 h-4 rounded-full bg-[#f28c18]" />;
const link = 'text-[#d9bda6] hover:text-[#f7a23b] transition';

export default function Footer() {
  return (
    <footer className="relative overflow-hidden bg-[#2b1206] text-[#d9bda6] pt-16 pb-10">
      {/* Warm glows, as on the brand strip and banners. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(242,140,24,0.14),transparent_45%),radial-gradient(ellipse_at_bottom_right,rgba(242,140,24,0.10),transparent_50%)]" />
      <div aria-hidden="true" className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#f28c18]/0 via-[#f28c18] to-[#f28c18]/0" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 md:gap-8 mb-12">
          {/* Col 1: Brand Info */}
          <div className="space-y-4">
            <Link to="/" className="inline-flex items-center gap-3 group">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#3d1b0c] via-[#542813] to-[#1c0a03] border border-[#f28c18]/25 flex items-center justify-center shadow-md shadow-black/30 group-hover:scale-105 transition-transform">
                <UtensilsCrossed className="w-5 h-5 stroke-[2.2] text-[#f7a23b]" />
              </div>
              <span className="font-extrabold text-xl text-white">
                Kitchen<span className="text-[#f28c18]">Link</span>
              </span>
            </Link>
            <p className="text-xs text-[#d9bda6] leading-relaxed">
              Rwanda's multi-vendor marketplace connecting home cooks, culinary chefs, bakeries and restaurants directly with food lovers.
            </p>
            <div className="flex items-center gap-2 text-xs text-[#d9bda6]">
              <MapPin className="w-4 h-4 text-[#f28c18]" />
              <span>Kigali, Rwanda</span>
            </div>
          </div>

          {/* Col 2: For Customers */}
          <div>
            <h4 className={heading}>{headingMark}For Food Lovers</h4>
            <ul className="space-y-2.5 text-xs font-medium">
              <li><Link to="/" className={link}>Browse Home Kitchens</Link></li>
              <li><Link to="/vendors?filter=preorder" className={link}>Tomorrow's Specials (Pre-Order)</Link></li>
              <li><Link to="/orders" className={link}>Order Tracking & History</Link></li>
              <li><Link to="/profile" className={link}>Saved Addresses & Preferences</Link></li>
            </ul>
          </div>

          {/* Col 3: Coverage Areas */}
          <div>
            <h4 className={heading}>{headingMark}We deliver across Kigali</h4>
            <div className="flex flex-wrap gap-2 text-xs">
              {KIGALI_DISTRICTS.map((district) => (
                <span
                  key={district}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/[0.06] text-[#f5ebe1] text-[11px] font-semibold border border-white/10"
                >
                  <MapPin className="w-3 h-3 text-[#f7a23b]" aria-hidden="true" />
                  {district}
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs text-[#d9bda6] leading-relaxed">
              Every neighbourhood in all three districts. Order from home kitchens near you, wherever you are in the city.
            </p>
          </div>

          {/* Col 4: Payments */}
          <div>
            <h4 className={heading}>{headingMark}Supported Payments</h4>
            <p className="text-xs text-[#d9bda6] mb-3">
              Pay with Mobile Money, cards, eKash, or your wallet:
            </p>
            <div className="flex flex-wrap gap-2 text-xs font-bold">
              {['Mobile Money', 'Cards', 'eKash', 'Wallet'].map((method) => (
                <span key={method} className="px-3 py-1 rounded-full bg-[#f28c18]/15 text-[#ffc27a] border border-[#f28c18]/30">
                  {method}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-[#b39580] gap-4">
          <p>© {new Date().getFullYear()} KitchenLink. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Made with <Heart className="w-3.5 h-3.5 text-[#f28c18] fill-[#f28c18]" /> for Kigali Food Culture
          </p>
        </div>
      </div>
    </footer>
  );
}
