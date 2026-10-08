import React, { useState } from 'react';
import clsx from 'clsx';

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
    <div className={clsx('relative overflow-hidden bg-gray-100', aspect, rounded, className)}>
      {/* Shimmer placeholder sits underneath while the image loads */}
      {status !== 'ready' && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200" aria-hidden="true" />
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
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-300" role="img" aria-label={alt}>
          {fallback ?? <span className="text-3xl" aria-hidden="true">🍴</span>}
        </div>
      )}
    </div>
  );
}
