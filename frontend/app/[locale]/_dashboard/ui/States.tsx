'use client';

// Loading, error and empty for the dashboards. The look comes from the shared
// frontend/components/States.tsx; this file only supplies the dashboard's own words and its
// error-code translations, so every screen keeps calling these the same way.
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import * as Shared from '@/components/States';
import { useDashboardError } from '../lib/useDashboardError';

export function LoadingState({ label }: { label?: string }) {
  const t = useTranslations('Dashboard');
  return <Shared.LoadingState label={label ?? t('loading')} />;
}

export function ErrorState({ code, onRetry }: { code: string; onRetry?: () => void }) {
  const t = useTranslations('Dashboard');
  const errorMessage = useDashboardError();
  return <Shared.ErrorState message={errorMessage(code)} retryLabel={t('retry')} onRetry={onRetry} />;
}

export function EmptyState(props: { title: string; body?: string; action?: ReactNode; icon?: ReactNode }) {
  return <Shared.EmptyState {...props} />;
}
