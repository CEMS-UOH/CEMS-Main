// Plain label + input pair. Styling is intentionally minimal - the real design comes
// from Figma (Role 7). Uses logical classes only so it flips for RTL and LTR.

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
      <label htmlFor={id} className="text-sm font-medium">
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
        className="rounded border border-slate-300 px-3 py-2 text-start disabled:bg-slate-100"
      />
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
