import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  Bike,
  KeyRound,
  MessageCircle,
  RotateCcw,
  ShoppingBag,
  Store,
  Wallet,
  X,
} from 'lucide-react';

const SHOW_MS = 8000;
const MAX_VISIBLE = 3;

/** Icon + colour by notification type (falls back to a bell). */
function iconFor(type = '') {
  if (/late|failed|cancel|suspend|reject/.test(type)) return [AlertTriangle, 'bg-red-50 text-red-600'];
  if (/code/.test(type)) return [KeyRound, 'bg-emerald-50 text-emerald-700'];
  if (/delivery|driver|offer|taken|ready|pickup/.test(type)) return [Bike, 'bg-sky-50 text-sky-700'];
  if (/payout|wallet|finance|payment/.test(type)) return [Wallet, 'bg-violet-50 text-violet-700'];
  if (/refund/.test(type)) return [RotateCcw, 'bg-sky-50 text-sky-700'];
  if (/support|complaint|message/.test(type)) return [MessageCircle, 'bg-amber-50 text-amber-700'];
  if (/vendor|kitchen|application/.test(type)) return [Store, 'bg-amber-50 text-amber-700'];
  if (/order/.test(type)) return [ShoppingBag, 'bg-emerald-50 text-emerald-700'];
  return [Bell, 'bg-stone-100 text-stone-600'];
}

const ago = (iso) => {
  if (!iso) return 'now';
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  return minutes < 60 ? `${minutes} min ago` : `${Math.round(minutes / 60)} h ago`;
};

/**
 * Small pop-ups for notifications that arrive while the app is open — the
 * same for customers, vendors, delivery workers and admins. Each app passes
 * its notification list (already polled); only notifications that are new
 * since the list first loaded pop up, so a backlog of unread ones doesn't
 * flood the screen on sign-in.
 *
 * Props:
 * - notifications: [{ id, type, title, body, read, createdAt }]
 * - loaded: true once the list has been fetched at least once
 * - linkFor(notification): where "View" goes (or null)
 * - onRead(notification): mark it read (called on "View")
 */
export default function NotificationPopups({ notifications, loaded, linkFor, onRead }) {
  const navigate = useNavigate();
  const seen = useRef(null);
  const [popups, setPopups] = useState([]);

  useEffect(() => {
    if (!loaded) return;
    const list = notifications || [];
    if (seen.current === null) {
      // First load: everything already there counts as seen.
      seen.current = new Set(list.map((n) => n.id));
      return;
    }
    const fresh = list.filter((n) => n.id && !seen.current.has(n.id));
    fresh.forEach((n) => seen.current.add(n.id));
    const show = fresh.filter((n) => !n.read);
    if (show.length) {
      setPopups((current) => [...show.map((n) => ({ ...n, shownAt: Date.now() })), ...current].slice(0, MAX_VISIBLE));
    }
  }, [notifications, loaded]);

  const dismiss = useCallback((id) => setPopups((current) => current.filter((p) => p.id !== id)), []);

  // Clicking or tapping anywhere outside the pop-ups closes them (they stay unread in the bell).
  const stackRef = useRef(null);
  const hasPopups = popups.length > 0;
  useEffect(() => {
    if (!hasPopups) return undefined;
    const onPointerDown = (event) => {
      if (stackRef.current && !stackRef.current.contains(event.target)) setPopups([]);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [hasPopups]);

  if (popups.length === 0) return null;

  return createPortal(
    <div
      ref={stackRef}
      className="fixed z-[1100] inset-x-0 top-0 sm:inset-x-auto sm:right-4 sm:top-20 flex flex-col items-center sm:items-end gap-2 px-3 sm:px-0 pointer-events-none"
      style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      aria-live="polite"
      role="region"
      aria-label="New notifications"
    >
      {popups.map((popup) => (
        <Popup
          key={popup.id}
          popup={popup}
          link={linkFor?.(popup) || null}
          onClose={() => dismiss(popup.id)}
          onView={(link) => {
            dismiss(popup.id);
            onRead?.(popup);
            if (link) navigate(link);
          }}
        />
      ))}
    </div>,
    document.body,
  );
}

/** One pop-up: hides itself after a few seconds unless the pointer is on it. */
function Popup({ popup, link, onClose, onView }) {
  const [hovered, setHovered] = useState(false);
  const [Icon, tone] = iconFor(popup.type);
  // The parent re-renders often; only the latest close handler matters.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (hovered) return undefined;
    const timer = setTimeout(() => closeRef.current(), SHOW_MS);
    return () => clearTimeout(timer);
  }, [hovered]);

  return (
    <div
      role="alert"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="pointer-events-auto w-full max-w-sm bg-white rounded-2xl border border-stone-200 shadow-2xl p-3 flex items-start gap-3 animate-fade-in"
    >
      <span className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${tone}`}>
        <Icon className="w-5 h-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className="text-sm font-black text-gray-900 truncate flex-1">{popup.title || 'New notification'}</p>
          <span className="text-[10px] font-semibold text-stone-400 flex-shrink-0">{ago(popup.createdAt || popup.created_at)}</span>
        </div>
        {popup.body && <p className="text-xs text-stone-600 leading-snug line-clamp-2 mt-0.5">{popup.body}</p>}
        <div className="mt-2 flex items-center gap-3">
          <button type="button" onClick={() => onView(link)} className="text-xs font-black text-[#542813] hover:underline">
            {link ? 'View' : 'Mark as read'}
          </button>
          <button type="button" onClick={onClose} className="text-xs font-semibold text-stone-400 hover:text-stone-600">
            Dismiss
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close notification"
        className="w-7 h-7 -mt-1 -mr-1 rounded-full flex items-center justify-center text-stone-400 hover:bg-stone-100 hover:text-stone-700 flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
