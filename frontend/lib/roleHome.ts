// Where each role lands after signing in, and where "go to my area" links point.
// One map so the login redirect and the dashboards never disagree.
import type { PublicUser } from './api';

export const HOME_BY_ROLE: Record<PublicUser['role'], string> = {
  ATTENDEE: '/me',
  ORGANIZER: '/organizer',
  ADMIN: '/admin',
};
