import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Handshake, Loader2, Truck } from 'lucide-react';
import { vendorApi } from '../../api/vendorApi';
import { useToast } from '../../components/common/Toast';
import NegotiationChat from '../../components/special-delivery/NegotiationChat';
import { QuotationCard, RequestFacts, StatusHistory, StatusPill, formatWhen, rwf } from '../../components/special-delivery/shared';

const api = vendorApi.specialDeliveries;
const input = 'w-full px-3 py-2 text-sm rounded-xl border border-stone-200 focus:border-[#542813] outline-none bg-white';
const label = 'text-[11px] font-bold text-stone-500 uppercase';
const btn = 'px-3.5 py-2 rounded-xl text-xs font-black transition disabled:opacity-50';
const primary = `${btn} bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] text-white`;
const secondary = `${btn} border border-stone-300 text-stone-700 hover:bg-stone-50`;

const toLocalInput = (iso) => {
  if (!iso) return '';
  const date = new Date(iso);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

/**
 * Kitchen inbox for special delivery requests (big events outside coverage or
 * above the automatic price limit): accept to negotiate, ask for details or
 * decline; chat with the customer; submit or revise a formal quotation.
 */
export default function VendorSpecialDeliveriesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('request') || '';
  const [scope, setScope] = useState('open');
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  const loadList = useCallback(
    () =>
      api
        .list({ scope, limit: 50 })
        .then((data) => setItems(data.items || []))
        .catch((err) => setError(err.message || 'Could not load requests.')),
    [scope],
  );

  useEffect(() => {
    loadList();
    const timer = setInterval(() => document.visibilityState === 'visible' && loadList(), 20000);
    return () => clearInterval(timer);
  }, [loadList]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          <Truck className="w-6 h-6 text-[#542813]" /> Special deliveries
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          Big-event deliveries KitchenLink can't price automatically. Agree the delivery with the customer and send a formal
          quotation — chat messages never set a price.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-4 space-y-3">
          <div className="flex gap-2">
            {['open', 'closed'].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setScope(value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${scope === value ? 'bg-[#542813] text-white border-[#542813]' : 'bg-white text-stone-600 border-stone-200'}`}
              >
                {value === 'open' ? 'Open' : 'Closed'}
              </button>
            ))}
          </div>
          {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
          {!items ? (
            <Loader2 className="w-5 h-5 animate-spin text-[#542813]" />
          ) : items.length === 0 ? (
            <p className="text-sm text-stone-500">No {scope} requests.</p>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSearchParams({ request: item.id })}
                    className={`w-full text-left rounded-2xl border p-3.5 bg-white transition ${item.id === selectedId ? 'border-[#542813] ring-1 ring-[#542813]/20' : 'border-stone-200 hover:border-stone-300'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-stone-400">{item.reference}</p>
                        <p className="text-sm font-black text-gray-900 truncate">{item.customer?.name}</p>
                        <p className="text-xs text-stone-500 truncate">{item.delivery_location?.address}</p>
                        <p className="text-[11px] text-stone-500">{formatWhen(item.requested_delivery_at)}</p>
                      </div>
                      <div className="text-right space-y-1">
                        <StatusPill status={item.status} label={item.status_label} />
                        {item.unread_count > 0 && <p className="text-[11px] font-bold text-[#542813]">{item.unread_count} new</p>}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="lg:col-span-8">
          {selectedId ? (
            <RequestDetail key={selectedId} id={selectedId} onChanged={loadList} />
          ) : (
            <p className="text-sm text-stone-500 rounded-3xl border border-dashed border-stone-300 p-8 text-center">Choose a request to review it.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function RequestDetail({ id, onChanged }) {
  const toast = useToast();
  const [request, setRequest] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [text, setText] = useState('');
  const [showQuote, setShowQuote] = useState(false);

  const load = useCallback(
    () =>
      api
        .get(id)
        .then((data) => {
          setRequest(data);
          setError('');
        })
        .catch((err) => setError(err.message || 'Could not load this request.')),
    [id],
  );
  useEffect(() => {
    load();
  }, [load]);

  const act = async (key, fn, success) => {
    setBusy(key);
    try {
      setRequest(await fn());
      setText('');
      if (success) toast.success(success);
      onChanged?.();
      return true;
    } catch (err) {
      toast.error(err.message || 'That did not work.');
      load();
      return false;
    } finally {
      setBusy('');
    }
  };

  if (error && !request) return <p className="text-sm font-semibold text-red-600">{error}</p>;
  if (!request) return <Loader2 className="w-6 h-6 animate-spin text-[#542813]" />;

  const actions = new Set(request.allowed_actions || []);
  const open = request.active_quotation;
  const reviewing = actions.has('accept_negotiation') || actions.has('request_information');

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-white border border-stone-200/80 shadow-sm p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-bold text-stone-400">{request.reference}</p>
            <p className="text-lg font-black text-gray-900">{request.customer?.name}</p>
            {request.customer?.phone && <p className="text-xs text-stone-500">{request.customer.phone}</p>}
          </div>
          <StatusPill status={request.status} label={request.status_label} />
        </div>
        <RequestFacts request={request} />
        {request.agreed_fee_rwf != null && (
          <p className="text-sm font-black text-emerald-800">
            Agreed delivery fee {rwf(request.agreed_fee_rwf)} · {formatWhen(request.agreed_at)}
            {request.order ? ` · order ${request.order.order_number} (${request.order.payment_status})` : ' · waiting for the customer to book'}
          </p>
        )}
        {request.order?.payout_on_hold && (
          <p className="text-xs font-semibold text-amber-700">Your payout for this order is on hold until KitchenLink support resolves the dispute.</p>
        )}
        {request.dispute?.fee_reduced_by_rwf > 0 && (
          <p className="text-xs font-semibold text-stone-700">
            Support reduced the delivery fee by {rwf(request.dispute.fee_reduced_by_rwf)} (now {rwf(request.order?.delivery_fee_rwf)}); your payout is
            lowered by the same amount.
          </p>
        )}

        {(reviewing || actions.has('decline')) && (
          <div className="pt-3 border-t border-stone-100 space-y-2">
            <p className={label}>{reviewing ? 'Your decision' : 'Decline'}</p>
            <textarea
              rows={2}
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 1000))}
              placeholder={reviewing ? 'Message: a question for the customer, or the reason you decline' : 'Reason for declining'}
              className={input}
            />
            <div className="flex flex-wrap gap-2">
              {actions.has('accept_negotiation') && (
                <button
                  type="button"
                  className={primary}
                  disabled={Boolean(busy)}
                  onClick={() => act('accept', () => api.acceptNegotiation(id, text.trim()), 'The chat with the customer is open.')}
                >
                  <Handshake className="w-3.5 h-3.5 inline mr-1" /> Accept to negotiate
                </button>
              )}
              {actions.has('request_information') && (
                <button
                  type="button"
                  className={secondary}
                  disabled={Boolean(busy) || !text.trim()}
                  onClick={() => act('info', () => api.requestInformation(id, text.trim()), 'Question sent to the customer.')}
                >
                  Ask for more information
                </button>
              )}
              {actions.has('decline') && (
                <button
                  type="button"
                  className={`${btn} text-red-700 border border-red-200 hover:bg-red-50`}
                  disabled={Boolean(busy) || !text.trim()}
                  onClick={() => {
                    if (window.confirm('Decline this delivery request? The customer will see your reason.')) {
                      act('decline', () => api.decline(id, text.trim()), 'Request declined.');
                    }
                  }}
                >
                  Decline
                </button>
              )}
            </div>
            <p className="text-[11px] text-stone-400">Asking for information and declining need a message.</p>
          </div>
        )}
      </div>

      {open && (
        <QuotationCard
          quotation={open}
          highlight
          actions={
            actions.has('withdraw_quotation') && (
              <button
                type="button"
                className={`${btn} text-stone-600 hover:bg-stone-100`}
                disabled={Boolean(busy)}
                onClick={() => act('withdraw', () => api.withdrawQuotation(id, open.id), 'Quotation withdrawn.')}
              >
                Withdraw quotation
              </button>
            )
          }
        />
      )}

      {(actions.has('submit_quotation') || actions.has('revise_quotation')) &&
        (showQuote ? (
          <QuotationForm
            request={request}
            revising={Boolean(open)}
            busy={busy === 'quote'}
            onCancel={() => setShowQuote(false)}
            onSubmit={async (payload) => {
              if (await act('quote', () => api.submitQuotation(id, payload), open ? 'Revised quotation sent.' : 'Quotation sent to the customer.')) {
                setShowQuote(false);
              }
            }}
          />
        ) : (
          <button type="button" className={primary} onClick={() => setShowQuote(true)}>
            {open ? 'Revise the quotation' : 'Send a formal quotation'}
          </button>
        ))}

      <NegotiationChat api={api} requestId={id} side="vendor" open={request.chat_open} onActivity={load} />

      {request.quotations?.filter((q) => q.id !== open?.id).length > 0 && (
        <details className="rounded-3xl bg-white border border-stone-200/80 p-5">
          <summary className="text-xs font-bold text-stone-600 cursor-pointer">Earlier quotations</summary>
          <div className="space-y-2 mt-3">
            {request.quotations
              .filter((q) => q.id !== open?.id)
              .map((q) => (
                <QuotationCard key={q.id} quotation={q} />
              ))}
          </div>
        </details>
      )}
      <details className="rounded-3xl bg-white border border-stone-200/80 p-5">
        <summary className="text-xs font-bold text-stone-600 cursor-pointer">History</summary>
        <div className="mt-3">
          <StatusHistory history={request.status_history} />
        </div>
      </details>
      {actions.has('dispute') && (
        <button
          type="button"
          className={secondary}
          onClick={() => {
            const reason = window.prompt('What went wrong with this delivery?');
            if (reason && reason.trim()) act('dispute', () => api.dispute(id, reason.trim()), 'Support has been told.');
          }}
        >
          Report a problem
        </button>
      )}
    </div>
  );
}

function QuotationForm({ request, revising, busy, onSubmit, onCancel }) {
  const [fee, setFee] = useState(revising && request.active_quotation ? String(request.active_quotation.fee_rwf) : '');
  const [when, setWhen] = useState(toLocalInput(request.requested_delivery_at));
  const [arrangements, setArrangements] = useState([]);
  const [description, setDescription] = useState('');
  const [conditions, setConditions] = useState('');
  const [hours, setHours] = useState(String(Math.min(48, request.quotation_max_valid_hours || 48)));
  const [error, setError] = useState('');

  const toggle = (code) => setArrangements((list) => (list.includes(code) ? list.filter((c) => c !== code) : [...list, code]));

  const submit = (event) => {
    event.preventDefault();
    setError('');
    const amount = Number(fee);
    if (!Number.isInteger(amount) || amount < 1) return setError('Enter the delivery fee as a whole number of RWF.');
    if (!when) return setError('Choose the delivery date and time.');
    if (!arrangements.length) return setError('Say how you will deliver.');
    if (!description.trim()) return setError('Describe the delivery arrangement.');
    onSubmit({
      fee_rwf: amount,
      proposed_delivery_at: new Date(when).toISOString(),
      arrangements,
      arrangement_description: description.trim(),
      conditions: conditions.trim(),
      valid_hours: Number(hours),
    });
  };

  return (
    <form onSubmit={submit} className="rounded-3xl bg-white border border-[#542813]/30 shadow-sm p-5 space-y-3">
      <p className="text-sm font-black text-gray-900">{revising ? 'Revised quotation' : 'Formal delivery quotation'}</p>
      <p className="text-xs text-stone-500">
        {revising
          ? 'Your open quotation will be replaced (kept in the history). The customer must approve the new one.'
          : 'Once sent it cannot be edited — to change the price, send a revised quotation.'}{' '}
        You don't need to share your supplier or vehicle costs.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className={label}>Delivery fee (RWF)</span>
          <input inputMode="numeric" value={fee} onChange={(e) => setFee(e.target.value.replace(/\D/g, '').slice(0, 8))} className={`${input} mt-1`} />
        </label>
        <label className="block">
          <span className={label}>Delivery date and time</span>
          <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className={`${input} mt-1`} />
        </label>
      </div>
      <div>
        <span className={label}>How you'll deliver</span>
        <div className="flex flex-wrap gap-2 mt-1">
          {(request.arrangement_options || []).map((option) => (
            <button
              key={option.code}
              type="button"
              onClick={() => toggle(option.code)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${arrangements.includes(option.code) ? 'bg-[#542813] text-white border-[#542813]' : 'bg-white text-stone-600 border-stone-200'}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <label className="block">
        <span className={label}>Delivery arrangement</span>
        <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value.slice(0, 1000))} placeholder="e.g. One rented refrigerated van, two staff to unload and set up" className={`${input} mt-1`} />
      </label>
      <label className="block">
        <span className={label}>Conditions (optional)</span>
        <textarea rows={2} value={conditions} onChange={(e) => setConditions(e.target.value.slice(0, 1000))} placeholder="e.g. Vehicle access to within 50 m of the venue" className={`${input} mt-1`} />
      </label>
      <label className="block w-48">
        <span className={label}>Valid for (hours)</span>
        <input inputMode="numeric" value={hours} onChange={(e) => setHours(e.target.value.replace(/\D/g, '').slice(0, 3))} className={`${input} mt-1`} />
        <span className="text-[11px] text-stone-400">Up to {request.quotation_max_valid_hours} h, never past the delivery.</span>
      </label>
      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" className={primary} disabled={busy}>
          {busy ? 'Sending…' : 'Send quotation'}
        </button>
        <button type="button" className={secondary} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
