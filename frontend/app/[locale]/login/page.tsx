'use client';

// FR-02: login for every role (Attendee, Organizer, Admin). On success the API sets an
// httpOnly session cookie; nothing is stored in localStorage.
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import AuthShell from '@/components/AuthShell';
import Button from '@/components/Button';
import Card from '@/components/Card';
import FormField from '@/components/FormField';
import FormMessage from '@/components/FormMessage';
import { TEXT_LINK } from '@/components/styles';
import { login } from '@/lib/api';
import { HOME_BY_ROLE } from '@/lib/roleHome';
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
      // The login response carries the role, which decides where the user lands (Attendee ->
      // /me, Organizer -> /organizer, Admin -> /admin). Falls back to the account page if the
      // API ever sends a role this build doesn't know.
      router.push(HOME_BY_ROLE[result.data.user.role] ?? '/me');
      return; // keep the button disabled while the route change is in flight
    }

    setError(errorMessage(result.code));
    setSubmitting(false);
  }

  return (
    <AuthShell>
      <header className="flex flex-col gap-2 text-start">
        <h1 className="type-h1 text-text">{t('title')}</h1>
        <p className="text-base text-text-muted">{t('subtitle')}</p>
      </header>

      <Card>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          {error ? <FormMessage kind="error">{error}</FormMessage> : null}

          <FormField
            id="email"
            label={t('email')}
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            ltrValue
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

          <Button type="submit" loading={submitting} className="mt-2 w-full">
            {submitting ? t('submitting') : t('submit')}
          </Button>
        </form>
      </Card>

      <p className="text-start text-sm">
        <span className="me-1 text-text-muted">{t('noAccount')}</span>
        <Link href="/register" className={TEXT_LINK}>
          {t('registerLink')}
        </Link>
      </p>
    </AuthShell>
  );
}
