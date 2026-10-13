# UX Copy

**Owner:** Role 7. **Source of truth:** `frontend/messages/ar.json` and `en.json`. Every UI string lives there
(`CLAUDE.md` rule 7); this file is the rulebook for writing them, so the same situation reads the same everywhere.

## 1. Rules

- Say what happened and what the person can do next: "الحجز مغلق لأن الفعالية بدأت بالفعل".
- Short and plain. No blame ("you entered wrong"), no technical words (API, server error 409, null).
- Arabic is Modern Standard Arabic, polite and direct. English is sentence case, no exclamation marks.
- Errors are shown by the API's `code`, translated under `Errors`. Never show the API's English `message` to users.
- A destructive confirmation names the thing and the consequence: "سيتم حذف «…» ولا يمكن التراجع".
- Buttons are verbs: "احجز مقعدًا", "إلغاء الحجز", not "موافق" or "نعم".

## 2. Glossary (use these words, always)

| Concept | Arabic | English | Never |
|---|---|---|---|
| Attendee (role) | حاضر / الحضور | Attendee | طالب، Student (`CLAUDE.md` naming rule) |
| Organizer | منظم | Organizer | |
| Admin | مشرف | Admin | مدير، أدمن |
| Category | فئة | Category | تصنيف (keep one word) |
| Venue | مكان | Venue | |
| Booking / seat | حجز / مقعد | Booking / seat | تذكرة for the booking itself (the ticket is its QR) |
| Event request (pending) | طلب بانتظار الاعتماد | Pending request | |
| Approve / reject | اعتماد / رفض | Approve / reject | قبول |

## 3. Review of the current strings (13 Oct 2026)

Role 7 read all 486 lines of `ar.json` against these rules:

- No use of "طالب" or "Student" anywhere. Pass.
- Role names, category and approval words are consistent across Attendee, Organizer and Admin screens. Pass.
- 37 of the 41 error codes in `backend/src/modules/*/API.md` have Arabic and English strings, including the newer
  ones (`PENDING_LIMIT_REACHED`, `INVALID_PHONE`, `FEEDBACK_NOT_OPEN`). The 4 chatbot codes have none yet; proposed
  wording for whoever builds the chat screen (Role 4):

  | Code | Arabic | English |
  |---|---|---|
  | `INVALID_MESSAGE` | اكتب رسالة لا تتجاوز 2000 حرف | Write a message of up to 2,000 characters |
  | `INVALID_LOCALE` | تعذّر تحديد لغة المحادثة. حدّث الصفحة وحاول مرة أخرى. | Couldn't tell the chat language. Refresh and try again. |
  | `SESSION_NOT_FOUND` | انتهت هذه المحادثة. ابدأ محادثة جديدة. | This chat has ended. Start a new one. |
  | `CHATBOT_UNAVAILABLE` | المساعد غير متاح الآن. حاول بعد قليل. | The assistant isn't available right now. Try again shortly. |
- Minor: `INVALID_FILTER` uses the loanword "الفلتر"; the rest of the UI does not use it. Suggest
  "خيارات التصفية غير صالحة. أعد ضبطها وحاول مرة أخرى." (for Role 4).
- Missing, because the screens do not exist yet: strings for the notification center, QR check-in and the chat
  screen. Role 7 will review them when those screens are built.
