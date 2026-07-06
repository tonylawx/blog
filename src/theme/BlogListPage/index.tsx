import React, {useState} from 'react';
import BlogListPage from '@theme-original/BlogListPage';

// Category filter tabs above the blog list. Inline filtering — no separate page.
const CATEGORIES = ['ALL', 'AI 美股分析师', '随笔', 'AI 实战经验'] as const;
type Cat = (typeof CATEGORIES)[number];

export default function BlogListPageWrapper(props: {[key: string]: unknown}): JSX.Element {
  const [cat, setCat] = useState<Cat>('ALL');
  const allItems = props.items as readonly {[key: string]: unknown}[];
  const items =
    cat === 'ALL'
      ? allItems
      : allItems.filter(
          (i) =>
            ((i.content as {[key: string]: unknown} | undefined)?.frontMatter as
              | {[key: string]: unknown}
              | undefined)?.category === cat,
        );

  return (
    <>
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          justifyContent: 'center',
          flexWrap: 'wrap',
          padding: '1.5rem 1rem 0.5rem',
        }}
      >
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`button button--sm ${cat === c ? 'button--primary' : 'button--outline'}`}
            style={{borderRadius: '999px', padding: '0.4rem 1.1rem', fontSize: '0.9rem'}}
          >
            {c}
          </button>
        ))}
      </div>
      <BlogListPage {...props} items={items} />
    </>
  );
}
