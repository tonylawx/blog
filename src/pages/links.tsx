import React, {useCallback, useEffect, useState} from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {Icon, type IconifyIcon} from '@iconify/react';
// Utility icons — Material Design Icons
import airplaneIcon from '@iconify-icons/mdi/airplane';
import emailIcon from '@iconify-icons/mdi/email-outline';
import giftIcon from '@iconify-icons/mdi/gift-outline';
import postIcon from '@iconify-icons/mdi/post-outline';
import qrIcon from '@iconify-icons/mdi/qrcode';
import simOutlineIcon from '@iconify-icons/mdi/sim-outline';
import arrowExternalIcon from '@iconify-icons/mdi/arrow-top-right';
import arrowInternalIcon from '@iconify-icons/mdi/arrow-right';
// Brand icons — Simple Icons
import xIcon from '@iconify-icons/simple-icons/x';
import instagramIcon from '@iconify-icons/simple-icons/instagram';
import threadsIcon from '@iconify-icons/simple-icons/threads';
import telegramIcon from '@iconify-icons/simple-icons/telegram';
import githubIcon from '@iconify-icons/simple-icons/github';
import wiseIcon from '@iconify-icons/simple-icons/wise';
import wechatIcon from '@iconify-icons/simple-icons/wechat';

const xiaohongshuIcon: IconifyIcon = {
  width: 24,
  height: 24,
  body:
    '<path fill="currentColor" d="M22.405 9.879c.002.016.01.02.07.019h.725a.797.797 0 0 0 .78-.972.794.794 0 0 0-.884-.618.795.795 0 0 0-.692.794c0 .101-.002.666.001.777zm-11.509 4.808c-.203.001-1.353.004-1.685.003a2.528 2.528 0 0 1-.766-.126.025.025 0 0 0-.03.014L7.7 16.127a.025.025 0 0 0 .01.032c.111.06.336.124.495.124.66.01 1.32.002 1.981 0 .01 0 .02-.006.023-.015l.712-1.545a.025.025 0 0 0-.024-.036zM.477 9.91c-.071 0-.076.002-.076.01a.834.834 0 0 0-.01.08c-.027.397-.038.495-.234 3.06-.012.24-.034.389-.135.607-.026.057-.033.042.003.112.046.092.681 1.523.787 1.74.008.015.011.02.017.02.008 0 .033-.026.047-.044.147-.187.268-.391.371-.606.306-.635.44-1.325.486-1.706.014-.11.021-.22.03-.33l.204-2.616.022-.293c.003-.029 0-.033-.03-.034zm7.203 3.757a1.427 1.427 0 0 1-.135-.607c-.004-.084-.031-.39-.235-3.06a.443.443 0 0 0-.01-.082c-.004-.011-.052-.008-.076-.008h-1.48c-.03.001-.034.005-.03.034l.021.293c.076.982.153 1.964.233 2.946.05.4.186 1.085.487 1.706.103.215.223.419.37.606.015.018.037.051.048.049.02-.003.742-1.642.804-1.765.036-.07.03-.055.003-.112zm3.861-.913h-.872a.126.126 0 0 1-.116-.178l1.178-2.625a.025.025 0 0 0-.023-.035l-1.318-.003a.148.148 0 0 1-.135-.21l.876-1.954a.025.025 0 0 0-.023-.035h-1.56c-.01 0-.02.006-.024.015l-.926 2.068c-.085.169-.314.634-.399.938a.534.534 0 0 0-.02.191.46.46 0 0 0 .23.378.981.981 0 0 0 .46.119h.59c.041 0-.688 1.482-.834 1.972a.53.53 0 0 0-.023.172.465.465 0 0 0 .23.398c.15.092.342.12.475.12l1.66-.001c.01 0 .02-.006.023-.015l.575-1.28a.025.025 0 0 0-.024-.035zm-6.93-4.937H3.1a.032.032 0 0 0-.034.033c0 1.048-.01 2.795-.01 6.829 0 .288-.269.262-.28.262h-.74c-.04.001-.044.004-.04.047.001.037.465 1.064.555 1.263.01.02.03.033.051.033.157.003.767.009.938-.014.153-.02.3-.06.438-.132.3-.156.49-.419.595-.765.052-.172.075-.353.075-.533.002-2.33 0-4.66-.007-6.991a.032.032 0 0 0-.032-.032zm11.784 6.896c0-.014-.01-.021-.024-.022h-1.465c-.048-.001-.049-.002-.05-.049v-4.66c0-.072-.005-.07.07-.07h.863c.08 0 .075.004.075-.074V8.393c0-.082.006-.076-.08-.076h-3.5c-.064 0-.075-.006-.075.073v1.445c0 .083-.006.077.08.077h.854c.075 0 .07-.004.07.07v4.624c0 .095.008.084-.085.084-.37 0-1.11-.002-1.304 0-.048.001-.06.03-.06.03l-.697 1.519s-.014.025-.008.036c.006.01.013.008.058.008 1.748.003 3.495.002 5.243.002.03-.001.034-.006.035-.033v-1.539zm4.177-3.43c0 .013-.007.023-.02.024-.346.006-.692.004-1.037.004-.014-.002-.022-.01-.022-.024-.005-.434-.007-.869-.01-1.303 0-.072-.006-.071.07-.07l.733-.003c.041 0 .081.002.12.015.093.025.16.107.165.204.006.431.002 1.153.001 1.153zm2.67.244a1.953 1.953 0 0 0-.883-.222h-.18c-.04-.001-.04-.003-.042-.04V10.21c0-.132-.007-.263-.025-.394a1.823 1.823 0 0 0-.153-.53 1.533 1.533 0 0 0-.677-.71 2.167 2.167 0 0 0-1-.258c-.153-.003-.567 0-.72 0-.07 0-.068.004-.068-.065V7.76c0-.031-.01-.041-.046-.039H17.93s-.016 0-.023.007c-.006.006-.008.012-.008.023v.546c-.008.036-.057.015-.082.022h-.95c-.022.002-.028.008-.03.032v1.481c0 .09-.004.082.082.082h.913c.082 0 .072.128.072.128V11.19s.003.117-.06.117h-1.482c-.068 0-.06.082-.06.082v1.445s-.01.068.064.068h1.457c.082 0 .076-.006.076.079v3.225c0 .088-.007.081.082.081h1.43c.09 0 .082.007.082-.08v-3.27c0-.029.006-.035.033-.035l2.323-.003c.098 0 .191.02.28.061a.46.46 0 0 1 .274.407c.008.395.003.79.003 1.185 0 .259-.107.367-.33.367h-1.218c-.023.002-.029.008-.028.033.184.437.374.871.57 1.303a.045.045 0 0 0 .04.026c.17.005.34.002.51.003.15-.002.517.004.666-.01a2.03 2.03 0 0 0 .408-.075c.59-.18.975-.698.976-1.313v-1.981c0-.128-.01-.254-.034-.38 0 .078-.029-.641-.724-.998z"/>',
};

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
  /** Show a QR code modal instead of navigating away. */
  qrCode?: string;
  /** Optional hint shown under the QR code in the modal. */
  qrHint?: LocalizedText;
};

type LinkCategory = {
  id: string;
  title: LocalizedText;
  items: LinkItem[];
};

const PAGE_TEXT: Record<Locale, {description: string; tagline: string}> = {
  en: {
    description: 'All my links in one place — finance, digital nomad tools, and social media.',
    tagline: 'US stock investor · options trader · AI full-stack engineer · China National Ski Instructor',
  },
  zh: {
    description: '我的常用链接：金融、数字移民与社交媒体。',
    tagline: '美股投资者 · 期权交易者 · AI 全栈工程师 · 中国国职滑雪教练',
  },
};

const QR_MODAL_TEXT: Record<Locale, {close: string}> = {
  en: {close: 'Close'},
  zh: {close: '关闭'},
};

const LINK_CATEGORIES: LinkCategory[] = [
  {
    id: 'finance',
    title: {en: 'Finance', zh: '金融'},
    items: [
      {
        label: {en: 'THETA', zh: 'THETA'},
        desc: {en: 'theta.tonylaw.cc · US options tools', zh: 'theta.tonylaw.cc · 美股期权工具'},
        href: 'https://theta.tonylaw.cc',
        color: '#2763e9',
        img: '/img/theta-icon.png',
      },
      {
        label: {en: 'Longbridge Skill', zh: '长桥证券 Skill'},
        desc: {en: 'open.longbridge.com · AI trading skill invite', zh: 'open.longbridge.com · AI 交易 Skill 邀请福利'},
        href: 'https://open.longbridge.com/zh-HK/skill?invite-code=3GTL1J',
        color: '#00b8b8',
        img: '/img/longbridge-icon.svg',
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
        label: {en: 'Wise Invite', zh: 'Wise 邀请福利'},
        desc: {en: 'International money transfer invite', zh: '跨境汇款邀请奖励'},
        href: 'https://wise.com/invite/ilpc/haoyanl20',
        color: '#9fe870',
        icon: wiseIcon,
        glyphColor: '#9fe870',
      },
      {
        label: {en: 'Binance Referral', zh: '币安邀请福利'},
        desc: {en: 'Refer2Earn · USDC rewards', zh: 'Refer2Earn · USDC 奖励活动'},
        href: 'https://www.bsmkweb.cc/referral/earn-together/refer2earn-usdc/claim?hl=zh-CN&ref=GRO_28502_8G320&utm_source=referral_entrance',
        color: '#f0b90b',
        icon: giftIcon,
        glyphColor: '#f0b90b',
      },
    ],
  },
  {
    id: 'digital-nomad',
    title: {en: 'Digital Nomad', zh: '数字移民'},
    items: [
      {
        label: {en: 'Airport (Proxy)', zh: '机场'},
        desc: {en: 'ssr.wtf · High-speed proxy service', zh: 'ssr.wtf · 高速稳定网络加速'},
        href: 'https://ssr.wtf/auth/register?code=d45365025b',
        color: '#0284c7',
        icon: airplaneIcon,
        glyphColor: '#0284c7',
      },
      {
        label: {en: 'Xesim Promo Code', zh: 'Xesim 粉丝折扣码'},
        desc: {
          en: 'xesim.cc · Bluetooth eSIM card, no native eSIM required, iPhone ready',
          zh: 'xesim.cc · 蓝牙 eSIM 实体卡，免原生支持/免读卡器，iPhone 随便用',
        },
        href: 'https://xesim.cc/?DIST=Q0NCG1g%3D',
        color: '#ef8a35',
        icon: simOutlineIcon,
        glyphColor: '#ef8a35',
      },
    ],
  },
  {
    id: 'social',
    title: {en: 'Social Media', zh: '社交媒体'},
    items: [
      {
        label: {en: 'X (Twitter)', zh: 'X (Twitter)'},
        desc: {en: '@tonylawdotcc', zh: '@tonylawdotcc'},
        href: 'https://x.com/tonylawdotcc',
        color: '#0f0f0f',
        icon: xIcon,
      },
      {
        label: {en: 'Blog', zh: '博客'},
        desc: {en: 'www.tonylaw.cc · Blog homepage', zh: 'www.tonylaw.cc · 博客首页'},
        href: '/',
        color: '#2563eb',
        icon: postIcon,
      },
      {
        label: {en: 'WeChat Official Account', zh: '微信公众号'},
        desc: {en: '蜘蛛也会思考 · tap to scan QR code', zh: '蜘蛛也会思考 · 点击扫码关注'},
        href: '#',
        qrCode: '/img/wechat-qrcode.png',
        qrHint: {
          en: 'Scan with WeChat to follow',
          zh: '微信扫描二维码，关注我的账号',
        },
        color: '#07c160',
        icon: wechatIcon,
        glyphColor: '#07c160',
      },
      {
        label: {en: 'Personal WeChat', zh: '个人微信'},
        desc: {en: '支性难改 · tap to scan QR code', zh: '支性难改 · 点击扫码添加好友'},
        href: '#',
        qrCode: '/img/wechat-personal-qrcode.jpg',
        qrHint: {
          en: 'Scan with WeChat to add me as a friend',
          zh: '微信扫描二维码，添加我为朋友',
        },
        color: '#07c160',
        icon: wechatIcon,
        glyphColor: '#07c160',
      },
      {
        label: {en: 'Instagram', zh: 'Instagram'},
        desc: {en: '@tonylaw.cc', zh: '@tonylaw.cc'},
        href: 'https://www.instagram.com/tonylaw.cc/',
        color: '#e4405f',
        icon: instagramIcon,
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
        label: {en: 'Xiaohongshu', zh: '小红书'},
        desc: {en: 'Tony Law · Xiaohongshu profile', zh: 'Tony Law · 小红书主页'},
        href: 'https://www.xiaohongshu.com/user/profile/5a79d6494eacab7487aee9aa',
        color: '#ff2442',
        icon: xiaohongshuIcon,
        glyphColor: '#ff2442',
      },
    ],
  },
];

function getLocale(locale: string | undefined): Locale {
  return locale === 'zh' ? 'zh' : 'en';
}

type QrModalProps = {
  open: boolean;
  title: string;
  hint?: string;
  qrCode: string;
  closeLabel: string;
  onClose: () => void;
};

function QrModal({
  open,
  title,
  hint,
  qrCode,
  closeLabel,
  onClose,
}: QrModalProps): JSX.Element | null {
  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="links-qr-modal" role="presentation" onClick={onClose}>
      <div
        className="links-qr-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="links-qr-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="links-qr-modal__close"
          aria-label={closeLabel}
          onClick={onClose}
        >
          ×
        </button>
        <h2 id="links-qr-modal-title" className="links-qr-modal__title">
          {title}
        </h2>
        <img
          src={qrCode}
          alt={title}
          className="links-qr-modal__image"
        />
        {hint ? <p className="links-qr-modal__hint">{hint}</p> : null}
      </div>
    </div>
  );
}

export default function LinksPage(): JSX.Element {
  const {siteConfig, i18n} = useDocusaurusContext();
  const locale = getLocale(i18n.currentLocale);
  const pageText = PAGE_TEXT[locale];
  const qrModalText = QR_MODAL_TEXT[locale];
  const [qrModal, setQrModal] = useState<{
    title: string;
    hint?: string;
    qrCode: string;
  } | null>(null);

  const closeQrModal = useCallback(() => setQrModal(null), []);

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
        <div className="links-container">
          {LINK_CATEGORIES.map((category) => (
            <section key={category.id} className="links-section">
              <h2 className="links-section-title">{category.title[locale]}</h2>
              <div className="links-list">
                {category.items.map((item) => {
                  const internal = item.href.startsWith('/') && !item.qrCode;
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
                        icon={item.qrCode ? qrIcon : internal ? arrowInternalIcon : arrowExternalIcon}
                        aria-hidden="true"
                        className="links-arrow"
                      />
                    </>
                  );

                  if (item.qrCode) {
                    return (
                      <button
                        key={label}
                        type="button"
                        className={`links-card links-card--button${item.img ? ' links-card--img' : ''}`}
                        style={styleVars}
                        onClick={() =>
                          setQrModal({
                            title: label,
                            hint: item.qrHint?.[locale],
                            qrCode: item.qrCode!,
                          })
                        }
                      >
                        {card}
                      </button>
                    );
                  }

                  if (internal) {
                    return (
                      <Link
                        key={label}
                        to={item.href}
                        className={`links-card${item.img ? ' links-card--img' : ''}`}
                        style={styleVars}
                      >
                        {card}
                      </Link>
                    );
                  }

                  return (
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
            </section>
          ))}
        </div>
      </main>
      <QrModal
        open={qrModal !== null}
        title={qrModal?.title ?? ''}
        hint={qrModal?.hint}
        qrCode={qrModal?.qrCode ?? ''}
        closeLabel={qrModalText.close}
        onClose={closeQrModal}
      />
    </Layout>
  );
}
