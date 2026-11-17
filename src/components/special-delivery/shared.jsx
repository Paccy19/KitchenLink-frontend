import React from 'react';
import { CalendarClock, FileText, Truck } from 'lucide-react';

export const rwf = (value) => `${Math.round(Number(value) || 0).toLocaleString()} RWF`;

export const formatWhen = (iso) =>
  iso
    ? new Date(iso).toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

// Status colours: waiting (amber), talking (blue), agreed (green), closed (stone/red).
const TONES = {
  pending_vendor_review: 'bg-amber-50 text-amber-800 border-amber-200',
  awaiting_customer_information: 'bg-amber-50 text-amber-800 border-amber-200',
  negotiation_accepted: 'bg-sky-50 text-sky-800 border-sky-200',
  negotiating: 'bg-sky-50 text-sky-800 border-sky-200',
  quotation_submitted: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  quotation_revision_requested: 'bg-amber-50 text-amber-800 border-amber-200',
  quotation_rejected: 'bg-stone-100 text-stone-700 border-stone-200',
  quotation_expired: 'bg-stone-100 text-stone-700 border-stone-200',
  quotation_accepted: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  delivery_confirmed: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  completed: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  vendor_declined: 'bg-red-50 text-red-700 border-red-200',
  customer_cancelled: 'bg-stone-100 text-stone-600 border-stone-200',
  disputed: 'bg-red-50 text-red-700 border-red-200',
};

export function StatusPill({ status, label }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-bold ${TONES[status] || TONES.customer_cancelled}`}>
      {label || status}
    </span>
  );
}

const QUOTE_TONES = {
  submitted: 'text-indigo-700',
  accepted: 'text-emerald-700',
  rejected: 'text-red-700',
  superseded: 'text-stone-500',
  withdrawn: 'text-stone-500',
  expired: 'text-stone-500',
};

/** One formal delivery quotation. `actions` renders below it (accept, etc.). */
export function QuotationCard({ quotation, highlight = false, actions = null }) {
  if (!quotation) return null;
  return (
    <div className={`rounded-2xl border p-4 space-y-2 ${highlight ? 'border-[#542813] bg-[#faf6f2]' : 'border-stone-200 bg-white'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" /> Quotation {quotation.reference}
          </p>
          <p className="text-2xl font-black text-gray-900">{rwf(quotation.fee_rwf)}</p>
          <p className="text-[11px] text-stone-500">Delivery fee · food is charged separately</p>
        </div>
        <span className={`text-xs font-black uppercase ${QUOTE_TONES[quotation.status] || 'text-stone-500'}`}>
          {quotation.expired ? 'expired' : quotation.status}
        </span>
      </div>
      <dl className="text-xs text-stone-600 space-y-1">
        <div className="flex gap-2">
          <CalendarClock className="w-3.5 h-3.5 mt-0.5 text-stone-400 flex-shrink-0" />
          <span>
            Delivery: <strong className="text-gray-800">{formatWhen(quotation.proposed_delivery_at)}</strong>
          </span>
        </div>
        <div className="flex gap-2">
          <Truck className="w-3.5 h-3.5 mt-0.5 text-stone-400 flex-shrink-0" />
          <span>
            {quotation.arrangements.map((a) => a.label).join(', ')}
            {quotation.arrangement_description ? ` — ${quotation.arrangement_description}` : ''}
          </span>
        </div>
        <p>To: {quotation.destination?.address}</p>
        {quotation.conditions && <p>Conditions: {quotation.conditions}</p>}
        {quotation.status === 'submitted' && <p className="font-semibold text-gray-800">Valid until {formatWhen(quotation.valid_until)}</p>}
        {quotation.decision_note && <p className="italic">“{quotation.decision_note}”</p>}
      </dl>
      {actions}
    </div>
  );
}

/** The request's audit trail: every status change, who made it and why. */
export function StatusHistory({ history = [], labels = {} }) {
  if (!history.length) return null;
  const actor = { customer: 'Customer', vendor: 'Kitchen', admin: 'Support', system: 'KitchenLink' };
  return (
    <ol className="space-y-2 text-xs">
      {history
        .slice()
        .reverse()
        .map((entry, index) => (
          <li key={index} className="flex gap-2">
            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#8a5332] flex-shrink-0" />
            <span className="text-stone-600">
              <strong className="text-gray-800">{labels[entry.to] || entry.to.replace(/_/g, ' ')}</strong> · {actor[entry.actor_role] || entry.actor_role} ·{' '}
              {formatWhen(entry.at)}
              {entry.reason ? <span className="block text-stone-500">{entry.reason}</span> : null}
            </span>
          </li>
        ))}
    </ol>
  );
}

/** The request's key facts (event, destination, why it needs special pricing). */
export function RequestFacts({ request }) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs text-stone-600">
      <div>
        <dt className="font-bold text-stone-400 uppercase text-[10px]">Deliver to</dt>
        <dd className="text-gray-800 font-semibold">{request.delivery_location?.address}</dd>
        {request.destination_district && <dd>{request.destination_district.name} district</dd>}
        {request.delivery_location?.latitude != null && (
          <dd>
            <a
              className="text-[#542813] underline"
              target="_blank"
              rel="noreferrer"
              href={`https://www.openstreetmap.org/?mlat=${request.delivery_location.latitude}&mlon=${request.delivery_location.longitude}#map=15/${request.delivery_location.latitude}/${request.delivery_location.longitude}`}
            >
              Open map
            </a>
          </dd>
        )}
      </div>
      <div>
        <dt className="font-bold text-stone-400 uppercase text-[10px]">Requested delivery</dt>
        <dd className="text-gray-800 font-semibold">{formatWhen(request.requested_delivery_at)}</dd>
        {request.event?.event_at && <dd>Event: {formatWhen(request.event.event_at)}</dd>}
      </div>
      <div>
        <dt className="font-bold text-stone-400 uppercase text-[10px]">Event</dt>
        <dd>
          {[request.event?.package_name, request.event?.guests ? `${request.event.guests} guests` : null].filter(Boolean).join(' · ') || '—'}
        </dd>
        {request.event?.description && <dd>{request.event.description}</dd>}
      </div>
      <div>
        <dt className="font-bold text-stone-400 uppercase text-[10px]">Road distance</dt>
        <dd>{request.route?.distance_m != null ? `${(request.route.distance_m / 1000).toFixed(1)} km` : 'Not measured'}</dd>
        {request.calculated_fee_rwf != null && (
          <dd>
            Platform calculation: {rwf(request.calculated_fee_rwf)} (automatic limit {rwf(request.auto_ceiling_rwf)})
          </dd>
        )}
      </div>
      {request.instructions && (
        <div className="sm:col-span-2">
          <dt className="font-bold text-stone-400 uppercase text-[10px]">Delivery instructions</dt>
          <dd className="whitespace-pre-wrap">{request.instructions}</dd>
        </div>
      )}
      {request.trigger_messages?.length > 0 && (
        <div className="sm:col-span-2">
          <dt className="font-bold text-stone-400 uppercase text-[10px]">Why a special arrangement</dt>
          {request.trigger_messages.map((message) => (
            <dd key={message}>{message}</dd>
          ))}
        </div>
      )}
    </dl>
  );
}
