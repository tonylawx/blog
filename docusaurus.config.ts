import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';

const config: Config = {
  title: 'Tony Law',
  tagline: 'Software engineer & options trader',
  url: 'https://www.tonylaw.cc',
  baseUrl: '/',
  favicon: 'img/favicon.ico',

  // Strict broken-link checking — re-enabled for launch now that all
  // navbar/footer/hero-linked pages (/blog, /projects, /about + locale
  // variants) exist. The build will fail on any dangling link.
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if not hosting on GitHub, set this for correct build output.
  organizationName: 'tonylawx',
  projectName: 'blog',

  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'zh'],
    localeConfigs: {
      en: {label: 'English', htmlLang: 'en'},
      zh: {label: '简体中文', htmlLang: 'zh-CN'},
    },
  },

  presets: [
    [
      'classic',
      {
        // No docs section — disable the docs plugin so it doesn't render
        // docs/superpowers/* (our spec & plan) as public docs pages.
        docs: false,
        blog: {
          showReadingTime: true,
          postsPerPage: 'ALL',
          blogSidebarCount: 'ALL',
          feedOptions: {
            type: ['rss', 'atom'],
            title: 'Tony Law',
            description: 'Software engineer & options trader',
          },
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      },
    ],
  ],

  // Custom plugins. `latest-posts` exposes the most recent blog posts as
  // global data so the homepage (a standalone page outside the blog plugin's
  // route tree) can render a "Latest Posts" section via `usePluginData`.
  plugins: [
    require('./plugins/raw-html'),
    './plugins/latest-posts',
    // Minimal docs-plugin instance. We disable docs in the `classic` preset
    // (above) so that docs/superpowers/* (spec & plan) never render as public
    // pages. But `@easyops-cn/docusaurus-search-local`'s SearchBar unconditionally
    // calls `useActiveVersion` from `@docusaurus/plugin-content-docs/client`,
    // which throws if no docs-plugin instance with the default id exists
    // (https://github.com/easyops-cn/docusaurus-search-local/issues/211). So we
    // register a stub docs plugin here — pointed at a tiny `docs-internal/`
    // folder and an unlinked route base — purely to keep the search bar alive.
    // `indexDocs: false` on the search plugin means this stub is NOT indexed.
    [
      '@docusaurus/plugin-content-docs',
      {
        path: 'docs-internal',
        routeBasePath: 'notes',
        include: ['**/*.md', '**/*.mdx'],
        showLastUpdateAuthor: false,
        showLastUpdateTime: false,
        editUrl: undefined,
      },
    ],
    [
      '@easyops-cn/docusaurus-search-local',
      {
        hashed: true,
        indexDocs: false,
        indexBlog: true,
        indexPages: true,
        language: ['en', 'zh'],
        // The stub docs plugin at `routeBasePath: 'notes'` is registered only
        // to keep the SearchBar alive (upstream issue #211). `indexDocs: false`
        // already tells this plugin not to treat the stub as a docs source, but
        // because its routeBasePath differs from the default `/docs`, the stub's
        // `/notes/notes` page (and `/zh/notes/notes` for zh) still leaks into
        // the index as a generic page. `ignoreFiles` matches against the route
        // (no baseUrl, no trailing slash), so `^notes` excludes the en stub and
        // `^zh/notes` excludes the zh stub. Blog/pages routes never start with
        // these prefixes, so they remain indexed.
        ignoreFiles: [/^notes/, /^zh\/notes/],
      },
    ],
  ],

  themeConfig: {
    image: 'img/og.png',
    metadata: [
      {name: 'twitter:card', content: 'summary_large_image'},
    ],
    colorMode: {
      defaultMode: 'light',
      respectPrefersColorScheme: true,
      disableSwitch: false,
    },
    navbar: {
      title: 'Tony Law',
      items: [
        {to: '/blog', label: 'Blog', position: 'left'},
        {to: '/links', label: 'Links', position: 'left'},
        {to: '/blog/tags', label: 'Tags', position: 'left'},
        {to: '/blog/archive', label: 'Archive', position: 'left'},
        {to: '/projects', label: 'Projects', position: 'left'},
        {to: '/about', label: 'About', position: 'left'},
        // Search item is injected by docusaurus-search-local in Task 9.
        {type: 'localeDropdown', position: 'right'},
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Links',
          items: [
            {label: 'Blog', to: '/blog'},
            {label: 'Projects', to: '/projects'},
            {label: 'About', to: '/about'},
          ],
        },
        {
          title: 'Social',
          items: [
            {label: 'GitHub', href: 'https://github.com/tonylawx'},
            {label: 'X', href: 'https://x.com/tonylawdotcc'},
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Tony Law. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Config['themeConfig'],
};

export default config;
