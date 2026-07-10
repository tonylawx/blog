// Tiny HTTP front for a PostgreSQL table, used by the blog's /api/views Vercel
// function. Only two operations, both token-gated and slug-whitelisted so the
// database is only touched through this narrow API:
//   POST /incr?slug=<slug>  -> upsert + increment, returns {result: <number>}
//   GET  /get?slug=<slug>   -> read, returns {result: <number|null>}
//   GET  /health            -> {ok: true}  (no auth, for uptime checks)
//
// The view_counts table is created automatically on first use. Run behind HTTPS
// (Caddy/nginx auto-TLS). See README.md.

import http from 'node:http';
import pg from 'pg';

const PORT = Number(process.env.PORT || 8787);
const TOKEN = process.env.COUNTER_TOKEN;
const DATABASE_URL = process.env.DATABASE_URL; // e.g. postgres://counter:pass@127.0.0.1:5432/counter

// Only this slug shape is accepted — defense in depth alongside the Vercel
// function's own slug normalization.
const SLUG_RE = /^[A-Za-z0-9/_.-]+$/;

if (!TOKEN) {
  console.error('COUNTER_TOKEN env var is required (shared secret with Vercel).');
  process.exit(1);
}
if (!DATABASE_URL) {
  console.error('DATABASE_URL env var is required (e.g. postgres://user:pass@host:5432/db).');
  process.exit(1);
}

const pool = new pg.Pool({connectionString: DATABASE_URL});
pool.on('error', (err) => {
  // Log idle connection errors so they don't crash the process; per-request
  // failures are caught in the handler below and returned as 502.
  console.error('pg pool:', err.message);
});

let tableReady = false;

async function ensureTable() {
  if (tableReady) {
    return true;
  }
  try {
    await pool.query(
      'CREATE TABLE IF NOT EXISTS view_counts (slug TEXT PRIMARY KEY, views BIGINT NOT NULL DEFAULT 0)',
    );
    tableReady = true;
    return true;
  } catch (err) {
    console.error('pg ensureTable:', err.message);
    return false;
  }
}

// Best-effort at boot so the table exists once Postgres is reachable; also
// re-checked lazily inside each request to self-heal after a DB outage.
ensureTable();

function send(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(body));
}

function authorized(req) {
  return req.headers['x-counter-token'] === TOKEN;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const {pathname} = url;
  const slug = url.searchParams.get('slug');

  if (pathname === '/health') {
    return send(res, 200, {ok: true});
  }

  if (!authorized(req)) {
    return send(res, 401, {error: 'unauthorized'});
  }

  const op = pathname === '/incr' ? 'incr' : pathname === '/get' ? 'get' : null;
  if (!op || !slug || !SLUG_RE.test(slug)) {
    return send(res, 400, {error: 'bad request'});
  }
  if (op === 'incr' && req.method !== 'POST') {
    return send(res, 405, {error: 'method not allowed'});
  }

  if (!(await ensureTable())) {
    return send(res, 502, {error: 'database unavailable'});
  }

  try {
    if (op === 'incr') {
      const r = await pool.query(
        `INSERT INTO view_counts (slug, views) VALUES ($1, 1)
         ON CONFLICT (slug) DO UPDATE SET views = view_counts.views + 1
         RETURNING views`,
        [slug],
      );
      return send(res, 200, {result: Number(r.rows[0].views)});
    }
    const r = await pool.query(
      'SELECT views FROM view_counts WHERE slug = $1',
      [slug],
    );
    return send(res, 200, {result: r.rows.length ? Number(r.rows[0].views) : null});
  } catch (err) {
    console.error('pg query:', err.message);
    return send(res, 502, {error: 'database failed'});
  }
});

server.listen(PORT, () => {
  console.log(`counter service listening on :${PORT}`);
});
