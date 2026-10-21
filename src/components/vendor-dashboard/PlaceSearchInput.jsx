import React, { useEffect, useId, useRef, useState } from 'react';
import { Building2, Loader2, MapPin, Route } from 'lucide-react';
import { fetchPlaceSuggestions } from '../../api/endpoints';

const DEBOUNCE_MS = 350;
const KIND_ICONS = { area: MapPin, street: Route, place: Building2 };
const KIND_LABELS = { area: 'Area', street: 'Street', place: 'Place' };

/**
 * Text input with place suggestions as the vendor types, like a maps search
 * box. Typing only changes the text (`onChange`); picking a suggestion calls
 * `onSelect(suggestion)`. `near` ({ lat, lng }) ranks nearby places first.
 */
export default function PlaceSearchInput({
  value,
  onChange,
  onSelect,
  near,
  placeholder,
  className,
  maxLength,
  autoComplete = 'off',
}) {
  const listId = useId();
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  // Only search for what the vendor typed, not for text set by a selection.
  const typedRef = useRef(false);
  const requestRef = useRef(0);
  const blurTimer = useRef(null);

  const nearLat = near?.lat;
  const nearLng = near?.lng;

  useEffect(() => {
    if (!typedRef.current) return undefined;
    const text = String(value ?? '').trim();
    if (text.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return undefined;
    }
    const request = ++requestRef.current;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const data = await fetchPlaceSuggestions({ q: text, lat: nearLat, lng: nearLng });
        if (request !== requestRef.current) return;
        setSuggestions(data?.suggestions ?? []);
        setFailed(false);
        setActive(-1);
      } catch {
        if (request !== requestRef.current) return;
        setSuggestions([]);
        setFailed(true);
      } finally {
        if (request === requestRef.current) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value, nearLat, nearLng]);

  useEffect(() => () => clearTimeout(blurTimer.current), []);

  const choose = (suggestion) => {
    typedRef.current = false;
    requestRef.current += 1; // drop any in-flight search
    setOpen(false);
    setSuggestions([]);
    setLoading(false);
    onSelect(suggestion);
  };

  const onKeyDown = (event) => {
    if (!open || suggestions.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((index) => (index + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
    } else if (event.key === 'Enter') {
      // Enter picks the highlighted (or best) match instead of submitting the form.
      event.preventDefault();
      choose(suggestions[Math.max(active, 0)]);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  const showList = open && (suggestions.length > 0 || failed);

  return (
    <div className="relative">
      <input
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        value={value}
        onChange={(event) => {
          typedRef.current = true;
          setOpen(true);
          onChange(event.target.value);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          blurTimer.current = setTimeout(() => setOpen(false), 150);
        }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        maxLength={maxLength}
        autoComplete={autoComplete}
        className={className}
      />
      {loading && (
        <Loader2 className="w-4 h-4 animate-spin text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
      )}
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 w-full max-h-72 overflow-y-auto rounded-xl border border-stone-200 bg-white shadow-xl py-1"
        >
          {failed && suggestions.length === 0 ? (
            <li className="px-3 py-2.5 text-xs text-stone-500">
              Search is unavailable right now. Tap your kitchen's spot on the map instead.
            </li>
          ) : (
            suggestions.map((suggestion, index) => {
              const Icon = KIND_ICONS[suggestion.kind] || MapPin;
              return (
                <li
                  key={suggestion.id}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === active}
                  // mousedown so the pick lands before the input's blur closes the list.
                  onMouseDown={(event) => {
                    event.preventDefault();
                    choose(suggestion);
                  }}
                  onMouseEnter={() => setActive(index)}
                  className={`px-3 py-2.5 flex items-start gap-2.5 cursor-pointer ${
                    index === active ? 'bg-[#faf6f2]' : ''
                  }`}
                >
                  <Icon className="w-4 h-4 mt-0.5 text-[#8a5332] flex-shrink-0" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-gray-900 truncate">{suggestion.name}</span>
                    {suggestion.secondary && (
                      <span className="block text-[11px] text-stone-500 truncate">{suggestion.secondary}</span>
                    )}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 flex-shrink-0 mt-0.5">
                    {KIND_LABELS[suggestion.kind] || 'Place'}
                  </span>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
