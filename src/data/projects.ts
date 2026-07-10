export type Project = {
  name: string;
  description: string;
  /** Chinese description shown under zh locale. Falls back to `description`. */
  descriptionZh?: string;
  tags: string[];
  url?: string;
  repo: string;
  icon?: string;
  featured: boolean;
  /** Built for use by AI agents (e.g. a Codex / Claude Code skill). */
  aiAgent?: boolean;
};

export const projects: Project[] = [
  {
    name: 'THETA',
    description:
      'Options research and screening tool with broker integration, real-time greeks, and a mobile-friendly UI.',
    descriptionZh:
      '美股期权研究与筛选工具，支持券商集成、实时希腊值和移动端适配。',
    tags: ['React', 'TypeScript', 'Hono', 'Node', 'Finance'],
    repo: 'https://github.com/tonylawx/website',
    url: 'https://theta.tonylaw.cc',
    icon: '/img/theta-icon.png',
    featured: true,
    aiAgent: true,
  },
  {
    name: 'react-ios-multiselect',
    description:
      'An open-source React component for iOS-style multi-select interactions.',
    descriptionZh:
      '开源 React 组件，提供 iOS 风格的多选交互体验。',
    tags: ['React', 'TypeScript', 'Open Source'],
    repo: 'https://github.com/tonylawx/react-ios-multiselect',
    featured: true,
    aiAgent: true,
  },
  {
    name: 'US Stock Analyst Skill',
    description:
      'A Codex / agent skill that runs daily Tony-style U.S. equity analysis — generating market briefs, publishable HTML, and WeChat draft posts.',
    descriptionZh:
      'Codex / Agent 技能，每日自动生成美股分析简报、可发布 HTML 和微信公众号草稿。',
    tags: ['Python', 'LLM', 'Finance'],
    repo: 'https://github.com/tonylawx/us-stock-analyst-skill',
    featured: true,
    aiAgent: true,
  },
  {
    name: 'html-to-wechat-article',
    description: 'Convert HTML into WeChat-public-account-friendly markup.',
    descriptionZh: '将 HTML 转换为微信公众号兼容的富文本格式。',
    tags: ['Tooling', 'HTML'],
    repo: 'https://github.com/tonylawx/html-to-wechat-article',
    featured: true,
    aiAgent: true,
  },
  {
    name: 'Blog',
    description:
      'This site — a bilingual Docusaurus blog with local search and Giscus comments.',
    descriptionZh:
      '本站——基于 Docusaurus 的中英双语博客，支持本地搜索和 Giscus 评论。',
    tags: ['Docusaurus', 'React', 'MDX'],
    repo: 'https://github.com/tonylawx/blog',
    featured: true,
  },
];
