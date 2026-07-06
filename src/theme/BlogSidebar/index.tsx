import React, {useState} from 'react';
import BlogSidebar from '@theme-original/BlogSidebar';

// Category tabs at the top of the blog sidebar — filters the sidebar item list
// so the reader can narrow the left navigation by category, then click into posts.
const CATS = ['ALL', 'AI 美股分析师', '随笔', 'AI 实战经验'] as const;
type Cat = (typeof CATS)[number];

function catFor(title: string): Cat {
  const t = title;
  const tl = title.toLowerCase();
  if (tl.includes('agent') || ['黑灯工厂', 'OPC', 'skill'].some((k) => t.includes(k)))
    return 'AI 实战经验';
  const fin = [
    '美股', '分析师', '标普', '纳指', 'SPY', 'QQQ', '半导体', '科技股', '财报', 'IPO',
    'SpaceX', '罗素', '美光', 'NVDA', 'ORCL', '博通', '反弹', '牛市', '熊市', '行情',
    '逼空', '杠杆', '估值', 'CPI', '联储', '美联储', '利率', '通胀', '地缘', '油价',
    '验货', '尾部风险', '消费股', '抽干', '肉搏', 'AI', '踩刹车', '大空头', '调仓', '防线',
  ];
  if (fin.some((k) => t.includes(k))) return 'AI 美股分析师';
  return '随笔';
}

type SidebarItem = {title: string; permalink: string; date: string; unlisted?: boolean};

export default function BlogSidebarWrapper(props: {[key: string]: unknown}): JSX.Element {
  const [cat, setCat] = useState<Cat>('ALL');
  const sidebar = props.sidebar as {items: SidebarItem[]} | undefined;
  const allItems = sidebar?.items ?? [];
  const filtered =
    cat === 'ALL' ? allItems : allItems.filter((i) => catFor(i.title) === cat);

  return (
    <>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.15rem',
          marginBottom: '0.75rem',
          padding: '0 0.5rem',
        }}
      >
        {CATS.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`button button--sm ${cat === c ? 'button--primary' : 'button--clear'}`}
            style={{
              justifyContent: 'flex-start',
              fontSize: '0.82rem',
              padding: '0.3rem 0.7rem',
              borderRadius: '6px',
              fontWeight: cat === c ? 700 : 400,
            }}
          >
            {c}
          </button>
        ))}
        <hr style={{margin: '0.5rem 0', border: 'none', borderTop: '1px solid var(--ifm-color-emphasis-200)'}} />
      </div>
      <BlogSidebar {...props} sidebar={{...(sidebar ?? {items: []}), items: filtered}} />
    </>
  );
}
