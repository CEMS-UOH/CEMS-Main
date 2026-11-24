'use client';

// An attendance certificate, for a seat that was checked in at the door (FR-14).
// Calls GET /api/certificates/:id - public on purpose: this same page is where the QR printed
// on the certificate leads, so anyone (an employer, a department) can confirm it is genuine.
//
// Designed as an A4 landscape sheet. On screen it sits on the page with a small toolbar; in
// print (or "Save as PDF") only the sheet is printed, edge to edge.
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import Button from '@/components/Button';
import { AwardIcon, BackIcon, CheckIcon } from '@/components/Icons';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { FRAME, TEXT_LINK } from '@/components/styles';
import { Link } from '@/i18n/navigation';
import { useApiError } from '@/lib/useApiError';
import { getCertificate, type Certificate } from '../../(attendee)/_lib/attendee-api';
import { useQuery } from '../../(attendee)/_lib/useQuery';
import QrCode from '../../(attendee)/_ui/QrCode';
import { CAMPUS_TIME_ZONE } from '../../_dashboard/lib/campusTime';

export default function CertificatePage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations('Certificate');
  const errorMessage = useApiError();
  const query = useQuery(`certificate:${id}`, () => getCertificate(id));

  return (
    <div className="min-h-screen bg-background print:bg-white">
      {/* The paper size for print: A4 landscape, no browser margins. */}
      <style>{'@page { size: A4 landscape; margin: 0; }'}</style>

      <div className={`${FRAME} flex flex-col gap-6 py-8 print:max-w-none print:p-0`}>
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link href="/bookings" className={`flex w-fit items-center gap-1.5 text-sm ${TEXT_LINK}`}>
            <BackIcon />
            {t('back')}
          </Link>
          {query.data ? <Toolbar /> : null}
        </div>

        {query.loading ? (
          <LoadingState label={t('loading')} variant="spinner" />
        ) : query.errorCode === 'CERTIFICATE_NOT_FOUND' ? (
          <EmptyState icon={<AwardIcon className="size-6" />} title={t('notFoundTitle')} body={t('notFoundBody')} />
        ) : query.errorCode || !query.data ? (
          <ErrorState message={errorMessage(query.errorCode ?? 'UNKNOWN')} retryLabel={t('retry')} onRetry={query.reload} />
        ) : (
          <Sheet certificate={query.data.certificate} />
        )}
      </div>
    </div>
  );
}

function Toolbar() {
  const t = useTranslations('Certificate');
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // No clipboard access (old browser, blocked): the address bar still has the link.
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="secondary" size="sm" onClick={copyLink} icon={copied ? <CheckIcon /> : undefined}>
        {copied ? t('copied') : t('copyLink')}
      </Button>
      <Button type="button" size="sm" icon={<AwardIcon />} onClick={() => window.print()}>
        {t('print')}
      </Button>
    </div>
  );
}

function Sheet({ certificate: c }: { certificate: Certificate }) {
  const t = useTranslations('Certificate');
  const tHome = useTranslations('Home');
  const format = useFormatter();
  const locale = useLocale();
  const [verifyUrl, setVerifyUrl] = useState('');

  // The QR leads back to this page; built in the browser so it carries the real address.
  useEffect(() => setVerifyUrl(window.location.href.split('#')[0]), []);

  const day = format.dateTime(new Date(c.startsAt), { dateStyle: 'full', timeZone: CAMPUS_TIME_ZONE });
  const number = c.id.slice(0, 8).toUpperCase();

  return (
    <article
      aria-label={t('sheetLabel', { name: c.attendeeName })}
      className="theme-light relative mx-auto w-full max-w-5xl animate-fade-in rounded-lg bg-white shadow-[var(--shadow-card-hover)] print:max-w-none print:rounded-none print:shadow-none sm:aspect-[297/210] print:h-screen print:aspect-auto"
    >
      {/* Two fine frames: green outside, gold inside - the university's colours, drawn thin. */}
      <div aria-hidden className="pointer-events-none absolute inset-3 rounded-md border border-primary/40 sm:inset-5" />
      <div aria-hidden className="pointer-events-none absolute inset-5 rounded-sm border border-accent/60 sm:inset-8" />

      {/* The sheet keeps A4 proportions but grows if a long name or title needs the room. */}
      <div className="relative flex h-full flex-col items-center justify-between gap-6 px-8 py-12 text-center sm:px-20 sm:py-12">
        <header className="flex flex-col items-center gap-2">
          <span className="block size-12 overflow-hidden">
            <Image
              src="/logo.webp"
              alt=""
              width={56}
              height={56}
              unoptimized
              className="size-full origin-[47.8%_48.1%] translate-x-[2.2%] translate-y-[1.9%] scale-[1.35]"
            />
          </span>
          <p className="text-sm font-medium text-text-muted">{tHome('title')}</p>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success-light px-3 py-1 text-xs font-bold text-success print:hidden">
            <CheckIcon className="size-3.5" />
            {t('verified')}
          </span>
        </header>

        <div className="flex max-w-3xl flex-col items-center gap-3">
          <h1 className="text-[clamp(2rem,1.2rem+3vw,3.5rem)] leading-tight font-bold text-primary-dark">
            {t('title')}
          </h1>
          <span aria-hidden className="h-px w-24 bg-accent" />
          <p className="text-base text-text-muted sm:text-lg">{t('certifies', { issuer: c.issuedBy })}</p>
          <p className="text-[clamp(1.75rem,1rem+2.6vw,3rem)] leading-tight font-bold text-text [overflow-wrap:anywhere]">
            {c.attendeeName}
          </p>
          <p className="text-base text-text-muted sm:text-lg">{t('attended')}</p>
          <p className="text-xl font-bold text-primary-dark sm:text-2xl [overflow-wrap:anywhere]">
            <bdi>{c.eventTitle}</bdi>
          </p>
          <p className="text-sm text-text-muted sm:text-base">
            {c.venue ? t('whenWhere', { date: day, venue: c.venue }) : day}
          </p>
        </div>

        <footer className="grid w-full grid-cols-1 items-end gap-6 text-sm sm:grid-cols-3">
          <div className="flex flex-col items-center gap-1 sm:items-start sm:text-start">
            <span className="text-xs text-text-muted">{t('issuedBy')}</span>
            <span className="font-bold text-text [overflow-wrap:anywhere]">{c.issuedBy}</span>
            <span className="h-px w-32 bg-border" />
            <span className="text-xs text-text-muted">{c.category}</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs text-text-muted">{t('number')}</span>
            <span dir="ltr" className="font-mono text-sm font-bold tracking-widest text-text">
              {number}
            </span>
            <span className="text-xs text-text-muted">
              {t('attendedAt', {
                time: format.dateTime(new Date(c.attendedAt), { dateStyle: 'medium', timeStyle: 'short', timeZone: CAMPUS_TIME_ZONE }),
              })}
            </span>
          </div>
          <div className="flex flex-col items-center gap-1.5 sm:items-end">
            {verifyUrl ? (
              <QrCode value={verifyUrl} label={t('qrLabel')} className="size-16 rounded-sm" />
            ) : (
              <span className="size-16" />
            )}
            <span className="text-xs text-text-muted" lang={locale}>
              {t('scanToVerify')}
            </span>
          </div>
        </footer>
      </div>
    </article>
  );
}
