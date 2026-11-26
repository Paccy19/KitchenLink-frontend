import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, LayoutGrid } from 'lucide-react';
import DishCard from './DishCard';
import { photoFor } from './CategoryBar';

const isImageUrl = (value = '') => /^(https?:)?\/\//i.test(value) || value.startsWith('data:image') || value.startsWith('/');

/** Section title in the serif, with a small orange kicker and an optional link. */
export function SectionTitle({ kicker, title, to, linkLabel = 'See all', center = false }) {
  return (
    <div className={`flex items-end gap-4 mb-6 ${center ? 'flex-col items-center text-center' : 'justify-between'}`}>
      <div>
        {kicker && <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#b5652b]">{kicker}</p>}
        <h2 className="font-display text-3xl sm:text-4xl text-[#2b1206] mt-1">{title}</h2>
      </div>
      {to && (
        <Link to={to} className="group text-sm font-bold text-[#2b1206] inline-flex items-center gap-1.5 whitespace-nowrap">
          {linkLabel} <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </Link>
      )}
    </div>
  );
}

/** "Browse by category": round photos of the live categories; tapping opens the kitchens. */
export function CategoryCircles({ categories = [] }) {
  const navigate = useNavigate();
  if (!categories.length) return null;
  return (
    <section aria-label="Browse by category" className="kl-reveal">
      <SectionTitle kicker="Explore" title="Browse by category" center />
      <div className="flex gap-5 sm:gap-7 overflow-x-auto pb-3 -mx-4 px-4 sm:justify-center snap-x">
        <Circle label="All" onClick={() => navigate('/vendors')} icon={LayoutGrid} />
        {categories.slice(0, 10).map((c, i) => (
          <Circle key={c.id} label={c.name} image={c.iconUrl && isImageUrl(c.iconUrl) ? c.iconUrl : photoFor(c.name)} delay={i} onClick={() => navigate(`/vendors?category=${encodeURIComponent(c.id)}`)} />
        ))}
      </div>
    </section>
  );
}

function Circle({ label, image, icon: Icon, onClick, delay = 0 }) {
  return (
    <button type="button" onClick={onClick} className="group snap-start flex-shrink-0 w-[84px] sm:w-[100px] text-center kl-rise" style={{ animationDelay: `${delay * 50}ms` }}>
      <span className="block mx-auto w-[76px] h-[76px] sm:w-[92px] sm:h-[92px] rounded-full p-1 bg-white border border-[#ecdcc8] shadow-sm transition group-hover:-translate-y-1 group-hover:shadow-lg group-hover:border-[#e88532]">
        {image ? (
          <img src={image} alt="" loading="lazy" className="w-full h-full rounded-full object-cover transition-transform duration-700 group-hover:scale-110" />
        ) : (
          <span className="w-full h-full rounded-full bg-[#2b1206] text-white flex items-center justify-center"><Icon className="w-7 h-7" /></span>
        )}
      </span>
      <span className="block mt-2 text-xs sm:text-[13px] font-bold text-[#3b2416] line-clamp-2">{label}</span>
    </button>
  );
}

/**
 * "Popular dishes": what people near you order most (the server sends them
 * most ordered first, so the first one is the best seller). Tabs switch
 * between the kitchens these dishes come from.
 */
export function PopularDishes({ dishes = [] }) {
  const kitchens = [...new Map(dishes.filter((d) => d.vendor?.id).map((d) => [d.vendor.id, d.vendor.name])).entries()].slice(0, 4);
  const [tab, setTab] = useState('');
  if (!dishes.length) return null;
  const shown = dishes.filter((d) => !tab || d.vendor?.id === tab).slice(0, 8);
  return (
    <section id="popular" aria-label="Popular dishes" className="kl-reveal scroll-mt-24">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#b5652b]">Most ordered</p>
          <h2 className="font-display text-3xl sm:text-4xl text-[#2b1206] mt-1">Popular dishes</h2>
        </div>
        {kitchens.length > 1 && (
          <div className="flex gap-1 rounded-full bg-white border border-[#ecdcc8] p-1 overflow-x-auto">
            {[['', 'All'], ...kitchens].map(([id, name]) => (
              <button key={id || 'all'} type="button" onClick={() => setTab(id)} className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold transition ${tab === id ? 'bg-[#2b1206] text-white shadow' : 'text-[#6b4a35] hover:text-[#2b1206]'}`}>
                {name}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {shown.map((dish, i) => {
          const rank = dishes.indexOf(dish);
          return (
            <div key={dish.id} className="relative min-w-0 kl-rise" style={{ animationDelay: `${i * 60}ms` }}>
              {rank === 0 && <Tag className="bg-[#e88532]">Best seller</Tag>}
              {rank > 0 && rank < 3 && <Tag className="bg-[#2b1206]">Popular</Tag>}
              <DishCard dish={dish} actions className="h-full" />
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Tag({ children, className }) {
  return <span className={`pointer-events-none absolute left-3 top-3 z-10 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white shadow ${className}`}>{children}</span>;
}

/** The brown band before the footer: one line and one action. */
export function OrderBand() {
  return (
    <section className="kl-reveal relative overflow-hidden rounded-[2.25rem] bg-[#2b1206] text-white px-6 sm:px-12 py-10 sm:py-12">
      <div aria-hidden="true" className="absolute -right-16 -bottom-20 w-72 h-72 rounded-full bg-[radial-gradient(circle,rgba(232,133,50,0.35),transparent_65%)]" />
      <img src="/images/home/food/bowl.jpg" alt="" aria-hidden="true" className="hidden sm:block absolute right-10 top-1/2 -translate-y-1/2 w-40 h-40 rounded-full object-cover border-[6px] border-white/10 kl-spin-slow" />
      <div className="relative max-w-xl">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#f0a35e]">Hungry?</p>
        <h2 className="font-display text-3xl sm:text-5xl mt-2 leading-tight">Taste the best, <span className="italic text-[#f0a35e]">order now</span></h2>
        <p className="mt-3 text-[#e7d5c4] text-sm sm:text-base">Fresh from kitchens near you, to your door, the counter or your table.</p>
        <Link to="/vendors" className="group mt-6 inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#e88532] text-white font-bold text-sm shadow-lg hover:bg-[#d4741f] transition">
          Order online <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </section>
  );
}
