'use client';

// The account corner of the home page header. A visitor sees "Log in" and "Create account";
// someone already signed in sees a single button to their own area instead. The session is an
// httpOnly cookie on the API's origin, so the only way to know is to ask the API - until it
// answers, the visitor buttons are shown (the common case, and no layout jump for guests).
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Button from '@/components/Button';
import { GridIcon, UserIcon } from '@/components/Icons';
import { getMe, type PublicUser } from '@/lib/api';
import { HOME_BY_ROLE } from '@/lib/roleHome';

export default function HomeAccount() {
  const t = useTranslations('Home');
  const [user, setUser] = useState<PublicUser | null>(null);

  useEffect(() => {
    let active = true;
    getMe().then((result) => {
      // Any failure (signed out, server down) simply leaves the visitor buttons in place.
      if (active && result.ok) setUser(result.data.user);
    });
    return () => {
      active = false;
    };
  }, []);

  if (user) {
    const isAttendee = user.role === 'ATTENDEE';
    return (
      <Button
        href={HOME_BY_ROLE[user.role]}
        variant="secondary"
        size="sm"
        icon={isAttendee ? <UserIcon /> : <GridIcon />}
      >
        {isAttendee ? t('myAccount') : t('dashboard')}
      </Button>
    );
  }

  return (
    <>
      <Button href="/login" variant="ghost" size="sm">
        {t('login')}
      </Button>
      {/* The hero just below already offers "Create account", so a phone header skips it.
          Hidden by a wrapper: a class on the Button itself would lose to its own display. */}
      <span className="hidden sm:inline-flex">
        <Button href="/register" size="sm">
          {t('register')}
        </Button>
      </span>
    </>
  );
}
