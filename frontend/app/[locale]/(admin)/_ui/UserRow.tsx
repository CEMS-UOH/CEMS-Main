'use client';

// One account in the admin users list (FR-18, FR-22): role, active state, and the actions.
// The signed-in admin's own row has no actions - the API refuses them (CANNOT_MODIFY_SELF),
// so offering them would only produce an error.
import { useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import type { PublicUser } from '@/lib/api';
import Badge from '@/components/Badge';
import Button from '@/components/Button';
import { TEXT_LINK } from '@/components/styles';
import ConfirmAction from '../../_dashboard/ui/ConfirmAction';
import { SelectField } from '@/components/FormField';
import { DATE_FORMAT } from '../../_dashboard/lib/campusTime';
import { USER_ROLES, type UserRole } from '../../_dashboard/lib/types';

export type UserAction = 'active' | 'role' | 'delete';

export const USER_ROW =
  'grid gap-x-4 gap-y-3 px-5 py-4 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,3fr)_minmax(0,6fr)] lg:items-center';

type Props = {
  user: PublicUser;
  isSelf: boolean;
  /** The action currently running for THIS user, if any. */
  busy: UserAction | null;
  onSetActive: (user: PublicUser, active: boolean) => void;
  onChangeRole: (user: PublicUser, role: UserRole) => void;
  onDelete: (user: PublicUser) => void;
};

export default function UserRow({
  user,
  isSelf,
  busy,
  onSetActive,
  onChangeRole,
  onDelete,
}: Props) {
  const t = useTranslations('Admin.users');
  const tCommon = useTranslations('Dashboard');
  const tRoles = useTranslations('Roles');
  const format = useFormatter();

  // The role chosen in the dropdown but not saved yet. Saving is a separate, explicit click:
  // changing a role straight from a <select> change event is too easy to trigger by accident.
  const [draftRole, setDraftRole] = useState<UserRole>(user.role);
  const isBusy = busy !== null;
  const roleChanged = draftRole !== user.role;

  return (
    <li className={USER_ROW}>
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="min-w-0 text-sm font-medium text-text [overflow-wrap:anywhere]">
            {user.fullName}
          </span>
          {isSelf ? <Badge tone="neutral">{t('you')}</Badge> : null}
        </div>
        <span dir="ltr" className="w-fit max-w-full text-sm text-text-muted [overflow-wrap:anywhere]">
          {user.email}
        </span>
        {/* Contact details a self-registered organizer gave; absent for everyone else. */}
        {user.phone ? (
          <a
            href={`tel:${user.phone}`}
            dir="ltr"
            aria-label={`${tCommon('phone')}: ${user.phone}`}
            className={`w-fit text-sm tabular-nums ${TEXT_LINK}`}
          >
            {user.phone}
          </a>
        ) : null}
        {user.organization ? (
          <span className="text-sm text-text-muted [overflow-wrap:anywhere]">
            {tCommon('organization')}: {user.organization}
          </span>
        ) : null}
        <span className="text-xs text-text-muted">
          {t('joined', { date: format.dateTime(new Date(user.createdAt), DATE_FORMAT) })}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="neutral">{tRoles(user.role)}</Badge>
        <Badge tone={user.isActive ? 'success' : 'muted'}>
          {user.isActive ? t('active') : t('inactive')}
        </Badge>
      </div>

      {isSelf ? (
        <span aria-hidden="true" />
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-36">
            <SelectField
              id={`role-${user.id}`}
              label={t('roleFor', { name: user.fullName })}
              labelHidden
              value={draftRole}
              onChange={(value) => setDraftRole(value as UserRole)}
              disabled={isBusy}
              options={USER_ROLES.map((role) => ({ value: role, label: tRoles(role) }))}
            />
          </div>
          {roleChanged ? (
            <Button
              size="sm"
              loading={busy === 'role'}
              disabled={isBusy}
              onClick={() => onChangeRole(user, draftRole)}
            >
              {busy === 'role' ? tCommon('saving') : t('saveRole')}
            </Button>
          ) : null}
          <Button
            variant="secondary"
            size="sm"
            loading={busy === 'active'}
            disabled={isBusy}
            onClick={() => onSetActive(user, !user.isActive)}
          >
            {user.isActive ? t('deactivate') : t('activate')}
          </Button>
          <ConfirmAction
            label={tCommon('delete')}
            question={t('deleteConfirm')}
            confirmLabel={tCommon('confirmDelete')}
            busyLabel={tCommon('deleting')}
            busy={busy === 'delete'}
            disabled={isBusy}
            onConfirm={() => onDelete(user)}
          />
        </div>
      )}
    </li>
  );
}
