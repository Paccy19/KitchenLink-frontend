import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarClock, ChefHat, Clock } from 'lucide-react';
import LazyImage from '../common/LazyImage';
import { useCart } from '../../context/CartContext';
import { buildPreorderSpecial, formatScheduledFor } from '../../utils/schedule';

/**
 * A kitchen's "Tomorrow's Special" announcement card. The Pre-order action
 * primes the basket to order from this vendor against the special's delivery
 * time, then drops the customer onto the kitchen's menu.
 *
 * @param {{vendor:Object, special:Object}} props
 */
export default function SpecialCard({ vendor, special }) {
  const navigate = useNavigate();
  const { setOrderType, setPreorderSpecial } = useCart();

  if (!vendor || !special) return null;

  const handlePreorder = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setPreorderSpecial(buildPreorderSpecial(vendor, special));
    setOrderType('preorder');
    navigate(`/vendor/${vendor.id}`);
  };

  return (
    <Link
      to={`/vendor/${vendor.id}`}
      aria-label={`${vendor.name} special: ${special.text}`}
      className="group min-w-[300px] max-w-[300px] snap-start bg-white rounded-3xl border border-[#d9dcc0] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col"
    >
      <div className="relative overflow-hidden">
        <LazyImage
          src={vendor.bannerUrl}
          alt={`${vendor.name} special`}
          aspect="aspect-[16/9]"
          rounded="rounded-none"
          imgClassName="group-hover:scale-108 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-[#c9cda2] text-[#2b3317] text-[11px] font-black shadow-md">
          Tomorrow's Special
        </span>
        <div className="absolute bottom-3 left-3 right-3">
          <p className="text-white font-extrabold text-sm line-clamp-1">{vendor.name}</p>
          <p className="text-white/85 text-[11px] font-medium flex items-center gap-1">
            <ChefHat className="w-3 h-3" aria-hidden="true" />
            {vendor.type}
          </p>
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <p className="text-sm font-extrabold text-gray-900 leading-snug line-clamp-2">
          {special.text}
        </p>

        <div className="mt-3 space-y-1.5 text-[11px] font-semibold text-stone-600">
          <p className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#8a5332]" aria-hidden="true" />
            Order before {formatScheduledFor(special.cutoffAt)}
          </p>
          <p className="flex items-center gap-1.5">
            <CalendarClock className="w-3.5 h-3.5 text-[#8a5332]" aria-hidden="true" />
            Arrives {formatScheduledFor(special.deliveryAt)}
          </p>
        </div>

        <button
          type="button"
          onClick={handlePreorder}
          className="mt-4 w-full py-2.5 rounded-xl bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] text-white text-xs font-black shadow-md shadow-[#2b1206]/20 hover:from-[#3d1b0c] hover:to-[#2c1206] transition-all active:scale-95"
        >
          Pre-order now
        </button>
      </div>
    </Link>
  );
}