'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

// Placeholder that proves Frontend -> Backend (and CORS) work end to end. Delete when real screens exist.
export default function ApiStatus() {
  const t = useTranslations('Home');
  const [state, setState] = useState<'checking' | 'up' | 'down'>('checking');

  useEffect(() => {
    const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';
    fetch(`${api}/health`)
      .then((r) => r.json())
      .then((j) => setState(j?.success ? 'up' : 'down'))
      .catch(() => setState('down'));
  }, []);

  const label = state === 'checking' ? t('apiChecking') : state === 'up' ? t('apiUp') : t('apiDown');
  const color = state === 'up' ? 'text-green-700' : state === 'down' ? 'text-red-700' : 'text-slate-500';
  return <p className={color}>{label}</p>;
}
