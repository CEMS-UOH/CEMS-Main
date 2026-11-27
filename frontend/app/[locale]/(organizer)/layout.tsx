'use client';

// Organizer area (FR-10..FR-16). OWNER: Role 5.
import { useTranslations } from 'next-intl';
import { CalendarIcon, PlusIcon } from '@/components/Icons';
import DashboardShell, { type NavItem } from '../_dashboard/ui/DashboardShell';

export default function OrganizerLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('Organizer.nav');

  const nav: NavItem[] = [
    {
      href: '/organizer',
      label: t('events'),
      icon: <CalendarIcon />,
      // Stays active on an event's edit / attendees pages, but not on "New event".
      isActive: (pathname) =>
        pathname === '/organizer' ||
        (pathname.startsWith('/organizer/events/') && pathname !== '/organizer/events/new'),
    },
    { href: '/organizer/events/new', label: t('newEvent'), icon: <PlusIcon /> },
  ];

  return (
    <DashboardShell area="ORGANIZER" nav={nav}>
      {children}
    </DashboardShell>
  );
}
