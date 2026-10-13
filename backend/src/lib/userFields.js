// The ONLY shape of a user that may leave the API. passwordHash is absent by construction,
// so it can never leak through a forgotten `select`. Use this in every user query.
//
// `phone` and `organization` are an Organizer's contact details. They only ever reach two
// readers: the user themself (GET /auth/me) and Admins (the admin module). Nothing an
// Attendee can call selects a user through this shape - the attendee and organizer modules
// pick their own narrower fields (name only, or name + email).
const PUBLIC_USER_FIELDS = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  phone: true,
  organization: true,
  isActive: true,
  createdAt: true,
};

module.exports = { PUBLIC_USER_FIELDS };
