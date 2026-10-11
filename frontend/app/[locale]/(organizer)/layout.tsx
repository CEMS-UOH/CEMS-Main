import Role5Shell from '../(admin)/ui/Role5Shell';

export default function OrganizerLayout({ children }: { children: React.ReactNode }) {
  return <Role5Shell allowedRole="ORGANIZER">{children}</Role5Shell>;
}
