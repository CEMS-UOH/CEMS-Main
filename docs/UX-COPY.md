# UX Copy

**Owner:** Role 7. **Used by:** Role 4 and Role 5, who add the strings to `frontend/messages/ar.json` and `en.json`.

Wording for messages the API can return, so the same situation reads the same everywhere.
Rules: short, plain, tell the user what happened and what they can do. No blame, no technical words.
Arabic is Modern Standard Arabic, matching the existing `Errors` strings.

## 1. Attendee API errors (FR-03..FR-09)

Codes from `backend/src/modules/attendee/API.md`. Add under the `Errors` namespace.

| Code | Arabic | English |
|---|---|---|
| `INVALID_FILTER` | عامل التصفية غير صالح. امسح التصفية وحاول مرة أخرى. | That filter isn't valid. Clear the filters and try again. |
| `INVALID_PAGINATION` | تعذّر تحميل هذه الصفحة من النتائج. حاول مرة أخرى. | Couldn't load this page of results. Try again. |
| `EVENT_NOT_FOUND` | هذه الفعالية غير متاحة. ربما حُذفت أو لم تُعتمد بعد. | This event isn't available. It may have been removed or not approved yet. |
| `ALREADY_BOOKED` | لديك حجز في هذه الفعالية بالفعل. | You already have a booking for this event. |
| `EVENT_FULL` | اكتمل عدد المقاعد في هذه الفعالية. | This event is full. |
| `BOOKING_CLOSED` | انتهى الحجز لأن الفعالية بدأت. | Booking is closed because the event has started. |
| `BOOKING_NOT_FOUND` | لم نجد هذا الحجز. | We couldn't find this booking. |
| `ALREADY_CANCELLED` | هذا الحجز ملغى بالفعل. | This booking is already cancelled. |
| `CANCELLATION_CLOSED` | لا يمكن إلغاء الحجز بعد بدء الفعالية. | You can't cancel after the event has started. |

Ready to paste:

```json
"INVALID_FILTER": "عامل التصفية غير صالح. امسح التصفية وحاول مرة أخرى.",
"INVALID_PAGINATION": "تعذّر تحميل هذه الصفحة من النتائج. حاول مرة أخرى.",
"EVENT_NOT_FOUND": "هذه الفعالية غير متاحة. ربما حُذفت أو لم تُعتمد بعد.",
"ALREADY_BOOKED": "لديك حجز في هذه الفعالية بالفعل.",
"EVENT_FULL": "اكتمل عدد المقاعد في هذه الفعالية.",
"BOOKING_CLOSED": "انتهى الحجز لأن الفعالية بدأت.",
"BOOKING_NOT_FOUND": "لم نجد هذا الحجز.",
"ALREADY_CANCELLED": "هذا الحجز ملغى بالفعل.",
"CANCELLATION_CLOSED": "لا يمكن إلغاء الحجز بعد بدء الفعالية."
```

```json
"INVALID_FILTER": "That filter isn't valid. Clear the filters and try again.",
"INVALID_PAGINATION": "Couldn't load this page of results. Try again.",
"EVENT_NOT_FOUND": "This event isn't available. It may have been removed or not approved yet.",
"ALREADY_BOOKED": "You already have a booking for this event.",
"EVENT_FULL": "This event is full.",
"BOOKING_CLOSED": "Booking is closed because the event has started.",
"BOOKING_NOT_FOUND": "We couldn't find this booking.",
"ALREADY_CANCELLED": "This booking is already cancelled.",
"CANCELLATION_CLOSED": "You can't cancel after the event has started."
```

## 2. Notification titles by type

The API says to render a notification by its `type` in the reader's language (its `title` is the event title).

| `type` | Arabic | English |
|---|---|---|
| `BOOKING_CONFIRMATION` | تم تأكيد حجزك | Booking confirmed |
| `CAPACITY_FULL` | اكتملت سعة فعاليتك | Your event is full |
| `BROADCAST` | إعلان | Announcement |
| `SYSTEM` | تنبيه | Notice |

## 3. Booking and event states (badges)

| State | Source | Arabic | English | Badge color |
|---|---|---|---|---|
| Upcoming booking | `status = CONFIRMED`, event not started | قادم | Upcoming | teal |
| Attended | `checkedInAt` set | حضرت | Attended | success |
| Cancelled by the Attendee | `status = CANCELLED` | ألغيت الحجز | You cancelled | neutral |
| Cancelled by the Organizer | `event.status = CANCELLED` | ألغاها المنظم | Cancelled by organizer | danger |
| Open | `seatsLeft / capacity` > 25% | متاح | Open | success |
| Almost full | 1–25% seats left | شبه ممتلئ | Almost full | warning |
| Full | `isFull` | ممتلئ | Full | danger |

Show the **Cancel booking** button only when the API sends `canCancel: true`.

## 4. Filters (FR-04)

The events API filters by **category**, **venue** and **one day** (`date=YYYY-MM-DD`). There is no text search and no
date range, so the feed shows category chips, a venue list and a single date picker with an "All dates" reset.
If the team wants a search box or "this week", Role 2 has to add it to the API first.
