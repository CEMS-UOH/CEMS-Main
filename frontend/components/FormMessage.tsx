// Inline error / success message for forms. role="alert" so screen readers announce it.

type Props = {
  kind: 'error' | 'success';
  children: React.ReactNode;
};

export default function FormMessage({ kind, children }: Props) {
  const tone =
    kind === 'error'
      ? 'border-red-300 bg-red-50 text-red-800'
      : 'border-green-300 bg-green-50 text-green-800';

  return (
    <p role="alert" className={`rounded border px-3 py-2 text-sm text-start ${tone}`}>
      {children}
    </p>
  );
}
