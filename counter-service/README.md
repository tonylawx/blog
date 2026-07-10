# counter-service

Tiny HTTP front for a PostgreSQL table, backing the blog's per-article view
counter. The blog's Vercel function (`api/views.mjs`) calls this; this service
reads/writes a local Postgres table. The database is only touched through this
token-gated, slug-whitelisted HTTP API.

**Endpoints** (all require `X-Counter-Token` header except `/health`):

| Method | Path             | Returns                          |
|--------|------------------|----------------------------------|
| GET    | `/health`        | `{ok: true}`                     |
| GET    | `/get?slug=…`    | `{result: <number> \| null}`     |
| POST   | `/incr?slug=…`   | `{result: <number>}`             |

Only slugs matching `^[A-Za-z0-9/_.-]+$` are accepted. The `view_counts` table
is created automatically on first use (no manual SQL needed).

## Env vars

| Var             | Required | Example                                        |
|-----------------|----------|------------------------------------------------|
| `COUNTER_TOKEN` | yes      | a long random string (shared with Vercel)      |
| `DATABASE_URL`  | yes      | `postgres://counter:pass@127.0.0.1:5432/counter`|
| `PORT`          | no       | `8787` (default)                               |

## 1. Database (one time)

Your VPS already has a Postgres instance. Make a dedicated DB + role for the
counter so it doesn't share a table with other data:

```bash
sudo -u postgres psql <<'SQL'
CREATE ROLE counter LOGIN PASSWORD 'CHANGE_ME_strong_password';
CREATE DATABASE counter OWNER counter;
SQL
```

(Use a strong password; put it in the `DATABASE_URL` below.)

## 2. Run the service

```bash
cd counter-service
npm install
cat > .env <<EOF
COUNTER_TOKEN=$(openssl rand -hex 32)
DATABASE_URL=postgres://counter:CHANGE_ME_strong_password@127.0.0.1:5432/counter
PORT=8787
EOF
npm start
# -> counter service listening on :8787  (table auto-created on first request)
```

Quick local check (service up, no auth needed for health):

```bash
curl http://127.0.0.1:8787/health          # {"ok":true}
TOK=$(grep COUNTER_TOKEN .env | cut -d= -f2)
curl -H "X-Counter-Token: $TOK" "http://127.0.0.1:8788/incr?slug=blog/test" -X POST  # {"result":1}
curl -H "X-Counter-Token: $TOK" "http://127.0.0.1:8787/get?slug=blog/test"           # {"result":"1"}
```

Keep it running with **systemd** (`/etc/systemd/system/counter.service`, `EnvironmentFile=/opt/counter-service/.env`, `Restart=always`, `After=network.target postgresql.service`), **PM2** (`pm2 start index.js --name counter --env-file .env`), or Docker. The service must stay up for counts to show — if it is down, the blog silently hides the counter.

## 3. HTTPS in front (required — the token must not travel in cleartext)

Put Caddy (or nginx) in front for auto-HTTPS with a domain pointing at the VPS.
The Vercel function calls this over HTTPS.

**Caddyfile** (auto TLS, reverse-proxies `counter.example.com` → `127.0.0.1:8787`):

```caddy
counter.example.com {
  reverse_proxy 127.0.0.1:8787
}
```

## 4. DNS — ← do this step yourself

Point a DNS A/AAAA record for your chosen hostname (e.g. `counter.example.com`)
at the VPS. Caddy will issue the TLS cert automatically once DNS resolves.

## 5. Wire it to the blog (Vercel)

On the blog Vercel project → Settings → Environment Variables, add:

- `COUNTER_API_URL` = `https://counter.example.com`  (no trailing slash)
- `COUNTER_API_TOKEN` = the same `COUNTER_TOKEN` from `.env`

Trigger a redeploy (push any change, or hit redeploy) and the counter activates.
The token stays server-side — it is only ever read by `api/views.mjs`, never
shipped to the browser.
