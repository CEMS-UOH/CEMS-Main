'use client';

// Admin area (FR-17..FR-19, FR-21, FR-22). OWNER: Role 5.
import { useTranslations } from 'next-intl';
import DashboardShell, { type NavItem } from '../_dashboard/ui/DashboardShell';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('Admin.nav');

  const nav: NavItem[] = [
    { href: '/admin', label: t('overview'), isActive: (pathname) => pathname === '/admin' },
    { href: '/admin/events', label: t('events') },
    { href: '/admin/users', label: t('users') },
    { href: '/admin/categories', label: t('categories') },
    { href: '/admin/broadcast', label: t('broadcast') },
  ];

  return (
    <DashboardShell area="ADMIN" nav={nav}>
      {children}
    </DashboardShell>
  );
}
