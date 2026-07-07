export type ArticleLocale = 'en' | 'zh';

export interface ArticleElementLike {
  tagName?: string;
  textContent?: string | null;
  children?: Iterable<ArticleElementLike> | ArrayLike<ArticleElementLike>;
  getAttribute?: (name: string) => string | null;
  style?: {
    color?: string;
    background?: string;
    backgroundColor?: string;
  };
}

const SECTION_LABEL_RE = /^\s*\d+\s*(?:[·.]|\s)\s*\S+/;
const BLUE = '#2763e9';

const EN_TO_ZH: Record<string, string> = {
  SUMMARY: '摘要',
  FOCUS: '焦点',
  SEMIS: '半导体',
  RISK: '风险',
  SETUP: '策略',
  MOMENTUM: '动量',
  SOFTWARE: '软件',
  MARKET: '市场',
  STRUCTURE: '结构',
  CAPEX: '资本开支',
  COMPUTE: '算力',
  HARDWARE: '硬件',
  LIQUIDITY: '流动性',
  INDEX: '指数',
  STOCKS: '个股',
  TECH: '科技',
  MACRO: '宏观',
  FED: '美联储',
  EARNINGS: '财报',
  OPTIONS: '期权',
  TRADE: '交易',
  WATCH: '观察',
  'MARKET READ': '市场判断',
  'RISK WATCH': '风险提示',
};

const ZH_TO_EN: Record<string, string> = Object.fromEntries(
  Object.entries(EN_TO_ZH).map(([en, zh]) => [zh, en]),
);

const TITLE_LABEL_RULES: Array<[string, string[]]> = [
  ['CAPEX', ['capex', 'capital expenditure', 'capital spending', '资本支出', '资本开支', '现金流']],
  ['COMPUTE', ['compute', 'data center', 'cloud', 'h100', '算力', '数据中心', '云计算']],
  ['SEMIS', ['semi', 'semiconductor', 'chip', 'gpu', 'cpu', 'memory', 'hbm', 'soxx', 'smh', 'nvda', 'amd', 'mu', '半导体', '费半', '芯片', '存储', '光模块', '硬件']],
  ['SOFTWARE', ['software', 'pltr', 'app ', 'now', 'orcl', 'crm', '软件', '甲骨文']],
  ['MACRO', ['macro', 'jobs', 'inflation', 'fed', 'rate', 'cpi', 'pce', '宏观', '就业', '通胀', '利率', '降息', '美联储']],
  ['EARNINGS', ['earnings', 'revenue', 'guidance', '财报', '业绩', '营收', '指引']],
  ['MOMENTUM', ['momentum', 'breakout', 'rebound', 'squeeze', '动能', '突破', '反弹', '放量']],
  ['RISK', ['risk', 'pullback', 'breakdown', 'pressure', 'downside', '风险', '回撤', '破位', '压力', '下跌']],
  ['SETUP', ['setup', 'trade', 'range', 'support', 'position', 'strategy', '交易', '区间', '支撑', '仓位', '策略', '防守']],
  ['CONSUMER', ['consumer', 'retail', 'cost', 'wmt', 'mcd', 'nke', '消费', '零售']],
  ['ENERGY', ['energy', 'oil', 'wti', 'opec', '能源', '油价', '天然气']],
  ['LIQUIDITY', ['liquidity', 'flow', 'leverage', 'volume', '流动性', '资金', '杠杆', '成交量']],
  ['MARKET', ['market', 'index', 'breadth', 'rotation', '指数', '市场', '轮动', '纳指', '标普']],
];

function childrenOf(element: ArticleElementLike): ArticleElementLike[] {
  return Array.from(element.children ?? []);
}

function tagNameOf(element: ArticleElementLike): string {
  return (element.tagName ?? '').toLowerCase();
}

function styleTextOf(element: ArticleElementLike): string {
  return (element.getAttribute?.('style') ?? '').toLowerCase();
}

function styleValueOf(element: ArticleElementLike, property: string): string | null {
  const styleText = styleTextOf(element);
  const match = styleText.match(new RegExp(`${property}\\s*:\\s*([^;]+)`, 'i'));
  return match?.[1]?.trim() ?? null;
}

function cleanText(text: string | null | undefined): string {
  return (text ?? '').replace(/\s+/g, ' ').trim();
}

function stripSectionPrefix(text: string): string {
  return text.replace(/^\s*\d+\s*(?:[·.]\s*)?/, '').trim();
}

function findSectionLabel(element: ArticleElementLike): ArticleElementLike | null {
  if (tagNameOf(element) === 'span' && SECTION_LABEL_RE.test(cleanText(element.textContent))) {
    return element;
  }
  for (const child of childrenOf(element)) {
    const match = findSectionLabel(child);
    if (match) return match;
  }
  return null;
}

function isDivider(element: ArticleElementLike): boolean {
  if (tagNameOf(element) !== 'span') return false;
  const styleText = styleTextOf(element);
  return /height\s*:\s*1px/.test(styleText) && /background/.test(styleText);
}

function findDivider(element: ArticleElementLike): ArticleElementLike | null {
  if (isDivider(element)) return element;
  for (const child of childrenOf(element)) {
    const match = findDivider(child);
    if (match) return match;
  }
  return null;
}

function isHeaderContainer(element: ArticleElementLike): boolean {
  return findSectionLabel(element) !== null && findDivider(element) !== null;
}

function numericStyleValue(element: ArticleElementLike, property: string): number | null {
  const value = styleValueOf(element, property);
  if (!value) return null;
  const match = value.match(/^([0-9.]+)px$/);
  return match ? Number.parseFloat(match[1]) : null;
}

function fontWeightOf(element: ArticleElementLike): number | null {
  const value = styleValueOf(element, 'font-weight');
  if (!value) return null;
  if (value === 'bold') return 700;
  const numeric = Number.parseInt(value, 10);
  return Number.isNaN(numeric) ? null : numeric;
}

function isLargeTitleElement(element: ArticleElementLike): boolean {
  const tagName = tagNameOf(element);
  if (!['p', 'h1', 'h2', 'h3', 'h4', 'div'].includes(tagName)) return false;
  const fontSize = numericStyleValue(element, 'font-size');
  const fontWeight = fontWeightOf(element);
  return (fontSize !== null && fontSize >= 18) || (fontWeight !== null && fontWeight >= 700);
}

function firstLargeTitleElement(section: ArticleElementLike): ArticleElementLike | null {
  for (const child of childrenOf(section)) {
    if (isHeaderContainer(child)) continue;
    if (!isLargeTitleElement(child)) continue;
    const text = cleanText(child.textContent);
    if (text) return child;
  }
  return null;
}

function normalizeLabelKey(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toUpperCase();
}

function isKnownSectionLabel(label: string): boolean {
  const trimmed = label.trim();
  return Boolean(EN_TO_ZH[normalizeLabelKey(trimmed)] || ZH_TO_EN[trimmed]);
}

export function titleTextFromLegacyLabel(text: string): string | null {
  const match = text.match(/^\s*\d+\s*(?:[·.]\s*)?(.+?)\s*$/);
  if (!match) return null;

  const title = match[1].trim();
  if (!title || isKnownSectionLabel(title)) return null;
  return title;
}

export function sectionLabelTextForTitle(index: number, title: string, sectionNumber?: string): string {
  const normalizedTitle = title.replace(/\s+/g, ' ').trim().toUpperCase();
  const label =
    TITLE_LABEL_RULES.find(([, keywords]) =>
      keywords.some((keyword) => normalizedTitle.includes(keyword.toUpperCase())),
    )?.[0] ?? 'FOCUS';
  return `${sectionNumber ?? String(index)} · ${label}`;
}

export function localizeSectionLabelText(text: string, locale: ArticleLocale): string {
  const match = text.match(/^(\s*\d+)(\s*(?:[·.]\s*|\s+))(.+?)(\s*)$/);
  if (!match) return text;

  const [, number, delimiter, label, trailing] = match;
  if (locale === 'zh') {
    const mapped = ZH_TO_EN[label.trim()];
    return mapped ? `${number}${delimiter}${mapped}${trailing}` : text;
  }

  const mapped = EN_TO_ZH[normalizeLabelKey(label)];
  return mapped ? `${number}${delimiter}${mapped}${trailing}` : text;
}

export function normalizeArticleSectionPresentation(
  section: ArticleElementLike,
  locale: ArticleLocale,
): void {
  const label = findSectionLabel(section);
  if (!label) return;

  const labelColor = label.style?.color || styleValueOf(label, 'color') || BLUE;
  const text = cleanText(label.textContent);
  const localizedText = localizeSectionLabelText(text, locale);
  if (text !== localizedText) {
    label.textContent = localizedText;
  }

  const divider = findDivider(section);
  if (divider?.style) {
    divider.style.background = labelColor;
    divider.style.backgroundColor = labelColor;
  }
}

export function titleOf(section: ArticleElementLike, index: number): string | null {
  const largeTitle = firstLargeTitleElement(section);
  if (largeTitle) return cleanText(largeTitle.textContent);

  const label = findSectionLabel(section);
  if (!label) return null;

  const text = stripSectionPrefix(cleanText(label.textContent));
  return text || `Section ${index}`;
}

export function titleAnchorOf(section: ArticleElementLike): ArticleElementLike | null {
  return firstLargeTitleElement(section) ?? findSectionLabel(section);
}
