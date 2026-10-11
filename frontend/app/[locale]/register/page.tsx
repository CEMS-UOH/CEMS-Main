'use client';

// FR-01: registration. Any syntactically valid email is accepted - registration is
// deliberately NOT restricted to a university domain (see README "Known limitations").
//
// Registration does not create a session, so on success we confirm and offer a link to
// log in rather than redirecting immediately (a redirect would hide the confirmation).
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import Button from '@/components/Button';
import FormField from '@/components/FormField';
import FormMessage from '@/components/FormMessage';
import { register } from '@/lib/api';
import { useApiError } from '@/lib/useApiError';

export default function RegisterPage() {
  const t = useTranslations('Register');
  const errorMessage = useApiError();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = await register({ email, password, fullName });
    setSubmitting(false);

    if (result.ok) {
      setDone(true);
      return;
    }
    setError(errorMessage(result.code));
  }

  if (done) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-12">
        <h1 className="text-start text-2xl font-bold text-text">{t('title')}</h1>
        <FormMessage kind="success">{t('success')}</FormMessage>
        <Link
          href="/login"
          className="inline-flex w-fit items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-[var(--shadow-card)] hover:bg-primary-dark"
        >
          {t('loginLink')}
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-12">
      <header className="flex flex-col gap-1 text-start">
        <h1 className="text-2xl font-bold text-text">{t('title')}</h1>
        <p className="text-sm text-text-muted">{t('subtitle')}</p>
      </header>

      <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-6 shadow-[var(--shadow-card)]" noValidate>
        {error ? <FormMessage kind="error">{error}</FormMessage> : null}

        <FormField
          id="fullName"
          label={t('fullName')}
          value={fullName}
          onChange={setFullName}
          autoComplete="name"
          disabled={submitting}
          required
        />
        <FormField
          id="email"
          label={t('email')}
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          disabled={submitting}
          required
        />
        <FormField
          id="password"
          label={t('password')}
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          hint={t('passwordHint')}
          disabled={submitting}
          required
        />

        <Button type="submit" disabled={submitting} className="mt-2 w-full">
          {submitting ? t('submitting') : t('submit')}
        </Button>
      </form>

      <p className="text-sm text-start">
        <span className="me-1 text-text-muted">{t('haveAccount')}</span>
        <Link href="/login" className="font-medium text-primary hover:underline">
          {t('loginLink')}
        </Link>
      </p>
    </main>
  );
}
