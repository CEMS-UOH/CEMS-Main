const express = require('express');
const cors = require('cors');
const { corsOrigins } = require('./config/env');
const routes = require('./routes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.use(routes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
