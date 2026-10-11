'use client';

// FR-21: send one announcement to every active user. It cannot be recalled, so sending is
// a two-step action. Calls POST /api/admin/broadcast.
import { useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import Card from '@/components/Card';
import FormMessage from '@/components/FormMessage';
import Button from '@/components/Button';
import { TextAreaField, TextField } from '../../../_dashboard/ui/Field';
import PageHeader from '../../../_dashboard/ui/PageHeader';
import { useDashboardError } from '../../../_dashboard/lib/useDashboardError';
import { sendBroadcast } from '../../_lib/admin-api';

const MAX_TITLE = 200;
const MAX_BODY = 2000;

export default function AdminBroadcastPage() {
  const t = useTranslations('Admin.broadcast');
  const tCommon = useTranslations('Dashboard');
  const format = useFormatter();
  const errorMessage = useDashboardError();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [errors, setErrors] = useState<{ title?: string; body?: string }>({});
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  /** Step 1: validate, then ask. Nothing is sent yet. */
  function onReview(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);

    const problems: typeof errors = {};
    if (!title.trim()) problems.title = tCommon('required');
    if (!body.trim()) problems.body = tCommon('required');
    setErrors(problems);

    if (problems.title) document.getElementById('broadcast-title')?.focus();
    else if (problems.body) document.getElementById('broadcast-body')?.focus();
    else setConfirming(true);
  }

  /** Step 2: actually send. */
  async function onSend() {
    setSending(true);
    const result = await sendBroadcast({ title: title.trim(), body: body.trim() });
    setSending(false);
    setConfirming(false);

    if (!result.ok) {
      setNotice({ kind: 'error', text: errorMessage(result.code) });
      return;
    }
    setNotice({ kind: 'success', text: t('sent', { count: format.number(result.data.notified) }) });
    setTitle('');
    setBody('');
  }

  const locked = confirming || sending;

  return (
    <>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      {notice ? <FormMessage kind={notice.kind}>{notice.text}</FormMessage> : null}

      <Card className="max-w-2xl">
        <form onSubmit={onReview} noValidate className="flex flex-col gap-4">
          <TextField
            id="broadcast-title"
            label={t('titleLabel')}
            value={title}
            onChange={setTitle}
            error={errors.title}
            maxLength={MAX_TITLE}
            disabled={locked}
            required
          />
          <TextAreaField
            id="broadcast-body"
            label={t('bodyLabel')}
            value={body}
            onChange={setBody}
            error={errors.body}
            maxLength={MAX_BODY}
            rows={6}
            disabled={locked}
            required
          />

          {confirming ? (
            <div
              role="group"
              aria-label={t('confirm')}
              className="flex flex-col gap-3 border-t border-border pt-4"
            >
              <p className="text-start text-sm font-medium text-text">{t('confirm')}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" disabled={sending} onClick={onSend}>
                  {sending ? t('sending') : t('confirmSend')}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={sending}
                  onClick={() => setConfirming(false)}
                >
                  {tCommon('cancel')}
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <Button type="submit">{t('send')}</Button>
            </div>
          )}
        </form>
      </Card>
    </>
  );
}
