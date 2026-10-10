const {
  ROLE5_ENDPOINTS,
  analyticsQuery,
  applyEventReview,
  mockCreateEvent,
  mockGetAnalytics,
  mockMarkNotificationRead,
  mockReviewEvent,
  mockSetUserActive,
  resetRole5Mocks,
  validateEventInput,
} = require('./role5-contracts.ts');

describe('Role 5 assumed contracts', () => {
  beforeEach(() => {
    resetRole5Mocks();
  });

  it('keeps organizer, admin, analytics and notification paths stable', () => {
    expect(ROLE5_ENDPOINTS.organizerEvents).toBe('/api/organizer/events');
    expect(ROLE5_ENDPOINTS.organizerEvent('evt-1')).toBe('/api/organizer/events/evt-1');
    expect(ROLE5_ENDPOINTS.organizerAttendees('evt-1')).toBe('/api/organizer/events/evt-1/attendees');
    expect(ROLE5_ENDPOINTS.adminUsers).toBe('/api/admin/users');
    expect(ROLE5_ENDPOINTS.adminEventReview('evt-2')).toBe('/api/admin/events/evt-2/review');
    expect(ROLE5_ENDPOINTS.notifications).toBe('/api/notifications');
    expect(ROLE5_ENDPOINTS.notificationRead('ntf-1')).toBe('/api/notifications/ntf-1/read');
    expect(analyticsQuery({ categoryId: 'cat-1', from: '2026-10-01' })).toBe(
      '/api/admin/analytics?from=2026-10-01&categoryId=cat-1',
    );
  });

  it('allows PENDING events to be approved or rejected only', () => {
    expect(applyEventReview('PENDING', 'APPROVED')).toEqual({ ok: true, status: 'APPROVED' });
    expect(applyEventReview('PENDING', 'REJECTED')).toEqual({ ok: true, status: 'REJECTED' });
    expect(applyEventReview('APPROVED', 'REJECTED')).toEqual({ ok: false, code: 'INVALID_STATUS' });
    expect(applyEventReview('PENDING', 'CANCELLED')).toEqual({ ok: false, code: 'INVALID_STATUS' });
  });

  it('rejects an event review when the event is missing', () => {
    expect(mockReviewEvent('missing', 'APPROVED')).toEqual({ code: 'NOT_FOUND' });
  });

  it('activates and deactivates users', () => {
    const off = mockSetUserActive('usr-att-1', false);
    expect(off.user.isActive).toBe(false);
    const on = mockSetUserActive('usr-att-1', true);
    expect(on.user.isActive).toBe(true);
    expect(mockSetUserActive('missing', false)).toEqual({ code: 'NOT_FOUND' });
  });

  it('validates event payloads and creates a PENDING event', () => {
    expect(
      validateEventInput({
        title: '',
        description: 'x',
        startsAt: '2026-10-21T09:00:00.000Z',
        endsAt: '2026-10-21T11:00:00.000Z',
        capacity: 10,
        venueId: null,
        categoryId: 'cat-1',
      }),
    ).toBe('VALIDATION');

    const created = mockCreateEvent({
      title: 'New talk',
      description: 'Campus talk',
      startsAt: '2026-10-21T09:00:00.000Z',
      endsAt: '2026-10-21T11:00:00.000Z',
      capacity: 40,
      venueId: 'ven-1',
      categoryId: 'cat-2',
    });
    expect(created.event.status).toBe('PENDING');
    expect(created.event.title).toBe('New talk');
  });

  it('marks a notification as read', () => {
    const result = mockMarkNotificationRead('ntf-1');
    expect(result.notification.isRead).toBe(true);
    expect(mockMarkNotificationRead('missing')).toEqual({ code: 'NOT_FOUND' });
  });

  it('filters analytics by category and counts actual attendance', () => {
    const all = mockGetAnalytics();
    expect(all.analytics.attendanceCount).toBe(2);
    const sports = mockGetAnalytics({ categoryId: 'cat-5' });
    expect(sports.analytics.registrationsVsCheckins).toHaveLength(1);
    expect(sports.analytics.registrationsVsCheckins[0].title).toBe('Football Day');
    expect(sports.analytics.byCategory.every((row) => row.categoryId === 'cat-5')).toBe(true);
  });
});
