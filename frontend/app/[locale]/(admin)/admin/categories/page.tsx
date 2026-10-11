'use client';

// FR-19: event categories. A category that events still use cannot be deleted - the API
// answers CATEGORY_HAS_EVENTS, and the list shows the usage count so that is no surprise.
// Calls GET/POST /api/admin/categories and PATCH/DELETE /api/admin/categories/:id.
import { useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import Card from '@/components/Card';
import FormMessage from '@/components/FormMessage';
import Button from '@/components/Button';
import { PlusIcon } from '@/components/Icons';
import ConfirmAction from '../../../_dashboard/ui/ConfirmAction';
import { TextField } from '@/components/FormField';
import PageHeader from '@/components/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../../../_dashboard/ui/States';
import type { AdminCategory } from '../../../_dashboard/lib/types';
import { useApiQuery } from '../../../_dashboard/lib/useApiQuery';
import { useDashboardError } from '../../../_dashboard/lib/useDashboardError';
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from '../../_lib/admin-api';

const MAX_NAME = 100;
const MAX_DESCRIPTION = 1000;

type Notice = { kind: 'success' | 'error'; text: string };

export default function AdminCategoriesPage() {
  const t = useTranslations('Admin.categories');
  const tCommon = useTranslations('Dashboard');
  const format = useFormatter();
  const errorMessage = useDashboardError();

  const list = useApiQuery('admin-categories', listCategories);
  const [notice, setNotice] = useState<Notice | null>(null);

  // --- add ---
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  // --- edit one row in place ---
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);
    const cleanName = name.trim();
    if (!cleanName) {
      setNameError(tCommon('required'));
      document.getElementById('category-name')?.focus();
      return;
    }
    setNameError(null);

    setAdding(true);
    const result = await createCategory({
      name: cleanName,
      description: description.trim() || undefined,
    });
    setAdding(false);

    if (!result.ok) {
      const message = errorMessage(result.code);
      if (result.code === 'CATEGORY_NAME_TAKEN') setNameError(message);
      else setNotice({ kind: 'error', text: message });
      return;
    }
    setName('');
    setDescription('');
    setNotice({ kind: 'success', text: t('created') });
    list.reload();
  }

  function startEdit(category: AdminCategory) {
    setEditingId(category.id);
    setEditName(category.name);
    setEditDescription(category.description ?? '');
    setEditError(null);
  }

  async function onSaveEdit(e: React.FormEvent, category: AdminCategory) {
    e.preventDefault();
    setNotice(null);
    const cleanName = editName.trim();
    if (!cleanName) {
      setEditError(tCommon('required'));
      return;
    }

    setSavingEdit(true);
    const result = await updateCategory(category.id, {
      name: cleanName,
      description: editDescription.trim() || null,
    });
    setSavingEdit(false);

    if (!result.ok) {
      setEditError(errorMessage(result.code));
      return;
    }
    setEditingId(null);
    setNotice({ kind: 'success', text: t('updated') });
    list.reload();
  }

  async function onDelete(category: AdminCategory) {
    setNotice(null);
    setDeletingId(category.id);
    const result = await deleteCategory(category.id);
    setDeletingId(null);

    if (!result.ok) {
      setNotice({ kind: 'error', text: errorMessage(result.code) });
      if (result.code === 'CATEGORY_HAS_EVENTS') list.reload(); // the count we showed was stale
      return;
    }
    setNotice({ kind: 'success', text: t('deleted') });
    list.reload();
  }

  return (
    <>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <Card>
        <form onSubmit={onAdd} noValidate className="flex flex-col gap-4">
          <h2 className="type-h2 text-start text-text">{t('addTitle')}</h2>
          <div className="grid items-start gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <TextField
              id="category-name"
              label={t('name')}
              value={name}
              onChange={setName}
              error={nameError}
              maxLength={MAX_NAME}
              disabled={adding}
              required
            />
            <TextField
              id="category-description"
              label={t('description')}
              value={description}
              onChange={setDescription}
              maxLength={MAX_DESCRIPTION}
              disabled={adding}
            />
          </div>
          <div>
            <Button type="submit" icon={<PlusIcon />} loading={adding}>
              {adding ? tCommon('saving') : t('add')}
            </Button>
          </div>
        </form>
      </Card>

      {notice ? <FormMessage kind={notice.kind}>{notice.text}</FormMessage> : null}

      {list.loading ? (
        <LoadingState />
      ) : list.errorCode || !list.data ? (
        <ErrorState code={list.errorCode ?? 'UNKNOWN'} onRetry={list.reload} />
      ) : list.data.categories.length === 0 ? (
        <EmptyState title={t('empty')} />
      ) : (
        <Card padded={false} aria-busy={list.refreshing} className="overflow-hidden text-start">
          <ul className={`divide-y divide-border ${list.refreshing ? 'opacity-60' : ''}`}>
            {list.data.categories.map((category) =>
              editingId === category.id ? (
                <li key={category.id} className="px-5 py-4 sm:px-6">
                  <form
                    onSubmit={(e) => onSaveEdit(e, category)}
                    noValidate
                    className="flex flex-col gap-4"
                  >
                    <div className="grid items-start gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                      <TextField
                        id={`edit-name-${category.id}`}
                        label={t('name')}
                        value={editName}
                        onChange={setEditName}
                        error={editError}
                        maxLength={MAX_NAME}
                        disabled={savingEdit}
                        required
                      />
                      <TextField
                        id={`edit-description-${category.id}`}
                        label={t('description')}
                        value={editDescription}
                        onChange={setEditDescription}
                        maxLength={MAX_DESCRIPTION}
                        disabled={savingEdit}
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="submit" size="sm" loading={savingEdit}>
                        {savingEdit ? tCommon('saving') : tCommon('save')}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={savingEdit}
                        onClick={() => setEditingId(null)}
                      >
                        {tCommon('cancel')}
                      </Button>
                    </div>
                  </form>
                </li>
              ) : (
                <li
                  key={category.id}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-5 py-4 sm:px-6"
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="text-sm font-medium text-text [overflow-wrap:anywhere]">
                      {category.name}
                    </span>
                    {category.description ? (
                      <span className="text-sm text-text-muted [overflow-wrap:anywhere]">
                        {category.description}
                      </span>
                    ) : null}
                    <span className="text-xs text-text-muted tabular-nums">
                      {t('usedBy', { count: format.number(category.eventCount) })}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="secondary" size="sm" onClick={() => startEdit(category)}>
                      {tCommon('edit')}
                    </Button>
                    {category.eventCount > 0 ? (
                      <span className="text-xs text-text-muted">{t('inUse')}</span>
                    ) : (
                      <ConfirmAction
                        label={tCommon('delete')}
                        question={t('deleteConfirm')}
                        confirmLabel={tCommon('confirmDelete')}
                        busyLabel={tCommon('deleting')}
                        busy={deletingId === category.id}
                        onConfirm={() => onDelete(category)}
                      />
                    )}
                  </div>
                </li>
              )
            )}
          </ul>
        </Card>
      )}
    </>
  );
}
