'use client';

// Renders the booking token as a QR code (FR-05), drawn locally - the token never leaves the page.
// Always dark-on-white with a quiet zone, which scanners need regardless of the page theme.
import { useMemo } from 'react';
import { encodeQr, qrPath } from '../_lib/qr';

const QUIET_ZONE = 4;

export default function QrCode({ value, label, className = '' }: { value: string; label: string; className?: string }) {
  const symbol = useMemo(() => {
    const matrix = encodeQr(value);
    return { path: qrPath(matrix, QUIET_ZONE), extent: matrix.size + QUIET_ZONE * 2 };
  }, [value]);

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${symbol.extent} ${symbol.extent}`}
      shapeRendering="crispEdges"
      className={`block bg-white ${className}`}
    >
      <rect width={symbol.extent} height={symbol.extent} fill="#ffffff" />
      <path d={symbol.path} fill="#000000" />
    </svg>
  );
}
