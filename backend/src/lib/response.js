// Standard API response shape used by EVERY endpoint:
//   success: { success: true,  data: ... }
//   failure: { success: false, error: { message, code } }
const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });

const fail = (res, message, status = 400, code = 'BAD_REQUEST') =>
  res.status(status).json({ success: false, error: { message, code } });

class HttpError extends Error {
  constructor(status, message, code = 'ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

module.exports = { ok, fail, HttpError };
