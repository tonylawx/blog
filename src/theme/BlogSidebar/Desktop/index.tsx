import React, {memo, useState, useMemo} from 'react';
import clsx from 'clsx';
import {translate} from '@docusaurus/Translate';
import {
  useVisibleBlogSidebarItems,
  BlogSidebarItemList,
} from '@docusaurus/plugin-content-blog/client';
import BlogSidebarContent from '@theme/BlogSidebar/Content';
import type {Props as BlogSidebarContentProps} from '@theme/BlogSidebar/Content';
import type {Props} from '@theme/BlogSidebar/Desktop';
import styles from './styles.module.css';

/* ---- Category filter ---- */
const CATS = ['ALL', 'AI 美股分析师', '投资经验', 'AI 实战经验', '随笔'] as const;
type Cat = (typeof CATS)[number];

const STORAGE_KEY = 'blog-sidebar-category';

function catFor(title: string): Cat {
  const t = title;
  const tl = title.toLowerCase();
  if (tl.includes('agent') || ['黑灯工厂', 'OPC', 'skill'].some((k) => t.includes(k)))
    return 'AI 实战经验';
  if (
    [
      '投资', '资产', '被动收入', '欠条', 'FIRE', '现金流',
      '存钱', '回忆录', '标普', '怎样创造', '浅谈',
    ].some((k) => t.includes(k))
  )
    return '投资经验';
  const fin = [
    '美股', '分析师', '纳指', 'SPY', 'QQQ', '半导体', '科技股', '财报', 'IPO',
    'SpaceX', '罗素', '美光', 'NVDA', 'ORCL', '博通', '反弹', '牛市', '熊市', '行情',
    '逼空', '杠杆', '估值', 'CPI', '联储', '美联储', '利率', '通胀', '地缘', '油价',
    '验货', '尾部风险', '消费股', '抽干', '肉搏', 'AI', '踩刹车', '大空头', '调仓', '防线',
  ];
  if (fin.some((k) => t.includes(k))) return 'AI 美股分析师';
  return '随笔';
}

/* ---- ListComponent (same as original) ---- */
const ListComponent: BlogSidebarContentProps['ListComponent'] = ({items}) => {
  return (
    <BlogSidebarItemList
      items={items}
      ulClassName={clsx(styles.sidebarItemList, 'clean-list')}
      liClassName={styles.sidebarItem}
      linkClassName={styles.sidebarItemLink}
      linkActiveClassName={styles.sidebarItemLinkActive}
    />
  );
};

/* ---- Desktop sidebar with category pills above the title ---- */
function BlogSidebarDesktop({sidebar}: Props): React.ReactNode {
  // Persist selected category across page navigations (component remounts on route change)
  const [cat, setCatState] = useState<Cat>(() => {
    if (typeof window === 'undefined') return 'ALL';
    return (sessionStorage.getItem(STORAGE_KEY) as Cat | null) ?? 'ALL';
  });
  const setCat = (c: Cat) => {
    setCatState(c);
    try { sessionStorage.setItem(STORAGE_KEY, c); } catch { /* ignore */ }
  };

  // Filter sidebar items by selected category BEFORE visibility filtering
  const allItems = sidebar.items;
  const counts = useMemo(() => {
    const c: Record<Cat, number> = {
      ALL: allItems.length,
      'AI 美股分析师': 0,
      '随笔': 0,
      'AI 实战经验': 0,
    };
    for (const i of allItems) c[catFor(i.title)]++;
    return c;
  }, [allItems]);
  const filteredItems =
    cat === 'ALL' ? allItems : allItems.filter((i) => catFor(i.title) === cat);

  const items = useVisibleBlogSidebarItems(filteredItems);

  return (
    <aside className="col col--3">
      <nav
        className={clsx(styles.sidebar, 'thin-scrollbar')}
        aria-label={translate({
          id: 'theme.blog.sidebar.navAriaLabel',
          message: 'Blog recent posts navigation',
          description: 'The ARIA label for recent posts in the blog sidebar',
        })}
      >
        {/* Category pills — inside the nav, above the title */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: '0.3rem',
            marginBottom: '0.75rem',
          }}
        >
          {CATS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              style={{
                fontSize: '0.78rem',
                padding: '0.25rem 0.65rem',
                borderRadius: '999px',
                border: `1px solid ${cat === c ? 'var(--ifm-color-primary)' : 'var(--ifm-color-emphasis-300)'}`,
                background: cat === c ? 'var(--ifm-color-primary)' : 'transparent',
                color: cat === c ? '#fff' : 'var(--ifm-font-color-base)',
                cursor: 'pointer',
                fontWeight: cat === c ? 600 : 400,
                whiteSpace: 'nowrap',
              }}
            >
              {c} <span style={{opacity: 0.5}}>{counts[c]}</span>
            </button>
          ))}
        </div>

        <div className={clsx(styles.sidebarItemTitle, 'margin-bottom--md')}>
          {sidebar.title}
        </div>

        <BlogSidebarContent
          items={items}
          ListComponent={ListComponent}
          yearGroupHeadingClassName={styles.yearGroupHeading}
        />
      </nav>
    </aside>
  );
}

export default memo(BlogSidebarDesktop);
