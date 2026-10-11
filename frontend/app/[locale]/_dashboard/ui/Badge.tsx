// Pill-shaped status chip - rounded-full is reserved for these (and the area chip in the
// header); everything else uses the standard rounded-lg. The label always carries the
// meaning; colour only reinforces it. Gold (accent) is deliberately NOT a tone here: it is
// reserved for the single highlight on each screen.

export type BadgeTone = 'success' | 'danger' | 'neutral' | 'muted';

const toneClasses: Record<BadgeTone, string> = {
  success: 'bg-success-light text-success',
  danger: 'bg-danger-light text-danger',
  neutral: 'border border-border bg-surface text-text',
  muted: 'border border-border bg-background text-text-muted',
};

export default function Badge({ tone, children }: { tone: BadgeTone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}
