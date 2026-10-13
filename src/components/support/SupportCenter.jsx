import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, LifeBuoy, MessageSquarePlus, Send, Headset, CheckCircle2 } from 'lucide-react';
import useAutoRefresh from '../../hooks/useAutoRefresh';

const CATEGORY_LABELS = {
  order: 'An order',
  delivery: 'Delivery',
  payment: 'Payment',
  refund: 'Refund',
  vendor: 'A kitchen',
  driver: 'A delivery worker',
  account: 'My account',
  app: 'Problem using the app',
  other: 'Something else',
};

// Topics each kind of user can pick.
const CATEGORIES = {
  customer: ['order', 'delivery', 'payment', 'refund', 'vendor', 'driver', 'account', 'app', 'other'],
  vendor: ['order', 'payment', 'driver', 'account', 'app', 'other'],
  driver: ['delivery', 'payment', 'order', 'account', 'app', 'other'],
};

const STATUS_TONE = {
  open: 'bg-amber-50 text-amber-700 border-amber-200',
  in_review: 'bg-sky-50 text-sky-700 border-sky-200',
  resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-stone-100 text-stone-600 border-stone-200',
};

const when = (iso) => {
  if (!iso) return '';
  const date = new Date(iso);
  const sameDay = date.toDateString() === new Date().toDateString();
  return sameDay
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString([], { day: 'numeric', month: 'short' });
};

const errorText = (error) => error?.message || 'Something went wrong. Try again.';

/**
 * Help & Support: a user's conversations with the support team, a thread
 * view and a "new request" form. Used by customers, vendors and delivery
 * workers; `api` = { list, get, create, reply }.
 * `?ticket=<id>` opens a conversation, `?order=<id>` starts one about an order.
 */
export default function SupportCenter({ api, role = 'customer', orders = [] }) {
  const [params, setParams] = useSearchParams();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeId, setActiveId] = useState(params.get('ticket') || null);
  const [active, setActive] = useState(null);
  const [composing, setComposing] = useState(Boolean(params.get('order')) && !params.get('ticket'));
  const [form, setForm] = useState({
    subject: '',
    category: params.get('order') ? (role === 'driver' ? 'delivery' : 'order') : CATEGORIES[role][0],
    message: '',
    order_id: params.get('order') || '',
  });
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const threadEnd = useRef(null);

  const loadList = useCallback(async () => {
    try {
      const data = await api.list();
      setTickets(data.tickets || []);
      setLoadError('');
    } catch (error) {
      setLoadError(errorText(error));
    } finally {
      setLoading(false);
    }
  }, [api]);

  const loadActive = useCallback(async () => {
    if (!activeId) return;
    try {
      const data = await api.get(activeId);
      setActive(data.ticket);
    } catch (error) {
      setActionError(errorText(error));
    }
  }, [api, activeId]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    setActive(null);
    loadActive();
  }, [loadActive]);

  const refresh = useCallback(async () => {
    await loadList();
    if (activeId) {
      const data = await api.get(activeId);
      setActive(data.ticket);
    }
  }, [api, activeId, loadList]);
  useAutoRefresh(refresh);

  useEffect(() => {
    threadEnd.current?.scrollIntoView({ block: 'end' });
  }, [active?.messages?.length]);

  const open = (id) => {
    setComposing(false);
    setActionError('');
    setActiveId(id);
    const next = new URLSearchParams(params);
    next.set('ticket', id);
    next.delete('order');
    setParams(next, { replace: true });
  };

  const back = () => {
    setActiveId(null);
    setActive(null);
    setComposing(false);
    setParams(new URLSearchParams(), { replace: true });
  };

  const startNew = () => {
    setActiveId(null);
    setActive(null);
    setActionError('');
    setComposing(true);
  };

  const submitNew = async (event) => {
    event.preventDefault();
    setBusy(true);
    setActionError('');
    try {
      const payload = { subject: form.subject.trim(), category: form.category, message: form.message.trim() };
      if (form.order_id) payload.order_id = form.order_id;
      const data = await api.create(payload);
      setForm({ subject: '', category: CATEGORIES[role][0], message: '', order_id: '' });
      await loadList();
      open(data.ticket.id);
    } catch (error) {
      setActionError(errorText(error));
    } finally {
      setBusy(false);
    }
  };

  const sendReply = async (event) => {
    event.preventDefault();
    if (!reply.trim() || !activeId) return;
    setBusy(true);
    setActionError('');
    try {
      const data = await api.reply(activeId, reply.trim());
      setActive(data.ticket);
      setReply('');
      loadList();
    } catch (error) {
      setActionError(errorText(error));
    } finally {
      setBusy(false);
    }
  };

  const showDetail = composing || Boolean(activeId);
  const unread = useMemo(() => tickets.filter((ticket) => ticket.unread).length, [tickets]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <LifeBuoy className="w-6 h-6 text-[#542813]" /> Help &amp; Support
          </h2>
          <p className="text-xs text-stone-500 font-medium">
            Having a problem? Write to our support team; replies show up here and in your notifications.
            {unread > 0 ? ` · ${unread} new repl${unread > 1 ? 'ies' : 'y'}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={startNew}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#542813] text-white text-xs font-bold hover:bg-[#3d1d0e] transition"
        >
          <MessageSquarePlus className="w-4 h-4" /> New request
        </button>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] gap-4">
        {/* conversation list */}
        <div className={`bg-white rounded-3xl border border-stone-200/80 shadow-sm overflow-hidden ${showDetail ? 'hidden lg:block' : ''}`}>
          {loading ? (
            <p className="p-6 text-sm text-stone-500">Loading…</p>
          ) : loadError ? (
            <p className="p-6 text-sm text-rose-600">{loadError}</p>
          ) : tickets.length === 0 ? (
            <div className="p-8 text-center">
              <Headset className="w-9 h-9 text-stone-300 mx-auto" />
              <p className="mt-2 text-sm font-bold text-gray-900">No conversations yet</p>
              <p className="text-xs text-stone-500">Tap “New request” to tell us what went wrong.</p>
            </div>
          ) : (
            <ul className="divide-y divide-stone-100">
              {tickets.map((ticket) => (
                <li key={ticket.id}>
                  <button
                    type="button"
                    onClick={() => open(ticket.id)}
                    className={`w-full text-left px-4 py-3.5 hover:bg-[#faf6f2] transition ${activeId === ticket.id ? 'bg-[#faf6f2]' : ''}`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-black text-gray-900 truncate flex-1">{ticket.subject}</span>
                      {ticket.unread && <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" aria-label="new reply" />}
                    </span>
                    <span className="block text-xs text-stone-500 truncate mt-0.5">
                      {ticket.last_message ? `${ticket.last_message.from === 'support' ? 'Support: ' : 'You: '}${ticket.last_message.body}` : ''}
                    </span>
                    <span className="mt-1.5 flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_TONE[ticket.status] || STATUS_TONE.open}`}>
                        {ticket.status_label}
                      </span>
                      <span className="text-[10px] text-stone-400">{when(ticket.last_message_at)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* detail: new request form or a conversation */}
        <div className={`bg-white rounded-3xl border border-stone-200/80 shadow-sm min-h-[420px] flex flex-col ${showDetail ? '' : 'hidden lg:flex'}`}>
          {composing ? (
            <form onSubmit={submitNew} className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <button type="button" onClick={back} className="lg:hidden p-1.5 -ml-1.5 rounded-lg hover:bg-stone-100" aria-label="Back">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h3 className="text-base font-black text-gray-900">New support request</h3>
              </div>
              <label className="block">
                <span className="text-xs font-bold text-stone-600">What is it about?</span>
                <select
                  value={form.category}
                  onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm bg-white"
                >
                  {CATEGORIES[role].map((category) => (
                    <option key={category} value={category}>{CATEGORY_LABELS[category]}</option>
                  ))}
                </select>
              </label>
              {orders.length > 0 && (
                <label className="block">
                  <span className="text-xs font-bold text-stone-600">Order (optional)</span>
                  <select
                    value={form.order_id}
                    onChange={(event) => setForm((prev) => ({ ...prev, order_id: event.target.value }))}
                    className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm bg-white"
                  >
                    <option value="">Not about a specific order</option>
                    {orders.map((order) => (
                      <option key={order.id} value={order.id}>{order.label}</option>
                    ))}
                  </select>
                </label>
              )}
              <label className="block">
                <span className="text-xs font-bold text-stone-600">Subject</span>
                <input
                  value={form.subject}
                  onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))}
                  maxLength={120}
                  required
                  minLength={3}
                  placeholder="e.g. My order arrived cold"
                  className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-stone-600">Tell us what happened</span>
                <textarea
                  value={form.message}
                  onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
                  maxLength={2000}
                  required
                  rows={6}
                  placeholder="Give as many details as you can."
                  className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm resize-y"
                />
              </label>
              {actionError && <p className="text-xs font-semibold text-rose-600">{actionError}</p>}
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#542813] text-white text-sm font-bold hover:bg-[#3d1d0e] disabled:opacity-60 transition"
              >
                <Send className="w-4 h-4" /> {busy ? 'Sending…' : 'Send to support'}
              </button>
            </form>
          ) : activeId ? (
            !active ? (
              <p className="p-6 text-sm text-stone-500">{actionError || 'Loading conversation…'}</p>
            ) : (
              <>
                <div className="px-5 py-4 border-b border-stone-100 flex items-start gap-2">
                  <button type="button" onClick={back} className="lg:hidden p-1.5 -ml-1.5 rounded-lg hover:bg-stone-100" aria-label="Back">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-black text-gray-900">{active.subject}</h3>
                    <p className="text-[11px] text-stone-500">
                      {active.reference} · {CATEGORY_LABELS[active.category] || active.category}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full border whitespace-nowrap ${STATUS_TONE[active.status] || STATUS_TONE.open}`}>
                    {active.status_label}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 max-h-[55vh] bg-[#fcfaf8]">
                  {active.messages.map((message) => {
                    const mine = message.from === 'you';
                    return (
                      <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${mine ? 'bg-[#542813] text-white rounded-br-md' : 'bg-white border border-stone-200 text-gray-900 rounded-bl-md'}`}>
                          {!mine && <p className="text-[10px] font-black text-[#542813] mb-0.5">{message.author_name}</p>}
                          <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>
                          <p className={`text-[10px] mt-1 ${mine ? 'text-white/60' : 'text-stone-400'}`}>{when(message.at)}</p>
                        </div>
                      </div>
                    );
                  })}
                  {active.status === 'resolved' && (
                    <p className="flex items-center justify-center gap-1.5 text-[11px] text-emerald-700 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Marked resolved. Write again if you still need help.
                    </p>
                  )}
                  <div ref={threadEnd} />
                </div>
                <form onSubmit={sendReply} className="p-3 border-t border-stone-100 flex gap-2">
                  <textarea
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) sendReply(event);
                    }}
                    rows={1}
                    maxLength={2000}
                    placeholder="Write a message…"
                    className="flex-1 rounded-xl border border-stone-200 px-3 py-2.5 text-sm resize-none"
                  />
                  <button
                    type="submit"
                    disabled={busy || !reply.trim()}
                    className="px-4 rounded-xl bg-[#542813] text-white hover:bg-[#3d1d0e] disabled:opacity-50 transition"
                    aria-label="Send"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
                {actionError && <p className="px-4 pb-3 text-xs font-semibold text-rose-600">{actionError}</p>}
              </>
            )
          ) : (
            <div className="m-auto text-center p-8">
              <Headset className="w-10 h-10 text-stone-300 mx-auto" />
              <p className="mt-2 text-sm font-bold text-gray-900">Choose a conversation or start a new one</p>
              <p className="text-xs text-stone-500">Our support team usually replies within a few hours.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
