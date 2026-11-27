// One number with its label. `highlight` is the screen's single gold accent: use it on at
// most ONE tile per screen (the thing that needs attention), never as decoration.
import Card from '@/components/Card';

type Props = {
  label: string;
  value: string;
  highlight?: boolean;
};

export default function StatTile({ label, value, highlight = false }: Props) {
  return (
    <Card className="flex min-w-0 flex-col gap-3 text-start">
      <span
        aria-hidden="true"
        className={`h-1 w-8 rounded-lg ${highlight ? 'bg-accent' : 'bg-primary-light'}`}
      />
      <div className="flex flex-col gap-1">
        <span className="text-sm text-text-muted">{label}</span>
        <span
          className={`text-2xl font-bold tabular-nums ${highlight ? 'text-accent-dark' : 'text-text'}`}
        >
          {value}
        </span>
      </div>
    </Card>
  );
}

/** Responsive grid for stat tiles: 2 across on phones, 4 across from md up. */
export function StatGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{children}</div>;
}
