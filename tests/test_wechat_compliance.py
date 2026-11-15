"""Publication-time regression checks for recommendation-safe WeChat copy."""
from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import validate_blog_artifacts as validator


LONG_STORY = "<p>" + "真实的事实和独立分析，正文完整交代判断、依据及风险。" * 18 + "</p>"


class WeChatComplianceTest(unittest.TestCase):
    def _validate(self, html: str, *, source_url: str = "") -> list[str]:
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            run = root / "wechat-runs" / "2026-11-16-abcdef"
            run.mkdir(parents=True)
            (run / "article.wechat.html").write_text(html, encoding="utf-8")
            (run / "abstract_cover.png").write_bytes(b"non-empty cover")
            (run / "meta.json").write_text(json.dumps({
                "title": "有完整事实和结论的标题",
                "locale": "zh",
                "header_image_optional": True,
                "content_source_url": source_url,
            }), encoding="utf-8")
            errors = []
            with mock.patch.object(validator, "ROOT", root):
                validator.validate_wechat_run(errors, "2026-11-16-abcdef")
            return errors

    def test_complete_native_article_passes_without_promo_header(self):
        self.assertEqual(self._validate(LONG_STORY), [])

    def test_external_blog_source_url_is_blocked(self):
        errors = self._validate(LONG_STORY, source_url="https://www.example.com/blog/story")
        self.assertTrue(any("content_source_url" in error for error in errors))

    def test_qr_footer_and_promo_banner_are_blocked(self):
        html = LONG_STORY + '<img src="assets/wechat-header-ad.jpg">' \
            + '<p>长按识别二维码</p><img src="assets/wechat-follow-qr.png">'
        errors = self._validate(html)
        self.assertTrue(any("wechat-header-ad" in error for error in errors))
        self.assertTrue(any("wechat-follow-qr" in error for error in errors))

    def test_clickable_external_link_is_blocked(self):
        errors = self._validate(LONG_STORY + '<a href="https://outside.example">阅读全文</a>')
        self.assertTrue(any("external clickable link" in error for error in errors))

    def test_content_preview_without_substance_is_blocked(self):
        errors = self._validate("<p>扫码查看完整内容</p>")
        self.assertTrue(any("incomplete" in error for error in errors))

    def test_relevant_editorial_image_must_exist(self):
        errors = self._validate(LONG_STORY + '<img src="assets/chart-missing.png">')
        self.assertTrue(any("image is missing" in error for error in errors))


if __name__ == "__main__":
    unittest.main()
