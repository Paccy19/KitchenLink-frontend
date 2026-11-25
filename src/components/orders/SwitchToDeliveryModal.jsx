import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Bike, CreditCard, Loader2, Smartphone, Wallet, X } from 'lucide-react';
import { quoteSwitchToDelivery, switchOrderToDelivery } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import KitchenLocationFields from '../vendor-dashboard/KitchenLocationFields';
import { addressPoint } from '../checkout/FulfillmentSection';
import { formatDistance } from '../../utils/distance';
import ModalPortal from '../common/ModalPortal';
import { PHONE_MAX_LENGTH, PHONE_PLACEHOLDER, isValidMomoPhone, isValidRwandaPhone, sanitizePhoneInput, toLocalRwandaPhone } from '../../utils/validation';

const METHODS = [
  { code: 'mobile_money', label: 'Mobile Money', icon: Smartphone },
  { code: 'card', label: 'Card', icon: CreditCard },
  { code: 'ekash', label: 'eKash', icon: Wallet },
  { code: 'wallet', label: 'Wallet', icon: Wallet },
];

const money = (value) => `${Number(value || 0).toLocaleString()} RWF`;

/**
 * A pickup customer who can't collect their food asks for it to be delivered:
 * where to (their location + address), the delivery fee for that distance,
 * and paying it. After the switch the order is offered to delivery workers.
 */
export default function SwitchToDeliveryModal({ order, open, onClose, onSwitched }) {
  const { user } = useAuth();
  const saved = user?.addresses?.find((address) => address.isDefault) || user?.addresses?.[0];

  const [street, setStreet] = useState('');
  const [area, setArea] = useState('');
  // Where the food goes: a map pin the customer sets (not their phone's position).
  const [pin, setPin] = useState({ lat: '', lng: '' });
  const [note, setNote] = useState('');
  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [method, setMethod] = useState('mobile_money');
  const [phone, setPhone] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setStreet(saved?.street || '');
    setArea(saved?.district || '');
    const savedPoint = addressPoint(saved);
    setPin(savedPoint ? { lat: String(savedPoint.lat), lng: String(savedPoint.lng) } : { lat: '', lng: '' });
    setNote(saved?.instructions || '');
    setPhone(user?.phone ? toLocalRwandaPhone(user.phone) : '');
    setQuote(null);
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => event.key === 'Escape' && !busy && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onClose]);

  const pinPoint = addressPoint(pin.lat === '' || pin.lng === '' ? null : pin);
  const location = () => ({
    address: street.trim() || area.trim() || 'Delivery address',
    neighborhood: area.trim(),
    latitude: pinPoint.lat,
    longitude: pinPoint.lng,
    note: note.trim(),
  });

  // Price it whenever the pin moves (the fee depends on the road distance to it).
  useEffect(() => {
    if (!open) return undefined;
    setQuote(null);
    if (!pinPoint) {
      setQuoting(false);
      return undefined;
    }
    let cancelled = false;
    setQuoting(true);
    setError('');
    const timer = setTimeout(() => {
      quoteSwitchToDelivery(order.id, location())
        .then((result) => !cancelled && setQuote(result))
        .catch((err) => !cancelled && setError(err?.message || 'Could not price the delivery.'))
        .finally(() => !cancelled && setQuoting(false));
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pinPoint?.lat, pinPoint?.lng]);

  if (!open) return null;

  const payNow = Number(quote?.pay_now_rwf || 0);
  const needsPhone = method !== 'card';
  const phoneOk = method === 'mobile_money' ? isValidMomoPhone(phone) : isValidRwandaPhone(phone);
  const cardOk = /^\d{13,19}$/.test(cardNumber) && /^(0[1-9]|1[0-2])\/\d{2}$/.test(cardExpiry);
  const paymentOk = payNow === 0 || (needsPhone ? phoneOk : cardOk);
  const addressOk = street.trim().length >= 3 && Boolean(pinPoint);

  const confirm = async () => {
    setBusy(true);
    setError('');
    try {
      const result = await switchOrderToDelivery(order.id, {
        delivery_location: location(),
        payment_method: method,
        payment_details: needsPhone
          ? { phone: toLocalRwandaPhone(phone) }
          : { card_number: cardNumber, card_expiry: cardExpiry },
      });
      onSwitched?.(result);
      onClose();
    } catch (err) {
      setError(err?.message || 'Could not switch this order to delivery.');
    } finally {
      setBusy(false);
    }
  };

  const field = 'w-full text-sm p-3 rounded-xl border border-stone-200 outline-none bg-white focus:border-[#542813]';

  return (
    <ModalPortal>
    <div
      className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(event) => event.target === event.currentTarget && !busy && onClose()}
    >
      <div role="dialog" aria-modal="true" aria-label="Get this order delivered" className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-black text-gray-900 flex items-center gap-2">
              <Bike className="w-5 h-5 text-[#8a5332]" /> Get it delivered instead
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Can't collect {order.orderNumber}? A delivery worker brings it to you. You only pay the delivery fee.
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="w-8 h-8 rounded-xl flex items-center justify-center text-stone-500 hover:bg-stone-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Where to */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-stone-500">Deliver to</p>
          <p className="text-[11px] text-stone-500">
            The delivery fee is calculated by road from the kitchen to this pin, so put it where the food should arrive.
          </p>
          <KitchenLocationFields
            area={area}
            address={street}
            coords={pin}
            onChange={(patch) => {
              if (patch.area !== undefined) setArea(patch.area.slice(0, 80));
              if (patch.address !== undefined) setStreet(patch.address.slice(0, 120));
              if (patch.coords !== undefined) setPin(patch.coords);
            }}
            inputClass={() => field}
            areaLabel="Area"
            addressLabel="Street, building or landmark"
            place="the delivery spot"
            placeSpot="the exact spot where the food should arrive"
            currentLocationHint="At the delivery address right now? Detect it. Otherwise search the area and street, or tap the map."
          />
          <input value={note} onChange={(event) => setNote(event.target.value.slice(0, 200))} placeholder="Note for the worker" className={field} />
        </div>

        {/* Fee */}
        <div className="rounded-2xl border border-[#ebd7c5] bg-[#faf6f2] p-3.5 text-sm">
          {quoting ? (
            <p className="flex items-center gap-2 text-stone-500 text-xs"><Loader2 className="w-4 h-4 animate-spin" /> Working out the delivery fee…</p>
          ) : quote ? (
            <div className="space-y-1">
              <p className="flex justify-between"><span className="text-stone-600">Distance</span><span className="font-bold">{formatDistance(quote.distance_m, quote.distance_km)}</span></p>
              <p className="flex justify-between"><span className="text-stone-600">Delivery fee</span><span className="font-black text-[#4e2410]">{money(quote.delivery_fee_rwf)}</span></p>
              <p className="flex justify-between text-xs"><span className="text-stone-500">New order total</span><span className="font-bold">{money(quote.new_total_rwf)}</span></p>
              {payNow === 0 && <p className="text-[11px] text-stone-500 pt-1">Your order isn't paid yet — the fee is added to what you pay.</p>}
            </div>
          ) : (
            <p className="text-xs text-red-600">{pinPoint ? "Couldn't price the delivery to this pin." : "Put the pin on the map to see the delivery fee."}</p>
          )}
        </div>

        {/* Pay the fee */}
        {payNow > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-stone-500">Pay {money(payNow)} with</p>
            <div className="grid grid-cols-4 gap-2">
              {METHODS.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.code}
                    type="button"
                    onClick={() => setMethod(option.code)}
                    aria-pressed={method === option.code}
                    className={clsx(
                      'flex flex-col items-center gap-1 rounded-xl border px-2 py-2 text-[11px] font-bold transition',
                      method === option.code ? 'border-[#542813] bg-[#faf6f2] text-[#3d1b0c]' : 'border-stone-200 text-stone-600 hover:bg-stone-50',
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {option.label}
                  </button>
                );
              })}
            </div>
            {needsPhone ? (
              <>
                <input
                  type="tel"
                  inputMode="tel"
                  maxLength={PHONE_MAX_LENGTH}
                  value={phone}
                  onChange={(event) => setPhone(sanitizePhoneInput(event.target.value))}
                  placeholder={PHONE_PLACEHOLDER}
                  className={field}
                />
                {phone && !phoneOk && (
                  <p className="text-[11px] font-semibold text-red-600">
                    {method === 'mobile_money' ? 'Enter an MTN (078/079) or Airtel (073) number.' : 'Enter a valid Rwandan number.'}
                  </p>
                )}
              </>
            ) : (
              <div className="grid grid-cols-[1fr_110px] gap-2">
                <input inputMode="numeric" value={cardNumber} onChange={(event) => setCardNumber(event.target.value.replace(/\D/g, '').slice(0, 19))} placeholder="Card number" className={field} />
                <input
                  inputMode="numeric"
                  value={cardExpiry}
                  onChange={(event) => {
                    const digits = event.target.value.replace(/\D/g, '').slice(0, 4);
                    setCardExpiry(digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits);
                  }}
                  placeholder="MM/YY"
                  className={field}
                />
              </div>
            )}
          </div>
        )}

        {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
        <p className="text-[11px] text-stone-400">
          Your pickup code stops working and you get a delivery code instead. The kitchen is told right away.
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={confirm}
            disabled={busy || quoting || !quote || !addressOk || !paymentOk}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] text-white font-bold text-sm disabled:opacity-50"
          >
            {busy ? 'Switching…' : payNow > 0 ? `Pay ${money(payNow)} & get it delivered` : 'Get it delivered'}
          </button>
          <button type="button" onClick={onClose} disabled={busy} className="px-4 py-3 rounded-xl border border-stone-200 text-sm font-bold text-stone-700 hover:bg-stone-100">
            Cancel
          </button>
        </div>
        {!addressOk && <p className="text-[11px] text-stone-400 -mt-2">{pinPoint ? "Add a street, building or landmark so the worker can find you." : "Put the delivery spot on the map."}</p>}
      </div>
    </div>
    </ModalPortal>
  );
}
