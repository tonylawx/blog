// Computes a CJK-aware reading time for every blog post and writes it into the
// post's index.mdx frontmatter as `reading_time: <minutes>`. The blog config's
// custom `readingTime` function reads that value.
//
// Why this exists: every post injects its real content via `./article.html?raw`
// + dangerouslySetInnerHTML, so Docusaurus's default reading time (which counts
// the MDX body) sees only the ~5-line wrapper and reports ~1 min for everything.
// This script counts the actual article content instead — Chinese chars at a CJK
// rate and Latin words at a word rate — so EN and ZH posts both get sane times.
//
// Run automatically before every build (`npm run prebuild`), so future posts are
// correct without manual steps. Idempotent: re-running with unchanged content
// produces identical frontmatter (no diff).
import {readdirSync, readFileSync, writeFileSync, existsSync, statSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = process.cwd();
const postRoots = [
  join(root, 'blog'),
  join(root, 'i18n/zh/docusaurus-plugin-content-blog'),
];

const CJK_RE = /[一-鿿㐀-䶿぀-ヿ가-힯]/g;
const LATIN_RE = /[A-Za-z0-9]+/g;
const CJK_CPM = 400; // Chinese/Japanese/Korean chars per minute
const LATIN_WPM = 250; // Latin words per minute

function computeMinutes(html) {
  let text = html;
  // Drop non-prose blocks so code/style aren't counted as reading.
  text = text.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  text = text.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  text = text.replace(/<pre[\s\S]*?<\/pre>/gi, ' ');
  text = text.replace(/<code[\s\S]*?<\/code>/gi, ' ');
  // Strip remaining tags and decode common entities.
  text = text.replace(/<[^>]+>/g, ' ');
  text = text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');

  const cjk = (text.match(CJK_RE) || []).length;
  const latin = (text.match(LATIN_RE) || []).length;
  const minutes = cjk / CJK_CPM + latin / LATIN_WPM;
  return Math.max(1, Math.round(minutes));
}

const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;

function setReadingTime(content, minutes) {
  const m = content.match(FM_RE);
  if (!m) {
    return {content, changed: false};
  }
  let fm = m[1].replace(/^reading_time:.*\r?\n?/m, '').trimEnd();
  fm += `\nreading_time: ${minutes}`;
  const next = content.replace(FM_RE, () => `---\n${fm}\n---\n`);
  return {content: next, changed: next !== content};
}

function processPostDir(dir) {
  const mdxPath = join(dir, 'index.mdx');
  const htmlPath = join(dir, 'article.html');
  if (!existsSync(mdxPath) || !existsSync(htmlPath)) {
    return null;
  }
  const mdx = readFileSync(mdxPath, 'utf8');
  const minutes = computeMinutes(readFileSync(htmlPath, 'utf8'));
  const {content, changed} = setReadingTime(mdx, minutes);
  if (changed) {
    writeFileSync(mdxPath, content);
  }
  return {minutes, changed};
}

let updated = 0;
let skipped = 0;
for (const postRoot of postRoots) {
  if (!existsSync(postRoot)) {
    continue;
  }
  for (const entry of readdirSync(postRoot)) {
    const dir = join(postRoot, entry);
    try {
      if (!statSync(dir).isDirectory()) {
        continue;
      }
    } catch {
      continue;
    }
    try {
      const result = processPostDir(dir);
      if (!result) {
        skipped++;
        continue;
      }
      if (result.changed) {
        updated++;
      }
    } catch (err) {
      // Never fail the build over one post — leave it on the default time.
      console.error(`reading-time: skipped ${dir}: ${err.message}`);
      skipped++;
    }
  }
}

console.log(`reading-time: ${updated} updated, ${skipped} skipped.`);
