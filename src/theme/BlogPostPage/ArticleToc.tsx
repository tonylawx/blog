import {useEffect, useRef, useState} from 'react';
import {
  activeArticleAnchorIdFromPositions,
  articleAccordionIdForHash,
  articleAccordionItemsOf,
  childHeadingTocItemsOf,
  firstArticleAccordionId,
  normalizeArticleSectionPresentation,
  sectionLabelTextForTitle,
  titleAnchorOf,
  titleTextFromLegacyLabel,
  titleOf,
  type ArticleAccordionTocItem,
  type ArticleLocale,
  type ArticleTocItem,
} from './articleTocUtils';

// Builds a right-side TOC at runtime from the injected `.stt-article`
// sections (article.html posts have no markdown headings, so Docusaurus's
// built-in `toc` is empty). Works for any article.html post, English or
// Chinese, regardless of how the HTML was generated — no per-post data or
// pipeline coupling needed.
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
  'margin:0 0 16px 0;padding:0;color:inherit;font-size:22px;line-height:1.45;font-weight:850;text-align:left;letter-spacing:0;';
const MIN_SCROLL_SPY_TOP_OFFSET = 220;
const MAX_SCROLL_SPY_TOP_OFFSET = 520;

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

function scrollSpyTopOffset(): number {
  return Math.min(
    Math.max(window.innerHeight * 0.42, MIN_SCROLL_SPY_TOP_OFFSET),
    MAX_SCROLL_SPY_TOP_OFFSET,
  );
}

export default function ArticleToc(): JSX.Element | null {
  const [toc, setToc] = useState<ArticleAccordionTocItem[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const openIdRef = useRef<string | null>(null);

  const updateActiveId = (nextActiveId: string | null) => {
    if (activeIdRef.current === nextActiveId) return;
    activeIdRef.current = nextActiveId;
    setActiveId(nextActiveId);
  };

  const updateOpenId = (nextOpenId: string | null) => {
    if (openIdRef.current === nextOpenId) return;
    openIdRef.current = nextOpenId;
    setOpenId(nextOpenId);
  };
  useEffect(() => {
    const article = document.querySelector('.stt-article');
    if (!article) {
      setToc([]);
      return;
    }
    const locale = currentLocale();

    const syncToc = () => {
      const sections = topLevelArticleSections(article);
      const items: ArticleTocItem[] = [];
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
        items.push(...childHeadingTocItemsOf(section, index));
      });
      const grouped = articleAccordionItemsOf(items);
      setToc(grouped);
      setOpenId((current) => {
        const hashOpenId = articleAccordionIdForHash(grouped, window.location.hash);
        const nextOpenId = hashOpenId
          ?? (current && grouped.some((item) => item.id === current) ? current : null)
          ?? firstArticleAccordionId(grouped);
        openIdRef.current = nextOpenId;
        return nextOpenId;
      });
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

  useEffect(() => {
    const syncOpenIdFromHash = () => {
      const hashOpenId = articleAccordionIdForHash(toc, window.location.hash);
      if (hashOpenId) {
        updateOpenId(hashOpenId);
        updateActiveId(window.location.hash.replace(/^#/, ''));
      }
    };
    window.addEventListener('hashchange', syncOpenIdFromHash);
    return () => window.removeEventListener('hashchange', syncOpenIdFromHash);
  }, [toc]);

  useEffect(() => {
    if (toc.length === 0) return undefined;

    let frame = 0;
    const anchorIds = toc.flatMap((item) => [item.id, ...item.children.map((child) => child.id)]);

    const syncActiveAnchor = () => {
      frame = 0;
      const positions = anchorIds.flatMap((id) => {
        const element = document.getElementById(id);
        if (!element) return [];
        return [{id, top: element.getBoundingClientRect().top}];
      });
      const nextActiveId = activeArticleAnchorIdFromPositions(
        positions,
        scrollSpyTopOffset(),
      );
      if (!nextActiveId) return;

      updateActiveId(nextActiveId);
      const nextOpenId = articleAccordionIdForHash(toc, `#${nextActiveId}`);
      if (nextOpenId) updateOpenId(nextOpenId);
    };

    const scheduleSync = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(syncActiveAnchor);
    };

    syncActiveAnchor();
    window.addEventListener('scroll', scheduleSync, {passive: true});
    window.addEventListener('resize', scheduleSync);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', scheduleSync);
      window.removeEventListener('resize', scheduleSync);
    };
  }, [toc]);

  if (toc.length === 0) return null;
  return (
    <ul className="table-of-contents table-of-contents__left-border article-toc-accordion">
      {toc.map((item) => {
        const hasChildren = item.children.length > 0;
        const expanded = openId === item.id;
        const parentActive =
          activeId === item.id || item.children.some((child) => child.id === activeId);
        const childListId = `article-toc-children-${item.id}`;
        return (
          <li className="article-toc-accordion__item" key={item.id}>
            <div className="article-toc-accordion__row">
              {hasChildren ? (
                <button
                  aria-controls={childListId}
                  aria-expanded={expanded}
                  aria-label={expanded ? '收起模块' : '展开模块'}
                  className="article-toc-accordion__toggle"
                  onClick={() => updateOpenId(expanded ? null : item.id)}
                  title={expanded ? '收起模块' : '展开模块'}
                  type="button">
                  <span aria-hidden="true" className="article-toc-accordion__chevron">
                    &rsaquo;
                  </span>
                </button>
              ) : (
                <span aria-hidden="true" className="article-toc-accordion__toggle-spacer" />
              )}
              <a
                className={[
                  'table-of-contents__link toc-highlight article-toc-accordion__parent-link',
                  parentActive ? 'table-of-contents__link--active article-toc-accordion__link--active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                href={`#${item.id}`}
                onClick={() => {
                  updateOpenId(item.id);
                  updateActiveId(item.id);
                }}>
                {item.value}
              </a>
            </div>
            {hasChildren && expanded ? (
              <ul className="article-toc-accordion__children" id={childListId}>
                {item.children.map((child) => (
                  <li className="article-toc-accordion__child" key={child.id}>
                    <a
                      className={[
                        'table-of-contents__link article-toc-accordion__child-link',
                        activeId === child.id
                          ? 'table-of-contents__link--active article-toc-accordion__link--active'
                          : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      href={`#${child.id}`}
                      onClick={() => {
                        updateOpenId(item.id);
                        updateActiveId(child.id);
                      }}>
                      {child.value}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
