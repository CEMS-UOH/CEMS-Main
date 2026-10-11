'use client';

// The non-happy states every attendee screen needs: loading, error (with retry), empty.
import { useTranslations } from 'next-intl';
import Button from '@/components/Button';
import Card from '@/components/Card';
import FormMessage from '@/components/FormMessage';
import { useAttendeeError } from '../_lib/useAttendeeError';

/** Placeholder cards in the shape of the content that is coming, announced to screen readers. */
export function LoadingCards({ count = 6, label }: { count?: number; label?: string }) {
  const t = useTranslations('AttendeeCommon');
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{label ?? t('loading')}</span>
      <div aria-hidden className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="overflow-hidden rounded-lg border border-border bg-surface">
            <div className="aspect-[16/9] animate-pulse bg-background" />
            <div className="flex flex-col gap-3 p-5">
              <div className="h-3 w-20 animate-pulse rounded bg-background" />
              <div className="h-5 w-4/5 animate-pulse rounded bg-background" />
              <div className="h-3 w-3/5 animate-pulse rounded bg-background" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LoadingBlock({ label }: { label?: string }) {
  const t = useTranslations('AttendeeCommon');
  return (
    <Card role="status" aria-live="polite" className="text-start text-sm text-text-muted">
      {label ?? t('loading')}
    </Card>
  );
}

export function ErrorState({ code, onRetry }: { code: string; onRetry?: () => void }) {
  const t = useTranslations('AttendeeCommon');
  const errorMessage = useAttendeeError();
  return (
    <Card className="flex flex-col gap-4">
      <FormMessage kind="error">{errorMessage(code)}</FormMessage>
      {onRetry ? (
        <div>
          <Button type="button" variant="secondary" onClick={onRetry}>
            {t('retry')}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <p className="text-base font-bold text-text">{title}</p>
      {body ? <p className="max-w-md text-sm text-text-muted">{body}</p> : null}
      {action ? <div className="pt-3">{action}</div> : null}
    </Card>
  );
}
