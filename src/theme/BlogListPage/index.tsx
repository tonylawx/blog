import React, {useEffect} from 'react';
import BlogListPage from '@theme-original/BlogListPage';

type Item = {content?: {metadata?: {permalink?: string}}};

// /blog redirects to the newest post (items are newest-first). Category
// browsing still works: the category pills live in the sidebar, which renders
// on every post page, and /blog/archive lists all posts.
export default function BlogListPageWrapper(props: {
  [key: string]: unknown;
}): JSX.Element {
  const items = props.items as Item[] | undefined;
  const target = items?.[0]?.content?.metadata?.permalink;
  useEffect(() => {
    if (target) {
      window.location.replace(target);
    }
  }, [target]);
  if (target) {
    return (
      <div
        style={{
          textAlign: 'center',
          marginTop: '4rem',
          color: 'var(--ifm-color-emphasis-600)',
        }}>
        Opening the latest post…
      </div>
    );
  }
  return <BlogListPage {...props} />;
}
