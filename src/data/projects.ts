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
    name: 'Tech & AI Weekly Skill',
    description:
      'An agent skill for researching and drafting tech and AI weeklies, with source checks, cost and supply-chain analysis, and draft validation.',
    descriptionZh:
      '科技与 AI 周刊 Agent 技能，围绕真实事件做多信源核验、成本与供应链分析，生成并校验周刊稿件。',
    tags: ['Agent Skill', 'Python', 'AI', 'Research'],
    repo: 'https://github.com/tonylawx/tech-ai-weekly-skill',
    featured: true,
    aiAgent: true,
  },
  {
    name: 'Macro & Finance Weekly Skill',
    description:
      'An agent skill for weekly macro and U.S. equity research, covering liquidity, market reviews, event calendars, and risk levels with draft validation.',
    descriptionZh:
      '全球宏观与美股周报 Agent 技能，涵盖盘面复盘、流动性分析、事件日历和关键风险点位，并校验稿件结构。',
    tags: ['Agent Skill', 'Python', 'Finance', 'Research'],
    repo: 'https://github.com/tonylawx/macro-finance-weekly-skill',
    featured: true,
    aiAgent: true,
  },
  {
    name: 'react-ios-multiselect',
    description:
      'A React select with a keyboard-aware iOS bottom sheet, virtualized options, and single or multi-select modes. Includes a live playground and stable hooks for agents.',
    descriptionZh:
      'React 选择器，支持键盘感知的 iOS 底部面板、虚拟列表和单选/多选，提供在线演示与稳定的 Agent 操作钩子。',
    tags: ['React', 'TypeScript', 'Open Source'],
    repo: 'https://github.com/tonylawx/react-ios-multiselect',
    url: 'https://tonylawx.github.io/react-ios-multiselect/',
    featured: true,
    aiAgent: true,
  },
  {
    name: 'US Stock Analyst Skill',
    description:
      'A Codex skill for daily U.S. equity notes, with source discipline, earnings and cash-flow checks, price-attribution confidence, and event scenarios.',
    descriptionZh:
      '美股日报 Codex 技能，结合信源核验、财报与现金流检查、价格归因置信度和事件情景分析撰写市场笔记。',
    tags: ['Python', 'LLM', 'Finance'],
    repo: 'https://github.com/tonylawx/us-stock-analyst-skill',
    featured: true,
    aiAgent: true,
  },
  {
    name: 'Financial English Editor Skill',
    description:
      'An agent skill for rewriting Chinese market commentary into natural financial English while preserving tickers, figures, price levels, and conviction.',
    descriptionZh:
      '金融英文编辑 Agent 技能，将中文市场评论改写为自然的金融英语，保留股票代码、数字、关键点位与判断强度。',
    tags: ['Agent Skill', 'Finance', 'Writing'],
    repo: 'https://github.com/tonylawx/financial-english-editor-skill',
    featured: false,
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
      'This bilingual Docusaurus site, with local search, article navigation, self-hosted Remark42 comments, and an archive for the publishing workflow.',
    descriptionZh:
      '本站——中英双语 Docusaurus 博客，支持本地搜索、文章导航、自托管 Remark42 评论，并承接内容发布归档。',
    tags: ['Docusaurus', 'React', 'MDX'],
    repo: 'https://github.com/tonylawx/blog',
    featured: true,
  },
];
