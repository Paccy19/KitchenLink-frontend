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
    <div className="mb-12 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-100/60 rounded-3xl p-6 sm:p-8 border border-amber-200/80 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-200/70 text-amber-900 text-xs font-bold uppercase tracking-wider mb-2">
            <CalendarClock className="w-3.5 h-3.5 text-amber-800" />
            <span>Home Cook Pre-Orders & Specials</span>
          </div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">
            Tomorrow's Homemade Specials 🥘
          </h2>
          <p className="text-xs sm:text-sm text-gray-600">
            Home cooks prepare these special recipes upon advance booking. Lock in your order before cutoff time!
          </p>
        </div>

        <Link
          to="/?filter=preorder"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-orange-700 hover:text-orange-800"
        >
          <span>View all scheduled specials</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {preorderItems.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-2xl p-4 sm:p-5 border border-amber-100 shadow-sm hover:shadow-md transition flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
          >
            <div className="flex items-center gap-3.5 flex-1 min-w-0">
              <img
                src={item.image}
                alt={item.name}
                className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1">
                    <ChefHat className="w-3 h-3" />
                    {item.vendor.name}
                  </span>
                </div>
                <h4 className="font-extrabold text-sm sm:text-base text-gray-900 truncate">
                  {item.name}
                </h4>
                <p className="text-xs text-amber-700 font-semibold flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3" />
                  {item.preorderCutoff || 'Order ahead for next day'}
                </p>
                <div className="text-orange-600 font-black text-sm mt-1">
                  {item.price.toLocaleString()} RWF
                </div>
              </div>
            </div>

            <button
              onClick={() => onSelectPreorderDish(item, item.vendor)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm flex-shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Pre-Order Dish</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
