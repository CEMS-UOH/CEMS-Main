const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { corsOrigins, isProduction } = require('./config/env');
const routes = require('./routes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// In production the API sits behind NGINX, which terminates TLS. Without trusting the
// proxy, Express sees a plain http request and refuses to send the `secure` session
// cookie - login would silently fail. 1 = trust the single hop in front of us.
// See docs/DEPLOY.md.
if (isProduction) app.set('trust proxy', 1);

// credentials:true is required for the session cookie to be sent cross-origin
// (frontend on :3000 -> API on :5000). The origin list comes from CORS_ORIGINS.
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.use(routes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
