import Role5Shell from './ui/Role5Shell';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <Role5Shell allowedRole="ADMIN">{children}</Role5Shell>;
}
