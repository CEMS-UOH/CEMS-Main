'use client';

// FR-01: registration, as an Attendee or as an Organizer. Any syntactically valid email is
// accepted - registration is deliberately NOT restricted to a university domain (see README
// "Known limitations").
//
// An Organizer also gives a phone number (and optionally the club or department they
// represent) for the admin who will review their event requests. The account works at once;
// what waits for approval is each event, not the account.
//
// Registration does not create a session, so on success we confirm and offer a link to
// log in rather than redirecting immediately (a redirect would hide the confirmation).
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import AuthShell from '@/components/AuthShell';
import Button from '@/components/Button';
import Card from '@/components/Card';
import FormField, { LABEL } from '@/components/FormField';
import FormMessage from '@/components/FormMessage';
import { CalendarIcon, TicketIcon } from '@/components/Icons';
import { TEXT_LINK } from '@/components/styles';
import { register, type SelfRegisterRole } from '@/lib/api';
import { useApiError } from '@/lib/useApiError';

export default function RegisterPage() {
  // useSearchParams needs a Suspense boundary so the page can still be prerendered.
  return (
    <Suspense fallback={<AuthShell>{null}</AuthShell>}>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const t = useTranslations('Register');
  const errorMessage = useApiError();
  // /register?type=organizer opens with "Organizer" already chosen (the home page links here).
  const startAsOrganizer = useSearchParams().get('type') === 'organizer';

  const [role, setRole] = useState<SelfRegisterRole>(startAsOrganizer ? 'ORGANIZER' : 'ATTENDEE');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [organization, setOrganization] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<{ phone?: string; organization?: string }>({});
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isOrganizer = role === 'ORGANIZER';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldError({});
    setSubmitting(true);

    const result = await register({
      email,
      password,
      fullName,
      role,
      // Contact details are only sent for an Organizer; the API ignores them otherwise.
      ...(isOrganizer ? { phone, organization } : {}),
    });
    setSubmitting(false);

    if (result.ok) {
      setDone(true);
      return;
    }
    const message = errorMessage(result.code);
    setError(message);
    if (result.code === 'INVALID_PHONE') setFieldError({ phone: message });
    if (result.code === 'INVALID_ORGANIZATION') setFieldError({ organization: message });
  }

  if (done) {
    return (
      <AuthShell>
        <h1 className="type-h1 text-start text-text">{t('title')}</h1>
        <Card className="flex flex-col gap-4">
          <FormMessage kind="success">{isOrganizer ? t('successOrganizer') : t('success')}</FormMessage>
          <Button href="/login" className="w-full">
            {t('loginLink')}
          </Button>
        </Card>
      </AuthShell>
    );
  }

  const options: { value: SelfRegisterRole; label: string; hint: string; icon: React.ReactNode }[] = [
    { value: 'ATTENDEE', label: t('attendee'), hint: t('attendeeHint'), icon: <TicketIcon className="size-5" /> },
    { value: 'ORGANIZER', label: t('organizer'), hint: t('organizerHint'), icon: <CalendarIcon className="size-5" /> },
  ];

  return (
    <AuthShell>
      <header className="flex flex-col gap-2 text-start">
        <h1 className="type-h1 text-text">{t('title')}</h1>
        <p className="text-base text-text-muted">{t('subtitle')}</p>
      </header>

      <Card>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          {error ? <FormMessage kind="error">{error}</FormMessage> : null}

          {/* Two real radio buttons, drawn as selectable tiles. The chosen one takes the
              primary colour; keyboard focus shows the same ring as every other control. */}
          <fieldset className="flex flex-col gap-1.5 text-start">
            <legend className={`mb-1.5 ${LABEL}`}>{t('accountType')}</legend>
            <div className="grid grid-cols-2 gap-3">
              {options.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer flex-col gap-2 rounded-lg border border-border bg-surface p-3 transition-colors duration-150 hover:border-primary/40 has-[:checked]:border-primary has-[:checked]:bg-primary-light has-[:disabled]:cursor-not-allowed has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary"
                >
                  <input
                    type="radio"
                    name="role"
                    value={option.value}
                    checked={role === option.value}
                    onChange={() => setRole(option.value)}
                    disabled={submitting}
                    className="sr-only"
                  />
                  <span className="flex items-center gap-2 text-sm font-bold text-primary-dark">
                    <span aria-hidden className="text-primary">
                      {option.icon}
                    </span>
                    {option.label}
                  </span>
                  <span className="text-xs text-text-muted">{option.hint}</span>
                </label>
              ))}
            </div>
          </fieldset>

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

          {isOrganizer ? (
            <>
              <FormField
                id="phone"
                label={t('phone')}
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={setPhone}
                autoComplete="tel"
                hint={t('phoneHint')}
                error={fieldError.phone}
                ltrValue
                disabled={submitting}
                required
              />
              <FormField
                id="organization"
                label={t('organization')}
                value={organization}
                onChange={setOrganization}
                autoComplete="organization"
                hint={t('organizationHint')}
                error={fieldError.organization}
                maxLength={120}
                disabled={submitting}
              />
              <p className="rounded-lg bg-background px-3 py-2.5 text-start text-sm text-text-muted">
                {t('organizerNote')}
              </p>
            </>
          ) : null}

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
