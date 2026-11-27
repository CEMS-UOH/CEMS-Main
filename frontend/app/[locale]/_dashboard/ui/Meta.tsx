// Label/value pairs inside a card (date, venue, category ...). One column on phones, two
// from sm up, so long Arabic or English values never push the card wider than the screen.

export function MetaList({ children }: { children: React.ReactNode }) {
  return <dl className="grid gap-x-4 gap-y-3 text-start sm:grid-cols-2">{children}</dl>;
}

export function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-text-muted">{label}</dt>
      <dd className="text-sm text-text [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}
