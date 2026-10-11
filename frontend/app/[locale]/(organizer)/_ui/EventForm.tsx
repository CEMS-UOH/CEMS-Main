'use client';

// Create / edit form for an organizer's event (FR-10, FR-11, FR-13, FR-16).
// Client-side checks mirror the backend's rules so most mistakes are caught before a round
// trip, but the API stays the authority: whatever it rejects is shown next to the field.
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Card from '@/components/Card';
import FormMessage from '@/components/FormMessage';
import { useRouter } from '@/i18n/navigation';
import type { ApiResult } from '@/lib/api';
import Button from '@/components/Button';
import { SelectField, TextAreaField, TextField } from '../../_dashboard/ui/Field';
import { campusInputToIso, isoToCampusInput } from '../../_dashboard/lib/campusTime';
import type { Category, EventInput, OrganizerEvent, Venue } from '../../_dashboard/lib/types';
import { useDashboardError } from '../../_dashboard/lib/useDashboardError';

const MAX_TITLE = 200;
const MAX_DESCRIPTION = 5000;
const MAX_ATTACHMENTS = 10;

// In the order the fields appear, so "focus the first invalid field" follows the screen.
const FIELDS = [
  'title',
  'description',
  'startsAt',
  'endsAt',
  'capacity',
  'categoryId',
  'venueId',
  'imageUrl',
  'attachments',
] as const;
type FieldName = (typeof FIELDS)[number];
type FieldErrors = Partial<Record<FieldName, string>>;

// Which field an API error code belongs to.
const FIELD_BY_CODE: Record<string, FieldName> = {
  INVALID_TITLE: 'title',
  INVALID_DESCRIPTION: 'description',
  INVALID_DATES: 'startsAt',
  INVALID_CAPACITY: 'capacity',
  CAPACITY_EXCEEDS_VENUE: 'capacity',
  CAPACITY_BELOW_BOOKED: 'capacity',
  INVALID_CATEGORY: 'categoryId',
  INVALID_VENUE: 'venueId',
  INVALID_IMAGE_URL: 'imageUrl',
  INVALID_ATTACHMENTS: 'attachments',
};

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

type Props = {
  /** Present when editing; absent when creating. */
  initial?: OrganizerEvent;
  categories: Category[];
  venues: Venue[];
  submitLabel: string;
  onSubmit: (input: EventInput) => Promise<ApiResult<unknown>>;
  onSuccess: () => void;
};

export default function EventForm({
  initial,
  categories,
  venues,
  submitLabel,
  onSubmit,
  onSuccess,
}: Props) {
  const t = useTranslations('Organizer.form');
  const tCommon = useTranslations('Dashboard');
  const errorMessage = useDashboardError();
  const router = useRouter();

  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [startsAt, setStartsAt] = useState(initial ? isoToCampusInput(initial.startsAt) : '');
  const [endsAt, setEndsAt] = useState(initial ? isoToCampusInput(initial.endsAt) : '');
  const [capacity, setCapacity] = useState(initial ? String(initial.capacity) : '');
  const [categoryId, setCategoryId] = useState(initial?.category.id ?? '');
  const [venueId, setVenueId] = useState(initial?.venue?.id ?? '');
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? '');
  const [attachments, setAttachments] = useState((initial?.attachments ?? []).join('\n'));

  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const seatsBooked = initial?.seatsTaken ?? 0;

  /** Returns the request body, or the per-field problems that stop it being sent. */
  function validate(): { input: EventInput } | { problems: FieldErrors } {
    const problems: FieldErrors = {};

    const cleanTitle = title.trim();
    if (!cleanTitle) problems.title = tCommon('required');
    else if (cleanTitle.length > MAX_TITLE) problems.title = t('v.titleLength');

    const cleanDescription = description.trim();
    if (!cleanDescription) problems.description = tCommon('required');
    else if (cleanDescription.length > MAX_DESCRIPTION) {
      problems.description = t('v.descriptionLength');
    }

    const startIso = campusInputToIso(startsAt);
    const endIso = campusInputToIso(endsAt);
    if (!startIso) problems.startsAt = t('v.dateInvalid');
    else if (new Date(startIso).getTime() <= Date.now()) problems.startsAt = t('v.startFuture');
    if (!endIso) problems.endsAt = t('v.dateInvalid');
    else if (startIso && new Date(endIso).getTime() <= new Date(startIso).getTime()) {
      problems.endsAt = t('v.endAfterStart');
    }

    const venue = venues.find((v) => v.id === venueId) ?? null;
    const seats = /^\d+$/.test(capacity.trim()) ? Number(capacity.trim()) : NaN;
    if (!Number.isSafeInteger(seats) || seats < 1) problems.capacity = t('v.capacity');
    else if (venue && seats > venue.capacity) {
      problems.capacity = t('v.capacityVenue', { capacity: venue.capacity });
    } else if (seats < seatsBooked) {
      problems.capacity = t('v.capacityBooked', { count: seatsBooked });
    }

    if (!categoryId) problems.categoryId = tCommon('required');

    const cleanImageUrl = imageUrl.trim();
    if (cleanImageUrl && !isHttpUrl(cleanImageUrl)) problems.imageUrl = t('v.url');

    const links = attachments
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    if (links.length > MAX_ATTACHMENTS) problems.attachments = t('v.attachmentsMax');
    else if (!links.every(isHttpUrl)) problems.attachments = t('v.url');

    if (Object.keys(problems).length > 0 || !startIso || !endIso) return { problems };

    return {
      input: {
        title: cleanTitle,
        description: cleanDescription,
        startsAt: startIso,
        endsAt: endIso,
        capacity: seats,
        categoryId,
        venueId: venueId || null,
        imageUrl: cleanImageUrl || null,
        attachments: links,
      },
    };
  }

  function focusFirstInvalid(problems: FieldErrors) {
    const first = FIELDS.find((name) => problems[name]);
    if (first) document.getElementById(first)?.focus();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const checked = validate();
    if ('problems' in checked) {
      setErrors(checked.problems);
      setFormError(t('v.fixErrors'));
      focusFirstInvalid(checked.problems);
      return;
    }

    setErrors({});
    setSubmitting(true);
    const result = await onSubmit(checked.input);
    setSubmitting(false);

    if (result.ok) {
      onSuccess();
      return;
    }

    const message = errorMessage(result.code);
    setFormError(message);
    const field = FIELD_BY_CODE[result.code];
    if (field) {
      const problems: FieldErrors = { [field]: message };
      setErrors(problems);
      focusFirstInvalid(problems);
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        {formError ? <FormMessage kind="error">{formError}</FormMessage> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <TextField
              id="title"
              label={t('title')}
              value={title}
              onChange={setTitle}
              error={errors.title}
              maxLength={MAX_TITLE}
              disabled={submitting}
              required
            />
          </div>

          <div className="sm:col-span-2">
            <TextAreaField
              id="description"
              label={t('description')}
              value={description}
              onChange={setDescription}
              error={errors.description}
              maxLength={MAX_DESCRIPTION}
              rows={5}
              disabled={submitting}
              required
            />
          </div>

          <TextField
            id="startsAt"
            label={t('startsAt')}
            type="datetime-local"
            value={startsAt}
            onChange={setStartsAt}
            error={errors.startsAt}
            hint={tCommon('campusTimeHint')}
            disabled={submitting}
            required
          />
          <TextField
            id="endsAt"
            label={t('endsAt')}
            type="datetime-local"
            value={endsAt}
            onChange={setEndsAt}
            error={errors.endsAt}
            hint={tCommon('campusTimeHint')}
            disabled={submitting}
            required
          />

          <SelectField
            id="categoryId"
            label={t('category')}
            value={categoryId}
            onChange={setCategoryId}
            error={errors.categoryId}
            disabled={submitting}
            required
            options={[
              { value: '', label: t('categoryPlaceholder') },
              ...categories.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
          <SelectField
            id="venueId"
            label={t('venue')}
            value={venueId}
            onChange={setVenueId}
            error={errors.venueId}
            disabled={submitting}
            options={[
              { value: '', label: tCommon('noVenue') },
              ...venues.map((v) => ({
                value: v.id,
                label: t('venueOption', { name: v.name, capacity: v.capacity }),
              })),
            ]}
          />

          <TextField
            id="capacity"
            label={t('capacity')}
            type="number"
            inputMode="numeric"
            min={1}
            value={capacity}
            onChange={setCapacity}
            error={errors.capacity}
            hint={t('capacityHint')}
            disabled={submitting}
            required
          />
          <TextField
            id="imageUrl"
            label={t('imageUrl')}
            type="url"
            inputMode="url"
            ltrValue
            value={imageUrl}
            onChange={setImageUrl}
            error={errors.imageUrl}
            hint={t('imageUrlHint')}
            disabled={submitting}
          />

          <div className="sm:col-span-2">
            <TextAreaField
              id="attachments"
              label={t('attachments')}
              value={attachments}
              onChange={setAttachments}
              error={errors.attachments}
              hint={t('attachmentsHint')}
              rows={3}
              ltrValue
              disabled={submitting}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? tCommon('saving') : submitLabel}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={submitting}
            onClick={() => router.push('/organizer')}
          >
            {tCommon('cancel')}
          </Button>
        </div>
      </form>
    </Card>
  );
}
