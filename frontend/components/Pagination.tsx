// Previous / next with the current position, for every paged list. Arrows follow the reading
// direction (they flip in Arabic). Renders nothing when there is only one page.
//
// Takes ready-made strings; each area's own wrapper supplies its translations.

import Button from './Button';
import { BackIcon, ForwardIcon } from './Icons';

type Props = {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
  disabled?: boolean;
  labels: { nav: string; previous: string; next: string; position: string };
};

export default function Pagination({ page, totalPages, onPage, disabled, labels }: Props) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label={labels.nav} className="flex flex-wrap items-center justify-between gap-3">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        icon={<BackIcon />}
        disabled={disabled || page <= 1}
        onClick={() => onPage(page - 1)}
      >
        {labels.previous}
      </Button>
      <span className="text-sm text-text-muted tabular-nums" aria-live="polite">
        {labels.position}
      </span>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={disabled || page >= totalPages}
        onClick={() => onPage(page + 1)}
      >
        {labels.next}
        <ForwardIcon />
      </Button>
    </nav>
  );
}
