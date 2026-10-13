# Design System

**Owner:** Role 7 (UI/UX). **Source of truth:** the code. Tokens live in `frontend/app/globals.css`, shared components
in `frontend/components`. This file explains them, gives the rules for using them, and records Role 7's accessibility
review. If this file and the code disagree, the code wins and this file gets fixed.

Need a color, size or pattern that is not here? Ask Role 7 and the owners of `frontend/components` (Role 1 + Role 4)
before adding one.

## 1. Colors

Palette taken from the University of Ha'il portal: deep green brand, white surfaces, a gold accent from the crest.
The hex values are read from a screenshot, not the university's official brand kit (open item: get the kit).

| Token (Tailwind class) | Hex | Use |
|---|---|---|
| `primary` | `#1f7a52` | Primary buttons, links, focus ring, active states. |
| `primary-dark` | `#123b2e` | Hover on primary, text on `primary-light`. |
| `primary-light` | `#e6f2ec` | Selected/hover backgrounds, primary badge background. |
| `accent` | `#c9a227` | Gold. Decoration and icons only, **never text** (§5). At most one gold element per screen. |
| `accent-dark` | `#8a6a1a` | Text on `accent-light` (see §5: needs one step darker). |
| `accent-light` | `#f6eed7` | Accent badge background ("3 seats left"). |
| `background` | `#f5f6f6` | Page background. |
| `surface` | `#ffffff` | Cards, inputs, header. |
| `text` | `#1a1f1c` | Body text. |
| `text-muted` | `#5b6560` | Secondary text, labels of meta lines. |
| `border` | `#e3e7e5` | Card and divider lines. |
| `danger` / `danger-light` | `#b3261e` / `#fbecea` | Errors, delete, cancel. |
| `success` / `success-light` | `#1f7a52` / `#e6f2ec` | Confirmed, done (same green as primary). |

## 2. Typography

| | Arabic (`dir="rtl"`) | English (`dir="ltr"`) |
|---|---|---|
| Font | Tajawal (matches the university portal) | Plus Jakarta Sans |
| Display weight | 500 (heavier cuts fill in at large sizes) | 800 |
| Letter spacing | 0 always (tracking breaks Arabic joins) | tight on headings |
| Line height | taller, to clear the diacritics | standard |

Use the named sizes, never a one-off `text-*`: `type-display` (home headline only), `type-h1` (page title),
`type-h2` (section), `type-h3` (card or list title), `type-eyebrow` (small label above a title),
`text-base` (body), `text-sm` (secondary/UI), `text-xs` (captions, field labels).
`globals.css` switches the font and the numbers by `html[dir]`; components never set a font.

## 3. Shape, spacing, motion

- Radius: `rounded-lg` everywhere; `rounded-full` only for badges.
- Shadow: `shadow-card`, `shadow-card-hover` on interactive cards and primary buttons.
- Page width: `FRAME` (max-w-6xl), `FRAME_NARROW` for single forms, `FRAME_WIDE` for the home page (`components/styles.ts`).
- Motion: one entrance (`animate-rise`) and one easing. Nothing bounces or loops except the loading spinner.
  `prefers-reduced-motion` turns the entrance off.

## 4. Components

Use these; do not restyle them per screen.

| Component | File | Rules |
|---|---|---|
| Button | `Button.tsx` | Variants `primary`, `secondary`, `ghost`, `danger`; sizes `sm` (36px), `md` (44px), `lg` (48px). Pass `href` for navigation, nothing for actions. `loading` shows a spinner and blocks double clicks. One `primary` per area. |
| Badge | `Badge.tsx` | Tones `primary`, `success`, `danger`, `accent`, `neutral`, `muted`. The label carries the meaning; color only reinforces it. |
| Card | `Card.tsx` | `interactive` for clickable cards (hover lift + shadow). |
| Form fields | `FormField.tsx` | `TextField`, `TextAreaField`, `SelectField`. 44px tall, label above, error below, `aria-invalid` turns the border red. |
| Form message | `FormMessage.tsx` | Success or error banner at the top of a form. |
| Page header | `PageHeader.tsx` | Eyebrow, title, subtitle, actions on the end side. |
| States | `States.tsx` | `LoadingState`, `EmptyState` (icon, sentence, next action), `ErrorState` (message + retry). Every screen that loads data uses all three. |
| Icons | `Icons.tsx` | 24px line icons. Directional ones (`BackIcon`, `ForwardIcon`) must flip in RTL. No emoji in the UI. |
| Pagination | `Pagination.tsx` | Lists longer than one page. |

Focus: every interactive element shows `FOCUS_RING` (2px `primary` outline) on keyboard focus only.

## 5. Accessibility review (WCAG 2.1 AA, NFR-16)

Role 7 checked every text/background pair the components use. Measured contrast:

| Pair | Ratio | Needs | Result |
|---|---|---|---|
| White on `primary` (primary button) | 5.30 | 4.5 | Pass |
| `primary` on white (links, secondary button) | 5.30 | 4.5 | Pass |
| `primary` on `background` | 4.89 | 4.5 | Pass |
| `text` on `background` | 15.43 | 4.5 | Pass |
| `text-muted` on white / on `background` | 6.04 / 5.58 | 4.5 | Pass |
| White on `danger` | 6.54 | 4.5 | Pass |
| `danger` on `danger-light` (badge) | 5.69 | 4.5 | Pass |
| `success` on `success-light` (badge) | 4.61 | 4.5 | Pass, just |
| `accent-dark` on `accent-light` (badge) | **4.36** | 4.5 | **Fail** |
| `accent` (gold) on white as text | **2.42** | 4.5 | **Fail** (fine for icons and decoration) |
| Input border (`border`) on white | **1.25** | 3.0 | **Fail**: the field outline is hard to see |
| Placeholder (`text-muted` at 70%) on white | about 3.1 | 4.5 | Weak; acceptable only because every field has a visible label |

Recommended fixes, for the owners of `globals.css` and `components` (Role 1 + Role 4) to decide:

1. `accent-dark`: `#8a6a1a` → `#785b16` (5.48:1 on `accent-light`). Same look, passes.
2. Never use `accent` as a text color. Keep it for icons, borders and decoration.
3. Input borders: give `CONTROL_BASE` its own darker border, e.g. `#86908b` (3.29:1), and keep `border` for cards
   and dividers.

## 6. Status mapping

As implemented in `_dashboard/ui/StatusBadges.tsx` (Organizer, Admin) and `(attendee)/_ui/Badges.tsx`:

| Meaning | Badge tone | Where |
|---|---|---|
| Event pending approval | `neutral` | Dashboards |
| Event approved | `success` | Dashboards |
| Event rejected | `danger` | Dashboards |
| Event cancelled | `muted` | Dashboards |
| Booking confirmed | `success` in dashboards, **`primary` for the Attendee** | Both |
| Attended (checked in) | `success` | Attendee |
| Event cancelled by the organizer | `danger` | Attendee |
| Booking cancelled by the attendee | `muted` | Attendee |
| Event full | `danger` | Attendee |
| Few seats left | `accent` (the one gold element on the screen) | Attendee |
| Category | `primary` | Attendee |

**Inconsistency to settle (Role 4 + Role 5):** a confirmed booking is green (`success`) in the dashboards and
`primary` for the Attendee. They look almost the same today (same background `#e6f2ec`), but the text is
`primary-dark` in one and `success` in the other, and they will drift apart if either color changes. Pick one tone for "confirmed" and use it in both places; Role 7 suggests `success`.

## 7. Layout, RTL and language

- Arabic RTL is the default, English LTR second. The language switcher is on every screen.
- Tailwind logical classes only: `ms-` `me-` `ps-` `pe-` `start-` `end-` `text-start` `text-end`
  (`CLAUDE.md` rule 8). Never `ml-` `mr-` `left-` `right-`.
- Text people type (event titles, descriptions, names) can be in either language: show it with `dir="auto"` so it
  aligns by its own language inside the other UI.
- Numbers, dates and times: format with the active locale (next-intl), never hand-built strings.
- Every UI string comes from `frontend/messages/{ar,en}.json` (`CLAUDE.md` rule 7). Wording rules: `docs/UX-COPY.md`.
