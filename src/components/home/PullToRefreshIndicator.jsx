import React from 'react';
import clsx from 'clsx';
import { ArrowDown, Check, Loader2 } from 'lucide-react';

/**
 * Visual feedback for the pull-to-refresh gesture.
 * Sits at the top of the feed and stretches with the pull distance.
 */
export default function PullToRefreshIndicator({ pullDistance, ready, refreshing }) {
  const visible = pullDistance > 0 || refreshing;

  return (
    <div
      aria-hidden={!visible}
      className="pointer-events-none flex justify-center overflow-hidden transition-[height,opacity] duration-200"
      style={{ height: refreshing ? 48 : Math.min(pullDistance, 96), opacity: visible ? 1 : 0 }}
    >
      <div className="flex flex-col items-center gap-1 pt-3 text-orange-600">
        {refreshing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Refreshing…</span>
          </>
        ) : (
          <>
            <span
              className={clsx(
                'transition-transform',
                ready ? 'rotate-180 text-forest-600' : 'rotate-0',
              )}
            >
              {ready ? <Check className="w-5 h-5" /> : <ArrowDown className="w-5 h-5" />}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              {ready ? 'Release to refresh' : 'Pull to refresh'}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
