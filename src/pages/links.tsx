import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
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

type Locale = 'en' | 'zh';

type LocalizedText = Record<Locale, string>;

type LinkItem = {
  label: LocalizedText;
  desc: LocalizedText;
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

const PAGE_TEXT: Record<Locale, {description: string; tagline: string}> = {
  en: {
    description: 'All my links in one place — THETA, X, Threads, Telegram, GitHub, email, blog.',
    tagline: 'Software engineer & options trader',
  },
  zh: {
    description: '我的常用链接：THETA、X、Threads、Telegram、GitHub、邮箱和博客。',
    tagline: '软件工程师 / 美股期权交易者',
  },
};

const LINKS: LinkItem[] = [
  {
    label: {en: 'THETA', zh: 'THETA'},
    desc: {en: 'theta.tonylaw.cc · US options tools', zh: 'theta.tonylaw.cc · 美股期权工具'},
    href: 'https://theta.tonylaw.cc',
    color: '#2763e9',
    img: '/img/theta-icon.png',
  },
  {
    label: {en: 'Binance Referral', zh: '币安邀请福利'},
    desc: {en: 'Refer2Earn · USDC rewards', zh: 'Refer2Earn · USDC 奖励活动'},
    href: 'https://www.bsmkweb.cc/referral/earn-together/refer2earn-usdc/claim?hl=zh-CN&ref=GRO_28502_8G320&utm_source=referral_entrance',
    color: '#f0b90b',
    icon: giftIcon,
    glyphColor: '#f0b90b',
  },
  {
    label: {en: 'uSMART Bonus', zh: 'uSMART 开户福利'},
    desc: {en: 'US stock brokerage account bonus', zh: '美股券商开户奖励活动'},
    href: 'https://m.usmartsg66.com/promo/overseas/bonus-dec.html?ICode=sere&langType=3&Id=',
    color: '#f59e0b',
    icon: giftIcon,
    glyphColor: '#f59e0b',
  },
  {
    label: {en: 'X (Twitter)', zh: 'X (Twitter)'},
    desc: {en: '@tonylawdotcc', zh: '@tonylawdotcc'},
    href: 'https://x.com/tonylawdotcc',
    color: '#0f0f0f',
    icon: xIcon,
  },
  {
    label: {en: 'Threads', zh: 'Threads'},
    desc: {en: '@tonylaw.cc', zh: '@tonylaw.cc'},
    href: 'https://www.threads.com/@tonylaw.cc',
    color: '#0f0f0f',
    icon: threadsIcon,
  },
  {
    label: {en: 'Telegram Group', zh: 'Telegram 群'},
    desc: {en: 'usstocknoptionchat · US stocks and options', zh: 'usstocknoptionchat · 美股期权交流'},
    href: 'https://t.me/usstocknoptionchat',
    color: '#2aabee',
    icon: telegramIcon,
    glyphColor: '#2aabee',
  },
  {
    label: {en: 'GitHub', zh: 'GitHub'},
    desc: {en: '@tonylawx', zh: '@tonylawx'},
    href: 'https://github.com/tonylawx',
    color: '#181717',
    icon: githubIcon,
  },
  {
    label: {en: 'Email', zh: '邮箱'},
    desc: {en: 'hello@tonylaw.cc', zh: 'hello@tonylaw.cc'},
    href: 'mailto:hello@tonylaw.cc',
    color: '#6E7681',
    icon: emailIcon,
  },
  {
    label: {en: 'Blog', zh: '博客'},
    desc: {en: 'www.tonylaw.cc · Blog homepage', zh: 'www.tonylaw.cc · 博客首页'},
    href: '/',
    color: '#2563eb',
    icon: postIcon,
  },
];

function getLocale(locale: string | undefined): Locale {
  return locale === 'zh' ? 'zh' : 'en';
}

export default function LinksPage(): JSX.Element {
  const {siteConfig, i18n} = useDocusaurusContext();
  const locale = getLocale(i18n.currentLocale);
  const pageText = PAGE_TEXT[locale];

  return (
    <Layout title="Links" description={pageText.description}>
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
        <p style={{opacity: 0.65, marginBottom: '2rem', fontSize: '0.95rem'}}>{pageText.tagline}</p>
        <div className="links-list">
          {LINKS.map((item) => {
            const internal = item.href.startsWith('/');
            const label = item.label[locale];
            const styleVars = {
              '--brand': item.color,
              ...(item.glyphColor ? {'--brand-glyph': item.glyphColor} : {}),
            } as React.CSSProperties;
            const card = (
              <>
                <span className="links-chip">
                  {item.img ? (
                    <img src={item.img} alt={label} className="links-chip-img" />
                  ) : (
                    <Icon icon={item.icon!} aria-hidden="true" />
                  )}
                </span>
                <span className="links-text">
                  <span className="links-label">{label}</span>
                  <span className="links-desc">{item.desc[locale]}</span>
                </span>
                <Icon
                  icon={internal ? arrowInternalIcon : arrowExternalIcon}
                  aria-hidden="true"
                  className="links-arrow"
                />
              </>
            );

            return internal ? (
              <Link
                key={label}
                to={item.href}
                className={`links-card${item.img ? ' links-card--img' : ''}`}
                style={styleVars}
              >
                {card}
              </Link>
            ) : (
              <a
                key={label}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`links-card${item.img ? ' links-card--img' : ''}`}
                style={styleVars}
              >
                {card}
              </a>
            );
          })}
        </div>
      </main>
    </Layout>
  );
}
