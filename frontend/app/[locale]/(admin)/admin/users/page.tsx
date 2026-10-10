'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import FormMessage from '@/components/FormMessage';
import { useApiError } from '@/lib/useApiError';
import { listAdminUsers, setUserActive } from '../../lib/admin-api';
import type { Role5AdminUser } from '../../lib/role5-contracts';

export default function AdminUsersPage() {
  const t = useTranslations('Role5');
  const tRoles = useTranslations('Roles');
  const errorMessage = useApiError();
  const [users, setUsers] = useState<Role5AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const result = await listAdminUsers();
      if (!active) return;
      if (!result.ok) {
        setError(result.code);
        setLoading(false);
        return;
      }
      setUsers(result.data.users);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  async function onToggle(user: Role5AdminUser) {
    setPendingId(user.id);
    const result = await setUserActive(user.id, !user.isActive);
    setPendingId(null);
    if (!result.ok) {
      setError(result.code);
      return;
    }
    setUsers((current) => current.map((item) => (item.id === user.id ? result.data.user : item)));
  }

  if (loading) return <p className="text-start text-slate-600">{t('common.loading')}</p>;
  if (error) {
    return (
      <FormMessage kind="error">
        {error === 'NOT_FOUND' ? t('errors.NOT_FOUND') : errorMessage(error)}
      </FormMessage>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-start text-2xl font-bold">{t('admin.usersTitle')}</h1>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] border-collapse text-start text-sm">
          <thead>
            <tr className="border-b bg-white">
              <th className="px-3 py-2 font-medium">{t('admin.fullName')}</th>
              <th className="px-3 py-2 font-medium">{t('admin.email')}</th>
              <th className="px-3 py-2 font-medium">{t('admin.role')}</th>
              <th className="px-3 py-2 font-medium">{t('admin.active')}</th>
              <th className="px-3 py-2 font-medium">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b bg-white">
                <td className="px-3 py-2">{user.fullName}</td>
                <td className="px-3 py-2">{user.email}</td>
                <td className="px-3 py-2">{tRoles(user.role)}</td>
                <td className="px-3 py-2">{user.isActive ? t('admin.yes') : t('admin.no')}</td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    disabled={pendingId === user.id}
                    onClick={() => onToggle(user)}
                    className="text-blue-700 underline disabled:opacity-60"
                  >
                    {user.isActive ? t('admin.deactivate') : t('admin.activate')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
