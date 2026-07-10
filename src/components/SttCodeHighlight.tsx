import {useEffect} from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';

// Docusaurus's built-in Prism only touches code blocks authored in MDX.
// These interview posts inject their HTML via `?raw` + dangerouslySetInnerHTML,
// so their `<pre><code class="language-*">` blocks ship un-highlighted. This
// component runs prismjs on them client-side after mount, scoped to the
// `.stt-article` wrapper. Blocks that already contain token spans (e.g. normal
// MDX posts that also use the wrapper) are skipped, so it never double-highlights.
export default function SttCodeHighlight(): null {
  useEffect(() => {
    const root = document.querySelector('.stt-article');
    if (!root) {
      return;
    }

    const blocks = Array.from(
      root.querySelectorAll<HTMLElement>('pre code'),
    );

    for (const block of blocks) {
      if (block.querySelector('span.token')) {
        continue;
      }
      if (!/\blanguage-[\w-]+/.test(block.className)) {
        continue;
      }
      try {
        Prism.highlightElement(block);
      } catch {
        // Unknown grammar — leave the block as plain monospace text.
      }
    }
  }, []);

  return null;
}
