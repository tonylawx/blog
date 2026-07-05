// Custom Docusaurus plugin: expose the latest blog posts as global data so
// they can be rendered on the homepage (a standalone page that does not
// belong to the blog plugin's route tree and therefore cannot use
// `usePluginData('docusaurus-plugin-content-blog')` directly).
//
// In `allContentLoaded` we receive ALL plugins' loaded content. We extract
// the blog plugin's post metadata, project it down to a small serializable
// subset (title, permalink, description, date) for the most recent posts,
// and stash it via `setGlobalData` so any page can read it with
// `usePluginData('latest-posts')`. Date formatting is done in the React
// component (via `useDateTimeFormat`) so it stays locale-aware.
//
// IMPORTANT: This file is loaded via Node's require() (Docusaurus resolves
// plugin path strings with plain require.resolve, which does not handle
// .ts), so it must stay .js with require()-compatible (no TS) code.

const RECENT_POST_COUNT = 5;

async function allContentLoaded({allContent, actions}) {
  const blogContent =
    (allContent['docusaurus-plugin-content-blog'] &&
      allContent['docusaurus-plugin-content-blog'].default) ||
    {};

  // Prefer `blogPosts` (canonical post list the blog list page uses);
  // fall back to `archive.blogPosts` for alternate shapes.
  const source =
    blogContent.blogPosts ||
    (blogContent.archive && blogContent.archive.blogPosts) ||
    [];

  const posts = source
    .map((p) => p.metadata)
    .filter(Boolean)
    .slice(0, RECENT_POST_COUNT);

  actions.setGlobalData({posts});
}

module.exports = function latestPostsPlugin() {
  return {
    name: 'latest-posts',
    allContentLoaded,
  };
};
