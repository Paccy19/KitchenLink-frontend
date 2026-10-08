import React, { useState } from 'react';
import clsx from 'clsx';
import { Utensils } from 'lucide-react';

/**
 * Lazy image with a blurred shimmer placeholder and fade-in.
 * Parents should provide a fixed aspect ratio to minimise layout shift.
 *
 * @param {{src:string, alt:string, aspect?:string, rounded?:string,
 *          className?:string, imgClassName?:string, priority?:boolean,
 *          fallback?:React.ReactNode}} props
 */
export default function LazyImage({
  src,
  alt,
  aspect = 'aspect-[4/3]',
  rounded = 'rounded-2xl',
  className,
  imgClassName,
  priority = false,
  fallback,
}) {
  const [status, setStatus] = useState(src ? 'loading' : 'error');

  return (
    <div className={clsx('relative overflow-hidden bg-stone-100', aspect, rounded, className)}>
      {/* Shimmer placeholder sits underneath while the image loads */}
      {status !== 'ready' && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-stone-200 via-stone-100 to-stone-200" aria-hidden="true" />
      )}

      {status !== 'error' && (
        <img
          src={src}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setStatus('ready')}
          onError={() => setStatus('error')}
          className={clsx(
            'h-full w-full object-cover transition-all duration-500',
            status === 'ready' ? 'opacity-100 blur-0 scale-100' : 'opacity-0 blur-md scale-105',
            imgClassName,
          )}
        />
      )}

      {status === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-stone-100 text-stone-300" role="img" aria-label={alt}>
          {fallback ?? <Utensils className="w-8 h-8 text-stone-300" aria-hidden="true" />}
        </div>
      )}
    </div>
  );
}
