const { port, assertRuntimeConfig } = require('./config/env');
const app = require('./app');

// Fail fast on missing required configuration before accepting any traffic.
assertRuntimeConfig();

app.listen(port, () => console.log(`SCEMS API listening on http://localhost:${port}`));
