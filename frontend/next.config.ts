import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

// Where the Express API runs. The browser never calls it directly: every /api/* request goes to
// this site's own address and is passed on from here (a "rewrite"). The site and the API then
// look like ONE site to the browser, so the httpOnly session cookie works even when the two
// are hosted on unrelated domains (e.g. *.vercel.app and *.koyeb.app) - a cookie set by
// another site would be blocked as a third-party cookie.
// Read when the site is built: set BACKEND_URL in Vercel's environment variables.
const BACKEND_URL = (process.env.BACKEND_URL ?? 'http://localhost:5000').replace(/\/+$/, '');

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${BACKEND_URL}/api/:path*` }];
  },
};

export default withNextIntl(nextConfig);
