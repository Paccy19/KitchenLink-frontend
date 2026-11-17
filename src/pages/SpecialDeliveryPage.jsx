import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Truck } from 'lucide-react';
import { specialDeliveryApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import NegotiationChat from '../components/special-delivery/NegotiationChat';
import { QuotationCard, RequestFacts, StatusHistory, StatusPill, formatWhen, rwf } from '../components/special-delivery/shared';
import { ErrorState } from '../components/common/EmptyState';

const STATUS_HELP = {
  pending_vendor_review: 'The kitchen has your request and will accept to discuss it, ask for details, or decline.',
  awaiting_customer_information: 'The kitchen needs more details before it can decide. Answer below.',
  negotiation_accepted: 'The kitchen is open to arranging this delivery. Discuss it in the chat; they will send a formal quotation.',
  negotiating: 'Discuss the delivery in the chat. The kitchen will send a formal quotation with the price.',
  quotation_submitted: 'The kitchen sent a quotation. Review it and accept, ask for another price, or reject it.',
  quotation_revision_requested: 'You asked for another price. The kitchen can send a revised quotation.',
  quotation_rejected: 'You rejected the quotation. Keep talking in the chat, or cancel the request.',
  quotation_expired: 'The quotation expired. Ask the kitchen for a new one in the chat.',
  quotation_accepted: 'Price agreed and locked. Book your event to pay with this delivery fee.',
  delivery_confirmed: 'Your event order is booked and paid with the agreed delivery fee.',
  completed: 'Delivered. Thank you!',
  vendor_declined: 'The kitchen declined this delivery. You can pick the food up, or ask another kitchen.',
  customer_cancelled: 'This request is closed.',
  disputed: 'Our support team is reviewing a problem with this delivery.',
};

/**
 * One special delivery request, for the customer: the request, the kitchen's
 * quotations (accept / ask for another price / reject), the negotiation chat,
 * and — once a price is agreed — booking the event with that delivery fee.
 */
export default function SpecialDeliveryPage() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, openAuthModal } = useAuth();
  const [request, setRequest] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [actionError, setActionError] = useState('');
  const [note, setNote] = useState('');
  const [answer, setAnswer] = useState('');

  const load = useCallback(() => {
    return specialDeliveryApi
      .get(requestId)
      .then((data) => {
        setRequest(data);
        setError('');
      })
      .catch((err) => setError(err.message || 'Could not load this request.'));
  }, [requestId]);

  useEffect(() => {
    if (!isAuthenticated) {
      openAuthModal();
      return undefined;
    }
    load();
    const timer = setInterval(() => document.visibilityState === 'visible' && load(), 15000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, load]);

  const act = async (key, fn) => {
    setBusy(key);
    setActionError('');
    try {
      setRequest(await fn());
      setNote('');
    } catch (err) {
      setActionError(err.message || 'That did not work. Try again.');
      load();
    } finally {
      setBusy('');
    }
  };

  if (!isAuthenticated) {
    return <div className="max-w-2xl mx-auto px-4 py-16 text-center text-sm text-stone-500">Sign in to see your special delivery.</div>;
  }
  if (error && !request) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <ErrorState title="This request could not load" message={error} onRetry={load} />
      </div>
    );
  }
  if (!request) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#542813]" />
      </div>
    );
  }

  const actions = new Set(request.allowed_actions || []);
  const open = request.active_quotation;
  const venue =
    request.delivery_location?.latitude != null
      ? { latitude: request.delivery_location.latitude, longitude: request.delivery_location.longitude }
      : null;
  const button = 'px-4 py-2.5 rounded-xl text-xs font-black transition disabled:opacity-50';
  const primary = `${button} bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] text-white`;
  const secondary = `${button} border border-stone-300 text-stone-700 hover:bg-stone-50`;

  const bookEvent = () => {
    const params = new URLSearchParams({ agreement: request.id });
    if (request.event?.guests) params.set('guests', String(request.event.guests));
    if (request.event?.package_id) params.set('package', request.event.package_id);
    navigate(`/event-order/${request.vendor.id}?${params}`);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 animate-fade-in">
      <Link to="/special-deliveries" className="inline-flex items-center gap-2 text-xs font-bold text-stone-600 hover:text-[#542813] mb-5">
        <ArrowLeft className="w-4 h-4" /> All special deliveries
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5" /> Special delivery {request.reference}
          </p>
          <h1 className="text-2xl font-black text-gray-900">{request.vendor?.name}</h1>
        </div>
        <StatusPill status={request.status} label={request.status_label} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-3xl bg-white border border-stone-200/80 shadow-sm p-5 space-y-3">
            <p className="text-sm text-stone-700">{STATUS_HELP[request.status]}</p>
            {request.decline_reason && <p className="text-xs text-red-700 font-semibold">Kitchen's reason: {request.decline_reason}</p>}
            {request.info_request && request.status === 'awaiting_customer_information' && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-800">The kitchen asks: “{request.info_request}”</p>
                <textarea
                  rows={3}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value.slice(0, 1000))}
                  className="w-full text-sm p-3 rounded-xl border border-stone-200 outline-none focus:border-[#542813]"
                  placeholder="Your answer"
                />
                <button
                  type="button"
                  className={primary}
                  disabled={!answer.trim() || Boolean(busy)}
                  onClick={() => act('info', () => specialDeliveryApi.provideInformation(request.id, answer.trim())).then(() => setAnswer(''))}
                >
                  {busy === 'info' ? 'Sending…' : 'Send answer'}
                </button>
              </div>
            )}
            {request.agreed_fee_rwf != null && (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3 text-sm">
                <p className="font-black text-emerald-900">Agreed delivery fee: {rwf(request.agreed_fee_rwf)}</p>
                <p className="text-xs text-emerald-800">Locked on {formatWhen(request.agreed_at)}. Added to your order total separately from the food.</p>
              </div>
            )}
            {request.can_checkout && (
              <button type="button" className={`${primary} w-full py-3`} onClick={bookEvent}>
                Book the event with this delivery fee
              </button>
            )}
            {request.order && (
              <Link to={`/track/${request.order.id}`} className="block text-xs font-bold text-[#542813] underline">
                Order {request.order.order_number} · {request.order.status}
              </Link>
            )}
            {request.dispute?.fee_reduced_by_rwf > 0 && (
              <p className="text-xs text-emerald-800 font-semibold">
                Support reduced your delivery fee by {rwf(request.dispute.fee_reduced_by_rwf)}
                {request.order ? ` (now ${rwf(request.order.delivery_fee_rwf)})` : ''}.
              </p>
            )}
            {request.refunds?.map((refund) => (
              <p key={refund.id} className="text-xs text-stone-700">
                Refund {rwf(refund.amount_rwf)} ({refund.kind_label.toLowerCase()}): <strong>{refund.status_label}</strong> to your{' '}
                {refund.destination.label}
                {refund.status !== 'completed' ? `, usually within ${refund.expected_within_hours} hours` : ''}.
              </p>
            ))}
            {actionError && <p className="text-xs font-semibold text-red-600">{actionError}</p>}
          </div>

          {open && (
            <QuotationCard
              quotation={open}
              highlight
              actions={
                actions.has('accept_quotation') && (
                  <div className="space-y-2 pt-2 border-t border-[#ebd7c5]">
                    <textarea
                      rows={2}
                      value={note}
                      onChange={(e) => setNote(e.target.value.slice(0, 500))}
                      placeholder="Note for the kitchen (optional, e.g. the price you hoped for)"
                      className="w-full text-xs p-2.5 rounded-xl border border-stone-200 outline-none focus:border-[#542813] bg-white"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={primary}
                        disabled={Boolean(busy)}
                        onClick={() => {
                          if (window.confirm(`Accept ${rwf(open.fee_rwf)} for delivery? This price will be locked for your order.`)) {
                            act('accept', () => specialDeliveryApi.acceptQuotation(request.id, open.id));
                          }
                        }}
                      >
                        {busy === 'accept' ? 'Accepting…' : `Accept ${rwf(open.fee_rwf)}`}
                      </button>
                      <button
                        type="button"
                        className={secondary}
                        disabled={Boolean(busy)}
                        onClick={() => act('revise', () => specialDeliveryApi.requestRevision(request.id, open.id, note))}
                      >
                        Ask for another price
                      </button>
                      <button
                        type="button"
                        className={`${button} text-red-700 hover:bg-red-50`}
                        disabled={Boolean(busy)}
                        onClick={() => act('reject', () => specialDeliveryApi.rejectQuotation(request.id, open.id, note))}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                )
              }
            />
          )}

          <div className="rounded-3xl bg-white border border-stone-200/80 shadow-sm p-5 space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Your request</p>
            <RequestFacts request={request} />
          </div>

          {request.quotations?.filter((q) => q.id !== open?.id).length > 0 && (
            <details className="rounded-3xl bg-white border border-stone-200/80 shadow-sm p-5">
              <summary className="text-xs font-bold text-stone-600 cursor-pointer">Earlier quotations ({request.quotations.length - (open ? 1 : 0)})</summary>
              <div className="space-y-2 mt-3">
                {request.quotations
                  .filter((q) => q.id !== open?.id)
                  .map((q) => (
                    <QuotationCard key={q.id} quotation={q} />
                  ))}
              </div>
            </details>
          )}

          <details className="rounded-3xl bg-white border border-stone-200/80 shadow-sm p-5">
            <summary className="text-xs font-bold text-stone-600 cursor-pointer">History</summary>
            <div className="mt-3">
              <StatusHistory history={request.status_history} />
            </div>
          </details>

          <div className="flex flex-wrap gap-2">
            {actions.has('cancel') && (
              <button
                type="button"
                className={`${button} text-red-700 border border-red-200 hover:bg-red-50`}
                disabled={Boolean(busy)}
                onClick={() => {
                  const reason = window.prompt('Cancel this special delivery request? You can tell the kitchen why (optional).', '');
                  if (reason !== null) act('cancel', () => specialDeliveryApi.cancel(request.id, reason));
                }}
              >
                Cancel request
              </button>
            )}
            {actions.has('dispute') && (
              <button
                type="button"
                className={secondary}
                disabled={Boolean(busy)}
                onClick={() => {
                  const reason = window.prompt('What went wrong with this delivery?');
                  if (reason && reason.trim()) act('dispute', () => specialDeliveryApi.dispute(request.id, reason.trim()));
                }}
              >
                Report a problem
              </button>
            )}
          </div>
        </div>

        <div className="lg:col-span-7">
          <NegotiationChat api={specialDeliveryApi} requestId={request.id} side="customer" open={request.chat_open} onActivity={load} venue={venue} />
        </div>
      </div>
    </div>
  );
}
