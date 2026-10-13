// Form controls for every screen: text-like inputs, textarea and select, each with a label,
// an optional hint and a per-field error. One file so a field on the login page and a field
// in a dashboard form are the same control.
//
// History: this used to be two files - a FormField here that only did text/email/password
// with no error slot, and a dashboard-local copy that added the rest. They were merged once
// both were stable. `FormField` (the default export) is kept as the name the auth pages use;
// it is the same component as `TextField`.
//
// Uses logical classes only so it flips correctly for RTL and LTR.

const CONTROL_BASE =
  'w-full min-w-0 min-h-11 rounded-lg border border-border bg-surface px-3 py-2.5 text-start text-base text-text outline-none transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-text-muted/70 hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-background disabled:text-text-muted disabled:hover:border-border aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/20';

/**
 * The look of a single-line input or select. Exported for the rare control that cannot use
 * the components below (e.g. the search box with an icon inside it). The fixed line height
 * keeps a field the same height in Arabic and English, whose body line heights differ.
 */
export const CONTROL = `${CONTROL_BASE} leading-6`;

/** The look of a textarea: the same box, with the language's own (roomier) line height. */
export const TEXTAREA = `${CONTROL_BASE} resize-y`;

/** The look of a field label. */
export const LABEL = 'text-sm font-medium text-text';

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
    <div className="flex min-w-0 flex-col gap-1.5 text-start">
      <label htmlFor={id} className={labelHidden ? 'sr-only' : LABEL}>
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs font-medium text-danger">
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
  type?:
    | 'text'
    | 'email'
    | 'password'
    | 'number'
    | 'tel'
    | 'url'
    | 'search'
    | 'date'
    | 'datetime-local';
  autoComplete?: string;
  inputMode?: 'text' | 'numeric' | 'tel' | 'email' | 'url' | 'search';
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
        className={TEXTAREA}
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

/** The name the auth pages use. Same component as TextField. */
export default TextField;
