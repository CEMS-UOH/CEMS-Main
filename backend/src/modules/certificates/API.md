# Certificates API: attendance certificates

| Method and path | Auth | Success `data` |
|---|---|---|
| `GET /api/certificates/:id` | **public** | `{ certificate: Certificate }` |

```ts
type Certificate = {
  id: string;            // the booking id - also the certificate number
  attendeeName: string;
  eventTitle: string;
  category: string;
  venue: string | null;
  startsAt: string; endsAt: string;
  issuedBy: string;      // the organizer's club/department, else their name
  attendedAt: string;    // when they were checked in at the door
};
```

- A certificate exists for a booking that was **checked in at the door** (FR-14), still
  confirmed, at an event that is still approved. Anything else is `404 CERTIFICATE_NOT_FOUND`
  (one answer for every case, so nothing about the booking leaks).
- Public on purpose: the certificate's link and the QR printed on it let anyone confirm it is
  genuine. The id is the booking's random UUID, so certificates cannot be listed or guessed.
  No email, QR token or other personal data beyond the attendee's name is returned.
