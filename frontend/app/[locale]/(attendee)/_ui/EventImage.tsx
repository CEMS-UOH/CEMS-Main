'use client';

// Event cover: the organizer's image when there is one (and it loads), otherwise a calm branded
// placeholder so cards keep the same shape. Plain <img>: organizer images can live on any host,
// which next/image would need listing in next.config.ts.
import { useState } from 'react';
import { CalendarIcon } from './Icons';

type Props = {
  src: string | null;
  alt: string;
  className?: string;
  /** Above-the-fold images (the event page hero) should not wait for lazy loading. */
  eager?: boolean;
};

export default function EventImage({ src, alt, className = '', eager }: Props) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        aria-hidden
        className={`grid place-items-center bg-linear-to-br from-primary-light via-surface to-accent-light text-primary/40 ${className}`}
      >
        <CalendarIcon className="size-12" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  );
}
