import React from 'react';
import Link from '@docusaurus/Link';
import {usePluginData} from '@docusaurus/useGlobalData';
import {useDateTimeFormat} from '@docusaurus/theme-common/internal';
import Translate from '@docusaurus/Translate';

interface BlogPostMetadata {
  title: string;
  permalink: string;
  description?: string;
  date: string;
}

// Docusaurus 3.10.1 exports `useGlobalData` as default + `usePluginData` /
// `useAllPluginInstancesData` as named exports from the
// `@docusaurus/useGlobalData` module alias.
//
// IMPORTANT (Docusaurus 3.10.1): `usePluginData('docusaurus-plugin-content-blog')`
// returns an EMPTY object on standalone pages (e.g. the homepage `/`) that
// do not belong to the blog plugin's route tree — global plugin data is
// only attached to routes owned by that plugin. To make the latest blog
// posts available on the homepage we register a small custom plugin
// (`plugins/latest-posts/index.js`) that reads the blog plugin's loaded
// content in `allContentLoaded` and calls `setGlobalData({posts})`. That
// data is then available on every route via `usePluginData('latest-posts')`.
//
// Date formatting uses the same `useDateTimeFormat` hook as the blog theme
// (`@docusaurus/theme-classic` BlogPostItem Header/Info), so dates match
// the blog list page and respect the active locale (en / zh).
interface LatestPostsGlobalData {
  posts: BlogPostMetadata[];
}

function useLatestPosts(count = 3): BlogPostMetadata[] {
  const data = usePluginData('latest-posts') as LatestPostsGlobalData | undefined;
  return (data?.posts ?? []).slice(0, count);
}

export default function FeaturedPosts(): JSX.Element {
  const posts = useLatestPosts(3);
  // Match the blog theme's date formatting exactly (locale-aware).
  const dateTimeFormat = useDateTimeFormat({
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  if (posts.length === 0) return <></>;
  return (
    <section className="container margin-vert--xl">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem'}}>
        <h2 style={{marginBottom: 0}}>
          <Translate>Latest Posts</Translate>
        </h2>
        <Link to="/blog">
          <Translate>View all →</Translate>
        </Link>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {posts.map((post) => {
          const formattedDate = dateTimeFormat.format(new Date(post.date));
          return (
            <Link key={post.permalink} to={post.permalink} className="card-interactive card padding--lg" style={{textDecoration: 'none', color: 'inherit'}}>
              <small style={{opacity: 0.7}}>{formattedDate}</small>
              <h3 style={{margin: '0.5rem 0'}}>{post.title}</h3>
              {post.description && <p style={{marginBottom: 0, opacity: 0.8}}>{post.description}</p>}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
