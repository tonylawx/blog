# counter-service

Tiny HTTP front for a PostgreSQL table, backing the blog's per-article view
counter. The blog's Vercel function (`api/views.mjs`) calls this over HTTPS;
this service reads/writes a local Postgres table. The database is only touched
through this token-gated, slug-whitelisted HTTP API.

**Endpoints** (all require `X-Counter-Token` header except `/health`):

| Method | Path             | Returns                          |
|--------|------------------|----------------------------------|
| GET    | `/health`        | `{ok: true}`                     |
| GET    | `/get?slug=…`    | `{result: <number> \| null}`     |
| POST   | `/incr?slug=…`   | `{result: <number>}`             |

Only slugs matching `^[A-Za-z0-9/_.-]+$` are accepted. The `view_counts(slug
TEXT PRIMARY KEY, views BIGINT)` table is created automatically on first use.

## Env vars

| Var             | Required | Example                                        |
|-----------------|----------|------------------------------------------------|
| `COUNTER_TOKEN` | yes      | long random string (shared with Vercel)        |
| `DATABASE_URL`  | yes      | `postgres://counter:pass@postgres:5432/counter`|
| `PORT`          | no       | `8787` (default)                               |

---

## Production deployment (current, live)

Runs on the VPS (`167.71.219.62`, DigitalOcean SGP) **as a Docker container
inside the existing `option-tool` stack** — it does not run standalone. It
shares that stack's network, Postgres, and Caddy.

| What               | Where / value                                                              |
|--------------------|----------------------------------------------------------------------------|
| Service dir        | `/opt/counter-service/` (Dockerfile, docker-compose.yml, index.js, `.env`) |
| Container          | `counter` (image `counter-service-counter`), `restart: unless-stopped`    |
| Network            | `api_default` (external — the option-tool compose network)                |
| Postgres           | shared container `api-postgres-1`, **dedicated** `counter` db + `counter` role |
| Postgres host (inside net) | `postgres:5432`                                                    |
| Caddy              | shared container `api-caddy-1`; site block in `/opt/tonylaw/option-tool/ops/api/Caddyfile` |
| Hostname           | `counter.tonylaw.cc` → `167.71.219.62` (DNS)                              |
| TLS cert           | auto, Let's Encrypt via Caddy                                              |
| Secrets            | `/opt/counter-service/.env` (chmod 600) — **not** in the repo             |
| Vercel env (blog)  | `COUNTER_API_URL=https://counter.tonylaw.cc`, `COUNTER_API_TOKEN=<COUNTER_TOKEN>` |

Caddy site block (in the option-tool Caddyfile):

```caddy
counter.tonylaw.cc {
	encode zstd gzip
	reverse_proxy counter:8787
}
```

docker-compose.yml (in `/opt/counter-service/`) — joins the shared network:

```yaml
services:
  counter:
    build: .
    container_name: counter
    restart: unless-stopped
    env_file: .env
    networks:
      - api_default
networks:
  api_default:
    external: true
```

End-to-end flow: browser → Vercel `/api/views` (same-origin) →
`https://counter.tonylaw.cc` (Caddy) → `counter:8787` → Postgres `counter.view_counts`.
Vercel dedupes one count per browser session per article.

---

## Operations & maintenance

All commands run on the VPS as root.

**Logs / status / DB inspection**

```bash
docker logs --tail 50 counter                       # service logs
docker ps --filter name=counter                     # status
docker exec api-postgres-1 psql -U counter -d counter \
  -c "SELECT * FROM view_counts ORDER BY views DESC LIMIT 20;"   # top articles
```

**Rebuild after a code change** (e.g. after editing `index.js` and syncing it to the VPS):

```bash
cd /opt/counter-service && docker compose up -d --build
```

**Restart only** (no rebuild): `docker restart counter`

**Rotate `COUNTER_TOKEN`** (do both sides, or counts stop):

```bash
# 1. VPS: new token in .env, recreate container
NEW=$(openssl rand -hex 32)
sed -i "s/^COUNTER_TOKEN=.*/COUNTER_TOKEN=$NEW/" /opt/counter-service/.env
cd /opt/counter-service && docker compose up -d
# 2. Vercel: update COUNTER_API_TOKEN to $NEW, then redeploy the blog
```

**Reset the DB password** (if needed): `ALTER ROLE counter WITH PASSWORD '…';`
in the `api-postgres-1` container, update `DATABASE_URL` in `.env`, then
`docker compose up -d`.

**After editing the Caddyfile** (validate before reload — a bad file is
rejected and the old config keeps serving):

```bash
docker exec api-caddy-1 caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
docker exec api-caddy-1 caddy reload  --config /etc/caddy/Caddyfile --adapter caddyfile
```

**Cert not issuing after a DNS change?** Caddy caches ACME backoff; a plain
reload won't retry. `docker restart api-caddy-1` resets it (2–3s blip for all
sites it fronts — `api.tonylaw.cc`, `remark42`, etc.). Check progress:

```bash
docker logs --tail 50 api-caddy-1 | grep -i counter
```

**Disk** (this VPS is 10 GB / 512 MB — tight): old `option-tool-api` image
tags accumulate and fill the disk. Reclaim unused images when low:

```bash
docker image prune -a   # removes images not used by any running container
```

---

## Fresh / standalone deploy (reference)

These notes assume the `option-tool` Docker stack already exists on the VPS
(it provides `api_default`, Postgres, and Caddy). To redeploy from scratch:

```bash
# 1. code on the VPS
mkdir -p /opt/counter-service   # copy: index.js, package.json, package-lock.json,
                                # Dockerfile, docker-compose.yml, .dockerignore

# 2. dedicated db + role in the shared Postgres
docker exec -i api-postgres-1 psql -U tonylaw_api -d tonylaw_api <<'SQL'
CREATE ROLE counter LOGIN PASSWORD 'CHANGE_ME';
CREATE DATABASE counter OWNER counter;
SQL

# 3. .env (generate the token; use the role password from step 2)
cat > /opt/counter-service/.env <<EOF
COUNTER_TOKEN=$(openssl rand -hex 32)
DATABASE_URL=postgres://counter:CHANGE_ME@postgres:5432/counter
PORT=8787
EOF
chmod 600 /opt/counter-service/.env

# 4. build + run
cd /opt/counter-service && docker compose up -d --build
docker exec api-caddy-1 wget -qO- http://counter:8787/health   # expect {"ok":true}

# 5. add the counter.tonylaw.cc site block to
#    /opt/tonylaw/option-tool/ops/api/Caddyfile, then validate + reload Caddy
# 6. DNS: counter.tonylaw.cc -> <vps ip>. Caddy issues the cert automatically.
# 7. Vercel blog project: COUNTER_API_URL + COUNTER_API_TOKEN, then redeploy.
```

## Wire to the blog (Vercel)

Vercel blog project → Settings → Environment Variables:

- `COUNTER_API_URL` = `https://counter.tonylaw.cc`
- `COUNTER_API_TOKEN` = the `COUNTER_TOKEN` from `.env`

Redeploy the blog to pick them up. The token stays server-side — it is only
ever read by `api/views.mjs`, never shipped to the browser.
