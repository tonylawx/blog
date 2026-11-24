#!/usr/bin/env python3
"""Validate generated blog handoff artifacts before they enter main."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parents[1]
DATE_SLUG_RE = re.compile(r"^20\d{2}-\d{2}-\d{2}-[0-9a-f]{6}$")
# English listening WeChat drafts are staged as <date-hash>-en alongside the CN run.
WECHAT_SLUG_RE = re.compile(r"^20\d{2}-\d{2}-\d{2}-[0-9a-f]{6}(?:-en)?$")
CJK_RE = re.compile(r"[\u3400-\u9fff]")
CREATOR_ATTRIBUTION_PATTERNS = (
    r"视野环球财经", r"Rhino\s*Finance",
    r"(?:YouTube(?:频道| channel)?|UP主|up主|主播|博主|视频作者|节目主持人|主理人|频道主理人|频道主持人)",
    r"\bthe\s+(?:host|creator|YouTuber|channel\s+host|channel\s+owner)\b",
    r"\baccording\s+to\s+(?:the\s+)?(?:host|creator|YouTuber)\b",
    r"\b(?:host|creator|YouTuber)\s+(?:said|says|disclosed|bought|sold|added|trimmed|holds|held|would)\b",
)


def run_git(args: list[str]) -> str:
    return subprocess.check_output(["git", *args], cwd=ROOT, text=True).strip()


def changed_files(base: str | None) -> list[Path]:
    if base:
        output = run_git(["diff", "--name-only", f"{base}...HEAD"])
    else:
        output = run_git(["diff", "--name-only", "HEAD~1", "HEAD"])
    return [Path(line) for line in output.splitlines() if line.strip()]


def fail(errors: list[str], message: str) -> None:
    errors.append(message)


def read_text(path: Path) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def assert_exists(errors: list[str], path: Path, label: str) -> bool:
    if not (ROOT / path).exists():
        fail(errors, f"missing {label}: {path}")
        return False
    return True


def slug_from_path(path: Path) -> str | None:
    parts = path.parts
    if len(parts) >= 2 and parts[0] in {"blog", "wechat-runs", "archive"}:
        return parts[1] if parts[0] != "archive" else path.stem
    if (
        len(parts) >= 4
        and parts[0] == "i18n"
        and parts[1] == "zh"
        and parts[2] == "docusaurus-plugin-content-blog"
    ):
        return parts[3]
    if len(parts) >= 3 and parts[0] == "static" and parts[1] == "img":
        return parts[2]
    return None


def path_requires_handoff(path: Path) -> bool:
    parts = path.parts
    return (
        parts[:1] in {("wechat-runs",), ("archive",)}
        or parts[:2] == ("static", "img")
    )



def validate_source_creator_attribution(errors: list[str], content: str, artifact: Path) -> None:
    """Block source-creator call-outs; analysis must stand as the writer's opinion."""
    for pattern in CREATOR_ATTRIBUTION_PATTERNS:
        match = re.search(pattern, content or "", flags=re.I)
        if match:
            fail(
                errors,
                f"creator/channel attribution is not allowed in {artifact}: {match.group(0)}; "
                "state subjective analysis as a view and do not reproduce third-party holdings",
            )
            return


def validate_rendered_headings(errors: list[str], html: str, artifact: Path) -> None:
    """Prevent bypassing the weekly headline rule during HTML rendering."""
    headings = re.findall(
        r'<p\b[^>]*\bfont-size\s*:\s*22px[^>]*>([^<]*)</p>',
        html,
        flags=re.I,
    )
    for heading in headings:
        if ":" in heading or "：" in heading:
            fail(errors, f"section heading contains colon in {artifact}: {heading.strip()}")



# Strict project defaults, not a claim that the platform bans every occurrence
# of these words. A false positive is a stop-and-review, never a silent edit.
WECHAT_RISK_PATTERNS: tuple[tuple[str, str], ...] = (
    (r"(?:稳赚不赔|稳赚包赔|保证盈利|(?<!不)(?<!无法)(?<!不能)(?<!不会)(?<!不得)(?<!禁止)保证收益|必定盈利|必涨无疑|保本保收益|零风险收益|无风险高收益)", "unqualified investment/return guarantee"),
    (r"(?:guaranteed profits?|guaranteed returns?|risk[- ]free returns?|zero[- ]risk profits?)", "unqualified investment/return guarantee"),
    (r"(?:点击阅读原文|点击查看完整版|阅读全文请|长按识别二维码|扫码(?:查看|获取)(?:完整|全文)|扫码(?:加|进|入)?群|加(?:我)?微信(?:领|拿|获取)|私信(?:我)?(?:领|拿|获取)|评论(?:区)?(?:领|拿|获取)|关注(?:后)?(?:领|拿|获取))", "promotional contact/reward/lead CTA"),
    (r"(?:scan (?:the )?qr(?: code)? to (?:join|unlock)|dm me (?:to|for)|follow to unlock|comment to get access)", "promotional contact/reward/lead CTA"),
    (r"(?:点击(?:链接|下方|此处)(?:获取|领取|查看)(?:完整|独家|内幕)|下载app(?:查看|领取)|免费领牛股|内幕荐股群)", "bait/redirect or unlicensed stock tip"),
)
WECHAT_TITLE_BAIT_RE = re.compile(
    r"(?:震惊[!！]?|全网沸腾|彻底沸腾|官方紧急通知|紧急通知|突发重磅通知|所有人(?:都)?注意)",
    flags=re.IGNORECASE,
)
WECHAT_QR_FILENAME_RE = re.compile(
    r"(?:qrcode|qr[-_]code|(?:weixin|wechat|follow|join|group)[-_]?(?:qr|code))",
    flags=re.IGNORECASE,
)


def validate_wechat_text_risks(errors: list[str], text: str, source: Path) -> None:
    """Fail on recognizable bait/guaranteed-return/promo phrases; flag for rewrite."""
    for pattern, description in WECHAT_RISK_PATTERNS:
        if re.search(pattern, text, flags=re.I):
            fail(errors, f"WeChat {description} needs editorial rewrite/review: {source}")


def validate_wechat_title_and_digest(
    errors: list[str], title: str, digest: str, meta: Path
) -> None:
    for label, value in (("title", title), ("digest", digest)):
        validate_wechat_text_risks(errors, value, meta)
        if WECHAT_TITLE_BAIT_RE.search(value):
            fail(errors, f"WeChat exaggerated or impersonating {label}: {meta}")
        if re.search(r"(?:https?://|www\.)\S+", value, flags=re.I):
            fail(errors, f"WeChat URL is not allowed in {label}: {meta}")




def validate_finance_weekly_seo(
    errors: list[str], title: str, digest: str, html: str, source: Path
) -> None:
    """Keep editorial discovery metadata; only drop real marketing redirects.

    Searchable, readable topics are not the same as QR or contact CTA.
    """
    if not title.startswith("【财经周报】"):
        return
    if not re.search(r"(?:通胀|CPI|出口|贸易|油价|能源|融资|汇率|企业|经济|债务|半导体|原油)", title):
        fail(errors, f"WeChat weekly title lacks searchable financial topics: {source}")
    chinese_digest = len(re.findall(r"[\u3400-\u9fff]", digest))
    if chinese_digest < 45 or chinese_digest > 160:
        fail(errors, f"WeChat weekly digest must explain the news and value in 45-160 Chinese characters: {source}")
    # RhinoFinance brand-wide masthead is fixed across daily and weekly Chinese posts.
    # Actual topical keywords belong in the title, digest and editorial paragraphs.
    fixed_seo = "美股 · 期权 · 资讯 · 观点"
    if fixed_seo not in html[:1800]:
        fail(errors, f"WeChat weekly first screen is missing fixed brand SEO line: {source}")
    # Preserve the visual contract, not an arbitrary number of sections.
    # Each real H2 section gets one consecutive 0..N label, blue divider and
    # original heading hierarchy. A weekly can have two, four, five, etc.
    labels = re.findall(
        r"<span\b[^>]*>\s*(\d+)\s*·\s*([A-Z][A-Z0-9_-]*)\s*</span>",
        html, flags=re.I,
    )
    sequence = [int(number) for number, _ in labels]
    if not labels or sequence != list(range(len(labels))):
        fail(errors, f"WeChat weekly section numbers must be content-driven and consecutive from 0: {source}")
    chapter_titles = re.findall(
        r'<p[^>]*font-size:\s*22px[^>]*>',
        html, flags=re.I,
    )
    if len(chapter_titles) != len(labels):
        fail(errors, f"WeChat weekly chapter heading count must match section labels: {source}")
    if "background:#2763e9" not in html or "font-size:22px" not in html:
        fail(errors, f"WeChat weekly must preserve the original blue line and title hierarchy: {source}")
    # No hidden keyword stuffing; natural sources and semantic topic titles survive.


def validate_wechat_recommendation_content(errors: list[str], html: str, run_dir: Path) -> None:
    """Fail closed on common platform-defined content, interaction and nested redirects.

    This deterministic gate supplements, never replaces, source verification and
    human review. A normal editorial citation may name its source in body text.
    """
    prohibited = (
        "wechat-header-ad", "wechat-follow-qr", "长按识别二维码",
        "Long press the QR code", "点击阅读原文", "点击查看完整版",
        "阅读全文请", "关注后查看", "分享后查看",
        "扫码加入", "加微信咨询", "私信领取",
    )
    for marker in prohibited:
        if marker.lower() in html.lower():
            fail(errors, f"WeChat promotional/redirect content ({marker}) is not allowed: {run_dir}")
    # Any clickable URL is not part of this project's native WeChat article.
    # An in-page section anchor is the only allowed href.
    for href in re.findall(r'<a\b[^>]*\bhref\s*=\s*["\']([^"\']*)["\']', html, flags=re.I):
        if href.strip() and not href.strip().startswith("#"):
            fail(errors, f"WeChat draft contains an external clickable link: {run_dir}")
    if re.search(r"<(?:script|iframe|form)\b", html, flags=re.I):
        fail(errors, f"WeChat draft contains unsupported embedded interactive content: {run_dir}")
    sources = re.findall(r'<img\b[^>]*\bsrc\s*=\s*["\']([^"\']+)["\']', html, flags=re.I)
    for src in sources:
        if WECHAT_QR_FILENAME_RE.search(src):
            fail(errors, f"WeChat draft image resembles a QR/contact asset: {run_dir}: {src}")
    plain_text = re.sub(r"<[^>]+>", "", html)
    plain_text = re.sub(r"\s+", "", plain_text)
    validate_wechat_text_risks(errors, plain_text, run_dir)
    if re.search(r"(?:https?://|www\.)\S+", plain_text, flags=re.I):
        fail(errors, f"WeChat body contains a visible external URL: {run_dir}")
    if len(plain_text) < 180:
        fail(errors, f"WeChat draft appears incomplete (less than 180 text characters): {run_dir}")

    for src in re.findall(r'<img\b[^>]*src=["\'](assets/[^"\']+)["\']', html, flags=re.I):
        image = run_dir / src
        if not (ROOT / image).is_file():
            fail(errors, f"WeChat editorial image is missing: {image}")


def validate_english_post(errors: list[str], slug: str, *, strict_handoff: bool) -> None:
    post = Path("blog") / slug / "index.mdx"
    if not assert_exists(errors, post, "English blog post"):
        return
    text = read_text(post)
    matches = list(CJK_RE.finditer(text))
    if matches:
        samples = []
        for match in matches[:5]:
            start = max(0, match.start() - 28)
            end = min(len(text), match.end() + 28)
            samples.append(re.sub(r"\s+", " ", text[start:end]).strip())
        fail(errors, f"English post contains Chinese characters: {post}; samples: {' | '.join(samples)}")

    assert_exists(errors, Path("i18n/zh/docusaurus-plugin-content-blog") / slug / "index.mdx", "Chinese blog post")
    zh_article = Path("i18n/zh/docusaurus-plugin-content-blog") / slug / "article.html"
    if assert_exists(errors, zh_article, "Chinese article HTML"):
        zh_html = read_text(zh_article)
        validate_rendered_headings(errors, zh_html, zh_article)
        validate_source_creator_attribution(errors, zh_html, zh_article)
    en_article = Path("blog") / slug / "article.html"
    if (ROOT / en_article).is_file():
        en_html = read_text(en_article)
        validate_rendered_headings(errors, en_html, en_article)
        validate_source_creator_attribution(errors, en_html, en_article)
    archive = Path("archive") / f"{slug}.md"
    if (ROOT / archive).is_file():
        validate_source_creator_attribution(errors, read_text(archive), archive)
    if strict_handoff:
        assert_exists(errors, Path("archive") / f"{slug}.md", "archive Markdown")

        cover = Path("static/img") / slug / "abstract_cover.png"
        if not cover.exists():
            fail(errors, f"missing cover image copied to blog static assets: {cover}")



def validate_finance_weekly_editorial(
    errors: list[str], slug: str, metadata: dict
) -> None:
    """Prevent the weekly channel from bypassing bilingual editorial passes.

    Applies to finance weekly *source* artifacts; older generic WeChat drafts
    without a weekly source are unaffected. Human judgment remains essential.
    """
    run_dir = Path("wechat-runs") / slug
    is_english = slug.endswith("-en")
    name = "english_listening.md" if is_english else "news_digest.md"
    final_path = run_dir / name
    if not (ROOT / final_path).is_file():
        return

    key = "financial_english_editor_applied" if is_english else "humanizer_zh_applied"
    snapshot_name = "english_listening.pre-editor.md" if is_english else "news_digest.pre-humanizer.md"
    expected_path = run_dir / snapshot_name
    meta_key = "pre_editor_path" if is_english else "pre_humanizer_path"

    if metadata.get(key) is not True:
        fail(errors, f"weekly editorial gate: {key} must be true: {run_dir}")
    if metadata.get(meta_key) != str(expected_path):
        fail(errors, f"weekly editorial gate: {meta_key} must point to the saved pre-edit snapshot: {run_dir}")
    if not (ROOT / expected_path).is_file():
        fail(errors, f"weekly editorial gate: missing pre-edit snapshot {expected_path}")
        return

    before = read_text(expected_path)
    after = read_text(final_path)
    if before.strip() == after.strip():
        fail(errors, f"weekly editorial gate: final copy equals its pre-edit snapshot: {final_path}")

    if not is_english:
        mechanical = (
            "第一层误会", "第二层误会", "更深一层的矛盾",
            "这条新闻值得关注的不是", "真正的新闻不是",
        )
        leftovers = [phrase for phrase in mechanical if phrase in after]
        if leftovers:
            fail(errors, f"weekly editorial gate: unedited mechanical scaffolding {leftovers}: {final_path}")
    else:
        if "US Stocks · Options · News · Views" not in after[:420]:
            fail(errors, f"weekly listening must keep the English brand masthead: {final_path}")
        if not re.search(r"^## 0 ", after, flags=re.M):
            fail(errors, f"weekly listening must have sequential numbered chapters: {final_path}")



WECHAT_GREY_DISCLAIMER_CN = "免责声明：本文仅为个人市场观察和交易复盘，不构成任何投资建议；市场有风险，交易需谨慎。"
WECHAT_GREY_DISCLAIMER_EN = "Disclaimer: For personal market observation only. Not investment advice. Markets involve risk."


def validate_wechat_footer(errors: list[str], slug: str, html: str, metadata: dict) -> None:
    """Apply the fixed, historical gray footer when the new contract is enabled."""
    if metadata.get("footer_policy") != "rhino-grey-disclaimer-v1":
        return
    notice = WECHAT_GREY_DISCLAIMER_EN if slug.endswith("-en") else WECHAT_GREY_DISCLAIMER_CN
    matches = re.findall(
        r'<p\b[^>]*\bstyle="[^"]*color:\s*#9a9aa8[^"]*font-size:\s*12px'
        r'[^"]*text-align:\s*center[^"]*"[^>]*>([^<]*)</p>',
        html, flags=re.I,
    )
    if matches != [notice]:
        fail(errors, f"WeChat fixed gray disclaimer is missing, modified or duplicated: {slug}")
    if "点击阅读原文" in html or "点击原文" in html:
        fail(errors, f"WeChat gray disclaimer/body must not prompt 点击原文: {slug}")


def validate_wechat_source_link(errors: list[str], slug: str, metadata: dict) -> None:
    """Allow a verified owned-blog 阅读原文 field, not a body CTA or arbitrary redirect."""
    value = str(metadata.get("content_source_url") or "").strip()
    if metadata.get("source_link_policy") != "same_article_blog":
        return  # Legacy runs are not silently rewritten.
    base = slug[:-3] if slug.endswith("-en") else slug
    relative = f"/blog/{base}" if slug.endswith("-en") else f"/zh/blog/{base}"
    canonical = "https://www.tonylaw.cc" + relative
    if value != canonical:
        fail(errors, f"WeChat original-source link must match this article's canonical owned blog URL: {slug}")
        return
    parts = urlsplit(value)
    if (parts.scheme != "https" or parts.netloc != "www.tonylaw.cc" or parts.query
            or parts.fragment or parts.username or parts.password):
        fail(errors, f"WeChat original-source URL is not a clean HTTPS blog link: {slug}")
        return
    english = Path("blog") / base / "index.mdx"
    chinese = Path("i18n/zh/docusaurus-plugin-content-blog") / base / "index.mdx"
    for page in (english, chinese):
        if not (ROOT / page).is_file():
            fail(errors, f"WeChat 阅读原文 targets a missing local blog article: {page}")

def validate_wechat_run(errors: list[str], slug: str) -> None:
    run_dir = Path("wechat-runs") / slug
    if not (ROOT / run_dir).exists():
        return

    article = run_dir / "article.wechat.html"
    cover = run_dir / "abstract_cover.png"
    meta = run_dir / "meta.json"
    is_english = slug.endswith("-en")
    if assert_exists(errors, article, "WeChat draft HTML"):
        html = read_text(article)
        validate_source_creator_attribution(errors, html, article)
        if "<html" in html.lower():
            fail(errors, f"WeChat draft HTML should be draft/add body HTML, not a full document: {article}")
        if not re.search(r"<(section|p|div|img|span)\b", html, flags=re.I):
            fail(errors, f"WeChat draft HTML does not look like rendered HTML: {article}")
        if "#d7e2ff" in html.lower():
            fail(errors, f"WeChat draft HTML section label rules must use #2763e9, not #d7e2ff: {article}")
        validate_rendered_headings(errors, html, article)
        # Banner/QR preflight is unconditional for all WeChat content types.
        validate_wechat_recommendation_content(errors, html, run_dir)
        if is_english and CJK_RE.search(html):
            fail(errors, f"English WeChat draft HTML contains Chinese characters: {article}")
        if is_english and "US Stocks · Options · News · Views" not in html:
            fail(errors, f"English WeChat draft missing EN SEO line: {article}")
    assert_exists(errors, cover, "WeChat abstract cover")
    if assert_exists(errors, meta, "WeChat metadata"):
        try:
            data = json.loads(read_text(meta))
        except json.JSONDecodeError as exc:
            fail(errors, f"invalid WeChat meta JSON: {meta}: {exc}")
        else:
            if not str(data.get("title", "")).strip():
                fail(errors, f"WeChat meta is missing title: {meta}")
            validate_wechat_title_and_digest(
                errors, str(data.get("title") or ""), str(data.get("digest") or ""), meta
            )
            validate_finance_weekly_seo(
                errors,
                str(data.get("title") or ""),
                str(data.get("digest") or ""),
                read_text(article) if (ROOT / article).is_file() else "",
                meta,
            )
            validate_finance_weekly_editorial(errors, slug, data)
            validate_wechat_source_link(errors, slug, data)
            validate_wechat_footer(
                errors, slug,
                read_text(article) if (ROOT / article).is_file() else "", data,
            )
            if is_english and data.get("locale") != "en":
                fail(errors, f"English WeChat meta must set locale=en: {meta}")
            if is_english and CJK_RE.search(str(data.get("title", ""))):
                fail(errors, f"English WeChat title contains Chinese characters: {meta}")

    forbidden = list((ROOT / run_dir).glob("*.html"))
    for path in forbidden:
        rel = path.relative_to(ROOT)
        if path.name != "article.wechat.html":
            fail(errors, f"wechat-runs may only contain article.wechat.html, not raw HTML: {rel}")


def validate_slug(errors: list[str], slug: str, *, strict_handoff: bool) -> None:
    if slug.endswith("-en"):
        if not WECHAT_SLUG_RE.match(slug):
            return
        if (ROOT / "wechat-runs" / slug).exists():
            validate_wechat_run(errors, slug)
        return
    if not DATE_SLUG_RE.match(slug):
        return
    if (ROOT / "blog" / slug).exists():
        validate_english_post(errors, slug, strict_handoff=strict_handoff)
    if (ROOT / "wechat-runs" / slug).exists():
        validate_wechat_run(errors, slug)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", help="Base git ref to diff against. Defaults to HEAD~1.")
    parser.add_argument("--slug", action="append", help="Validate one generated date slug. Can be passed more than once.")
    parser.add_argument("--strict-handoff", action="store_true", help="Require archive, static cover, and WeChat handoff artifacts for each slug.")
    parser.add_argument("--all", action="store_true", help="Validate every generated date slug in the repo.")
    args = parser.parse_args()

    if args.slug:
        slugs = set(args.slug)
    elif args.all:
        slugs = {
            path.name
            for root in [ROOT / "blog", ROOT / "wechat-runs"]
            if root.exists()
            for path in root.iterdir()
            if path.is_dir()
        }
    else:
        paths = changed_files(args.base)
        slugs = {slug for path in paths if (slug := slug_from_path(path))}
        args.strict_handoff = args.strict_handoff or any(path_requires_handoff(path) for path in paths)

    errors: list[str] = []
    for slug in sorted(slugs):
        validate_slug(errors, slug, strict_handoff=args.strict_handoff)

    if errors:
        print("blog artifact validation failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    print(f"blog artifact validation passed for {len(slugs)} slug(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
