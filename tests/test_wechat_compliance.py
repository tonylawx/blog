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
    def _validate(
        self, html: str, *, source_url: str = "",
        title: str = "有完整事实和结论的标题", digest: str = ""
    ) -> list[str]:
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            run = root / "wechat-runs" / "2026-11-16-abcdef"
            run.mkdir(parents=True)
            (run / "article.wechat.html").write_text(html, encoding="utf-8")
            (run / "abstract_cover.png").write_bytes(b"non-empty cover")
            (run / "meta.json").write_text(json.dumps({
                "title": title,
                "digest": digest,
                "locale": "zh",
                "header_image_optional": True,
                "content_source_url": source_url,
            }), encoding="utf-8")
            errors = []
            with mock.patch.object(validator, "ROOT", root):
                validator.validate_wechat_run(errors, "2026-11-16-abcdef")
            return errors

    def test_no_api_auto_publish_workflow(self):
        # Group-send/freepublish must remain a real human action in the official editor.
        root = Path(__file__).resolve().parents[1]
        self.assertFalse((root / ".github/workflows/wechat-freepublish.yml").exists())
        workflow = (root / ".github/workflows/wechat.yml").read_text(encoding="utf-8")
        self.assertIn("--articles-json", workflow)
        self.assertIn('str(meta.get("digest") or "")', workflow)
        self.assertNotIn("--mass-send-media-id", workflow)
        self.assertNotIn("--freepublish-media-id", workflow)

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

    def test_investment_profit_guarantee_is_blocked(self):
        errors = self._validate(LONG_STORY + "<p>私信领取稳赚不赔的股票。</p>")
        self.assertTrue(any("investment/return guarantee" in e for e in errors))
        self.assertTrue(any("promotional contact" in e for e in errors))

    def test_qualified_risk_statement_not_treated_as_profit_promise(self):
        errors = self._validate(LONG_STORY + "<p>未来价格不确定，无法保证收益。</p>")
        self.assertEqual(errors, [])

    def test_fake_urgent_official_title_is_blocked(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            errors = []
            with mock.patch.object(validator, "ROOT", root):
                validator.validate_wechat_title_and_digest(
                    errors, "官方紧急通知！美股走势确定了", "", Path("meta.json")
                )
            self.assertTrue(any("exaggerated" in e for e in errors))

    def test_digest_stock_group_bait_is_blocked(self):
        errors = []
        validator.validate_wechat_title_and_digest(
            errors, "本周市场结构变化", "扫码进群拿到免费领牛股", Path("meta.json")
        )
        self.assertTrue(errors)

    def test_digest_read_original_redirect_is_blocked(self):
        errors = []
        validator.validate_wechat_title_and_digest(
            errors, "完整市场分析", "点击阅读原文查看完整版", Path("meta.json")
        )
        self.assertTrue(any("promotional contact" in e for e in errors))

    def test_html_javascript_link_is_blocked(self):
        errors = self._validate(LONG_STORY + '<a href="javascript:alert(1)">查看更多</a>')
        self.assertTrue(any("external clickable link" in e for e in errors))

    def test_unrecognized_qr_asset_is_blocked(self):
        errors = self._validate(LONG_STORY + '<img src="assets/qrcode-new.png">')
        self.assertTrue(any("QR/contact asset" in e for e in errors))

    def test_visible_external_url_is_blocked(self):
        errors = self._validate(LONG_STORY + "<p>完整数据在 https://outside.example</p>")
        self.assertTrue(any("visible external URL" in e for e in errors))

    def test_finance_weekly_keeps_fixed_seo_and_dynamic_section_layout(self):
        title = "【财经周报】美国通胀、中国出口和油价背后的成本转移 20261116"
        digest = (
            "本周精选全球重要财经新闻，包括美国消费价格、中国出口、国际油价、"
            "日元干预与企业融资。沿着资金账本分析成本分配，看看谁承担风险。"
        )
        masthead = "美股 · 期权 · 资讯 · 观点"
        labels = ("MACRO", "ENERGY", "LIQUIDITY", "RISK", "OUTLOOK")

        def build_html(section_count: int) -> str:
            sections = "".join(
                '<section><span>' + str(i) + ' · ' + labels[i] + '</span>'
                '<span style="background:#2763e9"></span>'
                '<p style="font-size:22px">内容决定的章节标题</p></section>'
                for i in range(section_count)
            )
            return "<p>" + masthead + "</p>" + sections + LONG_STORY

        # The approved design is a style contract, NOT a fixed four-section count.
        for section_count in (2, 4, 5):
            with self.subTest(section_count=section_count):
                self.assertEqual(
                    self._validate(build_html(section_count), title=title, digest=digest),
                    [],
                )

        self.assertTrue(any(
            "digest" in e for e in self._validate(build_html(2), title=title)
        ))
        wrong_seo = build_html(2).replace(masthead, "全球财经 · 宏观经济 · 国际贸易")
        self.assertTrue(any(
            "fixed brand SEO" in e
            for e in self._validate(wrong_seo, title=title, digest=digest)
        ))
        skipped_label = build_html(2).replace("1 · ENERGY", "7 · ENERGY")
        self.assertTrue(any(
            "consecutive" in e
            for e in self._validate(skipped_label, title=title, digest=digest)
        ))
        missing_title = build_html(2).replace("font-size:22px", "font-size:20px", 1)
        self.assertTrue(any(
            "heading count" in e
            for e in self._validate(missing_title, title=title, digest=digest)
        ))
        generic = "【财经周报】全球财经11条新闻 20261116"
        self.assertTrue(any(
            "searchable financial topics" in e
            for e in self._validate(build_html(2), title=generic, digest=digest)
        ))

    def test_weekly_cannot_publish_without_humanizer_and_pre_edit_snapshot(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            slug = "2026-11-16-abcdef"
            run = root / "wechat-runs" / slug
            run.mkdir(parents=True)
            (run / "news_digest.md").write_text("# 【财经周报】测试\n\n正文已经写完。", encoding="utf-8")
            errors = []
            with mock.patch.object(validator, "ROOT", root):
                validator.validate_finance_weekly_editorial(errors, slug, {})
            self.assertTrue(any("humanizer_zh_applied" in x for x in errors))
            self.assertTrue(any("missing pre-edit snapshot" in x for x in errors))

            (run / "news_digest.pre-humanizer.md").write_text("# 【财经周报】初稿\n\n初始内容。", encoding="utf-8")
            metadata = {
                "humanizer_zh_applied": True,
                "pre_humanizer_path": f"wechat-runs/{slug}/news_digest.pre-humanizer.md",
            }
            errors = []
            with mock.patch.object(validator, "ROOT", root):
                validator.validate_finance_weekly_editorial(errors, slug, metadata)
            self.assertEqual(errors, [])

            (run / "news_digest.md").write_text(
                "第一层误会，第二层误会，更深一层的矛盾。", encoding="utf-8"
            )
            errors = []
            with mock.patch.object(validator, "ROOT", root):
                validator.validate_finance_weekly_editorial(errors, slug, metadata)
            self.assertTrue(any("mechanical scaffolding" in x for x in errors))

    def test_weekly_english_requires_independent_financial_editor_snapshot(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            slug = "2026-11-16-abcdef-en"
            run = root / "wechat-runs" / slug
            run.mkdir(parents=True)
            (run / "english_listening.md").write_text(
                "# Market\n\nUS Stocks · Options · News · Views\n\n## 0 Market\n\nA clear final script.",
                encoding="utf-8"
            )
            (run / "english_listening.pre-editor.md").write_text(
                "# Market\n\nUS Stocks · Options · News · Views\n\n## 0 Market\n\nAwkward original.",
                encoding="utf-8"
            )
            metadata = {
                "financial_english_editor_applied": True,
                "pre_editor_path": f"wechat-runs/{slug}/english_listening.pre-editor.md",
            }
            errors = []
            with mock.patch.object(validator, "ROOT", root):
                validator.validate_finance_weekly_editorial(errors, slug, metadata)
            self.assertEqual(errors, [])
            errors = []
            with mock.patch.object(validator, "ROOT", root):
                validator.validate_finance_weekly_editorial(errors, slug, {})
            self.assertTrue(any("financial_english_editor_applied" in x for x in errors))

    def test_relevant_editorial_image_must_exist(self):
        errors = self._validate(LONG_STORY + '<img src="assets/chart-missing.png">')
        self.assertTrue(any("image is missing" in error for error in errors))


if __name__ == "__main__":
    unittest.main()
