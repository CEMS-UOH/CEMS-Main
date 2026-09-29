# Deployment

**Owner: Role 8 (QA + DevOps).** Documentation only — nothing here has been run against a real
server yet.

Two hosts, one domain:

| Part | Where | URL |
|---|---|---|
| Frontend (Next.js) | Vercel | `https://app.<domain>` |
| Backend API (Express) | DigitalOcean droplet, Docker Compose + NGINX | `https://api.<domain>` |
| Analytics (FastAPI) | Same droplet, **not** publicly exposed | internal only |
| Database | Supabase (managed) | — |

Keeping both on subdomains of **one** registered domain is what lets the session cookie work —
see [Cookies and CORS](#cookies-and-cors-the-part-that-breaks-first).

---

## 1. Prerequisites

- A registered domain with DNS you control.
- A DigitalOcean droplet: Ubuntu 24.04 LTS, 2 GB RAM minimum (Prisma + Node + Python in one
  Compose stack will OOM on the 1 GB plan during `npm ci`).
- DNS **A records**, both pointing at the droplet's IPv4:
  - `api.<domain>` → droplet IP
  - `app.<domain>` → Vercel will give you a CNAME instead; set that when you add the domain in
    Vercel, not here.

---

## 2. Droplet setup

SSH in as root, then create a non-root user — do not run the stack as root.

```bash
adduser scems
usermod -aG sudo scems
```

Install Docker Engine and the Compose plugin from Docker's official repository (Ubuntu's
`docker.io` package lags badly):

```bash
curl -fsSL https://get.docker.com | sh
usermod -aG docker scems
```

Log out and back in as `scems` so the group membership takes effect.

### Firewall

Only SSH and HTTP/HTTPS should be reachable. Ports 5000 and 8000 must **never** be public —
NGINX reaches them over the Docker network.

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

---

## 3. Clone and configure

```bash
cd /opt
sudo git clone https://github.com/CEMS-UOH/CEMS-Main.git scems
sudo chown -R scems:scems scems
cd scems
git checkout main
cp .env.example .env
```

Fill in `/opt/scems/.env`. **Never commit it.** Production values that differ from local:

```ini
NODE_ENV=production
PORT=5000

# Supabase - same project, same strings as development
DATABASE_URL="postgresql://...pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://...pooler.supabase.com:5432/postgres"

# A DIFFERENT secret from development. Generate it on the droplet:
#   node -e "console.log(require('crypto').randomBytes(64).toString('base64url'))"
JWT_SECRET="<64 random bytes>"

# See section 6. Note the leading dot on COOKIE_DOMAIN.
CORS_ORIGINS="https://app.<domain>"
COOKIE_DOMAIN=".<domain>"

SEED_ADMIN_EMAIL="admin@<domain>"
SEED_ADMIN_PASSWORD="<strong password>"
```

`assertRuntimeConfig()` in `backend/src/config/env.js` **exits the process** if `JWT_SECRET` is
empty while `NODE_ENV=production`, so a missing secret fails at boot rather than at the first
login attempt.

---

## 4. Bring the stack up

```bash
cd /opt/scems
docker compose up -d --build
```

`docker-compose.yml` defines two services, both reading `env_file: .env`:

- `backend` → publishes `5000:5000`
- `analytics` → publishes `8000:8000`

> **Hardening to do (Role 8):** those `ports:` entries bind to `0.0.0.0`, so without the UFW
> rules above they would be publicly reachable. Change them to `"127.0.0.1:5000:5000"` and
> `"127.0.0.1:8000:8000"` so they are only reachable from the host, and drop the analytics
> mapping entirely once NGINX does not need it.

### Migrations

Run migrations **inside the container**, and use `npx` directly:

```bash
docker compose exec backend npx prisma migrate deploy
```

Do **not** use `npm run prisma:deploy` here. That script wraps the command in `dotenv-cli`,
which is a devDependency and is therefore absent from the image (`npm ci --omit=dev`). It is
also unnecessary: Compose already injects `.env` into the container's environment.

Seeding, the first time only:

```bash
docker compose exec backend node prisma/seed.js
```

The seed is idempotent, so re-running it creates nothing new and never changes an existing
admin's password.

### Health check

```bash
curl http://localhost:5000/health
curl http://localhost:5000/health/db     # must return {"success":true,...,"database":"up"}
```

---

## 5. NGINX + HTTPS for `api.<domain>`

Install NGINX and Certbot **on the host**, not in a container:

```bash
sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx
```

Create `/etc/nginx/sites-available/api.<domain>`:

```nginx
server {
    listen 80;
    server_name api.<domain>;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;

        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        # Required: Express uses this to know the original request was HTTPS.
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_set_header Upgrade    $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Enable it and reload:

```bash
sudo ln -s /etc/nginx/sites-available/api.<domain> /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Then issue the certificate — Certbot rewrites the file to add the 443 block and an HTTP→HTTPS
redirect:

```bash
sudo certbot --nginx -d api.<domain>
```

Renewal is automatic via the `certbot.timer` systemd unit. Verify with:

```bash
sudo certbot renew --dry-run
```

### One code change this requires

The session cookie is set with `secure: isProduction` (`backend/src/lib/session.js`). Behind a
proxy, Express only treats a request as secure if it trusts `X-Forwarded-Proto`. Add this to
`backend/src/app.js` before deploying, or the browser will reject the cookie:

```js
// Behind NGINX on the droplet: trust X-Forwarded-Proto so `secure` cookies work.
if (isProduction) app.set('trust proxy', 1);
```

This is **not** in the code yet — it is deliberately left for the deployment PR, since setting
it locally would have no effect and could mask problems.

---

## 6. Vercel (frontend)

In the Vercel dashboard, import `CEMS-UOH/CEMS-Main` and set:

| Setting | Value |
|---|---|
| Framework preset | Next.js |
| **Root Directory** | **`frontend`** |
| Build command | `npm run build` (default) |
| Install command | `npm install` (default) |
| Production branch | `main` |

Environment variables (Project → Settings → Environment Variables):

| Name | Production | Preview |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api.<domain>` | `https://api.<domain>` |

That is the only variable the frontend needs. Everything else in `.env.example` is
backend-side — **never** add `DATABASE_URL`, `JWT_SECRET` or `SEED_ADMIN_PASSWORD` to Vercel.
`NEXT_PUBLIC_*` variables are inlined into the browser bundle and are public by definition.

Then add the domain: Project → Settings → Domains → `app.<domain>`, and create the CNAME Vercel
shows you.

`SWC_NATIVE_BINDING_CACHE` is **not** needed on Vercel — that workaround is only for the
Windows permission quirk described in the README.

---

## Cookies and CORS: the part that breaks first

The session is an `httpOnly` cookie, and the frontend and API are on **different hosts**. Three
settings have to agree or login silently fails — the request succeeds, but the cookie is never
stored or never sent back.

| Variable | Value | Why |
|---|---|---|
| `CORS_ORIGINS` | `https://app.<domain>` | Exact scheme + host, no trailing slash, no wildcard. With `credentials: true` the browser rejects `*`. |
| `COOKIE_DOMAIN` | `.<domain>` | **Leading dot.** Scopes the cookie to the parent domain so `app.` can send it to `api.`. Set it to `api.<domain>` and the browser will not send it from `app.`. |
| `NEXT_PUBLIC_API_URL` | `https://api.<domain>` | Must match `CORS_ORIGINS`' counterpart exactly — `http` vs `https`, or a trailing slash, breaks it. |

Both subdomains must sit under **one registered domain**. `SameSite=Lax` plus a shared parent
domain makes this a same-site request. If the frontend ever moves to a different registered
domain (`scems.vercel.app` against `api.example.com`), the cookie becomes third-party and would
need `SameSite=None; Secure` — which is blocked by default in several browsers. Do not go there;
use the subdomain layout.

Locally, leave `COOKIE_DOMAIN` **empty** — the cookie then defaults to `localhost` and
`http://localhost:3000` → `http://localhost:5000` works without `Secure`.

### Verifying it end to end

```bash
curl -i -X POST https://api.<domain>/api/attendee/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"...","password":"..."}'
```

The `Set-Cookie` header must contain **all** of: `HttpOnly`, `SameSite=Lax`, `Secure`, and
`Domain=.<domain>`. If `Secure` is missing, `NODE_ENV` is not `production` in the container. If
`Domain` is missing, `COOKIE_DOMAIN` is not set.

---

## Updating a release

```bash
cd /opt/scems
git pull origin main
docker compose up -d --build
docker compose exec backend npx prisma migrate deploy   # only if migrations were added
docker compose logs -f backend                          # watch for a clean boot
```

Vercel redeploys `main` automatically on push.

## Rollback

```bash
cd /opt/scems
git checkout <previous-tag>      # e.g. foundation-v1
docker compose up -d --build
```

Prisma migrations do **not** roll back. If a release added a migration, rolling the code back
leaves the database ahead of it — fine for additive changes (new tables and nullable columns),
not for destructive ones. Review every migration for backward compatibility before tagging a
release.

---

## Still to be verified

Nothing in this document has been executed. Before the production deploy, Role 8 should confirm:

1. `docker compose build` succeeds for both services. **Not yet verified** — Docker Desktop
   would not start on the Leader's machine during the bootstrap session.
2. The `apk add --no-cache openssl` line in `backend/Dockerfile` is actually required (it is
   Prisma's documented requirement on Alpine, but it was added without a build to confirm).
3. `app.set('trust proxy', 1)` is added, or `Secure` cookies will not be set behind NGINX.
4. The `ports:` entries in `docker-compose.yml` are bound to `127.0.0.1`.
5. `docker compose exec backend npx prisma migrate deploy` works inside the image — the image
   deliberately ships the Prisma CLI as a runtime dependency for this.
