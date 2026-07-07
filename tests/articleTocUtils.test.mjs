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

function el(tagName, {text = '', style = '', children = []} = {}) {
  return {
    tagName,
    id: '',
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
