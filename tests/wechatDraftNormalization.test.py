import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.wechat_draft import clean_html_for_draft_add


class WechatDraftNormalizationTest(unittest.TestCase):
    def test_chinese_article_keeps_summary_label_in_english_and_divider_blue(self):
        html = """
        <div>
          <p>美股 · 期权 · 资讯 · 观点</p>
          <div>
            <span style="color:#2763e9;font-size:12px;">0 · 摘要</span>
            <span style="height:1px;background:#d7e2ff;"></span>
          </div>
          <p style="color:#2a2a34;font-size:22px;font-weight:850;">真正的大标题</p>
        </div>
        """

        cleaned = clean_html_for_draft_add(html)

        self.assertIn("0 · SUMMARY", cleaned)
        self.assertIn("background:#2763e9", cleaned)
        self.assertNotIn("background:#d7e2ff", cleaned)

    def test_english_article_shows_summary_label_in_chinese(self):
        html = """
        <div>
          <p>US EQUITIES · OPTIONS · NEWS · VIEWS</p>
          <div>
            <span style="color:#2763e9;font-size:12px;">1 · SUMMARY</span>
            <span style="height:1px;background:#d7e2ff;"></span>
          </div>
          <p style="color:#2a2a34;font-size:22px;font-weight:850;">The Real Heading</p>
        </div>
        """

        cleaned = clean_html_for_draft_add(html)

        self.assertIn("1 · 摘要", cleaned)
        self.assertIn("background:#2763e9", cleaned)


if __name__ == "__main__":
    unittest.main()
