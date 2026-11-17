import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, MapPinned, Plus, Search, Trash2, Truck } from 'lucide-react';
import { vendorApi } from '../../api/vendorApi';
import { useToast } from '../../components/common/Toast';

const rwf = (value) => `${Math.round(Number(value) || 0).toLocaleString()} RWF`;
const card = 'rounded-3xl bg-white border border-stone-200/80 shadow-sm p-5 sm:p-6 space-y-4';
const label = 'text-[11px] font-bold text-stone-500 uppercase';
const input = 'px-3 py-2 text-sm rounded-xl border border-stone-200 focus:border-[#542813] outline-none bg-white';

/**
 * Vendor dashboard → Delivery Coverage: where the kitchen delivers big-event
 * orders — with its own, rented or third-party vehicles. Districts and/or
 * "within N km" areas. The kitchen never sets the price: KitchenLink's
 * big-event delivery pricing is shown read-only. Outside these areas
 * customers can ask for a special delivery, which the kitchen may decline.
 */
export default function VendorDeliveryCoveragePage() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [enabled, setEnabled] = useState(false);
  const [areas, setAreas] = useState([]);
  const [radius, setRadius] = useState('15');
  const [district, setDistrict] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [check, setCheck] = useState({ lat: '', lng: '' });
  const [checkResult, setCheckResult] = useState(null);

  const apply = (result) => {
    setData(result);
    setEnabled(result.coverage.big_event_enabled);
    setAreas(result.coverage.areas);
  };

  useEffect(() => {
    vendorApi.coverage
      .get()
      .then(apply)
      .catch((err) => setError(err.message || 'Could not load your delivery coverage.'));
  }, []);

  const districtsByProvince = useMemo(() => {
    const groups = {};
    (data?.districts || []).forEach((d) => {
      (groups[d.province] = groups[d.province] || []).push(d);
    });
    return groups;
  }, [data]);

  if (error && !data) return <p className="text-sm font-semibold text-red-600">{error}</p>;
  if (!data) return <Loader2 className="w-6 h-6 animate-spin text-[#542813]" />;

  const chosenDistricts = new Set(areas.filter((a) => a.kind === 'district').map((a) => a.district));
  const pricing = data.platform_pricing;

  const addDistrict = () => {
    if (!district || chosenDistricts.has(district)) return;
    const d = data.districts.find((x) => x.code === district);
    setAreas((list) => [...list, { kind: 'district', district, label: d?.name || district, district_name: d?.name }]);
    setDistrict('');
  };
  const addRadius = () => {
    const km = Number(radius);
    if (!Number.isFinite(km) || km < data.limits.radius_km[0] || km > data.limits.radius_km[1]) {
      toast.error(`Choose a distance from ${data.limits.radius_km[0]} to ${data.limits.radius_km[1]} km.`);
      return;
    }
    setAreas((list) => [...list, { kind: 'radius', radius_km: km, label: `Within ${km} km of my kitchen` }]);
  };

  const save = async () => {
    setBusy(true);
    try {
      apply(
        await vendorApi.coverage.save({
          big_event_enabled: enabled,
          areas: areas.map(({ id, kind, district: code, radius_km, latitude, longitude, label: name }) => ({
            id,
            kind,
            district: code,
            radius_km,
            latitude,
            longitude,
            label: name,
          })),
        }),
      );
      toast.success(enabled ? 'Delivery coverage saved.' : 'Saved. Big-event delivery is off: customers can only pick up.');
    } catch (err) {
      toast.error(err.message || 'Could not save your coverage.');
    } finally {
      setBusy(false);
    }
  };

  const runCheck = async (event) => {
    event.preventDefault();
    setCheckResult(null);
    try {
      setCheckResult(await vendorApi.coverage.check({ lat: check.lat, lng: check.lng }));
    } catch (err) {
      setCheckResult({ error: err.message });
    }
  };

  const useMyPosition = () =>
    navigator.geolocation?.getCurrentPosition((pos) =>
      setCheck({ lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) }),
    );

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          <MapPinned className="w-6 h-6 text-[#542813]" /> Delivery Coverage
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          Where you can deliver big-event orders — with your own vehicle, a rented one or a transport partner. You choose the
          places; KitchenLink sets the delivery price.
        </p>
      </div>

      <div className={card}>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="mt-1 w-4 h-4 accent-[#542813]" />
          <span>
            <span className="block text-sm font-black text-gray-900">I deliver big-event orders</span>
            <span className="block text-xs text-stone-500">
              Off: customers can still book your event packages and pick the food up, but can't ask you to deliver.
            </span>
          </span>
        </label>

        <div className="space-y-2">
          <p className={label}>Places you deliver to</p>
          {areas.length === 0 ? (
            <p className="text-xs text-stone-500">No places yet. Add districts or a distance around your kitchen.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {areas.map((area, index) => (
                <li key={area.id || `${area.kind}-${index}`} className="inline-flex items-center gap-1.5 pl-3 pr-1 py-1 rounded-full bg-[#faf6f2] border border-[#ebd7c5] text-xs font-bold text-[#3d1b0c]">
                  {area.kind === 'district' ? `${area.district_name || area.label} district` : area.label}
                  <button
                    type="button"
                    onClick={() => setAreas((list) => list.filter((_, i) => i !== index))}
                    aria-label={`Remove ${area.label}`}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-stone-400 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <p className={label}>Add a district</p>
            <div className="flex gap-2">
              <select value={district} onChange={(e) => setDistrict(e.target.value)} className={`${input} flex-1 min-w-0`} aria-label="District">
                <option value="">Choose a district…</option>
                {Object.entries(districtsByProvince).map(([province, list]) => (
                  <optgroup key={province} label={province}>
                    {list.map((d) => (
                      <option key={d.code} value={d.code} disabled={chosenDistricts.has(d.code)}>
                        {d.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <button type="button" onClick={addDistrict} disabled={!district} className="px-3 rounded-xl border border-stone-200 text-[#542813] disabled:opacity-40" aria-label="Add district">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <p className={label}>Or a distance around your kitchen</p>
            <div className="flex gap-2 items-center">
              <span className="text-xs text-stone-500">Within</span>
              <input inputMode="decimal" value={radius} onChange={(e) => setRadius(e.target.value.replace(/[^0-9.]/g, ''))} className={`${input} w-20`} aria-label="Distance in km" />
              <span className="text-xs text-stone-500">km</span>
              <button type="button" onClick={addRadius} className="px-3 py-2 rounded-xl border border-stone-200 text-[#542813]" aria-label="Add distance">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] text-white text-xs font-bold disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Save coverage'}
        </button>
      </div>

      <div className={card}>
        <p className={label}>Is a destination inside your coverage?</p>
        <form onSubmit={runCheck} className="flex flex-wrap gap-2 items-center">
          <input value={check.lat} onChange={(e) => setCheck((c) => ({ ...c, lat: e.target.value }))} placeholder="Latitude, e.g. -1.95" className={`${input} w-36`} aria-label="Latitude" />
          <input value={check.lng} onChange={(e) => setCheck((c) => ({ ...c, lng: e.target.value }))} placeholder="Longitude, e.g. 30.06" className={`${input} w-36`} aria-label="Longitude" />
          <button type="submit" className="px-3 py-2 rounded-xl bg-[#542813] text-white text-xs font-bold inline-flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5" /> Check
          </button>
          <button type="button" onClick={useMyPosition} className="text-xs font-bold text-[#542813] underline">
            Use my position
          </button>
        </form>
        {checkResult &&
          (checkResult.error ? (
            <p className="text-xs font-semibold text-red-600">{checkResult.error}</p>
          ) : (
            <p className={`text-sm font-bold ${checkResult.covered ? 'text-emerald-700' : 'text-amber-700'}`}>
              {checkResult.covered
                ? `Inside your coverage (${checkResult.matched_area?.label}).`
                : checkResult.big_event_enabled
                  ? 'Outside your coverage: the customer can ask you for a special delivery, which you may decline.'
                  : 'Big-event delivery is off (saved setting).'}
              {checkResult.district ? ` ${checkResult.district.name} district.` : ''}
            </p>
          ))}
        <p className="text-[11px] text-stone-400">The check uses your saved coverage. Districts are matched to the nearest district centre, so points right on a border may be off.</p>
      </div>

      <div className={card}>
        <p className={`${label} flex items-center gap-1.5`}>
          <Truck className="w-3.5 h-3.5" /> Big-event delivery price (set by KitchenLink)
        </p>
        <p className="text-sm text-stone-700">
          {rwf(pricing.starting_fee_rwf)} + {pricing.per_meter_rwf} RWF per meter of road from your kitchen, at least {rwf(pricing.min_fee_rwf)}.
          Charged automatically up to {rwf(pricing.auto_ceiling_rwf)}
          {pricing.automatic_pricing_enabled ? '' : ' (automatic pricing is currently off: every delivery is quoted)'}.
        </p>
        <p className="text-xs text-stone-500">
          Above that, or outside your coverage, the customer can request a special delivery: you discuss it in a chat and send a
          formal quotation in{' '}
          <Link to="/vendor-dashboard/special-deliveries" className="font-bold text-[#542813] underline">
            Special deliveries
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
