import React, {memo, useState, useMemo} from 'react';
import clsx from 'clsx';
import {translate} from '@docusaurus/Translate';
import {usePluginData} from '@docusaurus/useGlobalData';
import {
  useVisibleBlogSidebarItems,
  BlogSidebarItemList,
} from '@docusaurus/plugin-content-blog/client';
import BlogSidebarContent from '@theme/BlogSidebar/Content';
import type {BlogSidebar, BlogSidebarItem} from '@docusaurus/plugin-content-blog';
import styles from './styles.module.css';

/* ---- Category filter ---- */
const CATS = ['all', 'markets', 'investing', 'aiPractice', 'essays'] as const;
type Cat = (typeof CATS)[number];

const CAT_LABELS: Record<Cat, string> = {
  all: 'All',
  markets: 'US Market',
  investing: 'Investing',
  aiPractice: 'AI Practice',
  essays: 'Essays',
};

const STORAGE_KEY = 'blog-sidebar-category';
type CategoryData = {
  categoryByPermalink?: Record<string, Cat>;
};

function catFor(item: BlogSidebarItem, categoryByPermalink: Record<string, Cat>): Cat {
  const fromFrontMatter = categoryByPermalink[item.permalink];
  if (fromFrontMatter) return fromFrontMatter;
  const title = item.title;
  const t = title;
  const tl = title.toLowerCase();
  if (
    tl.includes('agent') ||
    tl.includes('lights-out') ||
    tl.includes('ship-ready') ||
    ['黑灯工厂', 'OPC', 'skill'].some((k) => t.includes(k))
  )
    return 'aiPractice';
  if (
    [
      '投资', '资产', '被动收入', '欠条', 'FIRE', '现金流',
      '存钱', '回忆录', '标普', '怎样创造', '浅谈',
    ].some((k) => t.includes(k))
    || [
      'invest', 'asset', 'passive income', 'cash flow', 'memoir',
      'how i think about options', 'iou', 'mainland chinese investors',
      'buy the s&p 500 and nasdaq',
    ].some((k) => tl.includes(k))
  )
    return 'investing';
  const fin = [
    '美股', '分析师', '纳指', 'SPY', 'QQQ', '半导体', '科技股', '财报', 'IPO',
    'SpaceX', '罗素', '美光', 'NVDA', 'ORCL', '博通', '反弹', '牛市', '熊市', '行情',
    '逼空', '杠杆', '估值', 'CPI', '联储', '美联储', '利率', '通胀', '地缘', '油价',
    '验货', '尾部风险', '消费股', '抽干', '肉搏', 'AI', '踩刹车', '大空头', '调仓', '防线',
  ];
  const finEn = [
    'us market', 'market daily', 'semiconductor', 'semis', 'nasdaq', 'spy',
    'qqq', 'tech stocks', 'earnings', 'ipo', 'spacex', 'russell', 'micron',
    'nvda', 'orcl', 'broadcom', 'bounce', 'bull', 'bear', 'valuation',
    'cpi', 'fed', 'rate', 'inflation', 'geopolitical', 'oil', 'consumer stocks',
    'capex', 'mega-caps', 'ai spending', 'defensive', 'capital rotates',
  ];
  if (fin.some((k) => t.includes(k)) || finEn.some((k) => tl.includes(k))) return 'markets';
  return 'essays';
}

/* ---- ListComponent (same as original) ---- */
const ListComponent = ({items}: {items: BlogSidebarItem[]}) => {
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
function BlogSidebarDesktop({sidebar}: {sidebar: BlogSidebar}): React.ReactNode {
  const categoryData = usePluginData('latest-posts') as CategoryData | undefined;
  const categoryByPermalink = categoryData?.categoryByPermalink ?? {};
  // Persist selected category across page navigations (component remounts on route change)
  const [cat, setCatState] = useState<Cat>(() => {
    if (typeof window === 'undefined') return 'all';
    const stored = sessionStorage.getItem(STORAGE_KEY) as Cat | null;
    return stored && CATS.includes(stored) ? stored : 'all';
  });
  const setCat = (c: Cat) => {
    setCatState(c);
    try { sessionStorage.setItem(STORAGE_KEY, c); } catch { /* ignore */ }
  };

  // Filter sidebar items by selected category BEFORE visibility filtering
  const allItems = sidebar.items;
  const counts = useMemo(() => {
    const c: Record<Cat, number> = {
      all: allItems.length,
      markets: 0,
      investing: 0,
      aiPractice: 0,
      essays: 0,
    };
    for (const i of allItems) c[catFor(i, categoryByPermalink)]++;
    return c;
  }, [allItems, categoryByPermalink]);
  const filteredItems =
    cat === 'all' ? allItems : allItems.filter((i) => catFor(i, categoryByPermalink) === cat);

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
              {translate({
                id: `theme.blog.sidebar.category.${c}`,
                message: CAT_LABELS[c],
                description: 'Blog sidebar category filter label',
              })}{' '}
              <span style={{opacity: 0.5}}>{counts[c]}</span>
            </button>
          ))}
        </div>

        <div className={clsx(styles.sidebarItemTitle, 'margin-bottom--md')}>
          {translate({
            id: 'theme.blog.sidebar.title',
            message: sidebar.title,
            description: 'The title above the blog sidebar recent posts list',
          })}
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
