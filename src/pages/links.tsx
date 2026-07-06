import React from 'react';
import Layout from '@theme/Layout';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

type LinkItem = {
  label: string;
  desc: string;
  href: string;
  icon: string;
  color: string;
};

const LINKS: LinkItem[] = [
  {label: 'Threads', desc: '@tonylaw.cc', href: 'https://www.threads.com/@tonylaw.cc', icon: '🧵', color: '#000'},
  {label: 'Telegram 群', desc: 'usstocknoptionchat · 美股期权交流', href: 'https://t.me/usstocknoptionchat', icon: '✈️', color: '#0088cc'},
  {label: 'X (Twitter)', desc: '@tonylawdotcc', href: 'https://x.com/tonylawdotcc', icon: '𝕏', color: '#000'},
  {label: 'GitHub', desc: '@tonylawx', href: 'https://github.com/tonylawx', icon: '🐙', color: '#333'},
  {label: 'Blog', desc: 'www.tonylaw.cc · 博客首页', href: '/', icon: '📝', color: '#2763e9'},
];

export default function LinksPage(): JSX.Element {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout title="Links" description="All my links in one place — Threads, Telegram, X, GitHub, blog.">
      <main
        style={{
          minHeight: '72vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '3rem 1rem 4rem',
        }}
      >
        <img
          src="https://github.com/tonylawx.png"
          alt="Tony Law"
          style={{width: 96, height: 96, borderRadius: '50%', marginBottom: '1rem', border: '3px solid var(--ifm-color-primary)'}}
        />
        <h1 style={{margin: '0 0 0.25rem', fontSize: '1.75rem'}}>{siteConfig.title}</h1>
        <p style={{opacity: 0.65, marginBottom: '2rem', fontSize: '0.95rem'}}>{siteConfig.tagline}</p>
        <div style={{width: '100%', maxWidth: 460, display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
          {LINKS.map((l) => {
            const internal = l.href.startsWith('/');
            return (
              <a
                key={l.label}
                href={l.href}
                {...(internal ? {} : {target: '_blank', rel: 'noopener noreferrer'})}
                className="card-interactive card padding--lg"
                style={{display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none', color: 'inherit'}}
              >
                <span
                  style={{
                    fontSize: '1.6rem',
                    width: 44,
                    height: 44,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '12px',
                    background: `${l.color}14`,
                    flexShrink: 0,
                  }}
                >
                  {l.icon}
                </span>
                <span style={{flexGrow: 1}}>
                  <span style={{display: 'block', fontWeight: 700, fontSize: '1.02rem'}}>{l.label}</span>
                  <span style={{display: 'block', fontSize: '0.82rem', opacity: 0.55}}>{l.desc}</span>
                </span>
                <span style={{opacity: 0.3, fontSize: '1.2rem'}}>{internal ? '→' : '↗'}</span>
              </a>
            );
          })}
        </div>
      </main>
    </Layout>
  );
}
