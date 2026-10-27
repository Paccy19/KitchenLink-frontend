import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ChefHat,
  Expand,
  Loader2,
  MapPin,
  Navigation,
  Star,
  Store,
} from 'lucide-react';
import {
  FullscreenControl,
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  Popup,
} from 'maplibre-gl';
import { CARTO_API_KEY, CARTO_STYLE_URL } from '../lib/mapStyle';
import { fetchMapVendors } from '../api/endpoints';
import { normalizeVendor, pickList } from '../api/normalize';
import { useLocation } from '../context/LocationContext';
import useCategories from '../hooks/useCategories';
import useVendorTypeParam from '../hooks/useVendorTypeParam';
import VendorTypeFilter from '../components/common/VendorTypeFilter';
import { ErrorState } from '../components/common/EmptyState';

// Stores open and close during the day; keep the map current.
const MAP_REFRESH_MS = 60_000;
// When the customer's position is known, the first view frames them and
// this many of the nearest open kitchens; "Show all" frames every kitchen.
const INITIAL_NEAREST = 5;

const CUSTOMER_COLOR = '#2563eb';
const VENDOR_COLOR = '#8a5332';

const round = (value) => Number(Number(value).toFixed(4));
const hasCoords = (vendor) => vendor.coordinates?.lat != null && vendor.coordinates?.lng != null;
const lngLatOf = (vendor) => [vendor.coordinates.lng, vendor.coordinates.lat];

function buildInfoContent(vendor, showDistance) {
  const wrapper = document.createElement('div');
  wrapper.style.minWidth = '190px';
  wrapper.style.fontFamily = 'inherit';

  const title = document.createElement('div');
  title.textContent = vendor.name;
  title.style.fontWeight = '800';
  title.style.fontSize = '13px';
  title.style.color = '#111827';
  wrapper.appendChild(title);

  const meta = document.createElement('div');
  meta.textContent = showDistance
    ? `${vendor.neighborhood} · ${vendor.distanceKm} km away`
    : vendor.neighborhood;
  meta.style.fontSize = '11px';
  meta.style.color = '#78716c';
  meta.style.marginTop = '2px';
  wrapper.appendChild(meta);

  const link = document.createElement('a');
  link.href = `/vendor/${vendor.id}`;
  link.textContent = 'View kitchen →';
  link.style.display = 'inline-block';
  link.style.marginTop = '8px';
  link.style.fontSize = '11px';
  link.style.fontWeight = '700';
  link.style.color = '#542813';
  link.style.textDecoration = 'none';
  wrapper.appendChild(link);

  return wrapper;
}

function buildCustomerInfo(label) {
  const wrapper = document.createElement('div');
  const title = document.createElement('div');
  title.textContent = 'Your location';
  title.style.fontSize = '12px';
  title.style.fontWeight = '700';
  title.style.color = '#1d4ed8';
  wrapper.appendChild(title);

  const detail = document.createElement('div');
  detail.textContent = label || 'Current position';
  detail.style.fontSize = '11px';
  detail.style.color = '#78716c';
  wrapper.appendChild(detail);

  return wrapper;
}

/**
 * Customer map of every kitchen whose store is open, anywhere. Customers
 * explore by panning and zooming; the list beside the map follows the area in
 * view. A kitchen appears here only while its vendor has the store open.
 */
export default function VendorsMapPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { coords, label, isGps, source } = useLocation();
  // The Kigali-centre fallback is not the customer's position.
  const located = source !== 'default';
  const [mapsStatus, setMapsStatus] = useState('loading');
  const [viewBounds, setViewBounds] = useState(null);
  const categories = useCategories();

  const categoryId = searchParams.get('category');
  const [vendorTypes, setVendorTypes] = useVendorTypeParam();
  const typeParam = vendorTypes.length ? vendorTypes.join(',') : undefined;
  // ?events=1 (Big Event button): only kitchens that take event orders.
  const eventsOnly = searchParams.get('events') === '1';
  const guestsRaw = Number(searchParams.get('guests'));
  const guests = eventsOnly && Number.isInteger(guestsRaw) && guestsRaw >= 1 ? guestsRaw : null;

  const setParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value === null || value === undefined || value === '') next.delete(key);
    else next.set(key, String(value));
    setSearchParams(next);
  };

  const query = useQuery({
    queryKey: [
      'vendors',
      'map',
      located ? round(coords.lat) : null,
      located ? round(coords.lng) : null,
      categoryId ?? 'all',
      typeParam ?? 'all-types',
      eventsOnly,
      guests,
    ],
    queryFn: () =>
      fetchMapVendors({
        ...(located ? { lat: coords.lat, lng: coords.lng } : {}),
        category_id: categoryId ?? undefined,
        vendor_type: typeParam,
        events: eventsOnly ? 1 : undefined,
        guests: guests ?? undefined,
      }),
    staleTime: 30_000,
    refetchInterval: MAP_REFRESH_MS,
    refetchOnWindowFocus: true,
    select: (data) => {
      const vendors = pickList(data, 'vendors').map(normalizeVendor).filter(hasCoords);
      return { vendors, total: data?.meta?.total ?? vendors.length };
    },
  });

  const vendors = useMemo(() => query.data?.vendors ?? [], [query.data]);
  const total = query.data?.total ?? 0;

  // The list follows the part of the map the customer is looking at.
  const inView = useMemo(
    () => (viewBounds ? vendors.filter((vendor) => viewBounds.contains(lngLatOf(vendor))) : vendors),
    [vendors, viewBounds],
  );

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  // { vendorId | 'customer', marker } so list clicks can open the right popup.
  const markersRef = useRef([]);
  // Which result set the camera was last framed for: periodic refreshes must
  // not yank the map away from where the customer is exploring.
  const framedForRef = useRef(null);

  // The map panel is replaced by an error card when the vendor list fails, so
  // the map is (re)created whenever its container is shown.
  const showMap = !(query.isError && vendors.length === 0);

  // Create the map; MapLibre owns the container until it is hidden/unmounted.
  useEffect(() => {
    if (!showMap || !mapContainerRef.current) return undefined;

    setMapsStatus('loading');
    const map = new MapLibreMap({
      container: mapContainerRef.current,
      style: CARTO_STYLE_URL,
      center: [coords.lng, coords.lat],
      zoom: 12,
      // CARTO's style already carries the OpenStreetMap/CARTO attribution.
      attributionControl: { compact: true },
    });
    map.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new FullscreenControl(), 'top-right');
    map.on('load', () => {
      setMapsStatus('ready');
      setViewBounds(map.getBounds());
    });
    map.on('moveend', () => setViewBounds(map.getBounds()));
    // Only failing to fetch the style itself is fatal (bad key / offline);
    // a missing tile, font or icon is recoverable and must not hide the map.
    let styleFetched = false;
    map.once('styledata', () => {
      styleFetched = true;
    });
    map.on('error', (event) => {
      console.warn('[map]', event?.error?.message || event?.error || event);
      if (!styleFetched) setMapsStatus('error');
    });
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersRef.current = [];
      framedForRef.current = null;
    };
    // Initial centre only; later framing is handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showMap]);

  const fitAll = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map || vendors.length === 0) return;
    const bounds = new LngLatBounds(lngLatOf(vendors[0]), lngLatOf(vendors[0]));
    vendors.forEach((vendor) => bounds.extend(lngLatOf(vendor)));
    if (located) bounds.extend([coords.lng, coords.lat]);
    map.fitBounds(bounds, { padding: 64, maxZoom: 15, duration: 600 });
  }, [vendors, located, coords.lat, coords.lng]);

  // (Re)draw markers whenever the open kitchens or customer position change.
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || mapsStatus !== 'ready') return;

    markersRef.current.forEach(({ marker }) => marker.remove());
    markersRef.current = [];

    const origin = [coords.lng, coords.lat];
    if (located) {
      const customerMarker = new Marker({ color: CUSTOMER_COLOR, scale: 1.1 })
        .setLngLat(origin)
        .setPopup(new Popup({ offset: 30 }).setDOMContent(buildCustomerInfo(label)))
        .addTo(map);
      customerMarker.getElement().style.zIndex = '2';
      customerMarker.getElement().setAttribute('aria-label', 'Your location');
      markersRef.current.push({ vendorId: 'customer', marker: customerMarker });
    }

    vendors.forEach((vendor) => {
      const marker = new Marker({ color: VENDOR_COLOR, scale: 0.95 })
        .setLngLat(lngLatOf(vendor))
        .setPopup(new Popup({ offset: 28 }).setDOMContent(buildInfoContent(vendor, isGps && vendor.hasDistance)))
        .addTo(map);
      marker.getElement().setAttribute('aria-label', vendor.name);
      markersRef.current.push({ vendorId: vendor.id, marker });
    });

    // Frame the camera once per result set (first load, new category or a
    // new customer position), never on the periodic refresh.
    if (query.isPending) return;
    const frameKey = `${categoryId ?? 'all'}|${located ? `${round(coords.lat)},${round(coords.lng)}` : '-'}`;
    if (framedForRef.current === frameKey) return;
    framedForRef.current = frameKey;

    if (vendors.length === 0) {
      map.easeTo({ center: origin, zoom: 12 });
    } else if (located) {
      // Vendors arrive nearest first: frame the customer and the closest few.
      const bounds = new LngLatBounds(origin, origin);
      vendors.slice(0, INITIAL_NEAREST).forEach((vendor) => bounds.extend(lngLatOf(vendor)));
      map.fitBounds(bounds, { padding: 64, maxZoom: 15, duration: 600 });
    } else {
      fitAll();
    }
  }, [vendors, mapsStatus, coords.lat, coords.lng, label, isGps, located, categoryId, query.isPending, fitAll]);

  const recenter = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.flyTo({ center: [coords.lng, coords.lat], zoom: 14 });
  }, [coords.lat, coords.lng]);

  const focusVendor = useCallback((vendor) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.flyTo({ center: lngLatOf(vendor), zoom: 16 });
    markersRef.current.forEach(({ marker }) => marker.getPopup()?.remove());
    const entry = markersRef.current.find((item) => item.vendorId === vendor.id);
    if (entry && !entry.marker.getPopup().isOpen()) entry.marker.togglePopup();
  }, []);

  // The container stays mounted in every state because MapLibre is bound to it.
  const renderMap = () => {
    return (
      <>
        <div ref={mapContainerRef} className="w-full h-full min-h-[360px]" />
        {mapsStatus === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center gap-2 p-8 bg-[#faf6f2]">
            <p className="font-extrabold text-gray-900 text-sm">Could not load the map</p>
            <p className="text-xs text-stone-500">
              Check your internet connection{CARTO_API_KEY ? ' and your CARTO API key' : ''}.
            </p>
          </div>
        )}
        {mapsStatus === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm">
            <Loader2 className="w-6 h-6 animate-spin text-[#542813]" />
          </div>
        )}
      </>
    );
  };

  const mapButton =
    'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/95 backdrop-blur border border-stone-200 text-xs font-bold text-stone-700 shadow-md hover:text-[#542813] transition active:scale-95';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-20 animate-fade-in">
      <Link
        to={{ pathname: '/vendors', search: searchParams.toString() }}
        className="inline-flex items-center gap-2 text-xs font-bold text-stone-500 hover:text-[#542813] transition mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to list</span>
      </Link>

      <div className="mb-5">
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
          {eventsOnly ? 'Big Event Kitchens · Map' : 'Open Kitchens · Map'}
        </h1>
        <p className="text-xs text-stone-500 mt-1 flex items-center gap-1.5 flex-wrap">
          <MapPin className="w-3.5 h-3.5 text-[#8a5332]" aria-hidden="true" />
          {eventsOnly
            ? `Open kitchens that can host ${guests ? `${guests} guests` : 'big events'}. Move and zoom the map to explore.`
            : 'Every kitchen that is open right now. Move and zoom the map to explore.'}
          {eventsOnly && (
            <button
              type="button"
              onClick={() => setParam('events', null)}
              className="font-bold text-[#542813] hover:underline"
            >
              Show all kitchens
            </button>
          )}
          {!query.isPending && !query.isError && (
            <span className="bg-[#f5ebe1] text-[#3d1b0c] border border-[#ebd7c5] px-2.5 py-0.5 rounded-full font-extrabold text-[11px]">
              {total} open
            </span>
          )}
        </p>
      </div>

      <VendorTypeFilter value={vendorTypes} onChange={setVendorTypes} className="mb-3" />

      {categories.data?.length > 0 && (
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setParam('category', null)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border whitespace-nowrap transition ${
              !categoryId
                ? 'bg-[#542813] text-white border-[#542813]'
                : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
            }`}
          >
            All
          </button>
          {categories.data.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setParam('category', category.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border whitespace-nowrap transition ${
                categoryId === category.id
                  ? 'bg-[#542813] text-white border-[#542813]'
                  : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      )}

      {!showMap ? (
        <ErrorState
          title="Open kitchens failed to load"
          message={query.error?.message || 'We could not reach the kitchens map endpoint.'}
          onRetry={query.refetch}
          isRetrying={query.isFetching}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map */}
          <div className="lg:col-span-2 order-1 lg:order-2">
            <div className="relative rounded-3xl overflow-hidden border border-stone-200/80 shadow-sm bg-stone-100 h-[60vh] min-h-[380px]">
              {renderMap()}
              {mapsStatus === 'ready' && (
                <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
                  {vendors.length > 0 && (
                    <button type="button" onClick={fitAll} className={mapButton}>
                      <Expand className="w-3.5 h-3.5" />
                      Show all kitchens
                    </button>
                  )}
                  {located && (
                    <button type="button" onClick={recenter} className={mapButton}>
                      <Navigation className="w-3.5 h-3.5" />
                      Recenter
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Kitchens in the area on screen */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <div className="bg-white rounded-3xl border border-stone-200/80 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-stone-500">
                  {inView.length} open in this area
                </span>
                <Store className="w-4 h-4 text-stone-400" />
              </div>

              <div className="max-h-[52vh] overflow-y-auto divide-y divide-stone-100">
                {query.isPending ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="p-4 animate-pulse">
                      <div className="h-3 w-2/3 bg-stone-100 rounded" />
                      <div className="h-2.5 w-1/3 bg-stone-100 rounded mt-2" />
                    </div>
                  ))
                ) : inView.length === 0 ? (
                  <div className="p-6 text-center">
                    <ChefHat className="w-7 h-7 text-[#542813] mx-auto" />
                    <p className="text-xs text-stone-500 mt-2">
                      {vendors.length === 0
                        ? eventsOnly
                          ? 'No event kitchen is open right now. Check back soon.'
                          : 'No kitchens are open right now. Check back soon.'
                        : 'No open kitchens in this area. Zoom out or tap “Show all kitchens”.'}
                    </p>
                  </div>
                ) : (
                  inView.map((vendor) => (
                    <button
                      key={vendor.id}
                      type="button"
                      onClick={() => focusVendor(vendor)}
                      className="w-full text-left p-4 hover:bg-[#faf6f2] transition flex items-start gap-3"
                    >
                      <div className="w-9 h-9 rounded-xl bg-[#faf6f2] border border-[#ebd7c5] flex items-center justify-center flex-shrink-0">
                        <Store className="w-4 h-4 text-[#6d391d]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-xs text-gray-900 truncate">
                            {vendor.name}
                          </span>
                          <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-stone-600 flex-shrink-0">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            {vendor.rating}
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-500 mt-0.5 flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 text-[#8a5332]" />
                          <span className="truncate">{vendor.neighborhood}</span>
                          {isGps && vendor.hasDistance && (
                            <>
                              <span className="text-stone-300">·</span>
                              <span className="font-semibold">{vendor.distanceKm} km</span>
                            </>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
