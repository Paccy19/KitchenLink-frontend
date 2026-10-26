import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Send, ShieldCheck, Store, User } from 'lucide-react';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import FadeImage from '../common/FadeImage';
import VendorTypeBadge from '../common/VendorTypeBadge';

const MAX_LENGTH = 1000;
// How often an open chat checks for new messages.
const THREAD_REFRESH_MS = 4000;

const when = (iso) => {
  if (!iso) return '';
  const date = new Date(iso);
  const sameDay = date.toDateString() === new Date().toDateString();
  return sameDay
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString([], { day: 'numeric', month: 'short' });
};

const dayLabel = (iso) => {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
};

function Avatar({ person, side }) {
  const Icon = side === 'customer' ? Store : User;
  return (
    <FadeImage
      src={person?.avatar_url}
      className="w-10 h-10 rounded-xl object-cover flex-shrink-0 border border-stone-200"
      fallback={
        <span className="w-10 h-10 rounded-xl flex-shrink-0 bg-[#f5ebe1] border border-[#ebd7c5] text-[#542813] flex items-center justify-center">
          <Icon className="w-5 h-5" />
        </span>
      }
    />
  );
}

/**
 * Customer–kitchen chat: the list of conversations and the open one. Used by
 * customers (`side="customer"`, talking to kitchens) and kitchens
 * (`side="vendor"`, talking to customers). `?chat=<id>` opens a conversation.
 * `api` = { list, get(id, {after}), send(id, body), markRead(id) }.
 */
export default function ChatCenter({ api, side = 'customer', emptyMessage }) {
  const [params, setParams] = useSearchParams();
  const activeId = params.get('chat');
  const [conversations, setConversations] = useState([]);
  const [listLoaded, setListLoaded] = useState(false);
  const [listError, setListError] = useState('');

  const loadList = useCallback(async () => {
    try {
      const data = await api.list();
      setConversations(data?.conversations ?? []);
      setListError('');
    } catch (error) {
      setListError(error?.message || 'Could not load your chats.');
    } finally {
      setListLoaded(true);
    }
  }, [api]);

  useEffect(() => {
    loadList();
  }, [loadList]);
  useAutoRefresh(loadList, { intervalMs: 10000 });

  const open = (id) => {
    const next = new URLSearchParams(params);
    if (id) next.set('chat', id);
    else next.delete('chat');
    setParams(next, { replace: !id });
  };

  return (
    <div className="bg-white rounded-3xl border border-stone-200/80 shadow-sm overflow-hidden grid md:grid-cols-[320px_minmax(0,1fr)] h-[calc(100vh-220px)] min-h-[460px]">
      {/* Conversation list (hidden on phones while a chat is open) */}
      <aside className={`border-r border-stone-100 flex flex-col min-h-0 ${activeId ? 'hidden md:flex' : 'flex'}`}>
        <div className="px-4 py-3 border-b border-stone-100">
          <p className="font-black text-gray-900 flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-[#8a5332]" /> Messages
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {!listLoaded ? (
            <p className="px-4 py-6 text-sm text-stone-400">Loading…</p>
          ) : listError ? (
            <p className="px-4 py-6 text-sm text-red-600">{listError}</p>
          ) : conversations.length === 0 ? (
            <p className="px-4 py-8 text-sm text-stone-500 text-center">{emptyMessage}</p>
          ) : (
            conversations.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                onClick={() => open(conversation.id)}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 border-b border-stone-50 transition hover:bg-stone-50 ${
                  conversation.id === activeId ? 'bg-[#faf6f2]' : ''
                }`}
              >
                <Avatar person={conversation.with} side={side} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-gray-900 truncate">{conversation.with.name}</span>
                    <span className="text-[10px] text-stone-400 flex-shrink-0">{when(conversation.last_message_at)}</span>
                  </span>
                  <span className="flex items-center justify-between gap-2 mt-0.5">
                    <span className={`text-xs truncate ${conversation.unread_count ? 'font-bold text-gray-900' : 'text-stone-500'}`}>
                      {conversation.last_message_mine ? 'You: ' : ''}
                      {conversation.last_message_preview}
                    </span>
                    {conversation.unread_count > 0 && (
                      <span className="flex-shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-[#542813] text-white text-[10px] font-black flex items-center justify-center">
                        {conversation.unread_count}
                      </span>
                    )}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Open conversation */}
      <div className={`min-h-0 flex-col ${activeId ? 'flex' : 'hidden md:flex'}`}>
        {activeId ? (
          <ChatThread key={activeId} api={api} side={side} conversationId={activeId} onBack={() => open(null)} onSent={loadList} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-stone-500">
            <MessageCircle className="w-10 h-10 text-[#d9bda6]" />
            <p className="mt-2 text-sm font-bold text-gray-900">Pick a conversation</p>
            <p className="text-xs mt-0.5">Your messages appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ChatThread({ api, side, conversationId, onBack, onSent }) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const endRef = useRef(null);
  const latest = useRef(null);
  const stickToBottom = useRef(true);

  const scrollToEnd = () => requestAnimationFrame(() => endRef.current?.scrollIntoView({ block: 'end' }));

  // First load: the latest messages.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.get(conversationId);
        if (cancelled) return;
        setConversation(data.conversation);
        setMessages(data.messages ?? []);
        setHasMore(Boolean(data.has_more));
        setNote(data.privacy_note || '');
        latest.current = data.messages?.at(-1)?.created_at ?? null;
        scrollToEnd();
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Could not open this chat.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, conversationId]);

  // Polling: only messages newer than the last one we have.
  const poll = useCallback(async () => {
    if (!conversation) return;
    const data = await api.get(conversationId, latest.current ? { after: latest.current } : {});
    const fresh = (data.messages ?? []).filter((message) => !messages.some((m) => m.id === message.id));
    if (fresh.length) {
      setMessages((prev) => [...prev, ...fresh.filter((m) => !prev.some((p) => p.id === m.id))]);
      latest.current = fresh.at(-1).created_at;
      if (stickToBottom.current) scrollToEnd();
    }
  }, [api, conversationId, conversation, messages]);
  useAutoRefresh(poll, { enabled: Boolean(conversation), intervalMs: THREAD_REFRESH_MS });

  const loadOlder = async () => {
    if (!messages.length) return;
    setLoadingOlder(true);
    try {
      const data = await api.get(conversationId, { before: messages[0].created_at });
      setMessages((prev) => [...(data.messages ?? []), ...prev]);
      setHasMore(Boolean(data.has_more));
    } catch (err) {
      setError(err?.message || 'Could not load older messages.');
    } finally {
      setLoadingOlder(false);
    }
  };

  const send = async (event) => {
    event?.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setError('');
    try {
      const { message } = await api.send(conversationId, text);
      setMessages((prev) => [...prev, message]);
      latest.current = message.created_at;
      setDraft('');
      stickToBottom.current = true;
      scrollToEnd();
      onSent?.();
    } catch (err) {
      setError(err?.message || 'Your message was not sent. Try again.');
    } finally {
      setSending(false);
    }
  };

  const other = conversation?.with;
  const otherLink = side === 'customer' && other?.id ? `/vendor/${other.id}` : null;

  return (
    <>
      {/* Header */}
      <div className="px-4 py-3 border-b border-stone-100 flex items-center gap-3">
        <button type="button" onClick={onBack} className="md:hidden w-9 h-9 -ml-1 rounded-xl flex items-center justify-center text-stone-600 hover:bg-stone-100" aria-label="Back to messages">
          <ArrowLeft className="w-5 h-5" />
        </button>
        {other && <Avatar person={other} side={side} />}
        <div className="min-w-0 flex-1">
          {otherLink ? (
            <Link to={otherLink} className="text-sm font-black text-gray-900 hover:text-[#542813] truncate block">
              {other?.name}
            </Link>
          ) : (
            <p className="text-sm font-black text-gray-900 truncate">{other?.name || '…'}</p>
          )}
          {side === 'customer' && other?.vendor_type && (
            <div className="mt-0.5 flex items-center gap-1.5">
              <VendorTypeBadge type={other.vendor_type} size="xs" />
              {other.is_open === false && <span className="text-[10px] font-bold text-stone-400">Closed now</span>}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5 bg-[#fcfaf8]"
        onScroll={(event) => {
          const el = event.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
      >
        {note && (
          <p className="mx-auto max-w-md text-center text-[11px] text-stone-500 bg-white border border-stone-200 rounded-xl px-3 py-2 flex items-start gap-1.5 mb-2">
            <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-[#8a5332]" />
            <span>{note}</span>
          </p>
        )}
        {hasMore && (
          <div className="text-center">
            <button type="button" onClick={loadOlder} disabled={loadingOlder} className="text-xs font-bold text-[#542813] hover:underline disabled:opacity-60">
              {loadingOlder ? 'Loading…' : 'Load older messages'}
            </button>
          </div>
        )}
        {conversation && messages.length === 0 && (
          <p className="text-center text-sm text-stone-500 py-8">
            {side === 'customer'
              ? 'Ask the kitchen anything — about a dish, an order or delivery.'
              : 'No messages yet.'}
          </p>
        )}
        {messages.map((message, index) => {
          const showDay = index === 0 || new Date(messages[index - 1].created_at).toDateString() !== new Date(message.created_at).toDateString();
          return (
            <React.Fragment key={message.id}>
              {showDay && (
                <p className="text-center text-[10px] font-bold uppercase tracking-wider text-stone-400 pt-2">{dayLabel(message.created_at)}</p>
              )}
              <div className={`flex ${message.mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words shadow-sm ${
                    message.mine
                      ? 'chat-bubble-mine bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] text-white rounded-br-md'
                      : 'bg-white border border-stone-200 text-gray-900 rounded-bl-md'
                  }`}
                >
                  {message.body}
                  <span className={`block text-[10px] mt-0.5 text-right ${message.mine ? 'text-white/70' : 'text-stone-400'}`}>
                    {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </React.Fragment>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      <form onSubmit={send} className="border-t border-stone-100 p-3">
        {error && <p className="text-xs font-semibold text-red-600 mb-2">{error}</p>}
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value.slice(0, MAX_LENGTH))}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) send(event);
            }}
            rows={1}
            maxLength={MAX_LENGTH}
            placeholder="Write a message…"
            aria-label="Message"
            className="flex-1 resize-none max-h-32 px-3.5 py-2.5 text-sm rounded-2xl border border-stone-200 focus:border-[#542813] outline-none"
          />
          <button
            type="submit"
            disabled={!draft.trim() || sending || !conversation}
            aria-label="Send message"
            className="w-11 h-11 rounded-2xl bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] text-white flex items-center justify-center disabled:opacity-40 flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        {draft.length > MAX_LENGTH - 100 && (
          <p className="text-[10px] text-stone-400 mt-1 text-right">{draft.length}/{MAX_LENGTH}</p>
        )}
      </form>
    </>
  );
}
