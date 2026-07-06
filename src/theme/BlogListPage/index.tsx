import React from 'react';
import BlogListPage from '@theme-original/BlogListPage';

// Pass-through wrapper (category filtering is handled by the BlogSidebar tabs).
export default function BlogListPageWrapper(props: {[key: string]: unknown}): JSX.Element {
  return <BlogListPage {...props} />;
}
