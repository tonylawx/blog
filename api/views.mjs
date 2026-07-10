// Per-article view counter backed by Upstash Redis via its REST API (no SDK).
//   GET  /api/views?slug=...  -> read-only {views}
//   POST /api/views?slug=...  -> INCR + {views}
//
// Returns {views: <number>} when a real count exists, and {views: null}
// otherwise (Upstash env vars unset, invalid slug, cross-origin POST, lookup
// failure, or a key never incremented). The UI hides the counter on null, so
// it stays quiet until UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are
// configured in Vercel — no misleading "0 views".
//
// ESM (.mjs) so import/export work regardless of package.json "type".

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const SLUG_RE = /^[A-Za-z0-9/_.-]+$/;

// Strip the locale prefix so EN and ZH of the same article share one counter.
function normalizeSlug(raw) {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 200) {
    return '';
  }
  const slug = raw.replace(/^\/(zh|en)(\/|$)/, '/').replace(/^\/+/, '');
  return SLUG_RE.test(slug) ? slug : '';
}

// Reject cross-origin POSTs to make drive-by inflation harder.
function sameOrigin(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  if (!host) {
    return true; // unknown environment (e.g. local) — allow
  }
  const origin = req.headers.origin;
  const referer = req.headers.referer;
  const target = origin || (referer ? new URL(referer).origin : '');
  if (!target) {
    return true; // same-origin browser requests usually carry no Origin header
  }
  try {
    return new URL(target).host === host;
  } catch {
    return false;
  }
}

async function upstash(command, key) {
  const res = await fetch(`${UPSTASH_URL}/${command}/${encodeURIComponent(key)}`, {
    headers: {Authorization: `Bearer ${UPSTASH_TOKEN}`},
  });
  if (!res.ok) {
    throw new Error(`Upstash responded ${res.status}`);
  }
  const data = await res.json();
  return data.result; // INCR -> number, GET -> string|null
}

// Returns {views: <number>} only when a real count exists. Returns {views: null}
// when Upstash is not configured, the slug is invalid, the request is
// cross-origin, the lookup fails, or a key has never been incremented — so the
// UI hides the counter instead of showing a misleading "0".
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const slug = normalizeSlug(req.query?.slug || '');
  if (!slug) {
    res.status(200).json({views: null});
    return;
  }

  // Not configured yet — keep the UI quiet instead of erroring.
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    res.status(200).json({views: null});
    return;
  }

  const increment = req.method === 'POST';
  if (increment && !sameOrigin(req)) {
    res.status(403).json({views: null});
    return;
  }

  try {
    const result = await upstash(increment ? 'incr' : 'get', `views:${slug}`);
    if (result === null) {
      // GET on a key that was never incremented — nothing to show yet.
      res.status(200).json({views: null});
      return;
    }
    const views = Number(result);
    res.status(200).json({views: Number.isFinite(views) ? views : null});
  } catch {
    res.status(200).json({views: null});
  }
}
