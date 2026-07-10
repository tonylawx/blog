// Per-article view counter backed by Upstash Redis via its REST API (no SDK).
//   GET  /api/views?slug=...  -> read-only {views}
//   POST /api/views?slug=...  -> INCR + {views}
//
// Returns {views:0} gracefully when Upstash env vars are unset or the slug is
// invalid, so the site never errors — the counter simply stays hidden until
// UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are configured in Vercel.
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

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const slug = normalizeSlug(req.query?.slug || '');
  if (!slug) {
    res.status(200).json({views: 0});
    return;
  }

  // Not configured yet — keep the UI quiet instead of erroring.
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    res.status(200).json({views: 0});
    return;
  }

  const increment = req.method === 'POST';
  if (increment && !sameOrigin(req)) {
    res.status(403).json({views: 0});
    return;
  }

  try {
    const result = await upstash(increment ? 'incr' : 'get', `views:${slug}`);
    const views = result === null ? 0 : Number(result);
    res.status(200).json({views: Number.isFinite(views) ? views : 0});
  } catch {
    res.status(200).json({views: 0});
  }
}
