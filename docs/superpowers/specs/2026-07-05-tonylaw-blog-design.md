# tonylaw.cc 个人博客 — 设计文档

**日期**: 2026-07-05
**状态**: 待用户最终审阅
**域名**: tonylaw.cc（主域） + www.tonylaw.cc（重定向到主域）
**代码路径**: `~/Documents/blog`

---

## 1. 目标

把 `tonylaw.cc` 做成一个 **个人主页 + 博客 + 作品集** 三合一站点，兼顾两个长期用途：

- **写文章**：技术、投资、工具记录，中英双语
- **求职**：HR / 招聘者 Google 名字时能落到一个像样的个人页

上线时是空站（无内容迁移），先把流程跑通，内容后续手动补。

## 2. 非目标（YAGNI，本次不做）

- Newsletter / 邮件订阅
- Algolia 付费搜索
- 多作者（暂时只有 tonylaw 一个作者）
- Google Analytics（Vercel 自带基础分析够用）
- CMS 后台（直接 git 提 Markdown）
- 内容迁移（空站起步）
- 独立 resume 页 / PDF（求职走轻量路线，About 页简历化即可）

## 3. 技术栈决策

| 决策 | 选择 | 理由 |
|---|---|---|
| 框架 | **Docusaurus v3** | 用户最初指定"React 文档框架"；双语 i18n 一等公民；blog 插件、搜索、暗色、MDX 全现成 |
| 默认语言 | **英文**（不带前缀） | 英文为主，中文辅助 |
| 第二语言 | **中文**（`/zh/...` 前缀） | 单语文章合法，不必每篇都翻译 |
| 部署 | **Vercel** | 自动构建、全球 CDN、自定义域名一键绑定、免费额度够 |
| 评论 | **Giscus**（GitHub Discussions） | 无后端、免费、身份靠 GitHub |
| 搜索 | **docusaurus-search-local**（本地索引） | 免费、支持中文分词、不依赖 Algolia |
| 仓库 | **一个仓库搞定一切**（博客内容 + Giscus Discussions 都在博客仓库本身） | 用户明确要求 |

## 4. 信息架构

### 站点地图

| 路径 | 页面 | 说明 |
|---|---|---|
| `/` | 首页 | 定制：Hero + Latest Posts + Projects（见 §8） |
| `/blog` | 博客列表 | 标签、归档、作者、RSS |
| `/blog/<post>` | 文章详情 | MDX，代码高亮、目录、评论 |
| `/projects` | 作品集 | 项目卡片网格 |
| `/about` | 关于（简历型） | 自我介绍、技能、经历、教育、联系方式 |
| `/zh/...` | 上述各页的中文版 | 单语文章在中文站不显示 |

### 顶部导航

`Home` · `Blog` · `Projects` · `About` ＋ 右侧：搜索框、暗色切换 ⚡、语言切换 🌐

### Footer

GitHub / Twitter 等社交链接 + 版权 + 站点生成信息

## 5. 目录结构

```
blog/
├── blog/                              # 博客正文（默认 locale = 英文）
│   └── 2026-07-05-welcome/
│       └── index.md
├── blog/authors.yml                   # 作者元数据（tonylawx）
├── i18n/zh/                           # 中文翻译树
│   ├── code.json                      # UI 文案中文
│   ├── docusaurus-plugin-content-blog/
│   │   └── 2026-07-05-welcome/index.md
│   └── docusaurus-plugin-content-pages/
│       └── about.md
├── src/
│   ├── pages/
│   │   ├── index.tsx                  # ← 定制首页（核心改造）
│   │   ├── projects.tsx               # ← 作品集页（读 data/projects.ts）
│   │   └── about.md                   # 关于页（英文）
│   ├── components/
│   │   ├── Hero.tsx
│   │   ├── FeaturedPosts.tsx
│   │   └── ProjectCard.tsx
│   ├── data/
│   │   └── projects.ts                # 项目元数据数组
│   └── css/custom.css                 # 主题色、字体、间距（亮/暗两套变量）
├── static/                            # 静态资源（favicon、头像、og 图）
├── docusaurus.config.ts               # 站点配置：i18n、navbar、footer、主题色、搜索
├── sidebars.ts                        # （无 docs 板块时可留空）
├── vercel.json                        # 部署配置
└── package.json
```

> Docusaurus 不用文件名后缀（`index.zh.md` 是 Astro 的玩法）。翻译通过 `i18n/<locale>/` 目录树镜像源文件路径来组织。

## 6. i18n 双语机制

- 默认 locale = `en`（无前缀），中文 locale = `zh`（`/zh/...` 前缀）
- UI 文案：`i18n/zh/code.json` 翻译 Docusaurus 自带字符串（"Search"、"Tags"、"Previous" 等）
- 博客文章：英文版在 `blog/<post>/index.md`，中文版在 `i18n/zh/docusaurus-plugin-content-blog/<post>/index.md`
- 单语文章合法：只写英文的文章在 `/zh/blog` 列表里不出现，不报错
- navbar 自带语言切换 dropdown

## 7. 内容模型

### 博客 frontmatter

```yaml
---
title: Welcome to the blog
description: Why I started writing        # 用于 SEO / og:description / 列表摘要
slug: welcome
date: 2026-07-05
tags: [meta, announcement]
authors: tonylawx
---
正文（Markdown / MDX）……
```

### 项目数据 `src/data/projects.ts`

```ts
export type Project = {
  name: string;
  description: string;
  tags: string[];
  url?: string;       # 线上演示
  repo: string;       # GitHub 仓库
  icon?: string;
  featured: boolean;  # 是否在首页 Projects 段展示
};
```

一个数组同时驱动 `/projects` 页和首页的 Projects 卡片段。

### 作者 `blog/authors.yml`

```yaml
tonylawx:
  name: Tony Law
  title: Software engineer & options trader
  url: https://tonylaw.cc
  image_url: /img/avatar.png
  social_urls:
    github: https://github.com/tonylawx
    twitter: https://twitter.com/tonylawx   # 占位，实际账号待确认
```

## 8. 首页设计（Layout B — 全宽分段）

```
┌──────────────────────────────────────────┐
│  Tony Law        Blog Projects About ⚡🌐 │   navbar
├──────────────────────────────────────────┤
│                                          │
│           Hi, I'm Tony Law 👋             │
│   Software engineer & options trader      │   Hero
│     I write about markets, code, …        │
│                                          │
│      [ Read the blog ]  [ Contact ]       │   CTA（Contact 为求职低调入口）
│                                          │
├──────────────────────────────────────────┤
│  Latest Posts                        →    │   按日期取最新 3 篇
│  ┌─────────┐ ┌─────────┐ ┌─────────┐     │
│  │ post 1  │ │ post 2  │ │ post 3  │     │   FeaturedPosts 读 blog 插件
│  └─────────┘ └─────────┘ └─────────┘     │   最近的 3 条（无需 frontmatter 标记）
├──────────────────────────────────────────┤
│  Projects                            →    │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐             │   取 featured: true 的项目
│  └────┘ └────┘ └────┘ └────┘             │
└──────────────────────────────────────────┘
```

- Hero 区右侧放头像或抽象装饰
- "→" 表示点击跳转 `/blog` / `/projects` 完整列表
- 落地即中英双版本（`/` 和 `/zh/`）

## 9. About 页（轻量求职维度）

结构（简历型，单页）：

1. 一句话定位（同 Hero tagline）
2. 精选项目（3 个，链到 `/projects` 详节）
3. 技能栈（标签云）
4. 经历（简短时间线，可只列 2-3 段）
5. 教育
6. 联系方式（邮箱、GitHub、Twitter）

不做单独 `/resume` 页、不生成 PDF。SEO 元信息完善，HR Google 名字能落到这里。

## 10. 功能细节

| 功能 | 方案 |
|---|---|
| 暗色模式 | `@docusaurus/preset-classic` 自带 `colorMode`，navbar 切换按钮；`custom.css` 维护亮/暗两套 CSS 变量；`respectPrefersColorScheme: true` 跟随系统 |
| 站内搜索 | `@easyops-cn/docusaurus-search-local`，构建时生成本地索引；中文分词支持 |
| 评论 | `@giscus/react` 组件，swizzle Blog 页插入；Giscus Discussions 开在博客仓库本身 |
| RSS | blog 插件自带 `/blog/rss.xml` + `/blog/atom.xml`，自动生成 |
| 代码块 | MDX + prism（默认），支持 title、行号、diff 高亮；后续可换 Expressive Code |
| 字体 | 英文 Inter；中文走系统字体栈（不打包中文字体，省体积） |
| SEO | 每页 title/description，og 图，sitemap.xml 自动生成 |

## 11. 部署 & 域名

1. `~/Documents/blog` 初始化为 git 仓库，推到 GitHub 公开仓库
2. Vercel 绑定该仓库；框架预设自动识别 Docusaurus；构建命令 `npm run build`，输出 `build/`
3. Vercel 项目里加 `tonylaw.cc`（主域）+ `www.tonylaw.cc`（自动重定向到主域）
4. **在域名注册商处**改 DNS（不是本机）：
   - `tonylaw.cc` → A 记录指向 Vercel 提供的 IP
   - `www.tonylaw.cc` → CNAME `cname.vercel-dns.com`
   - HTTPS 证书 Vercel 自动签发
5. 本机 fake-ip 提醒：当前本机解析 `www.tonylaw.cc` 返回 `198.18.0.105/106`（198.18.0.0/15 保留段，本机代理在劫持）。**不影响真实部署**——真实 DNS 在注册商那里设。本地验证时记得关代理或加规则。

## 12. 上线前置条件

- [x] GitHub 认证就绪：`gh` 已登录账户 `tonylawx`，scope 含 `repo` + `workflow`（实现阶段用 `gh repo create` 建仓库）
- [x] 域名 `tonylaw.cc` 已拥有
- [ ] Giscus 配置：仓库开启 Discussions + 装 Giscus App，拿到 repo-id / category-id（实现阶段处理）
- [ ] 域名注册商 DNS 改到 Vercel（部署完在 Vercel 控制台拿具体记录）
- [ ] 头像、og 图等静态资源（可先用占位）
- [ ] Twitter/社交账号确认（spec 暂用 `tonylawx` 占位）

## 13. 未来可加（不在本次范围）

- Newsletter（Resend / ConvertKit）
- Algolia 全文搜索
- Google Analytics
- resume PDF 生成
- 多作者

---

**下一步**：本 spec 用户审阅通过后，进入实现计划阶段（writing-plans），产出可执行的实施步骤。
