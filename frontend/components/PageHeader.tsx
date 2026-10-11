// Title block at the top of every screen that has one - attendee, organizer and admin - so
// page titles are the same size, weight and spacing everywhere. `actions` wraps below the
// title on narrow screens instead of squeezing it.

type Props = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  /** Small line above the title, e.g. a back link. */
  eyebrow?: React.ReactNode;
};

export default function PageHeader({ title, subtitle, actions, eyebrow }: Props) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="flex min-w-0 flex-col gap-2 text-start">
        {eyebrow ? <div className="text-sm">{eyebrow}</div> : null}
        <h1 className="type-h1 text-text [overflow-wrap:anywhere]">{title}</h1>
        {subtitle ? (
          <p className="max-w-2xl text-base text-text-muted [overflow-wrap:anywhere]">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
