import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, Sparkles, ChefHat, ArrowRight, Clock } from 'lucide-react';
import { VENDORS } from '../../data/mockData';

export default function PreOrderBanner({ onSelectPreorderDish }) {
  // Find dishes marked as pre-order
  const preorderItems = [];
  VENDORS.forEach((vendor) => {
    vendor.menu.forEach((dish) => {
      if (dish.isPreorder) {
        preorderItems.push({ ...dish, vendor });
      }
    });
  });

  if (preorderItems.length === 0) return null;

  return (
    <div className="relative mb-12 bg-gradient-to-br from-[#2b1206] via-[#3d1b0c] to-[#1a0a03] rounded-3xl p-6 sm:p-8 border border-[#522712]/70 shadow-2xl text-white overflow-hidden">
      {/* Ambient background glow circles */}
      <div className="absolute -top-20 -right-20 w-72 h-72 bg-[#8a5332]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-[#4e2410]/25 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#522712]/80 border border-[#7a3a19]/50 text-[#ebd7c5] text-xs font-bold uppercase tracking-wider mb-2.5 shadow-sm">
            <CalendarClock className="w-3.5 h-3.5 text-[#d9bda6]" />
            <span>Home Cook Pre-Orders & Specials</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Tomorrow's Homemade Specials
          </h2>
          <p className="text-xs sm:text-sm text-stone-300 mt-1 max-w-2xl">
            Home cooks prepare these special recipes upon advance booking. Lock in your order before cutoff time!
          </p>
        </div>

        <Link
          to="/?filter=preorder"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#f5ebe1] hover:text-white bg-white/10 hover:bg-white/15 px-4 py-2 rounded-xl border border-white/10 backdrop-blur-sm transition-all hover:translate-x-0.5"
        >
          <span>View all specials</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4">
        {preorderItems.map((item) => (
          <div
            key={item.id}
            className="group bg-white rounded-2xl p-4 sm:p-5 border border-stone-200/80 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between text-gray-900"
          >
            <div className="flex items-center gap-3.5 flex-1 min-w-0">
              <div className="relative overflow-hidden rounded-xl flex-shrink-0">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-20 h-20 rounded-xl object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#faf6f2] text-[#542813] border border-[#ebd7c5] flex items-center gap-1">
                    <ChefHat className="w-3 h-3 text-[#6d391d]" />
                    {item.vendor.name}
                  </span>
                </div>
                <h4 className="font-extrabold text-sm sm:text-base text-gray-900 truncate group-hover:text-[#542813] transition-colors">
                  {item.name}
                </h4>
                <p className="text-xs text-[#6d391d] font-semibold flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3 text-[#8a5332]" />
                  {item.preorderCutoff || 'Order ahead for next day'}
                </p>
                <div className="text-[#3d1b0c] font-black text-sm mt-1">
                  {item.price.toLocaleString()} RWF
                </div>
              </div>
            </div>

            <button
              onClick={() => onSelectPreorderDish(item, item.vendor)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] hover:from-[#3d1b0c] hover:via-[#5c2810] hover:to-[#2c1206] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-[#2b1206]/20 hover:shadow-lg active:scale-95 flex-shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#d9bda6]" />
              <span>Pre-Order Dish</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
