import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const css = readFileSync(new URL('../src/css/custom.css', import.meta.url), 'utf8');

test('mobile blog posts hide the runtime article TOC only', () => {
  assert.match(
    css,
    /@media\s*\(max-width:\s*996px\)[\s\S]*?html\.blog-post-page\s+\.article-toc-accordion\s*\{[\s\S]*?display:\s*none\s*;?[\s\S]*?\}/,
  );

  assert.doesNotMatch(
    css,
    /html\.blog-post-page\s+\.pagination-nav\s*\{[\s\S]*?display:\s*none/,
  );
});
