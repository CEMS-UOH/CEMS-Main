'use client';

// FR-01: registration. Any syntactically valid email is accepted - registration is
// deliberately NOT restricted to a university domain (see README "Known limitations").
//
// Registration does not create a session, so on success we confirm and offer a link to
// log in rather than redirecting immediately (a redirect would hide the confirmation).
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import AuthShell from '@/components/AuthShell';
import Button from '@/components/Button';
import Card from '@/components/Card';
import FormField from '@/components/FormField';
import FormMessage from '@/components/FormMessage';
import { TEXT_LINK } from '@/components/styles';
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
      <AuthShell>
        <h1 className="type-h1 text-start text-text">{t('title')}</h1>
        <Card className="flex flex-col gap-4">
          <FormMessage kind="success">{t('success')}</FormMessage>
          <Button href="/login" className="w-full">
            {t('loginLink')}
          </Button>
        </Card>
      </AuthShell>
    );
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
            autoComplete="new-password"
            hint={t('passwordHint')}
            disabled={submitting}
            required
          />

          <Button type="submit" loading={submitting} className="mt-2 w-full">
            {submitting ? t('submitting') : t('submit')}
          </Button>
        </form>
      </Card>

      <p className="text-start text-sm">
        <span className="me-1 text-text-muted">{t('haveAccount')}</span>
        <Link href="/login" className={TEXT_LINK}>
          {t('loginLink')}
        </Link>
      </p>
    </AuthShell>
  );
}
