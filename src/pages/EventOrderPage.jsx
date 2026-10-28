import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Store } from 'lucide-react';
import { fetchEventQuote, createEventOrder } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { useOrders } from '../context/OrderContext';
import { useLocation } from '../context/LocationContext';
import { sanitizePhoneInput } from '../utils/validation';
import useDebounce from '../hooks/useDebounce';
import StepCard from '../components/checkout/StepCard';
import PaymentSection from '../components/checkout/PaymentSection';
import { EMPTY_PAYMENT_INPUTS, buildPaymentDetails } from '../components/checkout/paymentMethods';
import KitchenCoordinatesPicker, { parseCoords } from '../components/vendor-dashboard/KitchenCoordinatesPicker';
import { ErrorState } from '../components/common/EmptyState';

const rwf = (value) => `${Math.round(Number(value) || 0).toLocaleString()} RWF`;
const inputClass =
  'w-full text-sm p-3 rounded-xl border border-stone-200 bg-white text-gray-900 outline-none focus:border-[#542813] focus:ring-2 focus:ring-[#542813]/15 transition';

// The earliest event time the server accepts (min_lead_hours ahead), as a
// datetime-local value in the customer's own time zone.
function earliestEventInput(hours) {
  const date = new Date(Date.now() + hours * 60 * 60 * 1000 + 5 * 60 * 1000);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

/**
 * Big Event order: the customer books a kitchen's event offer — number of
 * guests, delivery (the kitchen brings it to the venue they pin; they pay its
 * delivery fee) or pick-up (no fee), the date and time (weeks or months
 * ahead, like a pre-order), and payment. They pay half now and the balance a
 * day before the event (from their order page). Prices always come from the
 * server (POST /orders/event-quote) and the order is placed with
 * POST /orders/event-checkout.
 */
export default function EventOrderPage() {
  const { vendorId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const { refreshOrder } = useOrders();
  const { coords, source } = useLocation();

  const [guests, setGuests] = useState(searchParams.get('guests') || '');
  // The kitchen's package being ordered (from the list); none = the server's pick.
  const [packageId, setPackageId] = useState(searchParams.get('package') || '');
  const [pickup, setPickup] = useState(searchParams.get('pickup') === '1');
  const [eventAt, setEventAt] = useState('');
  // The venue pin starts at the customer's position when it is known.
  const [venue, setVenue] = useState(() =>
    source !== 'default' && coords ? { lat: coords.lat.toFixed(6), lng: coords.lng.toFixed(6) } : { lat: '', lng: '' },
  );
  const [venueAddress, setVenueAddress] = useState('');
  const [note, setNote] = useState('');

  const accountPhone = sanitizePhoneInput(user?.phone);
  const [paymentMethod, setPaymentMethod] = useState('mobile_money');
  const [paymentInputs, setPaymentInputs] = useState(() => ({
    ...EMPTY_PAYMENT_INPUTS,
    mobile_money: { phone: accountPhone },
  }));
  const setPaymentInput = (code, field, value) =>
    setPaymentInputs((prev) => ({ ...prev, [code]: { ...prev[code], [field]: value } }));

  const [data, setData] = useState(null);
  const [quoteError, setQuoteError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [quoting, setQuoting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const guestCount = Number(guests);
  const validGuests = Number.isInteger(guestCount) && guestCount >= 1;
  const pin = parseCoords(venue);
  const debouncedGuests = useDebounce(guestCount, 400);
  const debouncedPin = useDebounce(pin ? `${pin.latitude},${pin.longitude}` : '', 400);

  // Re-price whenever guests, delivery / pick-up or the venue pin change.
  useEffect(() => {
    if (!Number.isInteger(debouncedGuests) || debouncedGuests < 1) return undefined;
    let alive = true;
    const [lat, lng] = debouncedPin ? debouncedPin.split(',').map(Number) : [null, null];
    setQuoting(true);
    fetchEventQuote({
      vendor_id: vendorId,
      ...(packageId ? { package_id: packageId } : {}),
      guests: debouncedGuests,
      fulfillment: pickup ? 'pickup' : 'delivery',
      ...(!pickup && lat != null ? { delivery_location: { latitude: lat, longitude: lng } } : {}),
    })
      .then((result) => {
        if (!alive) return;
        setData(result);
        setQuoteError('');
        setLoadError('');
      })
      .catch((error) => {
        if (!alive) return;
        // Out of the guest range etc.: keep the page, show why.
        if (error.status === 409 || error.status === 400) setQuoteError(error.message);
        else if (!data) setLoadError(error.message || 'Could not load this kitchen.');
        else setQuoteError(error.message);
      })
      .finally(() => alive && setQuoting(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId, packageId, debouncedGuests, pickup, debouncedPin]);

  if (loadError && !data) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <ErrorState title="This event offer could not load" message={loadError} onRetry={() => window.location.reload()} />
      </div>
    );
  }
  if (!data) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#542813]" />
      </div>
    );
  }

  const { vendor, offer, quote } = data;
  const pkg = offer.package;
  const leadDays = Math.round((quote.min_lead_hours ?? 48) / 24);
  const minEvent = earliestEventInput(quote.min_lead_hours ?? 48);
  const maxEvent = earliestEventInput(365 * 24).slice(0, 10) + 'T23:59';
  const quoteMatches = !quoteError && quote.guests === guestCount;
  // Paid in two parts: the deposit now, the balance a day before the event.
  const balanceDueAt = eventAt
    ? new Date(new Date(eventAt).getTime() - (quote.balance_due_hours_before ?? 24) * 60 * 60 * 1000)
    : null;
  const formatDue = (date) =>
    date.toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  const placeOrder = async () => {
    setErrorMsg('');
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    if (!validGuests) return setErrorMsg('Enter the number of guests.');
    if (quoteError) return setErrorMsg(quoteError);
    if (!eventAt) return setErrorMsg('Choose the date and time of your event.');
    const when = new Date(eventAt);
    if (Number.isNaN(when.getTime()) || eventAt < minEvent) {
      return setErrorMsg(`Big events must be booked at least ${leadDays} days ahead. Pick a later date.`);
    }
    if (!pickup && !venueAddress.trim()) return setErrorMsg('Enter the address of the event venue.');
    if (!pickup && !pin) return setErrorMsg('Pin the event venue on the map.');
    const { error: paymentError, details: paymentDetails } = buildPaymentDetails(paymentMethod, paymentInputs);
    if (paymentError) return setErrorMsg(paymentError);

    setSubmitting(true);
    try {
      const order = await createEventOrder({
        vendor_id: vendorId,
        package_id: packageId || quote.package_id,
        guests: guestCount,
        fulfillment: pickup ? 'pickup' : 'delivery',
        event_at: when.toISOString(),
        delivery_location: pickup
          ? { note: '' }
          : { address: venueAddress.trim(), latitude: pin.latitude, longitude: pin.longitude },
        note,
        payment_method: paymentMethod,
        payment_details: paymentDetails,
      });
      await refreshOrder(order.id);
      navigate(`/track/${order.id}`);
    } catch (error) {
      setErrorMsg(error.message || 'Could not place your order.');
    } finally {
      setSubmitting(false);
    }
  };

  const fulfilmentChoices = [
    { value: false, label: 'Delivery', hint: 'The kitchen brings it · delivery fee' },
    { value: true, label: 'Pick up', hint: 'You collect it · no delivery fee' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 animate-fade-in">
      <Link
        to={`/vendors?events=1&guests=${guestCount || ''}${pickup ? '&pickup=1' : ''}`}
        className="inline-flex items-center gap-2 text-xs font-bold text-stone-600 hover:text-[#542813] transition mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to event kitchens</span>
      </Link>

      <div className="flex items-center gap-3 mb-6 sm:mb-8">
        <img src="/icons/party-popper.png" alt="" aria-hidden="true" className="w-10 h-10" />
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Order for your event</h1>
          <p className="text-xs text-stone-500 font-medium">
            {vendor.name}
            {vendor.neighborhood ? ` · ${vendor.neighborhood}` : ''}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Guests and date */}
          <StepCard step={1} title="Your event">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-[11px] font-bold text-stone-500 uppercase">Number of guests</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={guests}
                  onChange={(e) => setGuests(e.target.value)}
                  className={`${inputClass} mt-1`}
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold text-stone-500 uppercase">Date and time</span>
                <input
                  type="datetime-local"
                  min={minEvent}
                  max={maxEvent}
                  value={eventAt}
                  onChange={(e) => setEventAt(e.target.value)}
                  className={`${inputClass} mt-1`}
                />
              </label>
            </div>
            {/* The kitchen's packages: switch between them here. */}
            {offer.packages.length > 1 && (
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-stone-500 uppercase">Package</span>
                <div role="radiogroup" aria-label="Event package" className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {offer.packages.map((option) => {
                    const selected = option.id === pkg.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setPackageId(option.id)}
                        className={`p-3 rounded-2xl border text-left transition ${
                          selected ? 'border-[#542813] bg-[#faf6f2] ring-1 ring-[#542813]/20 shadow-sm' : 'border-stone-200 hover:bg-stone-50'
                        }`}
                      >
                        <span className="block font-bold text-xs text-gray-900">{option.name}</span>
                        <span className="block text-[11px] text-stone-500 mt-0.5">
                          {option.min_guests}–{option.max_guests} guests · from {rwf(option.from_price_per_plate_rwf)}/plate
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <p className="text-[11px] text-stone-500">
              <span className="font-bold text-gray-700">{pkg.name}</span>:{' '}
              {pkg.tiers.map((t) => `${t.min_guests}–${t.max_guests} guests (${rwf(t.price_per_plate_rwf)}/plate)`).join(', ')}. Book
              at least {leadDays} days ahead — even months before your event.
            </p>
            {quoteError && <p className="text-xs font-semibold text-red-600">{quoteError}</p>}
          </StepCard>

          {/* 2. Delivery or pick-up */}
          <StepCard step={2} title="How will you get the food?">
            <div role="radiogroup" aria-label="How will you get the food?" className="grid grid-cols-2 gap-2.5">
              {fulfilmentChoices.map((choice) => {
                const selected = pickup === choice.value;
                return (
                  <button
                    key={choice.label}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setPickup(choice.value)}
                    className={`p-3.5 rounded-2xl border text-left transition ${
                      selected ? 'border-[#542813] bg-[#faf6f2] ring-1 ring-[#542813]/20 shadow-sm' : 'border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    <span className="block font-bold text-xs text-gray-900">{choice.label}</span>
                    <span className="block text-[11px] text-stone-500 mt-0.5">{choice.hint}</span>
                  </button>
                );
              })}
            </div>

            {pickup ? (
              <div className="p-3.5 rounded-2xl bg-[#faf6f2] border border-[#ebd7c5] flex items-start gap-3 text-xs">
                <Store className="w-5 h-5 text-[#8a5332] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-[#3d1b0c]">
                    Collect from {vendor.name}
                    {[vendor.address, vendor.neighborhood].filter(Boolean).length
                      ? ` · ${[vendor.address, vendor.neighborhood].filter(Boolean).join(', ')}`
                      : ''}
                  </p>
                  <p className="text-stone-600 mt-0.5">
                    Once you've paid the balance you'll get a 6-digit code. Give it to the kitchen when you collect the food.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block">
                  <span className="text-[11px] font-bold text-stone-500 uppercase">Event venue address</span>
                  <input
                    type="text"
                    maxLength={200}
                    value={venueAddress}
                    onChange={(e) => setVenueAddress(e.target.value)}
                    placeholder="e.g. Kigali Serena Hotel, KN 3 Ave"
                    className={`${inputClass} mt-1`}
                  />
                </label>
                <KitchenCoordinatesPicker
                  value={venue}
                  onChange={setVenue}
                  inputClass={inputClass}
                  place="your event venue"
                />
                {offer.delivery_details && <p className="text-[11px] text-stone-500">{offer.delivery_details}</p>}
              </div>
            )}
          </StepCard>

          {/* 3. Payment (the shared checkout step) */}
          <PaymentSection
            paymentMethod={paymentMethod}
            onMethodChange={setPaymentMethod}
            paymentInputs={paymentInputs}
            onInputChange={setPaymentInput}
            accountPhone={accountPhone}
          />

          <div className="bg-white rounded-3xl p-4 sm:p-6 border border-stone-200/80 shadow-sm space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-600">Notes for the kitchen</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 300))}
              placeholder="e.g. Wedding reception; 10 vegetarian plates please"
              rows={2}
              className="w-full text-xs p-3 rounded-xl border border-stone-200 outline-none focus:border-[#542813] focus:ring-2 focus:ring-[#542813]/15 transition resize-none"
            />
          </div>
        </div>

        {/* Summary */}
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-24 bg-white rounded-3xl p-4 sm:p-6 border border-stone-200/80 shadow-sm space-y-4">
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider">Order summary</h2>

            <div className="text-xs text-stone-600 space-y-1.5">
              <p className="text-sm font-black text-gray-900">{pkg.name}</p>
              {pkg.description && <p>{pkg.description}</p>}
              <p className="font-bold text-gray-800">{pkg.menu.join(' · ')}</p>
              {pkg.portion && <p>{pkg.portion}</p>}
              {!pickup && pkg.service_style_label && (
                <p>
                  <span className="font-bold text-gray-800">{pkg.service_style_label}</span>
                  {pkg.service_details && ` — ${pkg.service_details}`}
                </p>
              )}
            </div>

            <dl className="text-sm text-stone-600 space-y-1.5 pt-3 border-t border-stone-100">
              {quoteMatches ? (
                <>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="min-w-0">
                      {quote.guests} {quote.guests === 1 ? 'plate' : 'plates'} × {rwf(quote.price_per_plate_rwf)}
                    </dt>
                    <dd className="whitespace-nowrap text-right">{rwf(quote.food_total_rwf)}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    {pickup ? (
                      <>
                        <dt className="min-w-0">Pick up</dt>
                        <dd className="whitespace-nowrap text-right">No delivery fee</dd>
                      </>
                    ) : (
                      <>
                        <dt className="min-w-0">{quote.distance_km != null ? `Delivery (${quote.distance_km} km)` : 'Delivery'}</dt>
                        <dd className="whitespace-nowrap text-right">{quote.delivery_fee_rwf != null ? rwf(quote.delivery_fee_rwf) : 'Pin the venue'}</dd>
                      </>
                    )}
                  </div>
                  <div className="flex items-baseline justify-between gap-3 pt-2 border-t border-stone-100 text-base sm:text-lg font-black text-gray-900">
                    <dt className="min-w-0">Total</dt>
                    <dd className="whitespace-nowrap text-right">{rwf(quote.total_rwf)}</dd>
                  </div>
                  {(pickup || quote.delivery_fee_rwf != null) && (
                    <div className="mt-2 rounded-2xl bg-[#faf6f2] border border-[#ebd7c5] p-3 space-y-1 text-xs">
                      <div className="flex items-baseline justify-between gap-3 font-black text-[#3d1b0c]">
                        <dt className="min-w-0">Pay now ({quote.deposit_percent}%)</dt>
                        <dd className="whitespace-nowrap text-right">{rwf(quote.deposit_rwf)}</dd>
                      </div>
                      <div className="flex items-baseline justify-between gap-3 text-stone-600">
                        <dt className="min-w-0">Balance, {balanceDueAt ? `by ${formatDue(balanceDueAt)}` : 'a day before the event'}</dt>
                        <dd className="whitespace-nowrap text-right">{rwf(quote.balance_rwf)}</dd>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-stone-500">{quoteError || 'Enter your number of guests to see the price.'}</p>
              )}
            </dl>

            {errorMsg && <p className="text-xs font-semibold text-red-600">{errorMsg}</p>}

            <button
              type="button"
              onClick={placeOrder}
              disabled={submitting || quoting || !quoteMatches || (!pickup && quote.delivery_fee_rwf == null)}
              className="w-full px-4 py-3.5 rounded-2xl bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] text-white text-sm font-black shadow-md disabled:opacity-50 active:scale-[0.98] transition flex items-center justify-center gap-2"
            >
              {(submitting || quoting) && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? 'Placing your order…' : quoteMatches ? `Place order · pay ${rwf(quote.deposit_rwf)} now` : 'Place order'}
            </button>
            <p className="text-[11px] text-stone-400 text-center">
              You pay half now and the rest a day before your event, from your order page. Your money is held safely until
              the kitchen hands over the food with your code.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
