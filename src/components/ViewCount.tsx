import {useEffect, useState} from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {useBlogPost} from '@docusaurus/plugin-content-blog/client';

// Displays "X 次阅读" / "X views" beside the reading time in a blog post header.
// Reads the per-post permalink (stable key, carries the /zh/ prefix) and calls
// the /api/views serverless function. Increments once per browser session per
// article (sessionStorage dedup), then reads on subsequent visits. Renders
// nothing until the count arrives and on any failure, so the header never
// breaks and local dev (no /api) simply shows nothing.
function normalizeSlug(permalink: string): string {
  // Strip the locale prefix so EN and ZH of the same article share one counter.
  return permalink.replace(/^\/(zh|en)\//, '/').replace(/^\/+/, '');
}

export default function ViewCount(): JSX.Element | null {
  const {metadata} = useBlogPost();
  const {
    i18n: {currentLocale},
  } = useDocusaurusContext();
  const [views, setViews] = useState<number | null>(null);

  useEffect(() => {
    const slug = normalizeSlug(metadata.permalink);
    if (!slug) {
      return;
    }

    const sessionKey = `viewCounted:${slug}`;
    const counted = sessionStorage.getItem(sessionKey) === '1';
    let cancelled = false;

    fetch(`/api/views?slug=${encodeURIComponent(slug)}`, {
      method: counted ? 'GET' : 'POST',
    })
      .then(response => (response.ok ? response.json() : null))
      .then(data => {
        if (cancelled || !data) {
          return;
        }
        setViews(typeof data.views === 'number' ? data.views : 0);
        if (!counted) {
          sessionStorage.setItem(sessionKey, '1');
        }
      })
      .catch(() => {
        /* leave the counter hidden */
      });

    return () => {
      cancelled = true;
    };
  }, [metadata.permalink]);

  if (views === null) {
    return null;
  }

  const label = currentLocale === 'zh' ? '次阅读' : 'views';
  // Include the leading separator so nothing dangles when the count is absent.
  return <>{` · ${views.toLocaleString()} ${label}`}</>;
}
