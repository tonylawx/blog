import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const slug = '2026-07-09-ai-frontend-agent-interview';
const articlePaths = [
  new URL(`../blog/${slug}/article.html`, import.meta.url),
  new URL(`../i18n/zh/docusaurus-plugin-content-blog/${slug}/article.html`, import.meta.url),
];

test('interview-bank article publishes percentage-only public stats', () => {
  for (const articlePath of articlePaths) {
    const html = fs.readFileSync(articlePath, 'utf8');
    assert.equal(/\b\d+\/73\b/.test(html), false, `${articlePath.pathname} still exposes N/73 counts`);
    assert.equal(/73\s*篇/.test(html), false, `${articlePath.pathname} still says 73 articles`);
    assert.doesNotMatch(html, /图片贴图|OCR|image screenshots/i, `${articlePath.pathname} should not expose OCR/source-capture wording`);
    assert.doesNotMatch(html, /完整题库结构版|Full Structured Question-Bank Edition/, `${articlePath.pathname} should not keep the old opening note`);
    assert.match(html, /近百篇|near one hundred/, `${articlePath.pathname} should describe the source as near one hundred samples`);
    assert.match(html, /<code>82%<\/code>/, `${articlePath.pathname} should keep heading stats as percentages`);
    assert.match(html, /<td>95%<\/td>/, `${articlePath.pathname} should keep table stats as percentages`);
  }
});

test('interview-bank generator keeps private source config out of tracked code', () => {
  const source = fs.readFileSync(
    new URL('../scripts/generate_interview_bank_blog.mjs', import.meta.url),
    'utf8',
  );

  assert.doesNotMatch(source, /\/Users\//);
  assert.doesNotMatch(source, /const SOURCE_DIR\s*=/);
  assert.match(source, /INTERVIEW_BANK_SOURCE_DIR/);
  assert.match(source, /INTERVIEW_BANK_SANITIZE_RULES_PATH/);
});
