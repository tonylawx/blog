export type Project = {
  name: string;
  description: string;
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
    tags: ['React', 'TypeScript', 'Open Source'],
    repo: 'https://github.com/tonylawx/react-ios-multiselect',
    featured: true,
    aiAgent: true,
  },
  {
    name: 'US Stock Analyst Skill',
    description:
      'A Codex / agent skill that runs daily Tony-style U.S. equity analysis — generating market briefs, publishable HTML, and WeChat draft posts.',
    tags: ['Python', 'LLM', 'Finance'],
    repo: 'https://github.com/tonylawx/us-stock-analyst-skill',
    featured: true,
    aiAgent: true,
  },
  {
    name: 'html-to-wechat-article',
    description: 'Convert HTML into WeChat-public-account-friendly markup.',
    tags: ['Tooling', 'HTML'],
    repo: 'https://github.com/tonylawx/html-to-wechat-article',
    featured: true,
    aiAgent: true,
  },
  {
    name: 'Blog',
    description:
      'This site — a bilingual Docusaurus blog with local search and Giscus comments.',
    tags: ['Docusaurus', 'React', 'MDX'],
    repo: 'https://github.com/tonylawx/blog',
    featured: true,
  },
];
