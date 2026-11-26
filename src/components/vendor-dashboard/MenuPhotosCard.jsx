import React, { useRef, useState } from 'react';
import { Camera, Trash2, Loader2, ImagePlus } from 'lucide-react';
import { vendorRequest } from '../../api/vendorApi';
import { shrinkImage } from '../../utils/shrinkImage';
import { useVendor } from '../../context/VendorContext';
import { useLoad } from './ops/ui';

const dataUriToFile = (dataUri) => {
  const [head, base64] = dataUri.split(',');
  const mime = head.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], `menu.${mime.split('/')[1] || 'jpg'}`, { type: mime });
};

/**
 * Photos of the kitchen's own printed menu, shown to customers on the kitchen
 * page and at the table. Customers order from the dishes added one by one.
 */
export default function MenuPhotosCard() {
  const { can } = useVendor();
  const { data, error, reload } = useLoad(() => vendorRequest('/vendor/menu/photos'), [], { intervalMs: 60000 });
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const fileRef = useRef(null);
  const photos = data?.photos || [];
  const canAdd = can('menu.create') || can('menu.edit');

  const upload = async (files) => {
    setMessage('');
    for (const file of [...files]) {
      if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
        setMessage('Use a JPG, PNG or WebP photo.');
        continue;
      }
      setBusy('upload');
      try {
        // Big enough to read the prices, small enough for the 5 MB limit.
        const shrunk = await shrinkImage(file, { maxSide: 2400, maxChars: 3 * 1024 * 1024 });
        const form = new FormData();
        form.append('image', dataUriToFile(shrunk));
        await vendorRequest('/vendor/menu/photos', { method: 'POST', form });
      } catch (err) {
        setMessage(err.message || 'Could not upload this photo.');
      }
    }
    setBusy('');
    reload();
  };

  const caption = async (photo) => {
    const text = window.prompt('Caption (e.g. Breakfast, Drinks)', photo.caption || '');
    if (text === null) return;
    setBusy(photo.id);
    try {
      await vendorRequest(`/vendor/menu/photos/${photo.id}`, { method: 'PATCH', body: { caption: text } });
      reload();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy('');
    }
  };

  const remove = async (photo) => {
    if (!window.confirm('Remove this menu photo?')) return;
    setBusy(photo.id);
    try {
      await vendorRequest(`/vendor/menu/photos/${photo.id}`, { method: 'DELETE' });
      reload();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="rounded-3xl bg-white border border-stone-200/80 shadow-sm p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="font-black text-gray-900 flex items-center gap-2"><Camera className="w-4 h-4 text-[#6d391d]" /> Photos of your menu</h3>
          <p className="text-xs text-stone-500">Already have a printed menu? Add photos of it so customers can read it. Customers order from the dishes you add below.</p>
        </div>
        {canAdd && (
          <>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => { upload(e.target.files); e.target.value = ''; }} />
            <button
              type="button"
              disabled={busy === 'upload' || photos.length >= (data?.max || 12)}
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#faf6f2] border border-[#ebd7c5] text-[#542813] font-bold text-sm disabled:opacity-50"
            >
              {busy === 'upload' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />} Add menu photo
            </button>
          </>
        )}
      </div>
      {(message || error) && <p role="alert" className="mt-3 text-xs font-semibold text-red-600">{message || error}</p>}
      {photos.length > 0 && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {photos.map((photo) => (
            <figure key={photo.id} className="relative group rounded-2xl overflow-hidden border border-stone-200 bg-stone-50">
              <a href={photo.url} target="_blank" rel="noreferrer">
                <img src={photo.url} alt={photo.caption || 'Menu photo'} className="w-full aspect-[3/4] object-cover" loading="lazy" />
              </a>
              <figcaption className="px-2 py-1.5 text-[11px] font-semibold text-stone-600 flex items-center justify-between gap-1">
                <button type="button" className="truncate text-left hover:underline" onClick={() => canAdd && caption(photo)} disabled={!canAdd}>
                  {photo.caption || (canAdd ? 'Add caption' : '')}
                </button>
                {(can('menu.delete') || can('menu.edit')) && (
                  <button type="button" aria-label="Remove photo" onClick={() => remove(photo)} disabled={busy === photo.id} className="text-red-600 flex-shrink-0">
                    {busy === photo.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
