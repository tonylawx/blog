import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const source = readFileSync(
  new URL('../src/theme/BlogSidebar/Desktop/index.tsx', import.meta.url),
  'utf8',
);

test('BlogSidebarDesktop automatically navigates to first post when switching category', () => {
  // Verifies the file imports useHistory and useLocation from @docusaurus/router
  assert.match(source, /import\s*\{[^}]*useHistory[^}]*\}\s*from\s*['"]@docusaurus\/router['"]/);
  assert.match(source, /import\s*\{[^}]*useLocation[^}]*\}\s*from\s*['"]@docusaurus\/router['"]/);

  // Verifies setCat computes the target category's items and pushes the first item's permalink
  assert.match(
    source,
    /const targetItems =\s*c === 'all' \? allItems : allItems\.filter\(\(i\) => catFor\(i, categoryByPermalink\) === c\);/,
  );
  assert.match(
    source,
    /const targetItem = targetItems\.find\(\(i\) => !i\.unlisted\) \?\? targetItems\[0\];/,
  );
  assert.match(
    source,
    /history\.push\(targetItem\.permalink\);/,
  );
});

test('category switching logic selects the first listed post of the category', () => {
  // Simulates the selection logic extracted from Desktop/index.tsx
  const mockItems = [
    {permalink: '/blog/finance-unlisted', title: '财经周报 2', unlisted: true},
    {permalink: '/blog/finance-1', title: '财经周报 1', unlisted: false},
    {permalink: '/blog/tech-1', title: '科技周报 1', unlisted: false},
    {permalink: '/blog/essay-1', title: '随笔 1', unlisted: false},
  ];

  const catFor = (item) => {
    if (item.title.includes('财经周报')) return 'financeWeekly';
    if (item.title.includes('科技周报')) return 'techWeekly';
    return 'essays';
  };

  const getFirstPostForCategory = (cat) => {
    const targetItems =
      cat === 'all' ? mockItems : mockItems.filter((i) => catFor(i) === cat);
    return targetItems.find((i) => !i.unlisted) ?? targetItems[0];
  };

  // 'financeWeekly' should skip unlisted and select '/blog/finance-1'
  assert.equal(getFirstPostForCategory('financeWeekly')?.permalink, '/blog/finance-1');

  // 'techWeekly' should select '/blog/tech-1'
  assert.equal(getFirstPostForCategory('techWeekly')?.permalink, '/blog/tech-1');

  // 'all' should skip unlisted and select '/blog/finance-1'
  assert.equal(getFirstPostForCategory('all')?.permalink, '/blog/finance-1');
});
