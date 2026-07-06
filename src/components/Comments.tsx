import React, {useEffect} from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import {useColorMode} from '@docusaurus/theme-common';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

// Remark42 is self-hosted on the VPS behind Caddy; the blog (Vercel) embeds it.
// embed.js exposes window.REMARK42 (uppercase) and mounts into #remark42 by id.
const REMARK_HOST = 'https://comments.tonylaw.cc';
const SITE_ID = 'tonylaw-blog';

declare global {
  interface Window {
    // embed.js assigns these on load
    REMARK42?: {
      createInstance: (config: Record<string, unknown>) => void;
      changeTheme?: (theme: string) => void;
      destroy?: () => void;
    };
    remark_config?: Record<string, unknown>;
  }
}

function Remark42Widget(): JSX.Element {
  const {colorMode} = useColorMode();
  const {i18n} = useDocusaurusContext();
  const theme = colorMode === 'dark' ? 'dark' : 'light';
  const locale = i18n.currentLocale === 'zh' ? 'zh' : 'en';

  useEffect(() => {
    // 1. Global config read by embed.js when it initialises.
    window.remark_config = {
      host: REMARK_HOST,
      site_id: SITE_ID,
      components: ['embed'],
      theme,
      locale,
    };

    // 2. Load embed.js once. On load it sets window.REMARK42 and auto-mounts
    //    into #remark42 (which is already in the DOM by this useEffect).
    if (!document.getElementById('remark42-embed')) {
      const script = document.createElement('script');
      script.id = 'remark42-embed';
      script.async = true;
      script.src = `${REMARK_HOST}/web/embed.js`;
      document.body.appendChild(script);
    }

    // 3. On SPA navigation the script is already loaded and won't auto-init
    //    again, so once REMARK42 is ready we (re)create the instance into the
    //    current #remark42 node. createInstance reuses an existing child
    //    iframe if present, so this is safe to call repeatedly.
    let cancelled = false;
    const timer = window.setInterval(() => {
      if (cancelled) return;
      if (window.REMARK42) {
        window.clearInterval(timer);
        try {
          window.REMARK42.createInstance(window.remark_config ?? {});
        } catch {
          /* #remark42 not in DOM yet — harmless, will render on next mount */
        }
      }
    }, 150);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [theme, locale]);

  // Theme switches while mounted: tell the live iframe instead of remounting.
  useEffect(() => {
    if (window.REMARK42?.changeTheme) {
      try {
        window.REMARK42.changeTheme(theme);
      } catch {
        /* ignore */
      }
    }
  }, [theme]);

  // The id="remark42" is how embed.js finds the mount point (getElementById).
  return <div id="remark42" style={{marginTop: '2rem'}} />;
}

// BrowserOnly: remark42 touches window/document, so skip SSR.
export default function Comments(): JSX.Element {
  return (
    <BrowserOnly fallback={<div style={{marginTop: '2rem'}} />}>
      {() => <Remark42Widget />}
    </BrowserOnly>
  );
}
