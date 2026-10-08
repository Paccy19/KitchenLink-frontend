import React from 'react';
import { Link } from 'react-router-dom';
import { UtensilsCrossed, Phone, Mail, MapPin, Heart, ShieldCheck, ArrowRight } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#190a03] text-stone-300 pt-16 pb-12 border-t border-[#3d1b0c]/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Callout for Vendors */}
        <div className="relative overflow-hidden bg-gradient-to-r from-[#240e05] via-[#3d1b0c] to-[#1c0a03] rounded-3xl p-6 sm:p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 mb-12 shadow-2xl border border-[#522712]/80">
          <div className="absolute -top-16 -right-16 w-60 h-60 bg-[#8a5332]/20 rounded-full blur-3xl pointer-events-none" />
          
          <div className="space-y-2 text-center md:text-left relative z-10">
            <span className="text-[11px] font-black uppercase tracking-wider bg-white/15 px-3 py-1 rounded-full border border-white/10">
              Vendor Opportunities
            </span>
            <h3 className="text-xl sm:text-2xl font-black">
              Do you cook at home or run a food business?
            </h3>
            <p className="text-sm text-[#ebd7c5] max-w-xl">
              Turn your kitchen into a thriving online business. Join Home Cooks, Bakeries, Food Trucks, and Chefs selling directly to hungry neighbors across Kigali.
            </p>
          </div>
          <button
            onClick={() => alert('Vendor Registration module is part of the next step! Stay tuned.')}
            className="relative z-10 px-6 py-3.5 bg-gradient-to-r from-[#f5ebe1] to-[#ebd7c5] hover:from-white hover:to-[#f5ebe1] text-[#2b1206] font-black text-sm rounded-2xl shadow-xl transition-all duration-300 hover:scale-[1.03] active:scale-95 whitespace-nowrap flex items-center gap-2"
          >
            <span>Apply as Food Vendor</span>
            <ArrowRight className="w-4 h-4 text-[#542813]" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Col 1: Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#3d1b0c] to-[#6d391d] flex items-center justify-center text-white shadow-md shadow-[#2b1206]/40">
                <UtensilsCrossed className="w-5 h-5 stroke-[2.2] text-[#f5ebe1]" />
              </div>
              <span className="font-extrabold text-xl text-white">
                Food<span className="text-[#8a5332]">Kitchen</span>
              </span>
            </div>
            <p className="text-xs text-stone-400 leading-relaxed">
              Kigali's multi-vendor marketplace connecting home cooks, culinary chefs, bakeries and restaurants directly with food lovers.
            </p>
            <div className="flex items-center gap-2 text-xs text-stone-400">
              <MapPin className="w-4 h-4 text-[#8a5332]" />
              <span>Kimironko, Kigali · Rwanda</span>
            </div>
          </div>

          {/* Col 2: For Customers */}
          <div>
            <h4 className="text-sm font-extrabold text-white uppercase tracking-wider mb-4">
              For Food Lovers
            </h4>
            <ul className="space-y-2.5 text-xs text-stone-400 font-medium">
              <li>
                <Link to="/" className="hover:text-[#ebd7c5] transition">
                  Browse Home Kitchens
                </Link>
              </li>
              <li>
                <Link to="/?filter=preorder" className="hover:text-[#ebd7c5] transition">
                  Tomorrow's Specials (Pre-Order)
                </Link>
              </li>
              <li>
                <Link to="/orders" className="hover:text-[#ebd7c5] transition">
                  Order Tracking & History
                </Link>
              </li>
              <li>
                <Link to="/profile" className="hover:text-[#ebd7c5] transition">
                  Saved Addresses & Preferences
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Coverage Areas */}
          <div>
            <h4 className="text-sm font-extrabold text-white uppercase tracking-wider mb-4">
              Kigali Delivery Zones
            </h4>
            <div className="flex flex-wrap gap-1.5 text-xs">
              {['Kimironko', 'Remera', 'Nyarutarama', 'Kiyovu', 'Kacyiru', 'Gisozi', 'Gikondo', 'Downtown'].map((zone) => (
                <span
                  key={zone}
                  className="px-2.5 py-1 rounded-lg bg-stone-900/90 text-stone-300 text-[11px] border border-stone-800"
                >
                  {zone}
                </span>
              ))}
            </div>
          </div>

          {/* Col 4: Payments & Trust */}
          <div>
            <h4 className="text-sm font-extrabold text-white uppercase tracking-wider mb-4">
              Supported Payments
            </h4>
            <p className="text-xs text-stone-400 mb-3">
              Pay with MTN Mobile Money, a bank card, or cash on delivery:
            </p>
            <div className="flex flex-wrap gap-2 text-xs font-bold">
              <span className="px-2.5 py-1 rounded-md bg-yellow-400/20 text-yellow-300 border border-yellow-400/30">
                MTN MoMo
              </span>
              <span className="px-2.5 py-1 rounded-md bg-blue-400/20 text-blue-300 border border-blue-400/30">
                Visa / Cards
              </span>
              <span className="px-2.5 py-1 rounded-md bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                Cash on Delivery
              </span>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-[#3d1b0c]/60 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-4">
          <p>© {new Date().getFullYear()} Online Food Kitchen. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Made with <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" /> for Kigali Food Culture
          </p>
        </div>

      </div>
    </footer>
  );
}
