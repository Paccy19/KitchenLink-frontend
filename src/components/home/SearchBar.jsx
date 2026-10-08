import React, { useEffect, useRef, useState } from 'react';
import { Clock, Search, Sparkles, X } from 'lucide-react';
import useRecentSearches from '../../hooks/useRecentSearches';
import { SEARCH_SUGGESTIONS } from '../../hooks/useSearch';

/**
 * Prominent search input with clear button, recent searches and suggestions.
 * Fully controlled: the parent owns `value` and performs debounced lookups.
 *
 * @param {{value:string, onChange:(v:string)=>void, onSubmit?:(q:string)=>void,
 *          placeholder?:string, autoFocus?:boolean, className?:string,
 *          compact?:boolean, label?:string}} props
 */
export default function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = 'What are you craving? (Isombe, Pizza, Burger…)',
  autoFocus = false,
  className,
  compact = false,
  label = 'Search food or kitchens',
}) {
  const [focused, setFocused] = useState(false);
  const containerRef = useRef(null);
  const { recent, addSearch, removeSearch, clearSearches } = useRecentSearches();

  const submit = (query) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    addSearch(trimmed);
    onChange(trimmed);
    onSubmit?.(trimmed);
    setFocused(false);
    containerRef.current?.querySelector('input')?.blur();
  };

  // Close the suggestions panel when clicking outside.
  useEffect(() => {
    if (!focused) return undefined;
    const onPointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setFocused(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [focused]);

  const showPanel = focused;

  return (
    <div ref={containerRef} className={`relative ${className ?? ''}`}>
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          submit(value);
        }}
        className="relative"
      >
        <label htmlFor="global-search" className="sr-only">
          {label}
        </label>
        <Search
          className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
          aria-hidden="true"
        />
        <input
          id="global-search"
          type="search"
          value={value}
          autoComplete="off"
          autoFocus={autoFocus}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setFocused(true)}
          placeholder={placeholder}
          aria-label={label}
          aria-expanded={showPanel}
          aria-controls="search-suggestions"
          className={`w-full pl-12 pr-12 rounded-2xl bg-white border border-gray-200 text-gray-900 placeholder:text-gray-400 shadow-sm hover:border-gray-300 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition ${
            compact ? 'py-2.5 text-sm' : 'py-3.5 text-base'
          }`}
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              containerRef.current?.querySelector('input')?.focus();
            }}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </form>

      {showPanel && (
        <div
          id="search-suggestions"
          className="absolute z-50 mt-2 w-full bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden"
        >
          {recent.length > 0 && (
            <div className="p-3 border-b border-gray-100">
              <div className="flex items-center justify-between px-1 pb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  Recent searches
                </span>
                <button
                  type="button"
                  onClick={clearSearches}
                  className="text-[11px] font-bold text-orange-600 hover:underline"
                >
                  Clear
                </button>
              </div>
              <ul className="flex flex-wrap gap-2">
                {recent.map((query) => (
                  <li key={query} className="flex items-center gap-1 bg-gray-50 border border-gray-100 rounded-full pl-3 pr-1.5 py-1">
                    <button
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => submit(query)}
                      className="text-xs font-semibold text-gray-700 hover:text-orange-600 flex items-center gap-1.5"
                    >
                      <Clock className="w-3 h-3 text-gray-400" />
                      {query}
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove ${query} from recent searches`}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => removeSearch(query)}
                      className="w-5 h-5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-200 flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="p-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-1 block pb-2">
              <Sparkles className="w-3 h-3 inline mr-1 text-orange-500" />
              Try searching for
            </span>
            <div className="flex flex-wrap gap-2">
              {SEARCH_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => submit(suggestion)}
                  className="px-3 py-1.5 rounded-full bg-orange-50 text-orange-700 border border-orange-100 text-xs font-bold hover:bg-orange-100 transition"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
