'use client';

// The three non-happy states every data screen needs: loading, error (with retry), empty.
import { useTranslations } from 'next-intl';
import Card from '@/components/Card';
import FormMessage from '@/components/FormMessage';
import Button from './Button';
import { useDashboardError } from '../lib/useDashboardError';

export function LoadingState({ label }: { label?: string }) {
  const t = useTranslations('Dashboard');
  return (
    <Card role="status" aria-live="polite" className="text-start text-sm text-text-muted">
      {label ?? t('loading')}
    </Card>
  );
}

export function ErrorState({ code, onRetry }: { code: string; onRetry?: () => void }) {
  const t = useTranslations('Dashboard');
  const errorMessage = useDashboardError();
  return (
    <Card className="flex flex-col gap-4">
      <FormMessage kind="error">{errorMessage(code)}</FormMessage>
      {onRetry ? (
        <div>
          <Button variant="secondary" onClick={onRetry}>
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
    <Card className="flex flex-col gap-2 text-start">
      <p className="text-base font-bold text-text">{title}</p>
      {body ? <p className="text-sm text-text-muted">{body}</p> : null}
      {action ? <div className="pt-2">{action}</div> : null}
    </Card>
  );
}
