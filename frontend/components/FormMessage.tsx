// Inline error / success message for forms. role="alert" so screen readers announce it.

type Props = {
  kind: 'error' | 'success';
  children: React.ReactNode;
};

export default function FormMessage({ kind, children }: Props) {
  const tone =
    kind === 'error'
      ? 'border-danger/30 bg-danger-light text-danger'
      : 'border-success/30 bg-success-light text-success';

  return (
    <p role="alert" className={`rounded-lg border px-3 py-2.5 text-sm text-start ${tone}`}>
      {children}
    </p>
  );
}
