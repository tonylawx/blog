// Per-article view counter. The browser calls this same-origin Vercel function;
// this function forwards to a self-hosted counter-service (HTTP front for Redis
// on a VPS). The shared secret lives server-side only — it is never shipped to
// the browser.
//   GET  /api/views?slug=...  -> read-only {views}
//   POST /api/views?slug=...  -> INCR + {views}
//
// Returns {views: <number>} when a real count exists, and {views: null}
// otherwise (counter service not configured, invalid slug, cross-origin POST,
// lookup failure, or a key never incremented). The UI hides the counter on
// null — no misleading "0 views", and it stays quiet until COUNTER_API_URL /
// COUNTER_API_TOKEN are set in Vercel.
//
// ESM (.mjs) so import/export work regardless of package.json "type".

const COUNTER_API_URL = process.env.COUNTER_API_URL; // e.g. https://counter.example.com
const COUNTER_API_TOKEN = process.env.COUNTER_API_TOKEN; // shared secret

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

async function counterApi(op, key) {
  // op is 'incr' (POST) or 'get' (GET). The counter-service returns {result}.
  const res = await fetch(
    `${COUNTER_API_URL}/${op}?key=${encodeURIComponent(key)}`,
    {
      method: op === 'incr' ? 'POST' : 'GET',
      headers: {'X-Counter-Token': COUNTER_API_TOKEN},
    },
  );
  if (!res.ok) {
    throw new Error(`counter API responded ${res.status}`);
  }
  const data = await res.json();
  return data.result; // incr -> number, get -> string|null
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const slug = normalizeSlug(req.query?.slug || '');
  if (!slug) {
    res.status(200).json({views: null});
    return;
  }

  // Not configured yet — keep the UI quiet instead of erroring.
  if (!COUNTER_API_URL || !COUNTER_API_TOKEN) {
    res.status(200).json({views: null});
    return;
  }

  const increment = req.method === 'POST';
  if (increment && !sameOrigin(req)) {
    res.status(403).json({views: null});
    return;
  }

  try {
    const result = await counterApi(
      increment ? 'incr' : 'get',
      `views:${slug}`,
    );
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
