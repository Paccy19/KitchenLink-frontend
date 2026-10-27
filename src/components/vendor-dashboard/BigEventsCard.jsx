import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, Copy, Plus, Trash2 } from 'lucide-react';
import { vendorApi } from '../../api/vendorApi';
import { useToast } from '../common/Toast';
import {
  addRangeRow,
  feeInput,
  kmInput,
  rangeLabel,
  rangeProblems,
  rangesToPayload,
  rangesToRows,
  removeRangeRow,
  rowsToRanges,
} from '../../utils/distanceFeeRanges';

const EMPTY_TIER = { min_guests: '', max_guests: '', price_per_plate_rwf: '' };
const newPackage = (name = '') => ({
  id: '',
  name,
  description: '',
  enabled: true,
  tiers: [{ ...EMPTY_TIER }],
  menu: '',
  portion: '',
  service_style: 'buffet',
  service_details: '',
});
// Suggested start for the delivery fee by distance.
const DEFAULT_DELIVERY_ROWS = [
  { to: '5', fee: '5000' },
  { to: '15', fee: '15000' },
  { to: '', fee: '30000' },
];
const rwf = (value) => `${Math.round(Number(value) || 0).toLocaleString()} RWF`;

/** A package's filled-in guest ranges, as numbers. */
const filledTiers = (pkg) =>
  pkg.tiers
    .filter((t) => t.min_guests !== '' || t.max_guests !== '' || t.price_per_plate_rwf !== '')
    .map((t) => ({
      min_guests: Number(t.min_guests),
      max_guests: Number(t.max_guests),
      price_per_plate_rwf: Number(t.price_per_plate_rwf),
    }));

/** "50–300 guests · from 5,000 RWF/plate", or what is still missing. */
function packageSummary(pkg) {
  const tiers = filledTiers(pkg).filter((t) => t.min_guests > 0 && t.max_guests > 0 && t.price_per_plate_rwf > 0);
  if (!tiers.length) return 'No guest range yet';
  const min = Math.min(...tiers.map((t) => t.min_guests));
  const max = Math.max(...tiers.map((t) => t.max_guests));
  return `${min}–${max} guests · from ${rwf(Math.min(...tiers.map((t) => t.price_per_plate_rwf)))}/plate`;
}

/**
 * Big events: the kitchen sets up its ways of hosting events — one or more
 * packages ("Wedding buffet", "Corporate lunch" …), each with its own guest
 * ranges and price per plate, what a plate holds and the service — plus one
 * delivery fee by distance for all of them (ranges like the admin's delivery
 * fees), and checks the total a customer would pay. Customers who tap "Big
 * Event" enter their guest count, choose delivery (they pay the fee) or
 * pick-up (no fee), and see every package that fits.
 */
export default function BigEventsCard() {
  const toast = useToast();
  const [options, setOptions] = useState(null);
  const [form, setForm] = useState(null);
  const [openIndex, setOpenIndex] = useState(0);
  const [deliveryRows, setDeliveryRows] = useState(DEFAULT_DELIVERY_ROWS);
  const [previewPackage, setPreviewPackage] = useState(0);
  const [previewGuests, setPreviewGuests] = useState('');
  const [previewKm, setPreviewKm] = useState('3');
  const [busy, setBusy] = useState(false);

  const apply = useCallback((data) => {
    if (!data?.event_package) return;
    const offer = data.event_package;
    setOptions(data.options);
    setForm({
      enabled: offer.enabled,
      delivery_details: offer.delivery_details,
      packages: offer.packages.length
        ? offer.packages.map((pkg) => ({
            ...pkg,
            tiers: pkg.tiers.length ? pkg.tiers.map((t) => ({ ...t })) : [{ ...EMPTY_TIER }],
            menu: pkg.menu.join('\n'),
          }))
        : [newPackage('Event package')],
    });
    setDeliveryRows(rangesToRows(offer.delivery_fee_ranges, DEFAULT_DELIVERY_ROWS));
    setPreviewGuests((current) => current || String(offer.packages[0]?.tiers[0]?.min_guests ?? 50));
  }, []);

  useEffect(() => {
    let alive = true;
    vendorApi
      .eventPackage()
      .then((data) => alive && apply(data))
      .catch(() => {
        /* the card stays hidden when the API is unavailable */
      });
    return () => {
      alive = false;
    };
  }, [apply]);

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const setPackage = (index, patch) =>
    setForm((current) => ({
      ...current,
      packages: current.packages.map((pkg, i) => (i === index ? { ...pkg, ...patch } : pkg)),
    }));
  const setTier = (index, tierIndex, key, value) =>
    setForm((current) => ({
      ...current,
      packages: current.packages.map((pkg, i) =>
        i === index ? { ...pkg, tiers: pkg.tiers.map((t, j) => (j === tierIndex ? { ...t, [key]: value } : t)) } : pkg,
      ),
    }));
  const addPackage = (from = null) => {
    // A copy keeps everything but gets its own id (and a name to change).
    const pkg = from ? { ...from, id: '', name: `${from.name} (copy)`, tiers: from.tiers.map((t) => ({ ...t })) } : newPackage();
    setForm((current) => ({ ...current, packages: [...current.packages, pkg] }));
    setOpenIndex(form.packages.length);
  };
  const removePackage = (index) => {
    setForm((current) => ({ ...current, packages: current.packages.filter((_, i) => i !== index) }));
    setOpenIndex(-1);
    setPreviewPackage(0);
  };
  const setDeliveryRow = (index, patch) =>
    setDeliveryRows((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const deliveryRanges = useMemo(() => rowsToRanges(deliveryRows), [deliveryRows]);
  const deliveryProblems = rangeProblems(deliveryRanges, options?.limits.delivery_fee_rwf[0] ?? 0);

  // Same sum the customer sees: guests × the package's plate price for their range + delivery for the distance.
  const preview = useMemo(() => {
    const pkg = form?.packages[previewPackage];
    if (!pkg) return null;
    const guests = Number(previewGuests);
    if (!Number.isInteger(guests) || guests < 1) return null;
    const tier = filledTiers(pkg).find((t) => t.min_guests <= guests && guests <= t.max_guests && t.price_per_plate_rwf > 0);
    if (!tier) return { guests, tier: null, name: pkg.name };
    const food = guests * tier.price_per_plate_rwf;
    const km = Math.max(0, Number(previewKm) || 0);
    const range =
      deliveryRanges.find((r) => km >= r.from && (r.to === null || km < r.to)) || deliveryRanges[deliveryRanges.length - 1];
    const delivery = range && Number.isFinite(range.fee) ? range.fee : 0;
    return { guests, tier, food, km, delivery, total: food + delivery, name: pkg.name };
  }, [form, previewPackage, previewGuests, previewKm, deliveryRanges]);

  if (!form || !options) return null;

  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      apply(
        await vendorApi.saveEventPackage({
          enabled: form.enabled,
          packages: form.packages.map((pkg) => ({
            id: pkg.id || undefined,
            name: pkg.name,
            description: pkg.description,
            enabled: pkg.enabled,
            tiers: filledTiers(pkg),
            menu: pkg.menu.split('\n').map((line) => line.trim()).filter(Boolean),
            portion: pkg.portion,
            service_style: pkg.service_style,
            service_details: pkg.service_details,
          })),
          delivery_fee_ranges: rangesToPayload(deliveryRanges),
          delivery_details: form.delivery_details,
        }),
      );
      toast.success(form.enabled ? 'Big events saved. Customers can now find your packages.' : 'Big events saved.');
    } catch (error) {
      toast.error(error.message || 'Could not save your big events settings.');
    } finally {
      setBusy(false);
    }
  };

  const inputClass = 'mt-1 w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-200 focus:border-[#542813] outline-none';
  const smallInputClass = 'px-3 py-2 text-sm rounded-xl border border-stone-200 focus:border-[#542813] outline-none';
  const labelClass = 'text-[11px] font-bold text-stone-500 uppercase';
  const sectionClass = 'pt-4 border-t border-stone-100 space-y-3';
  const chipClass = (active) =>
    `px-3 py-2 rounded-xl text-xs font-bold border transition ${
      active ? 'bg-[#542813] text-white border-[#542813]' : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
    }`;
  const iconButton = 'w-8 h-8 rounded-lg border border-stone-200 text-stone-400 flex items-center justify-center transition';

  return (
    <form onSubmit={save} className="rounded-3xl bg-white border border-stone-200/80 shadow-sm p-5 sm:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
          <img src="/icons/party-popper.png" alt="" aria-hidden="true" className="w-4 h-4" /> Big events
        </p>
        <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-stone-700">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(event) => set('enabled', event.target.checked)}
            className="w-4 h-4 accent-[#542813]"
          />
          {form.enabled ? 'On — customers can find me' : 'Off'}
        </label>
      </div>
      <p className="text-sm text-stone-700">
        Set up the different ways you host big events — a wedding buffet, a corporate lunch, a birthday party… Each package has
        its own guests, prices, menu and service. Customers who tap <strong>Big Event</strong> see every package that fits their
        number of guests.
      </p>

      {/* Packages */}
      <div className={sectionClass}>
        <p className={labelClass}>Your event packages</p>
        {form.packages.map((pkg, index) => {
          const open = openIndex === index;
          return (
            <div key={index} className={`rounded-2xl border ${open ? 'border-[#d9bda6]' : 'border-stone-200'} ${pkg.enabled ? '' : 'bg-stone-50'}`}>
              <div className="flex items-center gap-2 p-3">
                <button
                  type="button"
                  onClick={() => setOpenIndex(open ? -1 : index)}
                  aria-expanded={open}
                  className="flex-1 min-w-0 flex items-center gap-2 text-left"
                >
                  <ChevronDown className={`w-4 h-4 text-stone-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                  <span className="min-w-0">
                    <span className="block text-sm font-black text-gray-900 truncate">{pkg.name || 'New package'}</span>
                    <span className="block text-[11px] text-stone-500 truncate">
                      {pkg.enabled ? packageSummary(pkg) : 'Off — customers don’t see it'}
                    </span>
                  </span>
                </button>
                <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-stone-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pkg.enabled}
                    onChange={(e) => setPackage(index, { enabled: e.target.checked })}
                    className="w-4 h-4 accent-[#542813]"
                  />
                  On
                </label>
                {form.packages.length < options.limits.packages && (
                  <button type="button" onClick={() => addPackage(pkg)} aria-label={`Copy ${pkg.name || 'package'}`} title="Copy" className={`${iconButton} hover:text-[#542813]`}>
                    <Copy className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removePackage(index)}
                  disabled={form.packages.length === 1}
                  aria-label={`Remove ${pkg.name || 'package'}`}
                  title="Remove"
                  className={`${iconButton} hover:text-red-600 hover:border-red-200 disabled:opacity-30`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {open && (
                <div className="px-3 pb-4 space-y-4 border-t border-stone-100 pt-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="block">
                      <span className={labelClass}>Package name</span>
                      <input
                        type="text"
                        maxLength={60}
                        value={pkg.name}
                        onChange={(e) => setPackage(index, { name: e.target.value })}
                        placeholder="e.g. Wedding buffet"
                        className={inputClass}
                      />
                    </label>
                    <label className="block">
                      <span className={labelClass}>Short description (optional)</span>
                      <input
                        type="text"
                        maxLength={300}
                        value={pkg.description}
                        onChange={(e) => setPackage(index, { description: e.target.value })}
                        placeholder="e.g. Full buffet for receptions"
                        className={inputClass}
                      />
                    </label>
                  </div>

                  {/* Guest ranges and price per plate */}
                  <div className="space-y-2">
                    <p className={labelClass}>Guests and price per plate</p>
                    {pkg.tiers.map((tier, tierIndex) => (
                      <div key={tierIndex} className="grid grid-cols-[1fr_1fr_1.3fr_auto] gap-2 items-end">
                        <label className="block">
                          <span className="text-[11px] text-stone-500">From (guests)</span>
                          <input type="number" min={1} value={tier.min_guests} onChange={(e) => setTier(index, tierIndex, 'min_guests', e.target.value)} className={inputClass} />
                        </label>
                        <label className="block">
                          <span className="text-[11px] text-stone-500">To (guests)</span>
                          <input type="number" min={1} value={tier.max_guests} onChange={(e) => setTier(index, tierIndex, 'max_guests', e.target.value)} className={inputClass} />
                        </label>
                        <label className="block">
                          <span className="text-[11px] text-stone-500">Per plate (RWF)</span>
                          <input type="number" min={0} step={100} value={tier.price_per_plate_rwf} onChange={(e) => setTier(index, tierIndex, 'price_per_plate_rwf', e.target.value)} className={inputClass} />
                        </label>
                        <button
                          type="button"
                          onClick={() => setPackage(index, { tiers: pkg.tiers.filter((_, j) => j !== tierIndex) })}
                          disabled={pkg.tiers.length === 1}
                          aria-label="Remove this guest range"
                          className="mb-1 w-9 h-9 rounded-xl border border-stone-200 text-stone-400 hover:text-red-600 hover:border-red-200 flex items-center justify-center disabled:opacity-30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {pkg.tiers.length < options.limits.tiers && (
                      <button
                        type="button"
                        onClick={() => setPackage(index, { tiers: [...pkg.tiers, { ...EMPTY_TIER }] })}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#542813] hover:underline"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add a guest range
                      </button>
                    )}
                    <p className="text-xs text-stone-500">Example: 50–100 guests at 6,000 RWF, 101–300 guests at 5,000 RWF. Ranges must not overlap.</p>
                  </div>

                  {/* Menu and quantity */}
                  <label className="block">
                    <span className={labelClass}>What is on the plate (one item per line)</span>
                    <textarea
                      rows={4}
                      value={pkg.menu}
                      onChange={(e) => setPackage(index, { menu: e.target.value })}
                      placeholder={'Rice and chips\nBeef brochettes\nVegetable salad\nFruit juice'}
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>Quantity per person</span>
                    <input
                      type="text"
                      maxLength={300}
                      value={pkg.portion}
                      onChange={(e) => setPackage(index, { portion: e.target.value })}
                      placeholder="e.g. One full plate (about 600 g) and one drink per guest"
                      className={inputClass}
                    />
                  </label>

                  {/* Service */}
                  <div className="space-y-2">
                    <p className={labelClass}>Service</p>
                    <div className="flex flex-wrap gap-2">
                      {options.service_styles.map((style) => (
                        <button
                          key={style.code}
                          type="button"
                          onClick={() => setPackage(index, { service_style: style.code })}
                          aria-pressed={pkg.service_style === style.code}
                          className={chipClass(pkg.service_style === style.code)}
                        >
                          {style.label}
                        </button>
                      ))}
                    </div>
                    <label className="block">
                      <span className="text-[11px] text-stone-500">Service details</span>
                      <input
                        type="text"
                        maxLength={500}
                        value={pkg.service_details}
                        onChange={(e) => setPackage(index, { service_details: e.target.value })}
                        placeholder="e.g. 5 waiters, plates, cutlery and chafing dishes included"
                        className={inputClass}
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {form.packages.length < options.limits.packages && (
          <button
            type="button"
            onClick={() => addPackage()}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#542813] hover:underline"
          >
            <Plus className="w-3.5 h-3.5" /> Add a package
          </button>
        )}
      </div>

      {/* Delivery (shared by all packages) */}
      <div className={sectionClass}>
        <p className={labelClass}>Delivery fee (all packages)</p>
        <p className="text-xs text-stone-500">
          Each customer chooses: you bring the food and they pay your delivery fee for the distance, or they pick it up at your
          kitchen and pay no delivery fee.
        </p>
        <label className="block">
          <span className="text-[11px] text-stone-500">Delivery details</span>
          <input
            type="text"
            maxLength={500}
            value={form.delivery_details}
            onChange={(e) => set('delivery_details', e.target.value)}
            placeholder="e.g. We bring the food and set up 1 hour before the event; pick-ups ready 2 hours before"
            className={inputClass}
          />
        </label>

        <div className="space-y-2">
          <p className="text-[11px] text-stone-500">
            Delivery fee by distance from your kitchen to the event. Each range starts where the previous one ends; the last one
            covers everything farther.
          </p>
          {deliveryRows.map((row, index) => {
            const range = deliveryRanges[index];
            const isLast = index === deliveryRows.length - 1;
            return (
              <div key={index} className="flex flex-wrap items-center gap-2 rounded-xl border border-stone-200 px-3 py-2.5">
                <span className="text-sm font-bold text-gray-900 w-20">From {range.from} km</span>
                {isLast ? (
                  <span className="text-sm font-bold text-stone-600 w-32">and more</span>
                ) : (
                  <span className="flex items-center gap-1.5 w-32">
                    <span className="text-sm text-stone-500">to</span>
                    <input
                      inputMode="decimal"
                      value={row.to}
                      onChange={(e) => setDeliveryRow(index, { to: kmInput(e.target.value) })}
                      className={`${smallInputClass} w-16`}
                      aria-label={`Delivery range ${index + 1} ends at (km)`}
                    />
                    <span className="text-sm text-stone-500">km</span>
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <input
                    inputMode="numeric"
                    value={row.fee}
                    onChange={(e) => setDeliveryRow(index, { fee: feeInput(e.target.value, 7) })}
                    className={`${smallInputClass} w-28`}
                    aria-label={`Delivery range ${index + 1} fee (RWF)`}
                  />
                  <span className="text-sm text-stone-500">RWF</span>
                </span>
                {deliveryRows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setDeliveryRows((rows) => removeRangeRow(rows, index))}
                    aria-label={`Remove delivery range ${index + 1}`}
                    className="ml-auto p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => setDeliveryRows((rows) => addRangeRow(rows, 5))}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#542813] hover:underline"
          >
            <Plus className="w-3.5 h-3.5" /> Add a distance range
          </button>
          {deliveryProblems.length > 0 ? (
            <ul className="text-xs font-semibold text-red-700 space-y-0.5">
              {deliveryProblems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          ) : (
            <div className="rounded-xl bg-stone-50 border border-stone-100 p-3 text-xs text-stone-700 space-y-0.5">
              <p className="font-black uppercase tracking-wider text-stone-400 mb-1">Customers will pay for delivery</p>
              {deliveryRanges.map((range, index) => (
                <p key={index}>
                  {rangeLabel(range.from, range.to)}: <strong>{rwf(range.fee)}</strong>
                </p>
              ))}
            </div>
          )}
          <p className="text-[11px] text-stone-400">A distance exactly on the edge (e.g. 5 km) uses the next range.</p>
        </div>
      </div>

      {/* Price check */}
      <div className="rounded-2xl bg-[#faf6f2] border border-[#ebd7c5] p-4 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>
            <span className="block text-xs font-black text-[#3d1b0c]">Check your prices</span>
            <span className="block text-[11px] text-stone-500">An example only — see what a customer would pay. Not saved.</span>
          </span>
          <span className="flex flex-wrap items-center gap-2 text-xs text-stone-600">
            {form.packages.length > 1 && (
              <select
                value={Math.min(previewPackage, form.packages.length - 1)}
                onChange={(e) => setPreviewPackage(Number(e.target.value))}
                aria-label="Package for the example"
                className="px-3 py-1.5 text-sm rounded-lg border border-stone-200 focus:border-[#542813] outline-none bg-white max-w-[10rem]"
              >
                {form.packages.map((pkg, index) => (
                  <option key={index} value={index}>
                    {pkg.name || `Package ${index + 1}`}
                  </option>
                ))}
              </select>
            )}
            <input
              type="number"
              min={1}
              value={previewGuests}
              onChange={(e) => setPreviewGuests(e.target.value)}
              aria-label="Guests for the example"
              className="w-20 px-3 py-1.5 text-sm rounded-lg border border-stone-200 focus:border-[#542813] outline-none bg-white"
            />
            guests
            <input
              inputMode="decimal"
              value={previewKm}
              onChange={(e) => setPreviewKm(kmInput(e.target.value))}
              aria-label="Distance for the example (km)"
              className="w-16 px-3 py-1.5 text-sm rounded-lg border border-stone-200 focus:border-[#542813] outline-none bg-white"
            />
            km away
          </span>
        </div>
        {!preview ? (
          <p className="text-xs text-stone-500">Enter a number of guests.</p>
        ) : !preview.tier ? (
          <p className="text-xs text-amber-700">
            {preview.name ? `"${preview.name}"` : 'This package'} has no guest range for {preview.guests} guests, so customers with
            this many guests won't see it.
          </p>
        ) : (
          <dl className="text-xs text-stone-600 space-y-1">
            <div className="flex justify-between">
              <dt>
                {preview.guests} {preview.guests === 1 ? 'plate' : 'plates'} × {rwf(preview.tier.price_per_plate_rwf)}
              </dt>
              <dd>{rwf(preview.food)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Delivery ({preview.km} km)</dt>
              <dd>{rwf(preview.delivery)}</dd>
            </div>
            <div className="flex justify-between pt-1.5 border-t border-[#ebd7c5] text-sm font-black text-gray-900">
              <dt>Total with delivery</dt>
              <dd>{rwf(preview.total)}</dd>
            </div>
            <div className="flex justify-between font-bold text-gray-800">
              <dt>Total if they pick it up</dt>
              <dd>{rwf(preview.food)}</dd>
            </div>
          </dl>
        )}
      </div>

      <button
        type="submit"
        disabled={busy || deliveryProblems.length > 0}
        className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] text-white text-xs font-bold disabled:opacity-50"
      >
        {busy ? 'Saving…' : 'Save big events'}
      </button>
    </form>
  );
}
