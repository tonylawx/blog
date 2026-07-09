import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

function loadUtils() {
  const source = fs.readFileSync(
    new URL('../src/theme/BlogPostPage/articleTocUtils.ts', import.meta.url),
    'utf8',
  );
  const {outputText} = ts.transpileModule(source, {
    compilerOptions: {module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022},
  });
  const dataUrl = `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`;
  return import(dataUrl);
}

function el(tagName, {text = '', style = '', id = '', children = []} = {}) {
  return {
    tagName,
    id,
    children,
    style: {},
    textContent: text || children.map((child) => child.textContent ?? '').join(''),
    getAttribute(name) {
      return name === 'style' ? style : null;
    },
  };
}

test('article TOC uses the first large title below the numbered label', async () => {
  const {titleAnchorOf, titleOf} = await loadUtils();
  const largeTitle = el('P', {
    text: '市场不是没涨，是涨得不扎实',
    style: 'color:#2a2a34;font-size:22px;font-weight:850;',
  });
  const section = el('SECTION', {
    children: [
      el('SECTION', {
        children: [
          el('SPAN', {
            text: '0 · FOCUS',
            style: 'color:#2763e9;font-size:12px;font-weight:850;',
          }),
          el('SPAN', {
            style: 'flex:1;height:1px;background:#d7e2ff;',
          }),
        ],
      }),
      largeTitle,
      el('P', {
        text: '正文第一段不应该进目录',
        style: 'color:#454550;font-size:16px;font-weight:400;',
      }),
    ],
  });

  assert.equal(titleOf(section, 0), '市场不是没涨，是涨得不扎实');
  assert.equal(titleAnchorOf(section), largeTitle);
});

test('article TOC falls back to old inline section labels', async () => {
  const {titleOf} = await loadUtils();
  const section = el('SECTION', {
    children: [
      el('DIV', {
        children: [
          el('SPAN', {
            text: '1 · Market Read',
            style: 'color:#2763e9;font-size:12px;font-weight:800;',
          }),
          el('SPAN', {
            style: 'flex:1;height:1px;background:#d7e2ff;',
          }),
        ],
      }),
      el('P', {
        text: 'Body paragraph',
        style: 'color:#454550;font-size:16px;line-height:1.9;',
      }),
    ],
  });

  assert.equal(titleOf(section, 1), 'Market Read');
});

test('Chinese article pages keep section labels in English and copy the label blue', async () => {
  const {normalizeArticleSectionPresentation} = await loadUtils();
  const label = el('SPAN', {
    text: '2 · 摘要',
    style: 'color:#2763e9;font-size:12px;font-weight:850;',
  });
  const divider = el('SPAN', {
    style: 'flex:1;height:1px;background:#d7e2ff;',
  });
  const section = el('SECTION', {
    children: [el('SECTION', {children: [label, divider]})],
  });

  normalizeArticleSectionPresentation(section, 'zh');

  assert.equal(label.textContent, '2 · SUMMARY');
  assert.equal(divider.style.background, '#2763e9');
  assert.equal(divider.style.backgroundColor, '#2763e9');
});

test('English article pages show Chinese section labels and copy the label blue', async () => {
  const {normalizeArticleSectionPresentation} = await loadUtils();
  const label = el('SPAN', {
    text: '2 · SUMMARY',
    style: 'color:#2763e9;font-size:12px;font-weight:850;',
  });
  const divider = el('SPAN', {
    style: 'flex:1;height:1px;background:#d7e2ff;',
  });
  const section = el('SECTION', {
    children: [el('SECTION', {children: [label, divider]})],
  });

  normalizeArticleSectionPresentation(section, 'en');

  assert.equal(label.textContent, '2 · 摘要');
  assert.equal(divider.style.background, '#2763e9');
  assert.equal(divider.style.backgroundColor, '#2763e9');
});

test('legacy title-in-label sections can be split into category label and title', async () => {
  const {sectionLabelTextForTitle, titleTextFromLegacyLabel} = await loadUtils();

  assert.equal(sectionLabelTextForTitle(0, 'Semis bounced into the key zone'), '0 · SEMIS');
  assert.equal(sectionLabelTextForTitle(1, '流动性变薄，资金承接开始变差'), '1 · LIQUIDITY');
  assert.equal(titleTextFromLegacyLabel('2 · Semis bounced into the key zone'), 'Semis bounced into the key zone');
  assert.equal(titleTextFromLegacyLabel('3 没有中点符号也要拆'), '没有中点符号也要拆');
});

test('article TOC exposes h2 question headings as second-level menu items', async () => {
  const {childHeadingTocItemsOf} = await loadUtils();
  const section = el('SECTION', {
    children: [
      el('P', {
        text: 'React 面试题详解',
        id: 'article-section-4',
        style: 'font-size:22px;font-weight:850;',
      }),
      el('DIV', {
        children: [
          el('H2', {
            text: '1. 状态管理 Redux/Zustand #React 70%',
            id: 'article-section-4-question-1',
          }),
          el('P', {text: '正文不应该进目录'}),
          el('H3', {
            text: '追问',
            id: 'article-section-4-question-1-followup',
          }),
          el('H2', {
            text: '2. Fiber 架构 #React 55%',
            id: 'article-section-4-question-2',
          }),
        ],
      }),
    ],
  });

  assert.deepEqual(childHeadingTocItemsOf(section, 4), [
    {
      value: '1. 状态管理 Redux/Zustand #React 70%',
      id: 'article-section-4-question-1',
      level: 3,
    },
    {
      value: '2. Fiber 架构 #React 55%',
      id: 'article-section-4-question-2',
      level: 3,
    },
  ]);
});

test('article TOC groups question links under module accordion items', async () => {
  const {articleAccordionIdForHash, articleAccordionItemsOf, firstArticleAccordionId} =
    await loadUtils();
  const grouped = articleAccordionItemsOf([
    {value: '总览与频次榜', id: 'article-section-1', level: 2},
    {value: '1. Promise / async await #JS基础 82%', id: 'article-section-2-question-1', level: 3},
    {value: '2. 垃圾回收与内存泄漏 #JS基础 53%', id: 'article-section-2-question-2', level: 3},
    {value: 'React 面试题详解', id: 'article-section-4', level: 2},
    {value: '1. 状态管理 Redux/Zustand #React 70%', id: 'article-section-4-question-1', level: 3},
  ]);

  assert.deepEqual(grouped, [
    {
      value: '总览与频次榜',
      id: 'article-section-1',
      level: 2,
      children: [
        {
          value: '1. Promise / async await #JS基础 82%',
          id: 'article-section-2-question-1',
          level: 3,
        },
        {
          value: '2. 垃圾回收与内存泄漏 #JS基础 53%',
          id: 'article-section-2-question-2',
          level: 3,
        },
      ],
    },
    {
      value: 'React 面试题详解',
      id: 'article-section-4',
      level: 2,
      children: [
        {
          value: '1. 状态管理 Redux/Zustand #React 70%',
          id: 'article-section-4-question-1',
          level: 3,
        },
      ],
    },
  ]);
  assert.equal(firstArticleAccordionId(grouped), 'article-section-1');
  assert.equal(articleAccordionIdForHash(grouped, '#article-section-4-question-1'), 'article-section-4');
  assert.equal(articleAccordionIdForHash(grouped, '#article-section-9'), null);
});

test('article TOC picks the current anchor from scroll positions', async () => {
  const {activeArticleAnchorIdFromPositions} = await loadUtils();

  assert.equal(
    activeArticleAnchorIdFromPositions(
      [
        {id: 'article-section-1', top: -780},
        {id: 'article-section-2', top: -20},
        {id: 'article-section-3', top: 260},
      ],
      120,
    ),
    'article-section-2',
  );
  assert.equal(
    activeArticleAnchorIdFromPositions(
      [
        {id: 'article-section-1', top: 180},
        {id: 'article-section-2', top: 420},
      ],
      120,
    ),
    'article-section-1',
  );
  assert.equal(activeArticleAnchorIdFromPositions([], 120), null);
});
