import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

/**
 * Drop-in <img> that fades in once loaded and swaps to `fallback` if the
 * link is broken. Unlike LazyImage it adds no wrapper, so existing sizing
 * classes (avatars, thumbnails, banners) keep working unchanged.
 *
 * @param {{src?:string, alt?:string, className?:string, priority?:boolean,
 *          fallback?:React.ReactNode}} props
 */
export default function FadeImage({ src, alt = '', className, priority = false, fallback = null, ...rest }) {
  const imgRef = useRef(null);
  const [status, setStatus] = useState(src ? 'loading' : 'error');

  // Reset when the picture changes, and catch images already in the browser cache.
  useEffect(() => {
    if (!src) return setStatus('error');
    const img = imgRef.current;
    setStatus(img?.complete && img.naturalWidth > 0 ? 'ready' : 'loading');
  }, [src]);

  if (status === 'error') return fallback;

  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      onLoad={() => setStatus('ready')}
      onError={() => setStatus('error')}
      className={clsx(
        'transition-opacity duration-300 motion-reduce:transition-none',
        status === 'ready' ? 'opacity-100' : 'opacity-0',
        className,
      )}
      {...rest}
    />
  );
}
