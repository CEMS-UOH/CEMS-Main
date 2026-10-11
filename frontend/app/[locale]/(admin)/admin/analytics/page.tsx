'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import FormMessage from '@/components/FormMessage';
import { useApiError } from '@/lib/useApiError';
import { getAnalytics } from '../../lib/admin-api';
import { mockListCategories, type Role5Analytics } from '../../lib/role5-contracts';

function BarList({
  items,
  value,
}: {
  items: Array<{ label: string; a: number; b?: number }>;
  value: (item: { a: number; b?: number }) => number;
}) {
  const max = Math.max(1, ...items.map((item) => Math.max(item.a, item.b ?? 0, value(item))));
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item.label} className="text-start">
          <p className="mb-1 text-sm">{item.label}</p>
          <div className="flex h-4 overflow-hidden rounded bg-slate-200">
            <span
              className="h-full bg-slate-800"
              style={{ width: `${(item.a / max) * 100}%` }}
            />
            {item.b !== undefined ? (
              <span
                className="h-full bg-slate-400"
                style={{ width: `${(item.b / max) * 100}%` }}
              />
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function AdminAnalyticsPage() {
  const t = useTranslations('Role5');
  const errorMessage = useApiError();
  const categories = mockListCategories().categories;
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [data, setData] = useState<Role5Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load(next = { from, to, categoryId }) {
    setLoading(true);
    const result = await getAnalytics({
      from: next.from || undefined,
      to: next.to || undefined,
      categoryId: next.categoryId || undefined,
    });
    if (!result.ok) {
      setError(result.code);
      setLoading(false);
      return;
    }
    setData(result.data.analytics);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // Initial load only; filters apply on submit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onFilter(e: React.FormEvent) {
    e.preventDefault();
    await load({ from, to, categoryId });
  }

  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-start text-2xl font-bold">{t('analytics.title')}</h1>
      <form onSubmit={onFilter} className="flex flex-col gap-3 rounded border border-slate-200 bg-white p-4 md:flex-row md:flex-wrap md:items-end">
        <label className="flex flex-col gap-1 text-start text-sm">
          {t('analytics.from')}
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-start text-sm">
          {t('analytics.to')}
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-start text-sm">
          {t('event.category')}
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="rounded border border-slate-300 px-3 py-2"
          >
            <option value="">{t('analytics.allCategories')}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-white">
          {t('analytics.apply')}
        </button>
      </form>

      {error ? <FormMessage kind="error">{errorMessage(error)}</FormMessage> : null}
      {loading || !data ? (
        <p className="text-start text-slate-600">{t('common.loading')}</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <article className="rounded border border-slate-200 bg-white p-4">
            <h2 className="mb-2 text-start font-semibold">{t('analytics.attendanceCount')}</h2>
            <p className="text-start text-4xl font-semibold">{data.attendanceCount}</p>
          </article>
          <article className="rounded border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-start font-semibold">{t('analytics.registeredVsCheckedIn')}</h2>
            <p className="mb-2 text-start text-xs text-slate-500">{t('analytics.legend')}</p>
            <BarList
              items={data.registrationsVsCheckins.map((row) => ({
                label: row.title,
                a: row.registered,
                b: row.checkedIn,
              }))}
              value={(item) => item.a}
            />
          </article>
          <article className="rounded border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-start font-semibold">{t('analytics.prediction')}</h2>
            <BarList
              items={data.prediction.map((row) => ({
                label: `${row.title} (${row.predictedAttendance}/${row.capacity})`,
                a: row.predictedAttendance,
              }))}
              value={(item) => item.a}
            />
          </article>
          <article className="rounded border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-start font-semibold">{t('analytics.byCategory')}</h2>
            <BarList
              items={data.byCategory.map((row) => ({
                label: `${row.categoryName} (${row.eventCount})`,
                a: row.attendance,
              }))}
              value={(item) => item.a}
            />
          </article>
        </div>
      )}
    </section>
  );
}
