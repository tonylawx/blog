import {useEffect, useState} from 'react';
import TOC from '@theme/TOC';
import {
  normalizeArticleSectionPresentation,
  sectionLabelTextForTitle,
  titleAnchorOf,
  titleTextFromLegacyLabel,
  titleOf,
  type ArticleLocale,
} from './articleTocUtils';

// Builds a right-side TOC at runtime from the injected `.stt-article`
// sections (article.html posts have no markdown headings, so Docusaurus's
// built-in `toc` is empty). Works for any article.html post, English or
// Chinese, regardless of how the HTML was generated — no per-post data or
// pipeline coupling needed.
interface TocItem {
  value: string;
  id: string;
  level: number;
}

function currentLocale(): ArticleLocale {
  const lang = document.documentElement.lang.toLowerCase();
  if (lang.startsWith('zh') || window.location.pathname.startsWith('/zh/')) {
    return 'zh';
  }
  return 'en';
}

function topLevelArticleSections(article: Element): HTMLElement[] {
  return Array.from(article.children).filter(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child.tagName.toLowerCase() === 'section',
  );
}

const SECTION_LABEL_RE = /^\s*(\d+)\s*(?:[·.]|\s)\s*\S+/;
const TITLE_STYLE =
  'margin:0 0 16px 0;padding:0;color:#2a2a34;font-size:22px;line-height:1.45;font-weight:850;text-align:left;letter-spacing:0;';

function findSectionLabel(section: HTMLElement): HTMLElement | null {
  return (
    Array.from(section.querySelectorAll('span')).find((span) =>
      SECTION_LABEL_RE.test(span.textContent?.replace(/\s+/g, ' ').trim() ?? ''),
    ) ?? null
  );
}

function directHeaderContainer(section: HTMLElement, label: HTMLElement): HTMLElement {
  let candidate: HTMLElement = label;
  while (candidate.parentElement && candidate.parentElement !== section) {
    candidate = candidate.parentElement;
  }
  return candidate;
}

function splitLegacyTitleLabel(section: HTMLElement, index: number): void {
  const label = findSectionLabel(section);
  if (!label) return;

  const currentAnchor = titleAnchorOf(section);
  if (currentAnchor instanceof HTMLElement && currentAnchor !== label) return;

  const labelText = label.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const title = titleTextFromLegacyLabel(labelText);
  if (!title) return;

  const number = labelText.match(/^\s*(\d+)/)?.[1] ?? String(index);
  label.textContent = sectionLabelTextForTitle(index, title, number);

  const titleElement = document.createElement('p');
  titleElement.textContent = title;
  titleElement.setAttribute('style', TITLE_STYLE);
  directHeaderContainer(section, label).insertAdjacentElement('afterend', titleElement);
}

export default function ArticleToc(): JSX.Element | null {
  const [toc, setToc] = useState<TocItem[]>([]);
  useEffect(() => {
    const article = document.querySelector('.stt-article');
    if (!article) {
      setToc([]);
      return;
    }
    const locale = currentLocale();

    const syncToc = () => {
      const sections = topLevelArticleSections(article);
      const items: TocItem[] = [];
      sections.forEach((section, index) => {
        splitLegacyTitleLabel(section, index);
        normalizeArticleSectionPresentation(section, locale);
        const value = titleOf(section, index);
        if (value === null) return; // skip header-less sections (e.g. intro prose)
        const target = titleAnchorOf(section);
        const anchor = target instanceof HTMLElement ? target : section;
        const id = `article-section-${items.length}`;
        if (!anchor.id) anchor.id = id;
        items.push({value, id: anchor.id, level: 2});
      });
      setToc(items);
    };

    syncToc();
    const observer = new MutationObserver(syncToc);
    observer.observe(article, {
      attributeFilter: ['id'],
      attributes: true,
      childList: true,
      subtree: true,
    });
    return () => observer.disconnect();
  }, []);

  if (toc.length === 0) return null;
  return <TOC toc={toc} />;
}
