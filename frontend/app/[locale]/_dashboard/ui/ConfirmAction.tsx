'use client';

// Two-step confirmation for destructive actions, inline - no browser confirm() dialog and no
// modal. The first click only asks; the red button appears at the moment of commitment.
// Keyboard focus follows the swap in both directions so it is never dropped.
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import Button from '@/components/Button';

type Props = {
  /** The initial, calm button, e.g. "Delete". */
  label: string;
  /** The question shown once clicked, e.g. "Delete this event?". */
  question: string;
  /** The committing button, e.g. "Yes, delete". */
  confirmLabel: string;
  /** Shown on the committing button while the request runs. */
  busyLabel: string;
  busy: boolean;
  disabled?: boolean;
  onConfirm: () => void;
};

export default function ConfirmAction({
  label,
  question,
  confirmLabel,
  busyLabel,
  busy,
  disabled,
  onConfirm,
}: Props) {
  const t = useTranslations('Dashboard');
  const [asking, setAsking] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const hasAsked = useRef(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (asking) {
      hasAsked.current = true;
      // The safe choice gets focus, so Enter right after opening never deletes.
      root.querySelector<HTMLButtonElement>('[data-confirm-cancel]')?.focus();
    } else if (hasAsked.current) {
      root.querySelector<HTMLButtonElement>('[data-confirm-trigger]')?.focus();
    }
  }, [asking]);

  return (
    <div
      ref={rootRef}
      role={asking ? 'group' : undefined}
      aria-label={asking ? question : undefined}
      className="flex flex-wrap items-center gap-2"
    >
      {asking ? (
        <>
          <span className="text-sm text-text">{question}</span>
          <Button type="button" variant="danger" size="sm" loading={busy} onClick={onConfirm}>
            {busy ? busyLabel : confirmLabel}
          </Button>
          <Button
            type="button"
            data-confirm-cancel=""
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => setAsking(false)}
          >
            {t('cancel')}
          </Button>
        </>
      ) : (
        <Button
          type="button"
          data-confirm-trigger=""
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={() => setAsking(true)}
        >
          {label}
        </Button>
      )}
    </div>
  );
}
