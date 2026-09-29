// The ONLY shape of a user that may leave the API. passwordHash is absent by construction,
// so it can never leak through a forgotten `select`. Use this in every user query.
const PUBLIC_USER_FIELDS = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  isActive: true,
  createdAt: true,
};

module.exports = { PUBLIC_USER_FIELDS };
