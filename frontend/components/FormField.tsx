// Label + input pair, styled to the SCEMS palette (globals.css tokens).
// Uses logical classes only so it flips correctly for RTL and LTR.

type Props = {
  id: string;
  label: string;
  type?: 'text' | 'email' | 'password';
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
};

export default function FormField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  autoComplete,
  hint,
  required,
  disabled,
}: Props) {
  return (
    <div className="flex flex-col gap-1 text-start">
      <label htmlFor={id} className="text-sm font-medium text-text">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        disabled={disabled}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="rounded-lg border border-border bg-surface px-3 py-2.5 text-start text-text outline-none transition-colors duration-150 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-background disabled:text-text-muted"
      />
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
