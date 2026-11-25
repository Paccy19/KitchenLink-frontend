import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, CheckCheck, ImagePlus, Loader2, MapPin, Send, ShieldCheck } from 'lucide-react';

const MAX_LENGTH = 1000;
const POLL_MS = 5000;

/**
 * The dedicated chat of one special delivery request (customer ↔ kitchen),
 * built on KitchenLink's chat messages: text, delivery instructions, shared
 * locations, photos, read receipts and platform notes. Chat never sets a
 * price — the kitchen sends a formal quotation for that.
 *
 * `api`: { messages(id, params), send(id, body), shareLocation(id, point), sendImage(id, file, caption) }
 */
export default function NegotiationChat({ api, requestId, side, open, onActivity, venue = null }) {
  const [messages, setMessages] = useState([]);
  const [note, setNote] = useState('');
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const latest = useRef(null);
  const endRef = useRef(null);
  const fileRef = useRef(null);

  const scrollToEnd = () => requestAnimationFrame(() => endRef.current?.scrollIntoView({ block: 'end' }));

  const load = useCallback(
    async (initial = false) => {
      const data = await api.messages(requestId, initial || !latest.current ? {} : { after: latest.current });
      setNote(data.privacy_note || '');
      const incoming = data.messages || [];
      if (initial) setMessages(incoming);
      else if (incoming.length) setMessages((prev) => [...prev.filter((m) => !incoming.some((n) => n.id === m.id)), ...incoming]);
      // Read receipts change without new messages: refresh "read" on mine.
      if (!initial && data.read_by_other_at) {
        setMessages((prev) => prev.map((m) => (m.mine ? { ...m, read: new Date(data.read_by_other_at) >= new Date(m.created_at) } : m)));
      }
      const last = (initial ? incoming : incoming).at(-1);
      if (last) latest.current = last.created_at;
      if (incoming.length) {
        scrollToEnd();
        if (!initial) onActivity?.();
      }
    },
    [api, requestId, onActivity],
  );

  useEffect(() => {
    let alive = true;
    latest.current = null;
    load(true).catch((err) => alive && setError(err?.message || 'Could not load the chat.'));
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load(false).catch(() => null);
    }, POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [load]);

  const afterSend = (message) => {
    setMessages((prev) => [...prev, message]);
    latest.current = message.created_at;
    scrollToEnd();
    onActivity?.();
  };

  const run = async (fn) => {
    setBusy(true);
    setError('');
    try {
      const { message } = await fn();
      afterSend(message);
      return true;
    } catch (err) {
      setError(err?.message || 'Your message was not sent. Try again.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const sendText = async (event) => {
    event?.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    if (await run(() => api.send(requestId, text))) setDraft('');
  };

  const shareLocation = () => {
    const send = (point) => run(() => api.shareLocation(requestId, point));
    if (!navigator.geolocation) {
      if (venue) send({ ...venue, label: 'Event venue' });
      else setError('Location sharing is not available on this device.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => send({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, label: draft.trim().slice(0, 120) || 'My location' }),
      () => (venue ? send({ ...venue, label: 'Event venue' }) : setError('Allow location access to share where you are.')),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const sendImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return setError('Choose a photo (JPG, PNG or WebP).');
    if (await run(() => api.sendImage(requestId, file, draft.trim().slice(0, 300)))) setDraft('');
  };

  return (
    <div className="flex flex-col rounded-3xl border border-stone-200/80 bg-white overflow-hidden min-h-[24rem] max-h-[36rem]">
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-[#fcfaf8]">
        {note && (
          <p className="mx-auto max-w-md text-center text-[11px] text-stone-500 bg-white border border-stone-200 rounded-xl px-3 py-2 flex items-start gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-[#8a5332]" />
            <span>{note} A price is only agreed through a formal quotation, not in chat.</span>
          </p>
        )}
        {messages.length === 0 && <p className="text-center text-sm text-stone-500 py-8">No messages yet.</p>}
        {messages.map((message) => {
          if (message.kind === 'system' || message.author_role === 'system') {
            return (
              <p key={message.id} className="mx-auto max-w-md text-center text-[11px] font-semibold text-stone-500 bg-stone-100 rounded-xl px-3 py-1.5">
                {message.body}
              </p>
            );
          }
          const mine = message.mine;
          return (
            <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words shadow-sm ${
                  mine
                    ? 'chat-bubble-mine bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] text-white rounded-br-md'
                    : 'bg-white border border-stone-200 text-gray-900 rounded-bl-md'
                }`}
              >
                {message.kind === 'image' && message.attachment_url && (
                  <a href={message.attachment_url} target="_blank" rel="noreferrer">
                    <img src={message.attachment_url} alt={message.body || 'Shared photo'} className="rounded-xl max-h-60 mb-1" loading="lazy" />
                  </a>
                )}
                {message.kind === 'location' && message.location ? (
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${message.location.latitude}&mlon=${message.location.longitude}#map=16/${message.location.latitude}/${message.location.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 font-bold underline"
                  >
                    <MapPin className="w-4 h-4" /> {message.location.label || 'Shared location'}
                  </a>
                ) : message.kind === 'quotation' ? (
                  <span className="font-bold">📄 {message.body}</span>
                ) : (
                  message.kind !== 'location' && message.body
                )}
                <span className={`flex items-center justify-end gap-1 text-[10px] mt-0.5 ${mine ? 'text-white/70' : 'text-stone-400'}`}>
                  {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {mine && (message.read ? <CheckCheck className="w-3 h-3" aria-label="Read" /> : <Check className="w-3 h-3" aria-label="Sent" />)}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {open ? (
        <form onSubmit={sendText} className="border-t border-stone-100 p-3">
          {error && <p className="text-xs font-semibold text-red-600 mb-2">{error}</p>}
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              aria-label="Send a photo"
              className="w-10 h-10 rounded-xl border border-stone-200 text-stone-500 flex items-center justify-center hover:bg-stone-50 flex-shrink-0"
            >
              <ImagePlus className="w-4 h-4" />
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={sendImage} />
            <button
              type="button"
              onClick={shareLocation}
              disabled={busy}
              aria-label="Share a location"
              className="w-10 h-10 rounded-xl border border-stone-200 text-stone-500 flex items-center justify-center hover:bg-stone-50 flex-shrink-0"
            >
              <MapPin className="w-4 h-4" />
            </button>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value.slice(0, MAX_LENGTH))}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) sendText(event);
              }}
              rows={1}
              placeholder={side === 'vendor' ? 'Ask about access, timing, unloading…' : 'Delivery instructions, questions…'}
              aria-label="Message"
              className="flex-1 resize-none max-h-32 px-3.5 py-2.5 text-sm rounded-2xl border border-stone-200 focus:border-[#542813] outline-none"
            />
            <button
              type="submit"
              disabled={!draft.trim() || busy}
              aria-label="Send message"
              className="w-11 h-11 rounded-2xl bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] text-white flex items-center justify-center disabled:opacity-40 flex-shrink-0"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </form>
      ) : (
        <p className="border-t border-stone-100 p-3 text-center text-xs text-stone-500">
          {messages.length ? 'This chat is read-only now.' : 'The chat opens once the kitchen accepts to discuss the delivery.'}
        </p>
      )}
    </div>
  );
}
