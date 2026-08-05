import {useEffect, type ReactNode} from 'react';
import OriginalRoot from '@theme-original/Root';
import {Analytics} from '@vercel/analytics/react';

const LIGHT_THEME_COLOR = '#ffffff';
const DARK_THEME_COLOR = '#0f1117';

function syncSafariThemeColor(): void {
  const dark =
    document.documentElement.getAttribute('data-theme') === 'dark';
  let meta = document.querySelector(
    'meta[name="theme-color"]:not([media])',
  ) as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', dark ? DARK_THEME_COLOR : LIGHT_THEME_COLOR);
}

// Wraps the core `Root` to mount Vercel Web Analytics on every page. The site
// had no analytics before this; on deploy Vercel auto-enables Web Analytics
// and per-path PV/UV show up in the dashboard.
//
// Also keeps Safari's status-bar `theme-color` in sync with Docusaurus
// `data-theme`, so iOS chrome matches light/dark instead of staying light.
export default function Root({children}: {children?: ReactNode}): ReactNode {
  useEffect(() => {
    syncSafariThemeColor();
    const observer = new MutationObserver(syncSafariThemeColor);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <OriginalRoot>
      {children}
      <Analytics />
    </OriginalRoot>
  );
}
