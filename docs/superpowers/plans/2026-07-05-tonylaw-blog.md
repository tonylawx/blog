# tonylaw.cc Blog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a bilingual (English-default / Chinese-secondary) personal blog + homepage + portfolio on Docusaurus v3, deployed to Vercel at tonylaw.cc.

**Architecture:** Docusaurus v3 classic preset with a custom homepage (Layout B: Hero + Latest Posts + Projects), bilingual content via the `i18n/zh/` translation tree, local search, Giscus comments, deployed from a single GitHub repo to Vercel.

**Tech Stack:** Docusaurus v3, React 18, MDX v2, `docusaurus-search-local`, `@giscus/react`, Vercel, GitHub (`tonylawx`).

## Global Constraints

- **Node version:** 18.x, 20.x, or 22.x+ (Docusaurus v3.10 supports Node 24 too). Verify before Task 1: `node -v` shows ≥18.
- **Package manager:** npm (ships with Node). Use `npm ci` after the lockfile exists, `npm install` before.
- **Default locale:** `en` (no URL prefix). Second locale: `zh` at `/zh/...`.
- **Site URL:** `https://tonylaw.cc`. **baseUrl:** `/`.
- **Working directory for all tasks:** `~/Documents/blog` (already `git init`'d, spec committed).
- **GitHub owner:** `tonylawx`. Repo name: `blog` (URL: `github.com/tonylawx/blog`).
- **Verification model for this project:** each task ends with (a) `npm run build` passing (this is the TypeScript + i18n-integrity + broken-link gate), and (b) a `npm start` dev-server check at `http://localhost:3000` with the specific things to confirm listed in that task. No unit-test framework — the project is config + Markdown + render; build is the type/integrity gate. This is a deliberate YAGNI call, not a shortcut.
- **Commit style:** conventional commits, one per task, end each task with a commit step.

---

### Task 1: Scaffold Docusaurus and clean defaults

**Files:**
- Create: everything under `~/Documents/blog` except `docs/` (already exists with the spec)
- Modify: `.gitignore` (ensure `node_modules`, `build`, `.docusaurus` ignored)

**Interfaces:**
- Produces: a running Docusaurus v3 (TypeScript template) at `http://localhost:3000` showing default content. Later tasks edit the generated files.

- [ ] **Step 1: Verify Node version**

Run: `node -v`
Expected: `v18.x.x` or `v20.x.x` (≥18, <23). If not, install Node 20 before continuing.

- [ ] **Step 2: Scaffold into a temp dir, then merge into `~/Documents/blog`**

`create-docusaurus` refuses non-empty dirs, and `~/Documents/blog` already holds `docs/`. Scaffold into `blog-tmp`, then move everything in.

Run:
```bash
cd ~/Documents
npx --yes create-docusaurus@latest blog-tmp classic --typescript
# Copy scaffold into the existing blog dir, preserving our docs/ (spec + plan)
# and .git. Excluding docs/ keeps the default tutorial out of docs/superpowers/.
rsync -a blog-tmp/ blog/ --exclude=node_modules --exclude=.git --exclude=docs
rm -rf blog-tmp
cd blog
```

- [ ] **Step 3: Install dependencies**

Run:
```bash
cd ~/Documents/blog
npm install
```
Expected: install completes; `package.json` shows `@docusaurus/core` ^3.x.

- [ ] **Step 4: First build + dev run to confirm scaffold works**

Run:
```bash
npm run build
```
Expected: build succeeds, ends with `Success! Generated static files in "build".`

Run:
```bash
npm start
```
Expected: dev server at `http://localhost:3000` shows the default Docusaurus landing page. Stop with Ctrl-C.

- [ ] **Step 5: Remove default content we will not use**

Remove the scaffold's example markdown page (we keep `src/pages/index.tsx` — overwritten in Task 7 — and the default blog posts, replaced in Task 5):

Run:
```bash
cd ~/Documents/blog
rm -f src/pages/markdown.md
# Verify our planning docs are intact:
ls docs/superpowers/specs docs/superpowers/plans
```
Expected: both spec and plan `.md` files still listed under `docs/superpowers/`.

- [ ] **Step 6: Confirm `.gitignore` covers build artifacts**

Check `~/Documents/blog/.gitignore` contains `node_modules`, `build`, `.docusaurus`. The scaffold's `.gitignore` already does — verify with:

Run: `grep -E 'node_modules|build|\.docusaurus' .gitignore`
Expected: three matching lines.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Docusaurus v3 (TypeScript template)"
```

---

### Task 2: Push to GitHub

**Why early:** Giscus (Task 10) and Vercel previews need a public repo. Doing this now unblocks both.

**Files:**
- Modify: `~/Documents/blog` remote

**Interfaces:**
- Produces: public repo `github.com/tonylawx/blog` with current code pushed on `main`.

- [ ] **Step 1: Ensure default branch is `main`**

Run: `git branch --show-current`
Expected: `main` (or `master`). If `master`, rename: `git branch -m master main`.

- [ ] **Step 2: Create the public repo and push**

Run:
```bash
cd ~/Documents/blog
gh repo create tonylawx/blog --public --source=. --remote=origin --description "tonylaw.cc — personal blog + portfolio (Docusaurus)" --push
```
Expected: creates `tonylawx/blog` (public), adds `origin` remote, pushes `main`. Output ends with something like `Pushed commits to https://github.com/tonylawx/blog`.

- [ ] **Step 3: Verify remote**

Run: `gh repo view tonylawx/blog --json url,visibility`
Expected: JSON with `"visibility": "PUBLIC"` and the repo URL.

No commit step (no local changes).

---

### Task 3: Base site config (i18n, navbar, footer, theme color)

**Files:**
- Modify (full rewrite): `docusaurus.config.ts`
- Modify: `static/img/favicon.ico` — leave the scaffold default for now (placeholder); replace in Task 11.

**Interfaces:**
- Produces: a `docusaurus.config.ts` exporting `config: Config` with `i18n.defaultLocale='en'`, `locales=['en','zh']`, navbar items for Blog/Projects/About + localeDropdown + (search slot reserved for Task 9), footer with social links, `url='https://tonylaw.cc'`, `baseUrl='/'`, `colorMode` with `respectPrefersColorScheme: true`. Used by every later task.

- [ ] **Step 1: Replace `docusaurus.config.ts` with the full config**

Overwrite `docusaurus.config.ts` with:

```ts
import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';

const config: Config = {
  title: 'Tony Law',
  tagline: 'Software engineer & options trader',
  url: 'https://tonylaw.cc',
  baseUrl: '/',
  favicon: 'img/favicon.ico',

  // GitHub pages edit URL — not used (deploying to Vercel), but harmless.
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
    },
  ],

  themeConfig: {
    colorMode: {
      defaultMode: 'light',
      respectPrefersColorScheme: true,
      disableSwitch: false,
    },
    navbar: {
      title: 'Tony Law',
      items: [
        {to: '/blog', label: 'Blog', position: 'left'},
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
            {label: 'Twitter', href: 'https://twitter.com/tonylawx'},
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
```

> Note: `docs: false` disables the classic preset's docs plugin. We have no docs section; without this, the plugin would try to render `docs/superpowers/*` (our internal spec & plan) as public docs pages.

- [ ] **Step 2: Build to verify config is valid**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Dev check — locale switcher present**

Run: `npm start`, open `http://localhost:3000`.
Expected: navbar shows Blog/Projects/About on the left and a language dropdown (showing "English") on the right. Clicking the dropdown shows "简体中文". Clicking "简体中文" navigates to `/zh/` (currently the default English content mirrored — fine for now; Task 5 adds real Chinese content). Stop the server.

- [ ] **Step 4: Commit**

```bash
git add docusaurus.config.ts
git commit -m "feat(config): base i18n + navbar + footer + theme"
```

---

### Task 4: Theme — fonts, colors, dark mode palette

**Files:**
- Modify (full rewrite): `src/css/custom.css`
- Create: `static/css/inter.css` — local Inter font fallback (or use system stack; see step)

**Interfaces:**
- Produces: a `custom.css` defining `:root` and `[data-theme='dark']` CSS variable blocks (brand colors, typography scale). Consumed by Docusaurus's Infima CSS system.

- [ ] **Step 1: Write `src/css/custom.css`**

Overwrite `src/css/custom.css` with:

```css
/* Inter font — @import MUST be the first rule (CSS spec: imports precede all
 * other rules), or browsers silently ignore it. */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

/**
 * Docusaurus custom theme. Extends Infima CSS variables.
 * https://docusaurus.io/docs/styling-layout
 */

:root {
  --ifm-color-primary: #2563eb;
  --ifm-color-primary-dark: #1d4ed8;
  --ifm-color-primary-darker: #1e40af;
  --ifm-color-primary-darkest: #1e3a8a;
  --ifm-color-primary-light: #3b82f6;
  --ifm-color-primary-lighter: #60a5fa;
  --ifm-color-primary-lightest: #93c5fd;
  --ifm-color-success: #16a34a;
  --ifm-color-info: #0ea5e9;
  --ifm-color-warning: #f59e0b;
  --ifm-color-danger: #dc2626;

  --ifm-font-family-base:
    'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue',
    'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  --ifm-font-family-monospace:
    'JetBrains Mono', 'Fira Code', SFMono-Regular, Menlo, Consolas, monospace;

  --ifm-global-radius: 0.5rem;
  --ifm-container-width: 1140px;
  --ifm-container-width-xl: 1320px;

  /* Homepage */
  --home-hero-bg: linear-gradient(135deg, #eff6ff 0%, #ffffff 60%);
  --home-card-border: #e5e7eb;
  --home-card-bg: #ffffff;
}

[data-theme='dark'] {
  --ifm-color-primary: #60a5fa;
  --ifm-color-primary-dark: #3b82f6;
  --ifm-color-primary-darker: #2563eb;
  --ifm-color-primary-darkest: #1d4ed8;
  --ifm-color-primary-light: #93c5fd;
  --ifm-color-primary-lighter: #bfdbfe;
  --ifm-color-primary-lightest: #dbeafe;

  --home-hero-bg: linear-gradient(135deg, #0f172a 0%, #111827 60%);
  --home-card-border: #1f2937;
  --home-card-bg: #111827;
}

/* Use Inter from Google Fonts via @import (no local font build step).
   The @import lives at the top of this file — see comment there. */

html {
  font-family: var(--ifm-font-family-base);
}

/* Card utility used by ProjectCard / FeaturedPosts */
.card-interactive {
  background: var(--home-card-bg);
  border: 1px solid var(--home-card-border);
  border-radius: var(--ifm-global-radius);
  transition:
    transform 0.15s ease,
    border-color 0.15s ease;
}
.card-interactive:hover {
  transform: translateY(-2px);
  border-color: var(--ifm-color-primary);
}
```

> Rationale: Inter is loaded from Google Fonts via `@import` to avoid a local font-build toolchain (YAGNI for a personal site). If you prefer zero external requests, replace the `@import` line with nothing and rely on the `system-ui` fallback in `--ifm-font-family-base`.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: success.

- [ ] **Step 3: Dev check — light/dark toggle + brand color**

Run: `npm start`, open `http://localhost:3000`.
Expected: links/buttons are blue (#2563eb). Click the theme toggle (sun/moon icon, navbar right). Page switches to dark background, links become light blue. Inter font visible (check via DevTools → computed font-family on `<body>` shows 'Inter').

- [ ] **Step 4: Commit**

```bash
git add src/css/custom.css
git commit -m "feat(theme): brand colors, Inter font, dark palette, card utility"
```

---

### Task 5: Blog — author + bilingual welcome post

**Files:**
- Modify (full rewrite): `blog/authors.yml`
- Modify (replace default): `blog/2026-07-05-welcome/index.md`
- Create: `i18n/zh/docusaurus-plugin-content-blog/2026-07-05-welcome/index.md`
- Create: `i18n/zh/code.json`

**Interfaces:**
- Produces: an `authors.yml` defining the `tonylaw` author (used in frontmatter), a sample English post under `blog/`, its Chinese translation under `i18n/zh/docusaurus-plugin-content-blog/`, and the Chinese UI strings in `i18n/zh/code.json`. The homepage (Task 7) reads blog metadata via `useGlobalData`.

- [ ] **Step 1: Write `blog/authors.yml`**

```yaml
tonylaw:
  name: Tony Law
  title: Software engineer & options trader
  url: https://tonylaw.cc
  image_url: https://github.com/tonylawx.png
  socials:
    github: https://github.com/tonylawx
```

> Avatar uses the GitHub-provided `tonylawx.png` (always available, no local file needed). Twitter line omitted pending user confirmation (spec §12).

- [ ] **Step 2: Replace the default welcome post**

Remove the scaffold's sample posts, then create one English welcome post.

Run:
```bash
cd ~/Documents/blog
rm -f blog/2019-05-28-hello-world.md blog/2019-05-29-long-blog-post.md blog/2021-08-26-welcome/index.md blog/2021-08-26-welcome/docusaurus-placemat.png
mkdir -p blog/2026-07-05-welcome
```

Write `blog/2026-07-05-welcome/index.md`:

```markdown
---
slug: welcome
title: Welcome to my blog
description: Why I started writing, and what to expect.
authors: [tonylaw]
tags: [meta]
date: 2026-07-05
---

Welcome — this is the first post on my new blog. I'm a software engineer and
options trader, and I plan to write about markets, code, and the tools I build
along the way.

## What to expect

- Notes on **options trading** and the systems I use to research them
- **Software engineering** writeups — React, TypeScript, infra
- Small **tools and experiments**, usually open-sourced

This site is built with [Docusaurus](https://docusaurus.io) and deployed on
Vercel. Thanks for stopping by.
```

- [ ] **Step 3: Add the Chinese translation of the same post**

Create `i18n/zh/docusaurus-plugin-content-blog/2026-07-05-welcome/index.md`:

```markdown
---
slug: welcome
title: 欢迎来到我的博客
description: 我为什么开始写博客，以及你会看到什么内容。
authors: [tonylaw]
tags: [meta]
date: 2026-07-05
---

欢迎 —— 这是新博客的第一篇。我是一名软件工程师兼期权交易者，打算在这里记录
市场、代码，以及我顺手做的一些工具。

## 你会看到什么

- **期权交易**相关笔记和我用来做研究的系统
- **软件工程**文章 —— React、TypeScript、基础设施
- 一些小的**工具和实验**，通常会开源

本站用 [Docusaurus](https://docusaurus.io) 搭建，部署在 Vercel。感谢来访。
```

- [ ] **Step 4: Add Chinese UI strings — `i18n/zh/code.json`**

Create `i18n/zh/code.json`:

```json
{
  "theme.blog.paginator.navAriaTitle": {
    "message": "博文列表分页导航"
  },
  "theme.blog.paginator.newerEntries": {
    "message": "较新的文章"
  },
  "theme.blog.paginator.olderEntries": {
    "message": "较旧的文章"
  },
  "theme.blog.post.readingTime.plurals": {
    "message": "约 {minutes} 分钟阅读"
  },
  "theme.blog.sidebar.navAriaTitle": {
    "message": "最近博文导航"
  },
  "theme.CodeBlock.copied": {
    "message": "已复制"
  },
  "theme.CodeBlock.copy": {
    "message": "复制"
  },
  "theme.NotFound.title": {
    "message": "页面不存在"
  },
  "theme.common.tags": {
    "message": "标签"
  },
  "theme.tags.tagsPageTitle": {
    "message": "标签"
  }
}
```

> These cover the most visible strings. Anything missing falls back to English, which is acceptable; add more later as needed.

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: success. Build output mentions both locales: lines like `[SUCCESS] en` and `[SUCCESS] zh` (or "Writing translated content for zh").

- [ ] **Step 6: Dev check — bilingual blog**

Run: `npm start`, open `http://localhost:3000/blog`.
Expected: "Welcome to my blog" appears with author "Tony Law", reading time, and the `meta` tag. Click the post → English body renders.

Now open `http://localhost:3000/zh/blog`.
Expected: "欢迎来到我的博客" appears. Click → Chinese body renders. UI chrome (copy button tooltip, "Tags") shows Chinese.

Also verify RSS was generated: open `http://localhost:3000/blog/rss.xml` → XML feed with the post. (RSS is configured in Task 3's preset.)

- [ ] **Step 7: Commit**

```bash
git add blog/ i18n/
git commit -m "feat(blog): author + bilingual welcome post + zh UI strings"
```

---

### Task 6: Projects — data model, card component, `/projects` page

**Files:**
- Create: `src/data/projects.ts`
- Create: `src/components/ProjectCard.tsx`
- Create: `src/pages/projects.tsx`

**Interfaces:**
- Produces:
  - `Project` type exported from `src/data/projects.ts` with fields `name`, `description`, `tags: string[]`, `url?: string`, `repo: string`, `icon?: string`, `featured: boolean`.
  - `projects: Project[]` default export.
  - `<ProjectCard project={Project} />` React component.
  - `/projects` page rendering a card grid.
- Consumed by: Task 7 (homepage Projects strip reuses `<ProjectCard>` and the `projects` array).

- [ ] **Step 1: Write `src/data/projects.ts`**

```ts
export type Project = {
  name: string;
  description: string;
  tags: string[];
  url?: string;
  repo: string;
  icon?: string;
  featured: boolean;
};

export const projects: Project[] = [
  {
    name: 'Option Screener',
    description:
      'Options research and screening tool with broker integration, real-time greeks, and a mobile-friendly UI.',
    tags: ['React', 'TypeScript', 'Node', 'Finance'],
    repo: 'https://github.com/tonylawx/option',
    url: 'https://tonylaw.cc',
    featured: true,
  },
  {
    name: 'Blog',
    description:
      'This site — a bilingual Docusaurus blog with local search and Giscus comments.',
    tags: ['Docusaurus', 'React', 'MDX'],
    repo: 'https://github.com/tonylawx/blog',
    featured: true,
  },
  {
    name: 'html-to-wechat-article',
    description: 'Convert HTML into WeChat-public-account-friendly markup.',
    tags: ['Tooling', 'HTML'],
    repo: 'https://github.com/tonylawx/html-to-wechat-article',
    featured: false,
  },
];
```

> Placeholder project set. Edit `src/data/projects.ts` later to reflect real repos.

- [ ] **Step 2: Write `src/components/ProjectCard.tsx`**

```tsx
import React from 'react';
import type {Project} from '../data/projects';

export default function ProjectCard({project}: {project: Project}): JSX.Element {
  return (
    <a
      className="card-interactive card padding--lg"
      href={project.url ?? project.repo}
      style={{textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', gap: '0.5rem'}}
    >
      <h3 style={{marginBottom: 0}}>{project.name}</h3>
      <p style={{flexGrow: 1, marginBottom: '0.5rem'}}>{project.description}</p>
      <div style={{display: 'flex', flexWrap: 'wrap', gap: '0.4rem'}}>
        {project.tags.map((tag) => (
          <span key={tag} className="badge badge--secondary">
            {tag}
          </span>
        ))}
      </div>
    </a>
  );
}
```

- [ ] **Step 3: Write `src/pages/projects.tsx`**

```tsx
import React from 'react';
import Layout from '@theme/Layout';
import {projects} from '../data/projects';
import ProjectCard from '../components/ProjectCard';

export default function ProjectsPage(): JSX.Element {
  return (
    <Layout title="Projects" description="Things I've built.">
      <main className="container margin-vert--xl">
        <h1>Projects</h1>
        <p>Things I've built — open-source tools, side projects, and experiments.</p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1.25rem',
            marginTop: '1.5rem',
          }}
        >
          {projects.map((project) => (
            <ProjectCard key={project.name} project={project} />
          ))}
        </div>
      </main>
    </Layout>
  );
}
```

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: success. (This type-checks the new TSX — the gate that catches prop mismatches.)

- [ ] **Step 5: Dev check — projects page**

Run: `npm start`, open `http://localhost:3000/projects`.
Expected: heading "Projects", three cards (Option Screener, Blog, html-to-wechat-article) in a responsive grid, each with name, description, tag badges. Clicking a card opens its `repo` URL in a new context (link target). Hovering lifts the card (`.card-interactive:hover` translate). Dark mode toggle still looks right.

- [ ] **Step 6: Commit**

```bash
git add src/data/projects.ts src/components/ProjectCard.tsx src/pages/projects.tsx
git commit -m "feat(projects): data model, card component, projects page"
```

---

### Task 7: Custom homepage (Layout B)

**Files:**
- Modify (full rewrite): `src/pages/index.tsx`
- Create: `src/components/Hero.tsx`
- Create: `src/components/FeaturedPosts.tsx`

**Interfaces:**
- Consumes: `projects` and `ProjectCard` (Task 6), blog plugin global data (Task 5).
- Produces: a homepage with three sections — Hero, Latest Posts (3 most recent), featured Projects.

> **IMPLEMENTATION NOTE (discovered during T7):** The brief's original `FeaturedPosts` recipe (`useGlobalData()['docusaurus-plugin-content-blog']['default'].blogPosts`) is broken on Docusaurus 3.10 — blog plugin content is NOT exposed via global data on standalone (non-blog) pages. The working approach is a small custom plugin at `plugins/latest-posts/index.js` (CommonJS, since Docusaurus's plugin resolver uses `require.resolve`) that reads `allContent['docusaurus-plugin-content-blog'].default.blogPosts` inside its `allContentLoaded` lifecycle hook and republishes the latest N via `setGlobalData({posts})`. `FeaturedPosts` then consumes that via the plugin's global data. This is the documented Docusaurus escape hatch for cross-plugin content access. The plugin is registered in `docusaurus.config.ts` `plugins: [...]`. The code blocks below show the original (broken) intent for Hero/index.tsx (still valid); FeaturedPosts must use the plugin-data path instead.

> Also: the default scaffold's `src/components/HomepageFeatures/` and `src/pages/index.module.css` (used only by the old landing page) become dead code after this rewrite and are removed.

- [ ] **Step 1: Write `src/components/Hero.tsx`**

```tsx
import React from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Translate from '@docusaurus/Translate';

export default function Hero(): JSX.Element {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header
      className="hero"
      style={{
        background: 'var(--home-hero-bg)',
        padding: '4rem 1rem',
        textAlign: 'center',
      }}
    >
      <div className="container">
        <h1 className="hero__title" style={{fontSize: 'clamp(2rem, 5vw, 3.25rem)'}}>
          Hi, I'm Tony Law 👋
        </h1>
        <p className="hero__subtitle" style={{fontSize: '1.25rem', opacity: 0.85}}>
          {siteConfig.tagline}
        </p>
        <div style={{display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1.5rem'}}>
          <Link className="button button--primary button--lg" to="/blog">
            <Translate>Read the blog</Translate>
          </Link>
          <Link className="button button--secondary button--lg" to="/about">
            <Translate>Contact</Translate>
          </Link>
        </div>
      </div>
    </header>
  );
}
```

> The `<Translate>` children without an `id` fall back to their text for English (the default locale). For Chinese, add entries to `i18n/zh/code.json` (Step 4). The "Contact" CTA goes to `/about` (the resume-style contact section) — lightweight job-seeker entry, per spec §9.

- [ ] **Step 2: Write `src/components/FeaturedPosts.tsx`**

```tsx
import React from 'react';
import Link from '@docusaurus/Link';
import {useGlobalData} from '@docusaurus/useGlobalData';
import Translate from '@docusaurus/Translate';

interface BlogPostMetadata {
  title: string;
  permalink: string;
  description?: string;
  formattedDate?: string;
  date: string;
}

interface BlogGlobalData {
  blogPosts: {metadata: BlogPostMetadata}[];
}

function useLatestPosts(count = 3): BlogPostMetadata[] {
  const globalData = useGlobalData();
  const blogPluginData = (globalData['docusaurus-plugin-content-blog']?.['default'] ?? {}) as BlogGlobalData;
  return (blogPluginData.blogPosts ?? [])
    .map((p) => p.metadata)
    .slice(0, count);
}

export default function FeaturedPosts(): JSX.Element {
  const posts = useLatestPosts(3);
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
        {posts.map((post) => (
          <Link key={post.permalink} to={post.permalink} className="card-interactive card padding--lg" style={{textDecoration: 'none', color: 'inherit'}}>
            <small style={{opacity: 0.7}}>{post.formattedDate ?? post.date}</small>
            <h3 style={{margin: '0.5rem 0'}}>{post.title}</h3>
            {post.description && <p style={{marginBottom: 0, opacity: 0.8}}>{post.description}</p>}
          </Link>
        ))}
      </div>
    </section>
  );
}
```

> `useGlobalData` returns the blog plugin's loaded posts for the *current locale*, so `/zh/` automatically shows Chinese posts. Each post's `permalink` is locale-correct.

- [ ] **Step 3: Rewrite `src/pages/index.tsx`**

Overwrite the scaffold landing page with:

```tsx
import React from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Hero from '../components/Hero';
import FeaturedPosts from '../components/FeaturedPosts';
import ProjectCard from '../components/ProjectCard';
import {projects} from '../data/projects';
import Translate from '@docusaurus/Translate';
import Link from '@docusaurus/Link';

export default function Home(): JSX.Element {
  const {siteConfig} = useDocusaurusContext();
  const featuredProjects = projects.filter((p) => p.featured);
  return (
    <Layout title={siteConfig.title} description={siteConfig.tagline}>
      <main>
        <Hero />
        <FeaturedPosts />
        <section className="container margin-vert--xl">
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem'}}>
            <h2 style={{marginBottom: 0}}>
              <Translate>Projects</Translate>
            </h2>
            <Link to="/projects">
              <Translate>View all →</Translate>
            </Link>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {featuredProjects.map((project) => (
              <ProjectCard key={project.name} project={project} />
            ))}
          </div>
        </section>
      </main>
    </Layout>
  );
}
```

- [ ] **Step 4: Add Chinese strings for `<Translate>` to `i18n/zh/code.json`**

Append these keys to the existing `i18n/zh/code.json` (merge into the JSON object):

```json
  "Read the blog": { "message": "阅读博客" },
  "Contact": { "message": "联系方式" },
  "Latest Posts": { "message": "最新文章" },
  "View all →": { "message": "查看全部 →" },
  "Projects": { "message": "项目" }
```

The merged file should remain valid JSON. Final `i18n/zh/code.json` (combining Task 5 Step 4 + these):

```json
{
  "theme.blog.paginator.navAriaTitle": {"message": "博文列表分页导航"},
  "theme.blog.paginator.newerEntries": {"message": "较新的文章"},
  "theme.blog.paginator.olderEntries": {"message": "较旧的文章"},
  "theme.blog.post.readingTime.plurals": {"message": "约 {minutes} 分钟阅读"},
  "theme.blog.sidebar.navAriaTitle": {"message": "最近博文导航"},
  "theme.CodeBlock.copied": {"message": "已复制"},
  "theme.CodeBlock.copy": {"message": "复制"},
  "theme.NotFound.title": {"message": "页面不存在"},
  "theme.common.tags": {"message": "标签"},
  "theme.tags.tagsPageTitle": {"message": "标签"},
  "Read the blog": {"message": "阅读博客"},
  "Contact": {"message": "联系方式"},
  "Latest Posts": {"message": "最新文章"},
  "View all →": {"message": "查看全部 →"},
  "Projects": {"message": "项目"}
}
```

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: success.

- [ ] **Step 6: Dev check — homepage Layout B**

Run: `npm start`, open `http://localhost:3000`.
Expected three stacked sections:
1. **Hero** — "Hi, I'm Tony Law 👋", subtitle "Software engineer & options trader", two buttons "Read the blog" / "Contact".
2. **Latest Posts** — the welcome post card with date + title + description, "View all →" link to `/blog`.
3. **Projects** — the two `featured: true` project cards (Option Screener, Blog), "View all →" link to `/projects`.

Open `http://localhost:3000/zh/`.
Expected: Hero subtitle unchanged, buttons read "阅读博客" / "联系方式", "最新文章" heading, "项目" heading, "查看全部 →" links.

- [ ] **Step 7: Commit**

```bash
git add src/pages/index.tsx src/components/Hero.tsx src/components/FeaturedPosts.tsx i18n/zh/code.json
git commit -m "feat(home): custom Layout B homepage — Hero + Latest Posts + Projects"
```

---

### Task 8: About page (resume-shaped, bilingual)

**Files:**
- Create: `src/pages/about.md`
- Create: `i18n/zh/docusaurus-plugin-content-pages/about.md`

**Interfaces:**
- Produces: `/about` (English) and `/zh/about` (Chinese) pages, single-page resume layout. Linked from navbar (Task 3) and hero Contact CTA (Task 7).

- [ ] **Step 1: Write `src/pages/about.md`**

```markdown
---
title: About
description: About Tony Law — software engineer & options trader.
slug: about
---

# About me

I'm a software engineer and options trader. I build tools for market research and
write about software, finance, and the systems that connect them.

## Featured projects

- **Option Screener** — options research and screening, broker-integrated
- **Blog** — this site, built with Docusaurus

See [Projects](/projects) for the full list.

## Skills

`TypeScript` `React` `Node` `Python` `Docker` `Postgres` `Options trading`

## Experience

- **Software Engineer** — building products across the stack (2018 – present)
- **Options trader** — systematic strategies and research tooling

## Education

B.Sc. — Computer Science

## Contact

- GitHub: [@tonylawx](https://github.com/tonylawx)
- Email: hello@tonylaw.cc

Recruiters welcome — the best way to reach me is by email.
```

> Email `hello@tonylaw.cc` is a placeholder; confirm/set the real address before launch (Task 11).

- [ ] **Step 2: Write `i18n/zh/docusaurus-plugin-content-pages/about.md`**

```markdown
---
title: 关于
description: 关于 Tony Law —— 软件工程师 & 期权交易者。
slug: about
---

# 关于我

我是一名软件工程师，也是期权交易者。我开发市场研究工具，写一些关于软件、
金融，以及二者交叉系统的文章。

## 精选项目

- **Option Screener** —— 期权研究与筛选，对接券商
- **Blog** —— 本站，用 Docusaurus 搭建

完整列表见 [Projects](/zh/projects)。

## 技能

`TypeScript` `React` `Node` `Python` `Docker` `Postgres` `期权交易`

## 经历

- **软件工程师** —— 全栈产品开发（2018 – 至今）
- **期权交易者** —— 系统化策略与研究工具

## 教育

计算机科学 理学学士

## 联系方式

- GitHub：[@tonylawx](https://github.com/tonylawx)
- 邮箱：hello@tonylaw.cc

欢迎招聘方联系 —— 最好的方式是发邮件。
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: success.

- [ ] **Step 4: Dev check — about page**

Run: `npm start`:
- Open `http://localhost:3000/about` → English resume-style page renders.
- Open `http://localhost:3000/zh/about` → Chinese version renders.
- Click "Contact" button on the homepage (`/`) → navigates to `/about`.

- [ ] **Step 5: Commit**

```bash
git add src/pages/about.md i18n/zh/docusaurus-plugin-content-pages/about.md
git commit -m "feat(about): bilingual resume-style about page"
```

---

### Task 9: Local search (Chinese + English)

**Files:**
- Modify: `package.json` (add `@easyops-cn/docusaurus-search-local`)
- Modify: `docusaurus.config.ts` (register plugin)

**Interfaces:**
- Produces: a search bar in the navbar (auto-injected by the plugin) that builds a client-side index over all blog/page content in both locales.

- [ ] **Step 1: Install the plugin**

Run:
```bash
cd ~/Documents/blog
npm install --save @easyops-cn/docusaurus-search-local
```
Expected: package added; `package.json` lists `@easyops-cn/docusaurus-search-local` ^0.x.

- [ ] **Step 2: Register the plugin in `docusaurus.config.ts`**

In `docusaurus.config.ts`, add a top-level `plugins` array (sibling to `presets`). Insert this after the `i18n` block:

```ts
  plugins: [
    [
      '@easyops-cn/docusaurus-search-local',
      {
        hashed: true,
        indexDocs: false,
        indexBlog: true,
        indexPages: true,
        language: ['en', 'zh'],
      },
    ],
  ],
```

> `indexDocs: false` because we have no `docs/` directory. `language: ['en','zh']` enables Chinese segmentation.

- [ ] **Step 3: Build (generates the search index)**

Run: `npm run build`
Expected: success. Build log shows search-index generation (no error about missing language).

- [ ] **Step 4: Dev check — search bar**

Run: `npm start`, open `http://localhost:3000`.
Expected: a search input appears in the navbar (right side, before the locale dropdown). Type "welcome" → results dropdown shows the English welcome post. Switch to `/zh/` and type "欢迎" → results show the Chinese post. Type "Option" → results show the Projects/About page.

> If the search bar does not appear: the plugin injects the navbar item automatically when the plugin is registered correctly. Verify the `plugins` array is at the top level of `config` (not nested inside `presets`), then rebuild.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json docusaurus.config.ts
git commit -m "feat(search): local search with Chinese+English support"
```

---

### Task 10: Giscus comments

**Prerequisites:** Repo is public (Task 2). Now enable Discussions + fetch IDs + install Giscus app.

**Files:**
- Modify: `package.json` (add `@giscus/react`)
- Create: `src/components/Comments.tsx`
- Create: `src/theme/BlogPostPage/index.tsx` (swizzled via eject)
- Modify: `i18n/zh/code.json` (optional, no-op for Giscus — Giscus has its own i18n via the `lang` prop)

**Interfaces:**
- Produces: a `<Comments />` component rendered at the bottom of every blog post.

- [ ] **Step 1: Enable GitHub Discussions on the repo**

Run:
```bash
gh repo edit tonylawx/blog --enable-discussions
```
Expected: no error. (If `--enable-discussions` is unsupported in your `gh` version, enable Discussions in the browser: repo → Settings → General → Features → check "Discussions".)

- [ ] **Step 2: Install the Giscus GitHub App**

Open https://github.com/apps/giscus/install and install it on `tonylawx/blog`, granting access to that repo. (One-time browser step — no CLI equivalent.)

- [ ] **Step 3: Fetch `repo-id` and `category-id` via the GraphQL API**

Create the "Announcements" category as the discussion category (it exists by default once Discussions is on). Fetch IDs:

Run:
```bash
gh api graphql -f query='
{
  repository(owner: "tonylawx", name: "blog") {
    id
    discussionCategories(first: 10) {
      nodes { id name slug }
    }
  }
}'
```
Expected: JSON with `repository.id` (the repo-id, e.g. `R_kgDOL...`) and a `discussionCategories.nodes` array. Find the node whose `name` is "Announcements" — copy its `id` (the category-id).

Record both values — they go into the next step's component.

- [ ] **Step 4: Install `@giscus/react`**

Run:
```bash
npm install --save @giscus/react
```

- [ ] **Step 5: Write `src/components/Comments.tsx`**

Replace `<REPO_ID>` and `<CATEGORY_ID>` with the values from Step 3.

```tsx
import React from 'react';
import Giscus from '@giscus/react';
import {useColorMode} from '@docusaurus/theme-common';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

export default function Comments(): JSX.Element {
  const {colorMode} = useColorMode();
  const {i18n} = useDocusaurusContext();
  const lang = i18n.currentLocale === 'zh' ? 'zh-CN' : 'en';

  return (
    <div style={{marginTop: '2rem'}}>
      <Giscus
        repo="tonylawx/blog"
        repoId="<REPO_ID>"
        category="Announcements"
        categoryId="<CATEGORY_ID>"
        mapping="pathname"
        strict="0"
        reactionsEnabled="1"
        emitMetadata="0"
        inputPosition="top"
        theme={colorMode === 'dark' ? 'dark' : 'light'}
        lang={lang}
        loading="lazy"
      />
    </div>
  );
}
```

- [ ] **Step 6: Swizzle `BlogPostPage` to insert comments**

Run:
```bash
npx docusaurus swizzle @docusaurus/theme-classic BlogPostPage -- --eject
```
Expected: writes `src/theme/BlogPostPage/index.tsx` and `src/theme/BlogPostPage/styles.module.css`. (If it prompts interactively, confirm the eject. If it errors that the theme is unsafe to swizzle, re-run with `--danger`.)

- [ ] **Step 7: Edit the ejected `src/theme/BlogPostPage/index.tsx` to render `<Comments />`**

Open `src/theme/BlogPostPage/index.tsx`. At the top of the file, add the import with the other imports:

```tsx
import Comments from '@site/src/components/Comments';
```

Then, just **before** the closing `</BlogPostItem>` tag near the end of the returned JSX (after the paginator/tags block, before `</BlogPostItem>`), insert:

```tsx
        <Comments />
```

> The exact surrounding markup varies by Docusaurus patch version. The insertion rule: place `<Comments />` once, as the last child inside `<BlogPostItem>`, so it appears at the bottom of each post. Build (next step) will surface any JSX error.

- [ ] **Step 8: Build**

Run: `npm run build`
Expected: success. (Catches malformed JSX from the swizzle edit.)

- [ ] **Step 9: Dev check — comments render**

Run: `npm start`, open `http://localhost:3000/blog/welcome`.
Expected: Giscus widget loads at the bottom of the post. (If it shows "giscus is not installed on this repo", revisit Step 2 — the GitHub App must be installed and the repo public.)

> First comment may require a GitHub login in the browser — that's expected.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json src/components/Comments.tsx src/theme/BlogPostPage/
git commit -m "feat(comments): Giscus integration via swizzled BlogPostPage"
```

---

### Task 11: Deploy to Vercel + verify RSS / sitemap / og

**Files:**
- Create: `vercel.json`
- Modify: `static/img/favicon.ico`, `static/img/og.png` (replace placeholders) — optional but recommended before launch

**Interfaces:**
- Produces: a live Vercel deployment at the project's `*.vercel.app` URL, with the production build passing and RSS/sitemap/og verifiable.

- [ ] **Step 1: Add `vercel.json`**

Create `vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "build",
  "framework": "docusaurus-2"
}
```

> `framework: "docusaurus-2"` is Vercel's preset id for Docusaurus v3 as well (Vercel maps it correctly). If `npm run build` is auto-detected, this file is belt-and-suspenders.

- [ ] **Step 2: Re-enable strict broken-link checking**

Now that `/projects` (Task 6) and `/about` (Task 8) exist, flip the config back to strict — this is the final safety net before the site goes live.

In `docusaurus.config.ts`, change `onBrokenLinks: 'warn'` back to `onBrokenLinks: 'throw'`.

Run: `npm run build`
Expected: build still succeeds (no broken links remain). If it throws, a navbar/footer link points at a page that doesn't exist — fix the link before deploying.

- [ ] **Step 3: (Optional, before launch) Replace favicon and og placeholders**

Put a real `favicon.ico` and a 1200×630 `og.png` into `static/img/`. If skipping, the scaffold defaults remain (acceptable for a first deploy).

In `docusaurus.config.ts`, add to the `themeConfig` object a basic image + metadata set (insert inside `themeConfig:`):

```ts
    image: 'img/og.png',
    metadata: [
      {name: 'twitter:card', content: 'summary_large_image'},
    ],
```

- [ ] **Step 4: Push everything to GitHub**

Run:
```bash
cd ~/Documents/blog
git add -A
git commit -m "chore: vercel config + og metadata" --allow-empty
git push origin main
```
Expected: all tasks (3–10) pushed; `main` on GitHub matches local.

- [ ] **Step 5: Create the Vercel project and connect it**

Option A (CLI — fastest):
```bash
npm i -g vercel
vercel  # link / create the project, follow prompts:
        # Set up and deploy? Y
        # Which scope? (your account)
        # Link to existing project? N
        # Project name: tonylaw-blog (or accept default)
        # In which directory is your code? ./
        # Want to modify settings? N
```
Then promote to production:
```bash
vercel --prod
```
Expected: a `*.vercel.app` production URL is printed. Visit it — full site loads.

Option B (browser): go to https://vercel.com/new, import `tonylawx/blog`, accept auto-detected Docusaurus settings, click Deploy.

- [ ] **Step 6: Verify RSS, sitemap, og on the production URL**

Replace `DEPLOY_URL` with the actual `*.vercel.app` URL from Step 5.

Run:
```bash
DEPLOY_URL="https://tonylaw-blog.vercel.app"  # ← replace with real URL
curl -sI "$DEPLOY_URL/blog/rss.xml" | head -1   # → HTTP/2 200
curl -sI "$DEPLOY_URL/sitemap.xml"  | head -1   # → HTTP/2 200
curl -s "$DEPLOY_URL" | grep -i 'og:image'       # → <meta property="og:image" ...>
```
Expected: all three return content (200 / 200 / an og:image meta tag).

- [ ] **Step 7: Commit the vercel config**

```bash
git add vercel.json docusaurus.config.ts
git commit -m "chore(deploy): vercel config + og metadata"
git push origin main
```

---

### Task 12: Custom domain `tonylaw.cc`

**Files:** none in the repo — this task configures Vercel + the user's DNS registrar.

**Interfaces:**
- Produces: `https://tonylaw.cc` serving the site over HTTPS, with `www.tonylaw.cc` redirecting to it.

- [ ] **Step 1: Add the domain in Vercel**

Run:
```bash
vercel domains add tonylaw.cc
vercel domains add www.tonylaw.cc
```
Or in browser: Vercel dashboard → the project → Settings → Domains → add `tonylaw.cc` (set as primary) and `www.tonylaw.cc` (set to redirect to `tonylaw.cc`).

Expected: Vercel shows the DNS records to configure for each host.

- [ ] **Step 2: Configure DNS at the domain registrar**

At the registrar where `tonylaw.cc` is managed, set (Vercel confirms exact values in Step 1's output):

| Host | Type | Value |
|---|---|---|
| `@` (apex `tonylaw.cc`) | A | `76.76.21.21` (Vercel's apex IP — confirm in dashboard) |
| `www` | CNAME | `cname.vercel-dns.com` |

> Some registrars support CNAME flattening at the apex instead of an A record — either works. Use what Vercel's dashboard specifies.

- [ ] **Step 3: Wait for DNS + cert provisioning**

Run (may take a few minutes to a few hours depending on DNS TTL):
```bash
dig +short tonylaw.cc A
```
Expected: eventually returns the Vercel apex IP (not `198.18.x.x` — if you see `198.18.x.x`, your local proxy/VPN is intercepting DNS; use a public resolver to verify instead):
```bash
dig +short tonylaw.cc A @1.1.1.1
```

- [ ] **Step 4: Verify the live domain**

Run:
```bash
curl -sI https://tonylaw.cc | head -1          # → HTTP/2 200
curl -sIL https://www.tonylaw.cc | grep -E '^HTTP|location'  # → 301/302 redirect to https://tonylaw.cc
curl -sI https://tonylaw.cc/zh/ | head -1      # → HTTP/2 200 (Chinese homepage)
```
Expected: apex serves 200 over HTTPS, `www` redirects to apex, `/zh/` works.

- [ ] **Step 5: Confirm in the Vercel dashboard**

Open the project → Domains. Both entries show a green "Valid Configuration" badge. The site is live at `https://tonylaw.cc`.

---

## Self-Review

**Spec coverage check** (spec section → task):
- §3 stack (Docusaurus v3, Vercel, Giscus, local search) → Tasks 1, 9, 10, 11
- §4 sitemap (Home/Blog/Projects/About + /zh) → Tasks 5 (Blog), 6 (Projects), 7 (Home), 8 (About), 3 (locale switcher)
- §5 directory structure → every task's files map to it
- §6 i18n en-default + zh via `i18n/zh/` tree → Tasks 3 (config), 5 (blog zh), 7 (UI strings), 8 (about zh)
- §7 content model (frontmatter, `projects.ts`, authors.yml) → Tasks 5, 6
- §8 homepage Layout B → Task 7
- §9 resume-style About + Contact CTA → Tasks 7 (CTA), 8 (page)
- §10 features (dark mode, search, Giscus, RSS, MDX, fonts) → Tasks 3 (colorMode), 4 (fonts/dark), 9 (search), 10 (Giscus), 5 (RSS), 11 (verify)
- §11 deploy + DNS → Tasks 2 (repo), 11 (Vercel), 12 (domain)
- §12 prerequisites (gh, domain) → resolved before plan; Giscus IDs in Task 10

No spec section uncovered.

**Placeholder scan:** `<REPO_ID>` and `<CATEGORY_ID>` in Task 10 are intentional runtime values, fetched in Step 3 of that same task and substituted in Step 5 — not plan placeholders. `hello@tonylaw.cc`, project list, and `twitter.com/tonylawx` are content placeholders flagged in-line for the user to confirm at launch (spec §12 already lists them as open). No "TBD"/"TODO"/"implement later".

**Type consistency:** `Project` type fields (`name`, `description`, `tags`, `url?`, `repo`, `icon?`, `featured`) defined in Task 6 Step 1 and consumed identically in Task 6 Step 2 (`ProjectCard`) and Task 7 Step 3 (homepage filter on `p.featured`). `FeaturedPosts` `BlogPostMetadata` fields (`title`, `permalink`, `description?`, `formattedDate?`, `date`) match what the blog plugin emits and what Task 7 Step 3 renders. No name drift.
