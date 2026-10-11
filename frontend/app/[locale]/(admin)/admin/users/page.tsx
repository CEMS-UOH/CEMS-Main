'use client';

// FR-18 (manage users) and the user half of FR-22 (permanent delete).
// Calls GET /api/admin/users, POST /api/admin/users,
// POST /api/admin/users/:id/activate|deactivate|role, DELETE /api/admin/users/:id.
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Card from '@/components/Card';
import FormMessage from '@/components/FormMessage';
import type { ApiResult, PublicUser } from '@/lib/api';
import Button from '@/components/Button';
import { useDashboardUser } from '../../../_dashboard/ui/DashboardShell';
import { SelectField, TextField } from '../../../_dashboard/ui/Field';
import PageHeader from '../../../_dashboard/ui/PageHeader';
import Pagination from '../../../_dashboard/ui/Pagination';
import { EmptyState, ErrorState, LoadingState } from '../../../_dashboard/ui/States';
import { USER_ROLES, type UserRole } from '../../../_dashboard/lib/types';
import { useApiQuery } from '../../../_dashboard/lib/useApiQuery';
import { useDashboardError } from '../../../_dashboard/lib/useDashboardError';
import {
  changeUserRole,
  createUser,
  deleteUser,
  listUsers,
  setUserActive,
} from '../../_lib/admin-api';
import UserRow, { USER_ROW, type UserAction } from '../../_ui/UserRow';

const PAGE_SIZE = 20;
const MIN_PASSWORD = 8;
const MAX_NAME = 120;
// Same pragmatic shape the backend checks (backend/src/lib/validate.js); the API decides.
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

type Notice = { kind: 'success' | 'error'; text: string };
type CreatableRole = 'ORGANIZER' | 'ADMIN';

export default function AdminUsersPage() {
  const t = useTranslations('Admin.users');
  const tCommon = useTranslations('Dashboard');
  const tRoles = useTranslations('Roles');
  const errorMessage = useDashboardError();
  const me = useDashboardUser();

  // --- list, search and filter ---
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<UserRole | ''>('');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState<{ id: string; action: UserAction } | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const list = useApiQuery(`admin-users:${role}:${search}:${page}`, () =>
    listUsers({ role, q: search, page, limit: PAGE_SIZE })
  );

  /** Runs one row action and reports it the same way for all three. */
  async function runAction(
    user: PublicUser,
    action: UserAction,
    request: () => Promise<ApiResult<unknown>>,
    successText: string
  ) {
    setNotice(null);
    setBusy({ id: user.id, action });
    const result = await request();
    setBusy(null);

    if (!result.ok) {
      setNotice({ kind: 'error', text: errorMessage(result.code) });
      return;
    }
    setNotice({ kind: 'success', text: successText });
    if (action === 'delete' && list.data && list.data.users.length === 1 && page > 1) {
      setPage(page - 1);
    } else {
      list.reload();
    }
  }

  // --- create account ---
  const [formOpen, setFormOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newRole, setNewRole] = useState<CreatableRole>('ORGANIZER');
  const [fieldErrors, setFieldErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const problems: typeof fieldErrors = {};
    const cleanName = fullName.trim();
    const cleanEmail = email.trim();
    if (!cleanName) problems.fullName = tCommon('required');
    else if (cleanName.length > MAX_NAME) problems.fullName = t('v.nameLength');
    if (!EMAIL_RE.test(cleanEmail)) problems.email = errorMessage('INVALID_EMAIL');
    if (password.length < MIN_PASSWORD) problems.password = errorMessage('WEAK_PASSWORD');

    setFieldErrors(problems);
    const firstInvalid = (['fullName', 'email', 'password'] as const).find((k) => problems[k]);
    if (firstInvalid) {
      document.getElementById(`new-${firstInvalid}`)?.focus();
      return;
    }

    setCreating(true);
    const result = await createUser({
      fullName: cleanName,
      email: cleanEmail,
      password,
      role: newRole,
    });
    setCreating(false);

    if (!result.ok) {
      setFormError(errorMessage(result.code));
      return;
    }

    setNotice({ kind: 'success', text: t('created', { name: result.data.user.fullName }) });
    setFullName('');
    setEmail('');
    setPassword('');
    setNewRole('ORGANIZER');
    setFormOpen(false);
    list.reload();
  }

  return (
    <>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={
          <Button
            variant={formOpen ? 'secondary' : 'primary'}
            aria-expanded={formOpen}
            aria-controls="create-user-panel"
            onClick={() => setFormOpen((open) => !open)}
          >
            {formOpen ? tCommon('cancel') : t('addUser')}
          </Button>
        }
      />

      {formOpen ? (
        <Card id="create-user-panel">
          <form onSubmit={onCreate} noValidate className="flex flex-col gap-4">
            <h2 className="text-start text-lg font-bold text-text">{t('createTitle')}</h2>
            <p className="text-start text-sm text-text-muted">{t('createHint')}</p>
            {formError ? <FormMessage kind="error">{formError}</FormMessage> : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                id="new-fullName"
                label={t('fullName')}
                value={fullName}
                onChange={setFullName}
                error={fieldErrors.fullName}
                autoComplete="off"
                maxLength={MAX_NAME}
                disabled={creating}
                required
              />
              <TextField
                id="new-email"
                label={t('email')}
                type="email"
                inputMode="email"
                ltrValue
                value={email}
                onChange={setEmail}
                error={fieldErrors.email}
                autoComplete="off"
                disabled={creating}
                required
              />
              <TextField
                id="new-password"
                label={t('password')}
                type="password"
                value={password}
                onChange={setPassword}
                error={fieldErrors.password}
                hint={t('passwordHint')}
                autoComplete="new-password"
                disabled={creating}
                required
              />
              <SelectField
                id="new-role"
                label={t('role')}
                value={newRole}
                onChange={(value) => setNewRole(value as CreatableRole)}
                disabled={creating}
                options={[
                  { value: 'ORGANIZER', label: tRoles('ORGANIZER') },
                  { value: 'ADMIN', label: tRoles('ADMIN') },
                ]}
              />
            </div>

            <div>
              <Button type="submit" disabled={creating}>
                {creating ? tCommon('saving') : t('createSubmit')}
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(searchInput.trim());
          setPage(1);
        }}
        className="grid items-end gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]"
      >
        <TextField
          id="user-search"
          label={t('searchLabel')}
          type="search"
          inputMode="search"
          value={searchInput}
          onChange={setSearchInput}
        />
        <SelectField
          id="role-filter"
          label={t('role')}
          value={role}
          onChange={(value) => {
            setRole(value as UserRole | '');
            setPage(1);
          }}
          options={[
            { value: '', label: tCommon('all') },
            ...USER_ROLES.map((r) => ({ value: r, label: tRoles(r) })),
          ]}
        />
        <Button type="submit" variant="secondary">
          {t('search')}
        </Button>
      </form>

      {notice ? <FormMessage kind={notice.kind}>{notice.text}</FormMessage> : null}

      {list.loading ? (
        <LoadingState />
      ) : list.errorCode || !list.data ? (
        <ErrorState code={list.errorCode ?? 'UNKNOWN'} onRetry={list.reload} />
      ) : list.data.users.length === 0 ? (
        <EmptyState title={t('empty')} />
      ) : (
        <>
          <Card padded={false} aria-busy={list.refreshing} className="overflow-hidden text-start">
            <div
              aria-hidden="true"
              className={`${USER_ROW} hidden border-b border-border bg-background text-xs font-medium text-text-muted lg:grid`}
            >
              <span>{t('colAccount')}</span>
              <span>{t('colStatus')}</span>
              <span>{t('colActions')}</span>
            </div>
            <ul className={`divide-y divide-border ${list.refreshing ? 'opacity-60' : ''}`}>
              {list.data.users.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  isSelf={user.id === me.id}
                  busy={busy?.id === user.id ? busy.action : null}
                  onSetActive={(u, active) =>
                    runAction(
                      u,
                      'active',
                      () => setUserActive(u.id, active),
                      active ? t('activated') : t('deactivated')
                    )
                  }
                  onChangeRole={(u, nextRole) =>
                    runAction(u, 'role', () => changeUserRole(u.id, nextRole), t('roleSaved'))
                  }
                  onDelete={(u) => runAction(u, 'delete', () => deleteUser(u.id), t('deleted'))}
                />
              ))}
            </ul>
          </Card>
          <Pagination
            pagination={list.data.pagination}
            onPageChange={setPage}
            disabled={list.refreshing}
          />
        </>
      )}
    </>
  );
}
