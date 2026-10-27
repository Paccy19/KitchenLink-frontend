import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChefHat, Gift, Loader2, Map, MapPin, Navigation, SlidersHorizontal } from 'lucide-react';
import VendorCard from '../components/home/VendorCard';
import EventVendorCard from '../components/home/EventVendorCard';
import SpecialCard from '../components/home/SpecialCard';
import CategoryBar from '../components/home/CategoryBar';
import EmptyState, { ErrorState } from '../components/common/EmptyState';
import { VendorCardSkeleton } from '../components/common/Skeleton';
import { SORT_OPTIONS } from '../hooks/useNearbyVendors';
import useAllVendors from '../hooks/useAllVendors';
import useVendorSpecials from '../hooks/useVendorSpecials';
import useVendorOffers from '../hooks/useVendorOffers';
import OfferDayCard from '../components/home/OfferDayCard';
import useCategories from '../hooks/useCategories';
import useVendorTypeParam from '../hooks/useVendorTypeParam';
import VendorTypeFilter from '../components/common/VendorTypeFilter';
import { vendorTypeLabel } from '../data/vendorTypes';
import { useLocation } from '../context/LocationContext';

function Chip({ active, onClick, children, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex-shrink-0 transition-all border active:scale-95 ${
        active
          ? 'bg-gradient-to-r from-[#2b1206] to-[#4e2410] text-white border-[#2b1206] shadow-md shadow-[#2b1206]/20'
          : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300 hover:text-stone-900 hover:bg-stone-50'
      }`}
    >
      {children}
    </button>
  );
}

function GroupHeading({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-4 h-4 text-[#8a5332]" aria-hidden="true" />
      <h2 className="text-base sm:text-lg font-black text-gray-900 tracking-tight">{title}</h2>
      {subtitle && <span className="text-xs text-stone-500 font-medium">{subtitle}</span>}
    </div>
  );
}

/**
 * All kitchens: `GET /home/vendors` lists every kitchen in the system, near or
 * far. With the customer's location, kitchens near them come first ("Near
 * you"), followed by the rest. Category filter, sorting and infinite scroll.
 */
export default function VendorsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentLocation, requestGps, status, source } = useLocation();

  const categoryId = searchParams.get('category');
  const preorderMode = searchParams.get('filter') === 'preorder';
  // ?events=1 (Big Event button): kitchens with a big-event offer. The
  // customer first enters their guests (?guests=120); the list then shows the
  // kitchens whose guest ranges cover that number, with their price.
  const eventsOnly = searchParams.get('events') === '1';
  const guestsRaw = Number(searchParams.get('guests'));
  const guests = eventsOnly && Number.isInteger(guestsRaw) && guestsRaw >= 1 ? guestsRaw : null;
  const needGuests = eventsOnly && !guests;
  // The customer chooses: the kitchen delivers (they pay its fee) or ?pickup=1 (no fee).
  const pickup = eventsOnly && searchParams.get('pickup') === '1';
  const sort = ['distance', 'rating'].includes(searchParams.get('sort'))
    ? searchParams.get('sort')
    : 'distance';

  const [vendorTypes, setVendorTypes] = useVendorTypeParam();
  const categories = useCategories({ enabled: !preorderMode });
  const query = useAllVendors({ categoryId, vendorTypes, eventsOnly, guests, sort, perPage: 9, enabled: !preorderMode && !needGuests });
  const specials = useVendorSpecials({ enabled: preorderMode });
  const offers = useVendorOffers({ enabled: preorderMode });
  const sentinelRef = useRef(null);

  const setParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value === null || value === undefined || value === '') next.delete(key);
    else next.set(key, String(value));
    setSearchParams(next);
  };

  // Infinite scroll — observe a sentinel under the grid.
  const { hasNextPage, fetchNextPage, isFetchingNextPage } = query;
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasNextPage) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: '300px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, fetchNextPage, isFetchingNextPage]);

  const activeCategory = useMemo(
    () => categories.data?.find((category) => category.id === categoryId) ?? null,
    [categories.data, categoryId],
  );

  const vendors = query.data?.vendors ?? [];
  const total = query.data?.total ?? 0;
  const nearRadiusKm = query.data?.nearRadiusKm ?? 5;
  const locationUsed = query.data?.locationUsed ?? false;
  const firstLoad = query.isPending;

  // Nearby kitchens lead the list (sorted by distance); split them into their own group.
  const groupByDistance = sort === 'distance' && locationUsed;
  const nearby = groupByDistance ? vendors.filter((vendor) => vendor.isNearby) : [];
  const others = groupByDistance ? vendors.filter((vendor) => !vendor.isNearby) : vendors;

  if (needGuests) {
    return (
      <GuestCountStep
        initialPickup={pickup}
        onSubmit={(count, wantsPickup) => {
          const next = new URLSearchParams(searchParams);
          next.set('guests', String(count));
          if (wantsPickup) next.set('pickup', '1');
          else next.delete('pickup');
          setSearchParams(next);
        }}
        onCancel={() => setParam('events', null)}
      />
    );
  }

  if (preorderMode) {
    const entries = specials.data ?? [];
    const offerEntries = offers.data ?? [];
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-20 animate-fade-in">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-stone-500 hover:text-[#542813] transition mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to home</span>
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Tomorrow's Specials
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Pre-order home cooks' specials before their order-before time runs out, and see which
            kitchens have an offer coming up.
          </p>
        </div>

        {specials.isPending || offers.isPending ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" aria-busy="true">
            {Array.from({ length: 6 }).map((_, index) => (
              <VendorCardSkeleton key={index} />
            ))}
          </div>
        ) : specials.isError && offers.isError ? (
          <ErrorState
            title="Specials could not load"
            message={specials.error?.message || 'We could not reach the specials endpoint.'}
            onRetry={() => {
              specials.refetch();
              offers.refetch();
            }}
            isRetrying={specials.isFetching || offers.isFetching}
          />
        ) : entries.length === 0 && offerEntries.length === 0 ? (
          <EmptyState
            icon={<ChefHat className="w-8 h-8 text-[#542813]" />}
            title="No specials today"
            message="No kitchen has announced a special or an upcoming offer yet. Check back soon."
            actionLabel="Browse all kitchens"
            onAction={() => setParam('filter', null)}
          />
        ) : (
          <div className="space-y-9">
            {entries.length > 0 && (
              <section aria-label="Pre-order specials">
                <GroupHeading icon={ChefHat} title="Pre-order specials" subtitle="order before the cutoff" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {entries.map((entry) => (
                    <SpecialCard
                      key={entry.vendor.id}
                      vendor={entry.vendor}
                      special={entry.special}
                    />
                  ))}
                </div>
              </section>
            )}
            {offerEntries.length > 0 && (
              <section aria-label="Upcoming offer days">
                <GroupHeading icon={Gift} title="Upcoming offer days" subtitle="kitchens with a deal on a coming day" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {offerEntries.map((offer) => (
                    <OfferDayCard key={offer.id} offer={offer} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    );
  }

  const renderGrid = (list) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {list.map((vendor) =>
        eventsOnly ? <EventVendorCard key={vendor.id} vendor={vendor} pickup={pickup} /> : <VendorCard key={vendor.id} vendor={vendor} />,
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-20 animate-fade-in">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-xs font-bold text-stone-500 hover:text-[#542813] transition mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to home</span>
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            {activeCategory
              ? activeCategory.name
              : eventsOnly
                ? 'Kitchens for Big Events'
                : vendorTypes.length === 1
                  ? `${vendorTypeLabel(vendorTypes[0])} kitchens`
                  : 'All Kitchens'}
          </h1>
          {eventsOnly && (
            <p className="text-xs text-stone-500 mt-1 flex items-center gap-1.5 flex-wrap">
              <img src="/icons/party-popper.png" alt="" aria-hidden="true" className="w-4 h-4" />
              Prices for <strong className="text-gray-900">{guests} guests</strong>
              <button
                type="button"
                onClick={() => setParam('guests', null)}
                className="font-bold text-[#542813] hover:underline"
              >
                Change
              </button>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() => setParam('events', null)}
                className="font-bold text-[#542813] hover:underline"
              >
                Show all kitchens
              </button>
            </p>
          )}
          {eventsOnly && (
            <FulfilmentChoice pickup={pickup} onChange={(wantsPickup) => setParam('pickup', wantsPickup ? '1' : null)} className="mt-3" />
          )}
          <p className="text-xs text-stone-500 mt-1 flex items-center gap-1.5 flex-wrap">
            <MapPin className="w-3.5 h-3.5 text-[#8a5332]" aria-hidden="true" />
            {source === 'default'
              ? 'Every kitchen on KitchenLink'
              : `Nearest to ${currentLocation} first`}
            {!firstLoad && !query.isError && (
              <span className="bg-[#f5ebe1] text-[#3d1b0c] border border-[#ebd7c5] px-2.5 py-0.5 rounded-full font-extrabold text-[11px]">
                {total} kitchens
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={{ pathname: '/vendors/map', search: searchParams.toString() }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#2b1206] to-[#4e2410] shadow-md shadow-[#2b1206]/20 transition active:scale-95"
          >
            <Map className="w-3.5 h-3.5" aria-hidden="true" />
            Map view
          </Link>
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1">
            <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
            Sort
          </span>
          {SORT_OPTIONS.map((option) => (
            <Chip
              key={option.id}
              active={sort === option.id}
              onClick={() => setParam('sort', option.id)}
              label={`Sort by ${option.label}`}
            >
              {option.label}
            </Chip>
          ))}
        </div>
      </div>

      {/* No position yet: invite the customer to share it so nearby kitchens come first. */}
      {source === 'default' && (
        <button
          type="button"
          onClick={requestGps}
          disabled={status === 'requesting'}
          className="mb-6 w-full sm:w-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#faf6f2] border border-[#ebd7c5] text-xs font-bold text-[#542813] hover:bg-[#f5ebe1] transition disabled:opacity-60"
        >
          <Navigation className="w-4 h-4" aria-hidden="true" />
          {status === 'requesting' ? 'Locating…' : 'Use my location to see kitchens near you first'}
        </button>
      )}

      {/* Kitchen type (Home Cook, Restaurant, Food Truck …) */}
      <VendorTypeFilter value={vendorTypes} onChange={setVendorTypes} className="mb-4" />

      {/* Categories */}
      <div className="mb-7">
        <CategoryBar
          categories={categories.data ?? []}
          activeId={categoryId}
          onSelect={(id) => setParam('category', id)}
          loading={categories.isPending}
        />
      </div>

      {/* Results */}
      {firstLoad ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" aria-busy="true">
          {Array.from({ length: 6 }).map((_, index) => (
            <VendorCardSkeleton key={index} />
          ))}
        </div>
      ) : query.isError && vendors.length === 0 ? (
        <ErrorState
          title="Kitchens failed to load"
          message={query.error?.message || 'We could not reach the kitchens endpoint.'}
          onRetry={query.refetch}
          isRetrying={query.isFetching}
        />
      ) : vendors.length === 0 ? (
        <EmptyState
          icon={<ChefHat className="w-8 h-8 text-[#542813]" />}
          title="No kitchens found"
          message={
            activeCategory
              ? `No kitchen serves ${activeCategory.name.toLowerCase()} yet. Try another category.`
              : eventsOnly
                ? `No kitchen hosts events for ${guests} guests yet. Try a different number of guests.`
                : vendorTypes.length
                ? 'No kitchen of the selected type has joined yet. Try another type.'
                : 'No kitchens have joined yet. Check back soon.'
          }
        >
          {categoryId && (
            <button
              type="button"
              onClick={() => setParam('category', null)}
              className="text-xs font-bold text-[#542813] hover:underline"
            >
              Clear category filter
            </button>
          )}
          {vendorTypes.length > 0 && (
            <button
              type="button"
              onClick={() => setVendorTypes([])}
              className="text-xs font-bold text-[#542813] hover:underline"
            >
              Show every kitchen type
            </button>
          )}
        </EmptyState>
      ) : (
        <>
          <div className="space-y-9">
            {groupByDistance && nearby.length > 0 && (
              <section aria-label="Kitchens near you">
                <GroupHeading icon={Navigation} title="Near you" subtitle={`within ${nearRadiusKm} km`} />
                {renderGrid(nearby)}
              </section>
            )}
            {others.length > 0 && (
              <section aria-label="More kitchens">
                {groupByDistance && (
                  <GroupHeading
                    icon={ChefHat}
                    title={nearby.length > 0 ? 'More kitchens' : 'All kitchens'}
                    subtitle={
                      nearby.length > 0
                        ? `further than ${nearRadiusKm} km`
                        : `none within ${nearRadiusKm} km — nearest first`
                    }
                  />
                )}
                {renderGrid(others)}
              </section>
            )}
            {isFetchingNextPage && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, index) => (
                  <VendorCardSkeleton key={`loading-${index}`} />
                ))}
              </div>
            )}
          </div>

          <div ref={sentinelRef} className="h-px" aria-hidden="true" />

          <div className="mt-8 flex justify-center">
            {hasNextPage ? (
              <button
                type="button"
                onClick={fetchNextPage}
                disabled={isFetchingNextPage}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white border border-stone-200 text-sm font-bold text-stone-700 hover:border-[#d9bda6] hover:text-[#542813] transition disabled:opacity-60 shadow-sm active:scale-95"
              >
                {isFetchingNextPage && <Loader2 className="w-4 h-4 animate-spin text-[#542813]" />}
                Load more kitchens
              </button>
            ) : (
              <p className="text-xs text-stone-400 font-semibold">
                You have seen all {total} kitchens
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Big Event: the customer chooses how the food gets to the event — the kitchen
 * delivers it (they pay the kitchen's delivery fee for the distance) or they
 * pick it up at the kitchen (no delivery fee).
 */
function FulfilmentChoice({ pickup, onChange, className = '', stretch = false }) {
  const options = [
    { value: false, label: 'Delivery', hint: 'Kitchen brings it · delivery fee' },
    { value: true, label: 'Pick up', hint: 'You collect it · no delivery fee' },
  ];
  return (
    <div role="radiogroup" aria-label="How will you get the food?" className={`flex gap-2 ${className}`}>
      {options.map((option) => {
        const active = pickup === option.value;
        return (
          <button
            key={option.label}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={`${stretch ? 'flex-1' : ''} text-left px-3.5 py-2 rounded-xl border transition active:scale-95 ${
              active ? 'bg-[#542813] text-white border-[#542813] shadow-md' : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300'
            }`}
          >
            <span className="block text-sm font-black">{option.label}</span>
            <span className={`block text-[11px] ${active ? 'text-white/80' : 'text-stone-500'}`}>{option.hint}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Big Event, first step: the customer enters how many guests they expect, so
 * the list can show each kitchen's price for exactly that many people.
 */
function GuestCountStep({ initialPickup, onSubmit, onCancel }) {
  const [value, setValue] = useState('');
  const [wantsPickup, setWantsPickup] = useState(initialPickup);
  const count = Number(value);
  const valid = Number.isInteger(count) && count >= 1 && count <= 100000;

  return (
    <div className="max-w-md mx-auto px-4 pt-10 pb-20 animate-fade-in">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (valid) onSubmit(count, wantsPickup);
        }}
        className="rounded-3xl bg-white border border-stone-200/80 shadow-sm p-6 text-center space-y-4"
      >
        <img src="/icons/party-popper.png" alt="" aria-hidden="true" className="w-16 h-16 mx-auto" />
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Plan a big event</h1>
          <p className="text-sm text-stone-500 mt-1">How many people are coming? We'll show the kitchens that can host them and what it will cost.</p>
        </div>
        <label className="block text-left">
          <span className="text-[11px] font-bold text-stone-500 uppercase">Number of guests</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={100000}
            autoFocus
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="e.g. 150"
            className="mt-1 w-full px-4 py-3 text-lg font-bold rounded-xl border border-stone-200 focus:border-[#542813] outline-none text-center"
          />
        </label>
        <div className="text-left">
          <span className="text-[11px] font-bold text-stone-500 uppercase">How will you get the food?</span>
          <FulfilmentChoice pickup={wantsPickup} onChange={setWantsPickup} className="mt-1" stretch />
        </div>
        <button
          type="submit"
          disabled={!valid}
          className="w-full px-4 py-3 rounded-xl bg-[#542813] text-white text-sm font-black hover:bg-[#2b1206] transition disabled:opacity-50 active:scale-[0.98]"
        >
          Show kitchens and prices
        </button>
        <button type="button" onClick={onCancel} className="text-xs font-bold text-stone-500 hover:text-[#542813]">
          Back to all kitchens
        </button>
      </form>
    </div>
  );
}
