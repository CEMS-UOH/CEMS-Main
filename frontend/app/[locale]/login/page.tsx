'use client';

// FR-02: login for every role (Attendee, Organizer, Admin). On success the API sets an
// httpOnly session cookie; nothing is stored in localStorage.
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import Button from '@/components/Button';
import FormField from '@/components/FormField';
import FormMessage from '@/components/FormMessage';
import { login } from '@/lib/api';
import { useApiError } from '@/lib/useApiError';

export default function LoginPage() {
  const t = useTranslations('Login');
  const errorMessage = useApiError();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = await login({ email, password });

    if (result.ok) {
      router.push('/me');
      return; // keep the button disabled while the route change is in flight
    }

    setError(errorMessage(result.code));
    setSubmitting(false);
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
          autoComplete="current-password"
          disabled={submitting}
          required
        />

        <Button type="submit" disabled={submitting} className="mt-2 w-full">
          {submitting ? t('submitting') : t('submit')}
        </Button>
      </form>

      <p className="text-sm text-start">
        <span className="me-1 text-text-muted">{t('noAccount')}</span>
        <Link href="/register" className="font-medium text-primary hover:underline">
          {t('registerLink')}
        </Link>
      </p>
    </main>
  );
}
