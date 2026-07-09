import React from 'react';
import Layout from '@theme/Layout';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {Icon, type IconifyIcon} from '@iconify/react';
// Utility icons — Material Design Icons
import emailIcon from '@iconify-icons/mdi/email-outline';
import giftIcon from '@iconify-icons/mdi/gift-outline';
import postIcon from '@iconify-icons/mdi/post-outline';
import arrowExternalIcon from '@iconify-icons/mdi/arrow-top-right';
import arrowInternalIcon from '@iconify-icons/mdi/arrow-right';
// Brand icons — Simple Icons
import xIcon from '@iconify-icons/simple-icons/x';
import threadsIcon from '@iconify-icons/simple-icons/threads';
import telegramIcon from '@iconify-icons/simple-icons/telegram';
import githubIcon from '@iconify-icons/simple-icons/github';

type LinkItem = {
  label: string;
  desc: string;
  href: string;
  /** Brand color — drives the chip tint + hover fill + focus ring. */
  color: string;
  /** Iconify icon object. Mutually exclusive with `img`. */
  icon?: IconifyIcon;
  /** Glyph color in the resting state; defaults to theme-adaptive currentColor. */
  glyphColor?: string;
  /** Local image (e.g. a product logo). Mutually exclusive with `icon`. */
  img?: string;
};

const LINKS: LinkItem[] = [
  {label: 'THETA', desc: 'theta.tonylaw.cc · 美股期权工具', href: 'https://theta.tonylaw.cc', color: '#2763e9', img: '/img/theta-icon.png'},
  {label: 'uSMART 开户福利', desc: '美股券商开户奖励活动', href: 'https://m.usmartsg66.com/promo/overseas/bonus-dec.html?ICode=sere&langType=3&Id=', color: '#f59e0b', icon: giftIcon, glyphColor: '#f59e0b'},
  {label: 'X (Twitter)', desc: '@tonylawdotcc', href: 'https://x.com/tonylawdotcc', color: '#0f0f0f', icon: xIcon},
  {label: 'Threads', desc: '@tonylaw.cc', href: 'https://www.threads.com/@tonylaw.cc', color: '#0f0f0f', icon: threadsIcon},
  {label: 'Telegram 群', desc: 'usstocknoptionchat · 美股期权交流', href: 'https://t.me/usstocknoptionchat', color: '#2aabee', icon: telegramIcon, glyphColor: '#2aabee'},
  {label: 'GitHub', desc: '@tonylawx', href: 'https://github.com/tonylawx', color: '#181717', icon: githubIcon},
  {label: 'Email', desc: 'hello@tonylaw.cc', href: 'mailto:hello@tonylaw.cc', color: '#6E7681', icon: emailIcon},
  {label: 'Blog', desc: 'www.tonylaw.cc · 博客首页', href: '/', color: '#2563eb', icon: postIcon},
];

export default function LinksPage(): JSX.Element {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout title="Links" description="All my links in one place — THETA, X, Threads, Telegram, GitHub, email, blog.">
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
        <div className="links-list">
          {LINKS.map((l) => {
            const internal = l.href.startsWith('/');
            const styleVars = {
              '--brand': l.color,
              ...(l.glyphColor ? {'--brand-glyph': l.glyphColor} : {}),
            } as React.CSSProperties;
            return (
              <a
                key={l.label}
                href={l.href}
                {...(internal ? {} : {target: '_blank', rel: 'noopener noreferrer'})}
                className={`links-card${l.img ? ' links-card--img' : ''}`}
                style={styleVars}
              >
                <span className="links-chip">
                  {l.img ? (
                    <img src={l.img} alt={l.label} className="links-chip-img" />
                  ) : (
                    <Icon icon={l.icon!} aria-hidden="true" />
                  )}
                </span>
                <span className="links-text">
                  <span className="links-label">{l.label}</span>
                  <span className="links-desc">{l.desc}</span>
                </span>
                <Icon
                  icon={internal ? arrowInternalIcon : arrowExternalIcon}
                  aria-hidden="true"
                  className="links-arrow"
                />
              </a>
            );
          })}
        </div>
      </main>
    </Layout>
  );
}
