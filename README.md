# DRIVE YOUR DREAM Giveaway

Japanese vehicle giveaway frontend with a Node.js/Express API and protected admin endpoints.

## Important architecture and data notes

The API in `server.js` persists entries to a JSON file in `DATABASE_DIR` and sessions to SQLite via `connect-sqlite3`. This is a starter deployment for a **single persistent backend instance** only. The backend disk must be persistent, encrypted, access-controlled, and backed up. Ephemeral filesystems lose entries on restart/redeploy; multiple instances can cause lost updates. For a real public campaign or multiple instances, replace the JSON entry store with managed PostgreSQL and use a shared session store (for example Redis/Postgres). Obtain legal/privacy review before collecting personal data and define retention/deletion procedures.

The frontend contains no credentials. `config.js` contains only the public API URL; set it to the deployed API origin. The admin page is not secret by URL: the API enforces login/session authorization for every admin data endpoint.

## Run locally

Requirements: Node.js 20+ and npm.

1. `cp .env.example .env`
2. Generate a unique password hash interactively: `npm run admin:hash-password`. Do not reuse the password previously pasted in chat. Put the printed bcrypt hash in `.env` as `ADMIN_PASSWORD_HASH`, set a long random `SESSION_SECRET`, and choose `ADMIN_USERNAME`.
3. Set `FRONTEND_ORIGINS=http://localhost:3000` (or the exact origin hosting the static files).
4. Install and start: `npm install && npm start`.
5. Serve the static site over HTTP (e.g. `npx http-server . -p 3000`) and set `config.js` API URL to `http://localhost:3000` if the API runs on that same origin. Do not use `file://`.
6. Visit `/admin.html`; register via the public form. Entries are stored in `./data/entries.json`.

## API

- `GET /api/health` — health check
- `POST /api/entries` — public entry submission (rate limited; validated server-side)
- `POST /api/admin/login` — admin login; establishes HttpOnly session cookie
- `POST /api/admin/logout` — logout
- `GET /api/admin/entries` — authenticated entry list (PII; no-store)
- `PATCH /api/admin/entries/:id` — authenticated status update

Mutating requests require an allowed `Origin` and `X-Requested-With: XMLHttpRequest`. Admin uses an HttpOnly, SameSite=Lax cookie. Use a custom domain for Pages and an API subdomain under the same registrable domain so browser cookie policies allow the secure session. Avoid GitHub's `github.io` origin with an unrelated API host for admin cookies; cross-site cookie blocking can prevent login.

## Secure deployment checklist: GitHub Pages + backend

1. **Use a custom domain**: map Pages to `www.example.com` and the API host to `api.example.com`. Enforce HTTPS for both. They are separate origins but same-site, which supports the API's SameSite=Lax HttpOnly session cookie. Configure Pages HTTPS after DNS is valid.
2. **Deploy frontend**: enable GitHub Pages for the intended branch/folder. Set `window.CAMPAIGN_API_URL` in `config.js` to `https://api.example.com` (public endpoint URL only). No passwords, session secrets, or database credentials in frontend files.
3. **Deploy backend**: use a maintained Node 20+ host/container with persistent encrypted storage. Configure start command `npm start`, install from the committed lockfile (generate and commit `package-lock.json` with `npm install`), and mount persistent storage at `DATABASE_DIR`. Do not use an ephemeral serverless filesystem with this JSON store.
4. **Set backend environment secrets**: `NODE_ENV=production`, `PORT` as provided by host, `SESSION_SECRET` generated from a cryptographically secure random source (32+ random bytes), `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH` (bcrypt cost 12+ from `npm run admin:hash-password`), `FRONTEND_ORIGINS=https://www.example.com`, and `DATABASE_DIR` pointing to persistent storage. Never put secrets in GitHub Pages, source code, logs, or chat. Rotate any credential already shared.
5. **Proxy/TLS**: terminate HTTPS at trusted provider; configure forwarded headers only from the provider. Express trusts one proxy hop for secure cookies; adjust only to match your host topology. Add request/body limits and provider WAF/DDoS protections.
6. **Cross-origin cookies**: browser requests include credentials. Keep frontend and API same-site via custom domains. Do not change cookie to `SameSite=None` just to work around cross-site hosting without threat modeling and CSRF controls.
7. **Production data store**: before a real campaign, use managed PostgreSQL for entries, unique IDs/indexes, backups, retention/deletion, and a shared session store. Enable encryption at rest, least-privilege DB credentials, access auditing, restore drills, and regional/privacy compliance review. Restrict admin access (VPN/identity-aware proxy/MFA if supported).
8. **Operational checks**: verify health endpoint, rate limits, origin allowlist, login/logout, unauthenticated admin API returns 401, invalid payloads are rejected, cookies are Secure/HttpOnly, and form data survives deployment. Set up uptime monitoring, error alerts, dependency updates, and security scanning.
9. **GitHub protections**: keep `.env`/database files ignored, enable secret scanning and push protection, use protected branches/reviews, pin/review dependency updates, and never commit real applicant data or credentials.
10. **Legal/user trust**: publish accurate campaign rules, eligibility, prize terms, privacy policy, contact and data deletion processes before accepting real registrations. Do not publish fabricated testimonials, prize valuations, or dates as factual claims.

This repository code is a starter implementation, not a substitute for production security review or legal review. For production traffic, migrate from the included single-instance JSON store to a transactional database before launch.
