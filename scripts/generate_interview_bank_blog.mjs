#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {micromark} from 'micromark';
import {gfm, gfmHtml} from 'micromark-extension-gfm';
import Prism from 'prismjs';
import 'prismjs/components/prism-jsx.js';
import 'prismjs/components/prism-typescript.js';
import 'prismjs/components/prism-tsx.js';
import 'prismjs/components/prism-go.js';
import 'prismjs/components/prism-json.js';
import 'prismjs/components/prism-yaml.js';
import 'prismjs/components/prism-nginx.js';
import 'prismjs/components/prism-http.js';
import 'prismjs/components/prism-docker.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SLUG = '2026-07-09-ai-frontend-agent-interview';
const FILES = [
  '00-总览与频次榜.md',
  '01-JavaScript基础.md',
  '02-CSS与布局.md',
  '03-React.md',
  '04-网络与安全.md',
  '05-浏览器与性能.md',
  '06-工程化与构建.md',
  '07-算法与手写.md',
  '08-AI与大模型前端.md',
  '09-架构与系统设计.md',
  '10-HR与软技能.md',
];

const BLUE = '#2763e9';
const P_STYLE = 'margin:0 0 16px;color:#454550;font-size:16px;line-height:1.9;';
const TITLE_STYLE =
  'margin:0 0 16px 0;padding:0;color:#2a2a34;font-size:22px;line-height:1.45;font-weight:850;text-align:left;letter-spacing:0;';
const SECTION_STYLE = 'margin:0 0 42px;';
const TOP_ZH =
  '<p style="text-align:center;color:#2763e9;font-size:11px;letter-spacing:0.16em;font-weight:700;margin:0 0 28px;">AI 实践 · 面试题库 · Agent 工程</p>';
const TOP_EN =
  '<p style="text-align:center;color:#2763e9;font-size:11px;letter-spacing:0.16em;font-weight:700;margin:0 0 28px;">AI Practice · Interview Question Bank · Agent Engineering</p>';

const sectionLabels = [
  '总览',
  'JS',
  'CSS',
  'React',
  '网络',
  '性能',
  '工程化',
  '算法',
  'AI 大模型',
  '架构',
  'HR',
];
const moduleAnchors = new Map(FILES.map((file, idx) => [file, `#article-section-${idx + 1}`]));

function esc(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function decodeHtmlEntities(text) {
  return String(text)
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&(amp|lt|gt|quot|apos);/g, (_, name) => {
      const entities = {
        amp: '&',
        lt: '<',
        gt: '>',
        quot: '"',
        apos: "'",
      };
      return entities[name] ?? _;
    });
}

function envPath(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Set ${name} before regenerating the interview-bank article.`);
  }
  return path.resolve(value);
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function loadSanitizeRules() {
  const rulesPath = envPath('INTERVIEW_BANK_SANITIZE_RULES_PATH');
  const payload = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
  const rules = Array.isArray(payload) ? payload : payload.rules;
  if (!Array.isArray(rules)) {
    throw new Error('Sanitize rules must be an array or an object with a rules array.');
  }

  return rules.map((rule, index) => {
    const replacement = rule.to;
    if (typeof replacement !== 'string') {
      throw new Error(`Sanitize rule ${index} is missing a string "to" value.`);
    }
    if (typeof rule.pattern === 'string') {
      return {pattern: new RegExp(rule.pattern, rule.flags ?? 'g'), replacement};
    }
    if (typeof rule.from === 'string') {
      return {pattern: new RegExp(escapeRegExp(rule.from), 'g'), replacement};
    }
    throw new Error(`Sanitize rule ${index} needs either "from" or "pattern".`);
  });
}

function sanitizePersonalInfo(markdown, sanitizeRules) {
  return sanitizeRules.reduce(
    (text, rule) => text.replace(rule.pattern, rule.replacement),
    markdown,
  );
}

function normalizePublicStats(markdown) {
  return markdown
    .replace(/(\d+)\/73\s*\((\d+%)\)/g, '$2')
    .replace(/73\s*篇/g, '近百篇')
    .replace(/频次\s*\/\s*占比/g, '提及占比')
    .replace(/freq\s*=\s*提到该主题的篇数，pct\s*=\s*占比/g, 'pct = 近百篇样本中的提及占比')
    .replace(/频次\s*=\s*近百篇中有多少篇提到该主题/g, '提及占比 = 近百篇样本中提到该主题的比例')
    .replace(/频次\s*=\s*近百篇中(?:有多少篇)?提(?:到|及)该主题的篇数/g, '提及占比 = 近百篇样本中提到该主题的比例')
    .replace(/频次为提到该主题的篇数/g, '提及占比为样本中提到该主题的比例')
    .replace(/频次为关键词估算篇数/g, '提及占比为关键词估算值')
    .replace(/按频次降序排列/g, '按提及占比降序排列')
    .replace(/频次越高/g, '提及占比越高')
    .replace(/频次/g, '提及占比')
    .replace(/提及占比为关键词估算篇数/g, '提及占比为关键词估算值')
    .replace(/提及占比 = 提到该主题的篇数/g, '提及占比 = 样本中提到该主题的比例')
    .replace(/提及占比 = 近百篇中提到该主题的篇数/g, '提及占比 = 近百篇样本中提到该主题的比例')
    .replace(/估算篇数/g, '估算值');
}

function moduleAnchorForTarget(target) {
  const cleanTarget = target.split('#')[0].split('?')[0];
  let filename = path.basename(cleanTarget);
  try {
    filename = decodeURIComponent(filename);
  } catch {
    // Keep the original target if it is not valid percent-encoded text.
  }
  return moduleAnchors.get(filename) ?? null;
}

function rewriteModuleLinks(markdown) {
  return markdown.replace(/\]\(([^)\s]+\.md(?:#[^)]+)?)(?:\s+"[^"]*")?\)/g, (match, target) => {
    const anchor = moduleAnchorForTarget(target);
    return anchor ? `](${anchor})` : match;
  });
}

function normalizeCodeLanguage(lang) {
  const value = String(lang || 'text').toLowerCase();
  const aliases = {
    dockerfile: 'docker',
    html: 'markup',
    js: 'javascript',
    md: 'markdown',
    sh: 'bash',
    ts: 'typescript',
    yml: 'yaml',
  };
  return aliases[value] ?? value;
}

function highlightCodeBlocks(html) {
  return html.replace(
    /<pre><code(?: class="language-([^"]+)")?>([\s\S]*?)<\/code><\/pre>/g,
    (_, rawLang, encodedCode) => {
      const language = normalizeCodeLanguage(rawLang);
      const grammar = Prism.languages[language];
      const code = decodeHtmlEntities(encodedCode);
      const highlighted = grammar ? Prism.highlight(code, grammar, language) : esc(code);
      const className = `language-${esc(language)}`;
      const label = esc(rawLang || language);
      return `<pre class="${className}" data-language="${label}"><code class="${className}">${highlighted}</code></pre>`;
    },
  );
}

function decorateSecondLevelHeadings(html, sectionIndex) {
  let headingIndex = 0;
  return html.replace(/<h2>([\s\S]*?)<\/h2>/g, (_, innerHtml) => {
    headingIndex += 1;
    return `<h2 id="article-section-${sectionIndex}-question-${headingIndex}">${innerHtml}</h2>`;
  });
}

function stripFirstH1(markdown) {
  const lines = markdown.split('\n');
  const idx = lines.findIndex((line) => /^#\s+/.test(line));
  if (idx === -1) return {title: 'Untitled', body: markdown};
  const title = lines[idx].replace(/^#\s+/, '').trim();
  lines.splice(idx, 1);
  return {title, body: lines.join('\n').trim()};
}

function renderMarkdown(markdown, sectionIndex) {
  const html = micromark(rewriteModuleLinks(markdown), {
    extensions: [gfm()],
    htmlExtensions: [gfmHtml()],
  });
  return decorateSecondLevelHeadings(highlightCodeBlocks(html), sectionIndex);
}

function labelRow(index, label) {
  return [
    '<div style="display:flex;align-items:center;gap:12px;margin:0 0 16px;">',
    `<span style="color:${BLUE};font-size:12px;font-weight:800;letter-spacing:0.14em;white-space:nowrap;">${index} · ${esc(label)}</span>`,
    `<span style="flex:1;height:1px;background:${BLUE};"></span>`,
    '</div>',
  ].join('');
}

function sectionHtml(index, label, title, bodyHtml) {
  return [
    `<section style="${SECTION_STYLE}">`,
    labelRow(index, label),
    `<p id="article-section-${index}" style="${TITLE_STYLE}">${esc(title)}</p>`,
    `<div class="interview-bank-section">${bodyHtml}</div>`,
    '</section>',
  ].join('\n');
}

function articleStyles() {
  return `<style>
.interview-bank-section h2{scroll-margin-top:calc(var(--ifm-navbar-height,60px) + 3rem);margin:34px 0 14px;padding:11px 14px 11px 16px;border-left:4px solid ${BLUE};border-radius:8px;background:linear-gradient(90deg,rgba(39,99,233,0.10),rgba(39,99,233,0.025));color:#20232a;font-size:21px;line-height:1.45;font-weight:850}
.interview-bank-section h3{margin:24px 0 10px;color:#2a2a34;font-size:18px;line-height:1.5;font-weight:800}
.interview-bank-section h4{margin:20px 0 8px;color:#33343c;font-size:16px;line-height:1.5;font-weight:800}
.interview-bank-section p{${P_STYLE}}
.interview-bank-section blockquote{margin:16px 0;padding:12px 16px;border-left:3px solid ${BLUE};background:rgba(39,99,233,0.06);color:#454550}
.interview-bank-section blockquote p{margin:0 0 10px}
.interview-bank-section blockquote p:last-child{margin-bottom:0}
.interview-bank-section ul,.interview-bank-section ol{margin:0 0 16px 1.25rem;color:#454550;font-size:16px;line-height:1.9;padding:0}
.interview-bank-section li{margin:0 0 6px}
.interview-bank-section table{width:100%;border-collapse:collapse;margin:16px 0;color:#454550;font-size:14px;line-height:1.65;display:block;overflow-x:auto}
.interview-bank-section th,.interview-bank-section td{border:1px solid #e4e7ed;padding:8px 10px;text-align:left;vertical-align:top}
.interview-bank-section th{background:#f7f9fc;color:#2a2a34;font-weight:800}
.interview-bank-section pre{position:relative;margin:16px 0;padding:34px 16px 14px;border-radius:8px;background:#111827;color:#e5e7eb;overflow-x:auto;font-size:13px;line-height:1.65}
.interview-bank-section pre[data-language]::before{content:attr(data-language);position:absolute;top:9px;right:12px;color:#93c5fd;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase}
.interview-bank-section pre code{display:block;padding:0;background:transparent;color:inherit;font-size:inherit;line-height:inherit}
.interview-bank-section code{font-family:var(--ifm-font-family-monospace);font-size:0.92em}
.interview-bank-section :not(pre)>code{padding:2px 5px;border-radius:5px;background:#eef2ff;color:#1d4ed8}
.interview-bank-section pre .token.comment,.interview-bank-section pre .token.prolog,.interview-bank-section pre .token.doctype,.interview-bank-section pre .token.cdata{color:#9ca3af}
.interview-bank-section pre .token.punctuation{color:#cbd5e1}
.interview-bank-section pre .token.property,.interview-bank-section pre .token.tag,.interview-bank-section pre .token.boolean,.interview-bank-section pre .token.number,.interview-bank-section pre .token.constant,.interview-bank-section pre .token.symbol{color:#fca5a5}
.interview-bank-section pre .token.selector,.interview-bank-section pre .token.attr-name,.interview-bank-section pre .token.string,.interview-bank-section pre .token.char,.interview-bank-section pre .token.builtin,.interview-bank-section pre .token.inserted{color:#86efac}
.interview-bank-section pre .token.operator,.interview-bank-section pre .token.entity,.interview-bank-section pre .token.url,.interview-bank-section pre .language-css .token.string,.interview-bank-section pre .style .token.string{color:#fde68a}
.interview-bank-section pre .token.atrule,.interview-bank-section pre .token.attr-value,.interview-bank-section pre .token.keyword{color:#93c5fd}
.interview-bank-section pre .token.function,.interview-bank-section pre .token.class-name{color:#c4b5fd}
.interview-bank-section pre .token.regex,.interview-bank-section pre .token.important,.interview-bank-section pre .token.variable{color:#fdba74}
.interview-bank-section hr{border:0;border-top:1px solid #edf0f5;margin:28px 0}
</style>`;
}

function buildArticle(topLine, localeNote, {sourceDir, sanitizeRules}) {
  const parts = [articleStyles(), topLine];
  parts.push(
    sectionHtml(
      0,
      localeNote.label,
      localeNote.title,
      `<p style="${P_STYLE}">${localeNote.body}</p>`,
    ),
  );
  FILES.forEach((file, idx) => {
    const raw = fs.readFileSync(path.join(sourceDir, file), 'utf8');
    const publicMarkdown = normalizePublicStats(sanitizePersonalInfo(raw, sanitizeRules));
    const {title, body} = stripFirstH1(publicMarkdown);
    parts.push(sectionHtml(idx + 1, sectionLabels[idx], title, renderMarkdown(body, idx + 1)));
  });
  return parts.join('\n\n') + '\n';
}

function writeArticle(relativeDir, html) {
  const dir = path.join(ROOT, relativeDir, SLUG);
  fs.mkdirSync(dir, {recursive: true});
  fs.writeFileSync(path.join(dir, 'article.html'), html, 'utf8');
}

const noteZh = {
  label: '说明',
  title: '完整题库结构版',
  body:
    '这版保留源题库的原始结构和细节：分类、题号、提及占比、典型问法、一句话、原理/要点、代码、追问、踩坑和参考话术都会按原顺序展开。仅对姓名、具体雇主、私人项目名和私密背景做了脱敏替换。',
};

const noteEn = {
  label: 'NOTE',
  title: 'Full Structured Question-Bank Edition',
  body:
    'This version keeps the original question-bank structure instead of compressing it into a summary. The detailed Chinese source structure is preserved in full, with personal identity, employer names, private project names, and private background sanitized.',
};

const sourceDir = envPath('INTERVIEW_BANK_SOURCE_DIR');
const sanitizeRules = loadSanitizeRules();

writeArticle(
  'i18n/zh/docusaurus-plugin-content-blog',
  buildArticle(TOP_ZH, noteZh, {sourceDir, sanitizeRules}),
);
writeArticle('blog', buildArticle(TOP_EN, noteEn, {sourceDir, sanitizeRules}));

console.log(`Generated full structured interview-bank article for ${SLUG}`);
