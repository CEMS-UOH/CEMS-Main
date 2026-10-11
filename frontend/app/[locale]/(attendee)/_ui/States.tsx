'use client';

// The non-happy states every attendee screen needs: loading, error (with retry), empty.
// The look comes from the shared frontend/components/States.tsx (the same one the dashboards
// use); this file supplies the attendee wording, the error-code translations, and the card
// skeleton that only the events feed needs.
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import Card from '@/components/Card';
import * as Shared from '@/components/States';
import { useAttendeeError } from '../_lib/useAttendeeError';

/** Placeholder cards in the shape of the content that is coming, announced to screen readers. */
export function LoadingCards({ count = 6, label }: { count?: number; label?: string }) {
  const t = useTranslations('AttendeeCommon');
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{label ?? t('loading')}</span>
      <div aria-hidden className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }, (_, i) => (
          <Card key={i} padded={false} className="overflow-hidden">
            <div className="aspect-[16/9] animate-pulse bg-background" />
            <div className="flex flex-col gap-3 p-5">
              <div className="h-3 w-20 animate-pulse rounded-full bg-background" />
              <div className="h-5 w-4/5 animate-pulse rounded-full bg-background" />
              <div className="h-3 w-3/5 animate-pulse rounded-full bg-background" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function LoadingBlock({ label }: { label?: string }) {
  const t = useTranslations('AttendeeCommon');
  return <Shared.LoadingState label={label ?? t('loading')} />;
}

export function ErrorState({ code, onRetry }: { code: string; onRetry?: () => void }) {
  const t = useTranslations('AttendeeCommon');
  const errorMessage = useAttendeeError();
  return <Shared.ErrorState message={errorMessage(code)} retryLabel={t('retry')} onRetry={onRetry} />;
}

export function EmptyState(props: { title: string; body?: string; action?: ReactNode }) {
  return <Shared.EmptyState {...props} />;
}
