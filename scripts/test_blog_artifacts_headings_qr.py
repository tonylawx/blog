"""Regression tests for weekly heading styles and WeChat follow-card assets."""
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from validate_blog_artifacts import validate_rendered_headings, validate_wechat_follow_image


class WeeklyHeadingAndFollowQrTest(unittest.TestCase):
    def test_colon_in_cn_or_en_section_heading_is_rejected(self):
        for title in ("谷歌发布新模型：每百万词元1.50美元", "Google releases a model: $1.50"):
            errors = []
            validate_rendered_headings(
                errors,
                f'<p style="font-size:22px;color:#222">{title}</p>',
                Path("article.html"),
            )
            self.assertEqual(len(errors), 1)
            self.assertIn("contains colon", errors[0])

    def test_comma_or_other_punctuation_is_allowed(self):
        errors = []
        validate_rendered_headings(
            errors,
            '<p style="font-size:22px">谷歌发布模型，搜索用户可直接使用</p>',
            Path("article.html"),
        )
        self.assertEqual(errors, [])

    def test_footer_with_no_img_fails(self):
        with tempfile.TemporaryDirectory() as root, patch("validate_blog_artifacts.ROOT", Path(root)):
            errors = []
            validate_wechat_follow_image(
                errors, "<div>长按识别二维码关注公众号</div>",
                Path("wechat-runs/test"),
            )
            self.assertTrue(any("lacks <img>" in x for x in errors))

    def test_footer_with_missing_asset_fails(self):
        with tempfile.TemporaryDirectory() as root, patch("validate_blog_artifacts.ROOT", Path(root)):
            errors = []
            validate_wechat_follow_image(
                errors,
                '<div>长按识别二维码<img src="assets/wechat-follow-qr.png"/></div>',
                Path("wechat-runs/test"),
            )
            self.assertTrue(any("image is missing" in x for x in errors))

    def test_footer_with_real_local_qr_passes(self):
        with tempfile.TemporaryDirectory() as root, patch("validate_blog_artifacts.ROOT", Path(root)):
            img = Path(root) / "wechat-runs/test/assets/wechat-follow-qr.png"
            img.parent.mkdir(parents=True)
            img.write_bytes(b"png placeholder for path existence check")
            errors = []
            validate_wechat_follow_image(
                errors,
                '<div>长按识别二维码<img src="assets/wechat-follow-qr.png"/></div>',
                Path("wechat-runs/test"),
            )
            self.assertEqual(errors, [])


if __name__ == "__main__":
    unittest.main()
