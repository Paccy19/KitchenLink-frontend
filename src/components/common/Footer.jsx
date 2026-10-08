import React from 'react';
import { Link } from 'react-router-dom';
import { UtensilsCrossed, Phone, Mail, MapPin, Heart, ShieldCheck } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-stone-900 text-stone-300 pt-16 pb-12 border-t border-stone-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Callout for Vendors */}
        <div className="bg-gradient-to-r from-orange-600 to-amber-600 rounded-3xl p-6 sm:p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 mb-12 shadow-xl">
          <div className="space-y-2 text-center md:text-left">
            <span className="text-[11px] font-black uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full">
              Vendor Opportunities
            </span>
            <h3 className="text-xl sm:text-2xl font-black">
              Do you cook at home or run a food business?
            </h3>
            <p className="text-sm text-orange-100 max-w-xl">
              Turn your kitchen into a thriving online business. Join Home Cooks, Bakeries, Food Trucks, and Chefs selling directly to hungry neighbors across Kigali.
            </p>
          </div>
          <button
            onClick={() => alert('Vendor Registration module is part of the next step! Stay tuned.')}
            className="px-6 py-3.5 bg-white text-orange-600 hover:bg-orange-50 font-black text-sm rounded-2xl shadow-lg transition whitespace-nowrap"
          >
            Apply as Food Vendor 🚀
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Col 1: Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-500 flex items-center justify-center text-white">
                <UtensilsCrossed className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="font-extrabold text-xl text-white">
                Food<span className="text-orange-500">Kitchen</span>
              </span>
            </div>
            <p className="text-xs text-stone-400 leading-relaxed">
              Kigali's multi-vendor marketplace connecting home cooks, culinary chefs, bakeries and restaurants directly with food lovers.
            </p>
            <div className="flex items-center gap-2 text-xs text-stone-400">
              <MapPin className="w-4 h-4 text-orange-400" />
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
                <Link to="/" className="hover:text-orange-400 transition">
                  Browse Home Kitchens
                </Link>
              </li>
              <li>
                <Link to="/?filter=preorder" className="hover:text-orange-400 transition">
                  Tomorrow's Specials (Pre-Order)
                </Link>
              </li>
              <li>
                <Link to="/orders" className="hover:text-orange-400 transition">
                  Order Tracking & History
                </Link>
              </li>
              <li>
                <Link to="/profile" className="hover:text-orange-400 transition">
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
                  className="px-2.5 py-1 rounded-lg bg-stone-800 text-stone-300 text-[11px]"
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
              Instant mobile payment & bank cards verified by safe escrow:
            </p>
            <div className="flex flex-wrap gap-2 text-xs font-bold">
              <span className="px-2.5 py-1 rounded-md bg-yellow-400/20 text-yellow-300 border border-yellow-400/30">
                MTN MoMo
              </span>
              <span className="px-2.5 py-1 rounded-md bg-red-400/20 text-red-300 border border-red-400/30">
                Airtel Money
              </span>
              <span className="px-2.5 py-1 rounded-md bg-blue-400/20 text-blue-300 border border-blue-400/30">
                Visa / Cards
              </span>
              <span className="px-2.5 py-1 rounded-md bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                eKash
              </span>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-stone-800 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-4">
          <p>© {new Date().getFullYear()} Online Food Kitchen. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Made with <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" /> for Kigali Food Culture
          </p>
        </div>

      </div>
    </footer>
  );
}
