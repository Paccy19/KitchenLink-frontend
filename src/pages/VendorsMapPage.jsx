import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ChefHat,
  KeyRound,
  Loader2,
  MapPin,
  Navigation,
  Star,
  Store,
} from 'lucide-react';
import { fetchNearbyVendors } from '../api/endpoints';
import { normalizeVendor, pickList } from '../api/normalize';
import { useLocation } from '../context/LocationContext';
import useGoogleMaps, { GOOGLE_MAPS_API_KEY } from '../hooks/useGoogleMaps';
import useCategories from '../hooks/useCategories';
import { ErrorState } from '../components/common/EmptyState';

const RADIUS_OPTIONS = [3, 5, 7, 10, 15];
const MAP_LIMIT = 50;

const round = (value) => Number(Number(value).toFixed(4));

const CUSTOMER_ICON = {
  path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z',
  fillColor: '#2563eb',
  fillOpacity: 1,
  strokeColor: '#ffffff',
  strokeWeight: 2,
  scale: 1.6,
  anchor: undefined,
};

const VENDOR_ICON = {
  path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z',
  fillColor: '#8a5332',
  fillOpacity: 1,
  strokeColor: '#ffffff',
  strokeWeight: 2,
  scale: 1.4,
};

function buildInfoContent(vendor) {
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
  meta.textContent = `${vendor.neighborhood} · ${vendor.distanceKm} km away`;
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
 * Dedicated "nearby kitchens on a map" page. Plots every active vendor that has
 * coordinates, plus the customer position, using the Google Maps JS API.
 */
export default function VendorsMapPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { coords, currentLocation, label } = useLocation();
  const { status: mapsStatus, maps } = useGoogleMaps();
  const categories = useCategories();

  const categoryId = searchParams.get('category');
  const radius = RADIUS_OPTIONS.includes(Number(searchParams.get('radius')))
    ? Number(searchParams.get('radius'))
    : 5;

  const setParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value === null || value === undefined || value === '') next.delete(key);
    else next.set(key, String(value));
    setSearchParams(next);
  };

  const query = useQuery({
    queryKey: ['vendors', 'map', round(coords.lat), round(coords.lng), radius, categoryId ?? 'all'],
    queryFn: () =>
      fetchNearbyVendors({
        lat: coords.lat,
        lng: coords.lng,
        radius,
        category_id: categoryId ?? undefined,
        sort: 'distance',
        page: 1,
        limit: MAP_LIMIT,
      }),
    staleTime: 45_000,
    refetchOnWindowFocus: false,
    select: (data) => {
      const vendors = pickList(data, 'vendors').map(normalizeVendor);
      return {
        vendors,
        total: data?.meta?.total ?? vendors.length,
        mapped: vendors.filter((vendor) => vendor.coordinates?.lat != null).length,
      };
    },
  });

  const vendors = useMemo(() => query.data?.vendors ?? [], [query.data]);
  const total = query.data?.total ?? 0;
  const mapped = query.data?.mapped ?? 0;

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const infoWindowRef = useRef(null);
  const markersRef = useRef([]);

  // Create the map once the API is ready.
  useEffect(() => {
    if (mapsStatus !== 'ready' || !maps || !mapContainerRef.current || mapInstanceRef.current) {
      return;
    }
    mapInstanceRef.current = new maps.Map(mapContainerRef.current, {
      center: { lat: coords.lat, lng: coords.lng },
      zoom: 13,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      clickableIcons: false,
    });
    infoWindowRef.current = new maps.InfoWindow();
  }, [mapsStatus, maps, coords.lat, coords.lng]);

  // (Re)draw markers whenever the vendor set or customer position changes.
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !maps) return undefined;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    const bounds = new maps.LatLngBounds();
    const origin = { lat: coords.lat, lng: coords.lng };
    bounds.extend(origin);

    const customerMarker = new maps.Marker({
      position: origin,
      map,
      title: 'Your location',
      icon: { ...CUSTOMER_ICON, anchor: new maps.Point(12, 22), scale: 1.6 },
      zIndex: 999,
    });
    customerMarker.addListener('click', () => {
      infoWindowRef.current.setContent(buildCustomerInfo(label));
      infoWindowRef.current.open({ anchor: customerMarker, map });
    });
    markersRef.current.push(customerMarker);

    vendors.forEach((vendor) => {
      if (vendor.coordinates?.lat == null || vendor.coordinates?.lng == null) return;
      const position = { lat: vendor.coordinates.lat, lng: vendor.coordinates.lng };
      const marker = new maps.Marker({
        position,
        map,
        title: vendor.name,
        icon: VENDOR_ICON,
        zIndex: 10,
      });
      marker.addListener('click', () => {
        infoWindowRef.current.setContent(buildInfoContent(vendor));
        infoWindowRef.current.open({ anchor: marker, map });
      });
      markersRef.current.push(marker);
      bounds.extend(position);
    });

    if (vendors.length > 0) {
      map.fitBounds(bounds, 64);
    } else {
      map.setCenter(origin);
      map.setZoom(13);
    }

    return () => {
      infoWindowRef.current?.close();
    };
  }, [vendors, maps, coords.lat, coords.lng, label]);

  const recenter = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.panTo({ lat: coords.lat, lng: coords.lng });
    map.setZoom(14);
  }, [coords.lat, coords.lng]);

  const focusVendor = useCallback((vendor) => {
    const map = mapInstanceRef.current;
    if (!map || vendor.coordinates?.lat == null) return;
    map.panTo({ lat: vendor.coordinates.lat, lng: vendor.coordinates.lng });
    map.setZoom(16);
    const marker = markersRef.current.find(
      (entry) => entry.getTitle?.() === vendor.name,
    );
    if (marker && infoWindowRef.current) {
      infoWindowRef.current.setContent(buildInfoContent(vendor));
      infoWindowRef.current.open({ anchor: marker, map });
    }
  }, []);

  const renderMap = () => {
    if (mapsStatus === 'missing-key') {
      return (
        <div className="h-full min-h-[360px] flex flex-col items-center justify-center text-center gap-3 p-8 bg-[#faf6f2]">
          <div className="w-12 h-12 rounded-2xl bg-white border border-[#ebd7c5] flex items-center justify-center text-[#542813] shadow-sm">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-gray-900 text-sm">Google Maps key required</h3>
            <p className="text-xs text-stone-500 mt-1 max-w-sm">
              Add <code className="bg-white px-1.5 py-0.5 rounded border border-stone-200">VITE_GOOGLE_MAPS_API_KEY</code>{' '}
              to your frontend <code className="bg-white px-1.5 py-0.5 rounded border border-stone-200">.env</code> file and restart the dev server to see kitchens on the map.
            </p>
          </div>
        </div>
      );
    }
    if (mapsStatus === 'error') {
      return (
        <div className="h-full min-h-[360px] flex flex-col items-center justify-center text-center gap-2 p-8 bg-[#faf6f2]">
          <p className="font-extrabold text-gray-900 text-sm">Could not load Google Maps</p>
          <p className="text-xs text-stone-500">Check the API key restrictions and your internet connection.</p>
        </div>
      );
    }
    return (
      <>
        <div ref={mapContainerRef} className="w-full h-full min-h-[360px]" />
        {mapsStatus === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm">
            <Loader2 className="w-6 h-6 animate-spin text-[#542813]" />
          </div>
        )}
      </>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-20 animate-fade-in">
      <Link
        to="/vendors"
        className="inline-flex items-center gap-2 text-xs font-bold text-stone-500 hover:text-[#542813] transition mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to list</span>
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Kitchens Near You · Map
          </h1>
          <p className="text-xs text-stone-500 mt-1 flex items-center gap-1.5 flex-wrap">
            <MapPin className="w-3.5 h-3.5 text-[#8a5332]" aria-hidden="true" />
            {label || currentLocation} · within {radius} km
            {!query.isPending && !query.isError && (
              <span className="bg-[#f5ebe1] text-[#3d1b0c] border border-[#ebd7c5] px-2.5 py-0.5 rounded-full font-extrabold text-[11px]">
                {mapped} of {total} on map
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
            Radius
          </span>
          {RADIUS_OPTIONS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setParam('radius', value)}
              aria-pressed={radius === value}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border active:scale-95 ${
                radius === value
                  ? 'bg-gradient-to-r from-[#2b1206] to-[#4e2410] text-white border-[#2b1206] shadow-md shadow-[#2b1206]/20'
                  : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300 hover:text-stone-900 hover:bg-stone-50'
              }`}
            >
              {value} km
            </button>
          ))}
        </div>
      </div>

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

      {query.isError && vendors.length === 0 ? (
        <ErrorState
          title="Nearby kitchens failed to load"
          message={query.error?.message || 'We could not reach the nearby vendors endpoint.'}
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
                <button
                  type="button"
                  onClick={recenter}
                  className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/95 backdrop-blur border border-stone-200 text-xs font-bold text-stone-700 shadow-md hover:text-[#542813] transition active:scale-95"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  Recenter
                </button>
              )}
            </div>
          </div>

          {/* Vendor list */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <div className="bg-white rounded-3xl border border-stone-200/80 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-stone-500">
                  {total} kitchens
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
                ) : vendors.length === 0 ? (
                  <div className="p-6 text-center">
                    <ChefHat className="w-7 h-7 text-[#542813] mx-auto" />
                    <p className="text-xs text-stone-500 mt-2">
                      No kitchens within {radius} km. Try a wider radius.
                    </p>
                  </div>
                ) : (
                  vendors.map((vendor) => (
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
                          <span className="text-stone-300">·</span>
                          <span className="font-semibold">{vendor.distanceKm} km</span>
                        </div>
                        {vendor.coordinates?.lat == null && (
                          <span className="text-[10px] text-amber-700 font-semibold">
                            No map coordinates
                          </span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {!GOOGLE_MAPS_API_KEY && (
              <p className="text-[11px] text-stone-400 mt-3 px-1">
                Tip: set <code className="bg-stone-100 px-1 rounded">VITE_GOOGLE_MAPS_API_KEY</code> to plot these kitchens on the map.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
