// Attendee area: browse events (FR-03, FR-04, FR-09), book and cancel (FR-05, FR-07),
// booking history (FR-08) and event feedback. OWNER: Role 4.
import AttendeeShell from './_ui/AttendeeShell';

export default function AttendeeLayout({ children }: { children: React.ReactNode }) {
  return <AttendeeShell>{children}</AttendeeShell>;
}
