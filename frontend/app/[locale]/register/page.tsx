'use client';

// FR-01: registration. Any syntactically valid email is accepted - registration is
// deliberately NOT restricted to a university domain (see README "Known limitations").
//
// Registration does not create a session, so on success we confirm and offer a link to
// log in rather than redirecting immediately (a redirect would hide the confirmation).
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
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
      <main className="mx-auto flex max-w-md flex-col gap-6 px-6 py-12">
        <h1 className="text-start text-2xl font-bold">{t('title')}</h1>
        <FormMessage kind="success">{t('success')}</FormMessage>
        <Link
          href="/login"
          className="w-fit rounded bg-slate-900 px-4 py-2 text-start text-white"
        >
          {t('loginLink')}
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-6 py-12">
      <header className="flex flex-col gap-1 text-start">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-sm text-slate-600">{t('subtitle')}</p>
      </header>

      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
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

        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-60"
        >
          {submitting ? t('submitting') : t('submit')}
        </button>
      </form>

      <p className="text-sm text-start">
        <span className="me-1 text-slate-600">{t('haveAccount')}</span>
        <Link href="/login" className="text-blue-700 underline">
          {t('loginLink')}
        </Link>
      </p>
    </main>
  );
}
