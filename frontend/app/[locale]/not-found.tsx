// "Page not found", in the visitor's language and in the app's own look.
import { useTranslations } from 'next-intl';
import AuthShell from '@/components/AuthShell';
import Button from '@/components/Button';
import { CalendarIcon, CompassIcon } from '@/components/Icons';
import { EmptyState } from '@/components/States';

export default function NotFoundPage() {
  const t = useTranslations('NotFound');

  return (
    <AuthShell>
      <p className="type-eyebrow text-center text-primary">{t('code')}</p>
      <EmptyState
        icon={<CompassIcon className="size-6" />}
        title={t('title')}
        body={t('body')}
        action={
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button href="/">{t('home')}</Button>
            <Button href="/events" variant="secondary" icon={<CalendarIcon />}>
              {t('events')}
            </Button>
          </div>
        }
      />
    </AuthShell>
  );
}
