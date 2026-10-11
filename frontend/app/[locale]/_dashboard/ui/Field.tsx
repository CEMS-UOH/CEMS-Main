// Form controls for the dashboards. The shared FormField (frontend/components) only supports
// text/email/password inputs and has no per-field error, and the dashboards also need number,
// date-time, select and textarea controls - so these follow FormField's exact visual recipe
// (same tokens, radius, focus treatment) instead of inventing a second look.

const CONTROL =
  'w-full min-w-0 rounded-lg border border-border bg-surface px-3 py-2.5 text-start text-text outline-none transition-colors duration-150 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-background disabled:text-text-muted aria-[invalid=true]:border-danger';

type ShellProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string | null;
  /** Keep the label for screen readers only - for a control inside a row that already names it. */
  labelHidden?: boolean;
  children: React.ReactNode;
};

function FieldShell({ id, label, hint, error, labelHidden, children }: ShellProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1 text-start">
      <label htmlFor={id} className={labelHidden ? 'sr-only' : 'text-sm font-medium text-text'}>
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const describedBy = (id: string, hint?: string, error?: string | null) =>
  error ? `${id}-error` : hint ? `${id}-hint` : undefined;

type CommonProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string | null;
  required?: boolean;
  disabled?: boolean;
};

type TextFieldProps = CommonProps & {
  type?: 'text' | 'email' | 'password' | 'number' | 'url' | 'search' | 'datetime-local';
  autoComplete?: string;
  inputMode?: 'text' | 'numeric' | 'email' | 'url' | 'search';
  maxLength?: number;
  min?: number;
  /** Force LTR for values that are always Latin (emails, URLs), even on an Arabic page. */
  ltrValue?: boolean;
};

export function TextField({
  id,
  label,
  value,
  onChange,
  hint,
  error,
  required,
  disabled,
  type = 'text',
  autoComplete,
  inputMode,
  maxLength,
  min,
  ltrValue,
}: TextFieldProps) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        inputMode={inputMode}
        maxLength={maxLength}
        min={min}
        dir={ltrValue ? 'ltr' : undefined}
        required={required}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={CONTROL}
      />
    </FieldShell>
  );
}

type TextAreaFieldProps = CommonProps & { rows?: number; maxLength?: number; ltrValue?: boolean };

export function TextAreaField({
  id,
  label,
  value,
  onChange,
  hint,
  error,
  required,
  disabled,
  rows = 4,
  maxLength,
  ltrValue,
}: TextAreaFieldProps) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <textarea
        id={id}
        name={id}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        dir={ltrValue ? 'ltr' : undefined}
        required={required}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={CONTROL}
      />
    </FieldShell>
  );
}

type SelectFieldProps = CommonProps & {
  options: { value: string; label: string }[];
  labelHidden?: boolean;
};

export function SelectField({
  id,
  label,
  value,
  onChange,
  hint,
  error,
  required,
  disabled,
  options,
  labelHidden,
}: SelectFieldProps) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} labelHidden={labelHidden}>
      <select
        id={id}
        name={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={CONTROL}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}
