# counter-service

Tiny HTTP front for a local Redis, backing the blog's per-article view counter.
The blog's Vercel function (`api/views.mjs`) calls this; this service talks to
Redis on localhost. The raw Redis port never has to face the public internet —
only this token-gated, key-whitelisted HTTP API does.

**Endpoints** (all require `X-Counter-Token` header except `/health`):

| Method | Path                | Returns                          |
|--------|---------------------|----------------------------------|
| GET    | `/health`           | `{ok: true}`                     |
| GET    | `/get?key=views:…`  | `{result: "<string>" \| null}`   |
| POST   | `/incr?key=views:…` | `{result: <number>}`             |

Only keys matching `^views:[A-Za-z0-9/_.-]+$` are accepted.

## Env vars

| Var             | Required | Example                          |
|-----------------|----------|----------------------------------|
| `COUNTER_TOKEN` | yes      | a long random string (shared with Vercel) |
| `REDIS_URL`     | no       | `redis://127.0.0.1:6379` (default)|
| `PORT`          | no       | `8787` (default)                 |

## Run locally / on the VPS

```bash
cd counter-service
npm install
COUNTER_TOKEN="$(openssl rand -hex 32)" npm start
# -> counter service listening on :8787
```

Quick check:

```bash
curl -H "X-Counter-Token: $COUNTER_TOKEN" "http://127.0.0.1:8787/incr?key=views:blog/test" -X POST
# {"result":1}
curl -H "X-Counter-Token: $COUNTER_TOKEN" "http://127.0.0.1:8787/get?key=views:blog/test"
# {"result":"1"}
```

## Keep it running

Pick **one**. The service must stay up for the counter to show numbers — if it
is down, the blog silently hides the counter (no error).

**systemd** (`/etc/systemd/system/counter.service`):

```ini
[Unit]
Description=Blog view-counter service
After=network.target redis.service

[Service]
WorkingDirectory=/opt/counter-service
ExecStart=/usr/bin/node index.js
EnvironmentFile=/opt/counter-service/.env
Restart=always
User=counter

[Install]
WantedBy=multi-user.target
```

with `/opt/counter-service/.env`:

```
COUNTER_TOKEN=__the_long_random_shared_secret__
REDIS_URL=redis://127.0.0.1:6379
PORT=8787
```

then `systemctl enable --now counter`.

**PM2**: `pm2 start index.js --name counter --env-file .env && pm2 save && pm2 startup`.

**Docker**: `docker run -d --name counter --env-file .env --network host -v $PWD:/app -w /app node:20 node index.js` (or compose).

## HTTPS in front (required — the token must not travel in cleartext)

Put Caddy (or nginx) in front for auto-HTTPS with a domain pointing at the VPS.
The Vercel function calls this over HTTPS.

**Caddyfile** (auto TLS, reverse-proxies `counter.example.com` → `127.0.0.1:8787`):

```caddy
counter.example.com {
  reverse_proxy 127.0.0.1:8787
}
```

Point a DNS A/AAAA record at the VPS, run Caddy, done.

## Wire it to the blog (Vercel)

On the blog Vercel project → Settings → Environment Variables, add:

- `COUNTER_API_URL` = `https://counter.example.com`  (no trailing slash)
- `COUNTER_API_TOKEN` = the same `COUNTER_TOKEN` you set here

Redeploy (or push any change) and the counter activates. The token stays
server-side — it is only ever read by `api/views.mjs`, never shipped to the
browser.
