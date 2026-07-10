// Tiny HTTP front for a local Redis, used by the blog's /api/views Vercel
// function. Only two operations, both token-gated and key-whitelisted so the
// raw Redis port never has to face the public internet:
//   POST /incr?key=views:<slug>  -> INCR, returns {result: <number>}
//   GET  /get?key=views:<slug>   -> GET,  returns {result: <string|null>}
//   GET  /health                 -> {ok: true}  (no auth, for uptime checks)
//
// Run on the VPS behind HTTPS (Caddy/nginx auto-TLS). See README.md.

import http from 'node:http';
import Redis from 'ioredis';

const PORT = Number(process.env.PORT || 8787);
const TOKEN = process.env.COUNTER_TOKEN;
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// Only this key shape is allowed — defense in depth alongside the Vercel
// function's own slug validation.
const KEY_RE = /^views:[A-Za-z0-9/_.-]+$/;

if (!TOKEN) {
  console.error('COUNTER_TOKEN env var is required (shared secret with Vercel).');
  process.exit(1);
}

const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 2,
  // Reconnect automatically; ioredis handles backoff.
});
redis.on('error', (err) => {
  // Keep connection errors from crashing the process or spamming; per-request
  // failures are caught in the handler below and returned as 502.
  console.error('redis:', err.message);
});

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
  const key = url.searchParams.get('key');

  if (pathname === '/health') {
    return send(res, 200, {ok: true});
  }

  if (!authorized(req)) {
    return send(res, 401, {error: 'unauthorized'});
  }

  const op = pathname === '/incr' ? 'incr' : pathname === '/get' ? 'get' : null;
  if (!op || !key || !KEY_RE.test(key)) {
    return send(res, 400, {error: 'bad request'});
  }
  if (op === 'incr' && req.method !== 'POST') {
    return send(res, 405, {error: 'method not allowed'});
  }

  try {
    if (op === 'incr') {
      const n = await redis.incr(key);
      return send(res, 200, {result: n});
    }
    const v = await redis.get(key);
    return send(res, 200, {result: v}); // string | null
  } catch (err) {
    console.error('redis error:', err.message);
    return send(res, 502, {error: 'redis failed'});
  }
});

server.listen(PORT, () => {
  console.log(`counter service listening on :${PORT}`);
});
