import React, { useState } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, X } from 'lucide-react';
import ModalPortal from './ModalPortal';

/** A kitchen's photos of its printed menu: thumbnails, then full screen to read. */
export default function MenuPhotos({ photos = [] }) {
  const [open, setOpen] = useState(-1);
  if (!photos.length) return null;
  const photo = photos[open];
  return (
    <section className="mb-5" aria-label="Menu photos">
      <h2 className="text-sm font-black text-gray-900 mb-2 flex items-center gap-1.5"><BookOpen className="w-4 h-4 text-[#f28c18]" /> Our menu</h2>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {photos.map((p, i) => (
          <button key={p.id || p.url} type="button" onClick={() => setOpen(i)} className="flex-shrink-0 w-28 text-left">
            <img src={p.url} alt={p.caption || `Menu page ${i + 1}`} loading="lazy" className="w-28 h-36 object-cover rounded-xl border border-stone-200" />
            {p.caption && <span className="block mt-1 text-[11px] font-semibold text-stone-600 truncate">{p.caption}</span>}
          </button>
        ))}
      </div>
      {photo && (
        <ModalPortal>
          <div className="fixed inset-0 z-[80] bg-black/90 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={photo.caption || 'Menu photo'} onClick={() => setOpen(-1)}>
            <img src={photo.url} alt={photo.caption || 'Menu photo'} className="max-w-full max-h-full object-contain" onClick={(e) => e.stopPropagation()} />
            <button type="button" aria-label="Close" onClick={() => setOpen(-1)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center"><X className="w-5 h-5" /></button>
            {photos.length > 1 && (
              <>
                <button type="button" aria-label="Previous" onClick={(e) => { e.stopPropagation(); setOpen((open - 1 + photos.length) % photos.length); }} className="absolute left-3 w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center"><ChevronLeft className="w-5 h-5" /></button>
                <button type="button" aria-label="Next" onClick={(e) => { e.stopPropagation(); setOpen((open + 1) % photos.length); }} className="absolute right-3 w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center"><ChevronRight className="w-5 h-5" /></button>
              </>
            )}
            {photo.caption && <p className="absolute bottom-5 inset-x-0 text-center text-white text-sm font-semibold">{photo.caption}</p>}
          </div>
        </ModalPortal>
      )}
    </section>
  );
}
