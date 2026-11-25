"""Regression tests for weekly headings and recommendation-safe WeChat copy."""
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from validate_blog_artifacts import (
    validate_rendered_headings,
    validate_wechat_recommendation_content,
)


class WeeklyHeadingAndWeChatComplianceTest(unittest.TestCase):
    def test_colon_in_section_heading_is_rejected(self):
        for title in ("谷歌发布新模型：每百万词元1.50美元", "Google releases a model: $1.50"):
            errors = []
            validate_rendered_headings(
                errors, f'<p style="font-size:22px;color:#222">{title}</p>', Path("article.html")
            )
            self.assertEqual(len(errors), 1)
            self.assertIn("contains colon", errors[0])

    def test_non_colon_heading_is_allowed(self):
        errors = []
        validate_rendered_headings(
            errors, '<p style="font-size:22px">谷歌发布模型，搜索用户可直接使用</p>',
            Path("article.html"),
        )
        self.assertEqual(errors, [])

    def test_banner_and_qr_are_blocked_even_when_assets_exist(self):
        with tempfile.TemporaryDirectory() as root, patch("validate_blog_artifacts.ROOT", Path(root)):
            run = Path("wechat-runs/example")
            assets = Path(root) / run / "assets"
            assets.mkdir(parents=True)
            for name in ("wechat-header-ad.jpg", "wechat-follow-qr.png"):
                (assets / name).write_bytes(b"fixture")
            errors = []
            validate_wechat_recommendation_content(
                errors,
                '<p>长按识别二维码关注公众号</p>'
                '<img src="assets/wechat-header-ad.jpg"/>'
                '<img src="assets/wechat-follow-qr.png"/>',
                run,
            )
            self.assertTrue(any("wechat-header-ad" in x for x in errors))
            self.assertTrue(any("wechat-follow-qr" in x for x in errors))

    def test_missing_editorial_chart_is_blocked(self):
        with tempfile.TemporaryDirectory() as root, patch("validate_blog_artifacts.ROOT", Path(root)):
            errors = []
            validate_wechat_recommendation_content(
                errors,
                "<p>" + "完整的新闻和分析事实。" * 30 + '</p><img src="assets/chart-missing.png"/>',
                Path("wechat-runs/example"),
            )
            self.assertTrue(any("editorial image is missing" in x for x in errors))

    def test_content_with_complete_text_and_real_chart_passes(self):
        with tempfile.TemporaryDirectory() as root, patch("validate_blog_artifacts.ROOT", Path(root)):
            img = Path(root) / "wechat-runs/example/assets/chart-price.png"
            img.parent.mkdir(parents=True)
            img.write_bytes(b"fixture")
            errors = []
            validate_wechat_recommendation_content(
                errors,
                "<p>" + "完整事实、判断依据、风险及结论。" * 30 + '</p><img src="assets/chart-price.png"/>',
                Path("wechat-runs/example"),
            )
            self.assertEqual(errors, [])


if __name__ == "__main__":
    unittest.main()
