# tonylaw.cc

Personal blog + portfolio of Tony Law — software engineer & options trader.

Built with [Docusaurus v3](https://docusaurus.io), bilingual (English default / Chinese secondary), deployed on Vercel.

## Develop

```bash
npm install
npm start        # http://localhost:3000
npm run build    # static output in build/
```

## Structure

- `blog/` — blog posts (Markdown/MDX)
- `src/pages/` — homepage, projects, about
- `src/components/` — Hero, FeaturedPosts, ProjectCard
- `src/data/projects.ts` — project metadata
- `i18n/zh/` — Chinese translations
- `docusaurus.config.ts` — site config
