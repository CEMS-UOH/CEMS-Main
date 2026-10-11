// The three non-happy states every data screen needs - loading, error (with retry) and
// empty - drawn once so the attendee, organizer and admin areas look like one product.
//
// These take ready-made strings: each area keeps a thin wrapper (its own States.tsx) that
// supplies its translations and its error-code messages, so no screen has to change.

import type { ReactNode } from 'react';
import Button from './Button';
import Card from './Card';
import { AlertIcon, InboxIcon, SpinnerIcon } from './Icons';

/** The round tinted badge that sits above the text in every state. */
function StateMark({ tone, children }: { tone: 'primary' | 'danger'; children: ReactNode }) {
  const colour = tone === 'danger' ? 'bg-danger-light text-danger' : 'bg-primary-light text-primary';
  return (
    <span aria-hidden className={`grid size-12 place-items-center rounded-full ${colour}`}>
      {children}
    </span>
  );
}

const BLOCK = 'flex flex-col items-center gap-3 px-6 py-10 text-center sm:py-12';

export function LoadingState({ label }: { label: string }) {
  return (
    <Card padded={false} role="status" aria-live="polite" className={BLOCK}>
      <StateMark tone="primary">
        <SpinnerIcon className="size-6" />
      </StateMark>
      <p className="text-sm text-text-muted">{label}</p>
    </Card>
  );
}

type ErrorProps = {
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
};

export function ErrorState({ message, retryLabel, onRetry }: ErrorProps) {
  return (
    <Card padded={false} role="alert" className={BLOCK}>
      <StateMark tone="danger">
        <AlertIcon className="size-6" />
      </StateMark>
      <p className="max-w-md text-base font-medium text-text">{message}</p>
      {onRetry && retryLabel ? (
        <div className="pt-1">
          <Button type="button" variant="secondary" onClick={onRetry}>
            {retryLabel}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}

type EmptyProps = {
  title: string;
  body?: string;
  action?: ReactNode;
  /** Replaces the default "nothing here" icon when another one says it better. */
  icon?: ReactNode;
};

export function EmptyState({ title, body, action, icon }: EmptyProps) {
  return (
    <Card padded={false} className={BLOCK}>
      <StateMark tone="primary">{icon ?? <InboxIcon className="size-6" />}</StateMark>
      <p className="type-h3 text-text">{title}</p>
      {body ? <p className="max-w-md text-sm text-text-muted">{body}</p> : null}
      {action ? <div className="pt-2">{action}</div> : null}
    </Card>
  );
}
