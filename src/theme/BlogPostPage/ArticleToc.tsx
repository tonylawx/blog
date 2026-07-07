import {useEffect, useState} from 'react';
import TOC from '@theme/TOC';

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

function titleOf(section: HTMLElement, index: number): string | null {
  // The section header is the first <div>, first <span> holds "N · Title".
  const span = section.querySelector('div > span');
  if (!span) return null;
  const text = (span.textContent ?? '').replace(/^\d+\s*[·.]\s*/, '').trim();
  return text || `Section ${index}`;
}

export default function ArticleToc(): JSX.Element | null {
  const [toc, setToc] = useState<TocItem[]>([]);
  useEffect(() => {
    const article = document.querySelector('.stt-article');
    if (!article) {
      setToc([]);
      return;
    }
    const sections = Array.from(
      article.querySelectorAll<HTMLElement>('section'),
    );
    const items: TocItem[] = [];
    sections.forEach((section, index) => {
      const value = titleOf(section, index);
      if (value === null) return; // skip header-less sections (e.g. intro prose)
      const id = `article-section-${index}`;
      if (!section.id) section.id = id;
      items.push({value, id, level: 2});
    });
    setToc(items);
  }, []);

  if (toc.length === 0) return null;
  return <TOC toc={toc} />;
}
