import React, { useEffect, useRef, useState } from 'react';
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
  const imgRef = useRef(null);
  const [status, setStatus] = useState(src ? 'loading' : 'error');

  // Reset when the picture changes, and catch images already in the browser cache.
  useEffect(() => {
    if (!src) return setStatus('error');
    const img = imgRef.current;
    setStatus(img?.complete && img.naturalWidth > 0 ? 'ready' : 'loading');
  }, [src]);

  return (
    <div className={clsx('relative overflow-hidden bg-stone-100', aspect, rounded, className)}>
      {/* Shimmer placeholder sits underneath while the image loads */}
      {status !== 'ready' && (
        <div className="absolute inset-0 animate-pulse motion-reduce:animate-none bg-stone-200" aria-hidden="true" />
      )}

      {status !== 'error' && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setStatus('ready')}
          onError={() => setStatus('error')}
          className={clsx(
            'h-full w-full object-cover transition-all duration-500 motion-reduce:transition-none',
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
