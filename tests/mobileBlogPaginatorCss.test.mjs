import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const css = readFileSync(new URL('../src/css/custom.css', import.meta.url), 'utf8');

test('mobile blog pagination remains visible', () => {
  assert.doesNotMatch(
    css,
    /@media\s*\(max-width:\s*996px\)[\s\S]*?html\.blog-post-page\s+\.pagination-nav(?:__link|__label|__sublabel)?\s*\{[\s\S]*?display:\s*none/,
  );
});
