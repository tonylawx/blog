import re
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from scripts import render_en_article_html as renderer


class RenderEnglishArticleHtmlTest(unittest.TestCase):
    def test_renders_category_label_blue_rule_and_large_title(self):
        markdown = """# Market Note

## 0 Semis bounced into the key zone

SOXX held the first support band.
"""
        article_html = renderer.render(renderer.parse_blocks(markdown))

        self.assertIn("0 · SEMIS", article_html)
        self.assertIn("background:#2763e9", article_html)
        self.assertNotIn("background:#d7e2ff", article_html)
        self.assertRegex(
            article_html,
            re.compile(
                r"<p style=\"[^\"]*font-size:22px;[^\"]*font-weight:850;[^\"]*\">"
                r"Semis bounced into the key zone</p>"
            ),
        )


if __name__ == "__main__":
    unittest.main()
