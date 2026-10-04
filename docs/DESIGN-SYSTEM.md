# Design System

**Owner:** Role 7 (UI/UX). **Used by:** Role 4 (Attendee screens) and Role 5 (Organizer / Admin screens).

One visual language for every screen, taken from the GP1 prototype (*SCEMS_UI_Prototype_17_Screens*, Report Ch. 11).
If a screen needs something this file does not cover, ask Role 7 before inventing a new color, size or pattern.

## 1. Colors

### Brand

| Token | Hex | Use |
|---|---|---|
| `navy` | `#1B2A4A` | Top bar, admin sidebar, page titles, chat header. Structure and authority. |
| `navy-light` | `#253659` | Hover on navy surfaces. |
| `navy-dark` | `#111B30` | Pressed state on navy buttons. |
| `teal` | `#2A9D8F` | Active states, progress bars, focus rings, icons, links on large text. |
| `teal-dark` | `#1E7268` | **Primary button background** and teal text on white (see §1.4). |
| `teal-light` | `#3AB5A5` | Decorative only (gradients). |
| `teal-bg` | `#E6F5F3` | Teal badge background, selected chip, outline-button hover. |

### Neutrals

| Token | Hex | Use |
|---|---|---|
| `gray-50` | `#F8F9FA` | Page background, info tiles inside cards. |
| `gray-100` | `#F1F3F5` | Subtle fills. |
| `gray-200` | `#E9ECEF` | Card borders, progress track. |
| `gray-300` | `#DEE2E6` | Input borders, dashed upload zone. |
| `gray-400` | `#CED4DA` | Disabled borders. **Not for text.** |
| `gray-600` | `#6C757D` | Secondary text (subtitles, meta lines). |
| `gray-700` | `#495057` | Form labels. |
| `gray-800` | `#343A40` | Body text. |

### Status

| Meaning | Solid (icons, bars, borders) | Badge background | Badge text |
|---|---|---|---|
| Success / Confirmed / Present | `#2ECC71` | `#D4F5E2` | `#1A7A40` |
| Warning / Near full | `#F39C12` | `#FEF3CD` | `#856404` |
| Danger / Cancel / Delete / Error | `#E74C3C` | `#FDE8E8` | `#A12D2D` |
| Info | `#3498DB` | `#E8ECF3` | `#1B2A4A` |
| Neutral / Past | `gray-500` | `gray-200` | `gray-600` |

### 1.4 Contrast rules (NFR-16, WCAG 2.1 AA)

Measured against white:

| Pair | Ratio | Verdict |
|---|---|---|
| White on `teal` `#2A9D8F` | 3.3 : 1 | **Fails** for normal text (needs 4.5). OK only for text ≥ 18.7px bold. |
| White on `teal-dark` `#1E7268` | 5.7 : 1 | Passes. **Use this for primary buttons.** |
| White on `navy` `#1B2A4A` | 14.2 : 1 | Passes. |
| White on danger `#E74C3C` | 3.8 : 1 | **Fails** for normal text. Danger buttons use `#C0392B` (5.4 : 1). |
| White on success `#2ECC71` / warning `#F39C12` | ~2.2 : 1 | **Fails.** Never put white text on these. Use the badge pairs above. |
| `gray-600` on white | 4.7 : 1 | Passes, just. Do not use a lighter gray for text. |

This is the one deliberate change from the GP1 prototype, which used white text on `teal` buttons.

## 2. Typography

- Font: **IBM Plex Sans Arabic** (Google Fonts, covers Arabic and Latin), falling back to `'Segoe UI', Tahoma, Arial, sans-serif`.
  In Next.js load it with `next/font/google`.
- Icons: line icons from the shadcn/ui default set (lucide), 2px stroke. No emoji in the UI.
- Sizes: page title 20px bold navy, section title 16px bold, body 14px, labels and meta 12–13px, badges 11px semibold.
- Never go below 11px. Arabic needs line-height ≥ 1.5.

## 3. Shape, spacing, motion

| Token | Value | Use |
|---|---|---|
| `radius` | 12px | Cards, banners, chat window. |
| `radius-sm` | 8px | Buttons, inputs, info tiles. |
| pill | 9999px | Badges, chips, search bar, language toggle. |
| `shadow` | `0 2px 12px rgba(27,42,74,0.10)` | Cards; event cards only on hover. |
| transition | `0.18s ease` | Hover and focus. |
| Spacing | Tailwind scale. Card padding `p-6` (`p-4` small), gap between cards `gap-3`/`gap-4`. |

## 4. Components

| Component | Spec |
|---|---|
| Primary button | `teal-dark` background, white 13px semibold, `radius-sm`, padding 9×20. Hover: `#185E56`. Full-width variant 14px, padding 12. |
| Secondary button | Transparent, 1.5px `teal-dark` border, `teal-dark` text. Hover: `teal-bg`. |
| Navy button | `navy` background, white text. For admin/structural actions. |
| Danger button | `#C0392B` background, white text. Always confirm before a destructive action. |
| Input | 1.5px `gray-300` border, `radius-sm`, padding 10×12, 13px. Focus: border `teal`. Error: border danger + message below in `#A12D2D`. |
| Label | 12px semibold `gray-700`, above the input. Required fields end with `*`. |
| Card | White, 1px `gray-200` border, `radius`, `shadow`. |
| Badge | Pill, 11px semibold, padding 2×10, colors from the status table. |
| Filter chip | Pill, 1.5px `gray-300` border, 12px `gray-600`. Selected: `teal-bg` fill, `teal-dark` text and border. |
| Search bar | Pill, 1.5px `gray-300` border, icon at the start, clear button at the end. |
| Progress bar | 6px tall, `gray-200` track, rounded. Fill color by capacity (§5). |
| Stat card (KPI) | White card, centered, big number in `navy`, label in `gray-600`. |
| Avatar | 36px circle, `teal-bg` with `teal-dark` initials. |
| Chat bubbles (FR-23) | Bot: `gray-100`, `gray-800` text. User: `teal-dark`, white text. 16px radius, max 75% width. |

## 5. Status mapping (same everywhere)

**Event capacity (progress bar and card badge):**

| Booked | Bar color | Badge |
|---|---|---|
| < 75% | `teal` | Open (success) |
| 75–99% | warning `#F39C12` | Almost full (warning) |
| 100% | danger `#E74C3C` | Full (danger) |

**Event status (`EventStatus`, Organizer and Admin screens):** `PENDING` → warning, `APPROVED` → success,
`REJECTED` → danger, `CANCELLED` → neutral.

**Booking status (`RegistrationStatus`):** `CONFIRMED` → teal, `CANCELLED` → neutral. Past events → neutral.

**Notifications:** unread → teal dot, read → gray dot.

Color is never the only signal: every status also has a text label (badge text, `aria-label`).

## 6. Layout, RTL and language

- Arabic RTL is the default, English LTR second. Every screen has the AR/EN toggle in the top bar.
- Use Tailwind logical classes only: `ms-` `me-` `ps-` `pe-` `start-` `end-` `text-start` `text-end`. Never `ml-` `mr-` `left-` `right-` (`CLAUDE.md` rule 8).
- Icons that show direction (back arrow, chevrons) flip in RTL (`rtl:rotate-180`).
- Numbers, dates and times: format with the active locale (next-intl), never hand-built strings.
- Responsive (NFR-08): one column on phones, two columns for the event grid from `md`, sidebar layouts from `lg`.
- Admin and Organizer pages: navy sidebar at the start edge on `lg`, collapses to a top menu on smaller screens.

## 7. States every screen must have

- **Loading:** skeleton cards, not a blank page.
- **Empty:** icon + one sentence + the next action (e.g. "+ Create event"), as in prototype Screen 16.
- **Error:** message translated from the API error `code` through the `Errors` namespace, plus a way to retry.

## 8. Tailwind 4 tokens

For whoever owns `frontend/app/globals.css` (Role 4 with the Leader). Role 7 does not edit it.

```css
@theme {
  --color-navy: #1B2A4A;
  --color-navy-light: #253659;
  --color-navy-dark: #111B30;
  --color-teal: #2A9D8F;
  --color-teal-dark: #1E7268;
  --color-teal-darker: #185E56;
  --color-teal-light: #3AB5A5;
  --color-teal-bg: #E6F5F3;
  --color-success: #2ECC71;
  --color-success-bg: #D4F5E2;
  --color-success-fg: #1A7A40;
  --color-warning: #F39C12;
  --color-warning-bg: #FEF3CD;
  --color-warning-fg: #856404;
  --color-danger: #E74C3C;
  --color-danger-strong: #C0392B;
  --color-danger-bg: #FDE8E8;
  --color-danger-fg: #A12D2D;
  --color-info: #3498DB;
  --radius-card: 12px;
  --radius-control: 8px;
  --shadow-card: 0 2px 12px rgba(27, 42, 74, 0.10);
  --font-sans: 'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif;
}
```

This gives classes like `bg-navy`, `bg-teal-dark`, `text-danger-fg`, `rounded-card`, `shadow-card`.
Tailwind's own gray scale is close enough to the prototype grays; use `gray-50`…`gray-800`.
