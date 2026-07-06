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
    name: 'THETA',
    description:
      'Options research and screening tool with broker integration, real-time greeks, and a mobile-friendly UI.',
    tags: ['React', 'TypeScript', 'Node', 'Finance'],
    repo: 'https://github.com/tonylawx/website',
    url: 'https://theta.tonylaw.cc',
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
