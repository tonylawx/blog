import React, {useEffect, useRef} from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import {useColorMode} from '@docusaurus/theme-common';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

// Remark42 is self-hosted on the VPS behind Caddy; the blog (Vercel) embeds it.
const REMARK_HOST = 'https://comments.tonylaw.cc';
const SITE_ID = 'tonylaw-blog';

declare global {
  interface Window {
    remark42?: {
      createWidget: (config: {
        node: HTMLElement;
        site_id: string;
        theme?: string;
        locale?: string;
      }) => void;
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
  const nodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Global config read by embed.js when it initialises.
    window.remark_config = {
      host: REMARK_HOST,
      site_id: SITE_ID,
      components: ['embed'],
    };

    // Load the embed script once; it creates window.remark42.
    if (!document.getElementById('remark42-embed')) {
      const script = document.createElement('script');
      script.id = 'remark42-embed';
      script.async = true;
      script.src = `${REMARK_HOST}/web/embed.js`;
      document.body.appendChild(script);
    }

    // Poll until remark42 is ready, then mount the widget into our node.
    let cancelled = false;
    const timer = window.setInterval(() => {
      if (cancelled || !window.remark42 || !nodeRef.current) return;
      window.clearInterval(timer);
      nodeRef.current.innerHTML = '';
      window.remark42.createWidget({
        node: nodeRef.current,
        site_id: SITE_ID,
        theme,
        locale,
      });
    }, 200);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.remark42?.destroy?.();
    };
  }, [theme, locale]);

  return <div ref={nodeRef} style={{marginTop: '2rem'}} />;
}

// BrowserOnly: remark42 touches window/document, so it must not run during SSR.
export default function Comments(): JSX.Element {
  return (
    <BrowserOnly fallback={<div style={{marginTop: '2rem'}} />}>
      {() => <Remark42Widget />}
    </BrowserOnly>
  );
}
