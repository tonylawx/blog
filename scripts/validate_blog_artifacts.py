#!/usr/bin/env python3
"""Validate generated blog handoff artifacts before they enter main."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATE_SLUG_RE = re.compile(r"^20\d{2}-\d{2}-\d{2}-[0-9a-f]{6}$")
# English listening WeChat drafts are staged as <date-hash>-en alongside the CN run.
WECHAT_SLUG_RE = re.compile(r"^20\d{2}-\d{2}-\d{2}-[0-9a-f]{6}(?:-en)?$")
CJK_RE = re.compile(r"[\u3400-\u9fff]")


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
    if "全球财经" not in html[:1800]:
        fail(errors, f"WeChat weekly first screen is missing its visible editorial SEO topic line: {source}")
    # No hidden keyword stuffing; normal meaningful headings and source names
    # belong in the public text and should survive the promo sanitizer.


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
        validate_rendered_headings(errors, read_text(zh_article), zh_article)
    en_article = Path("blog") / slug / "article.html"
    if (ROOT / en_article).is_file():
        validate_rendered_headings(errors, read_text(en_article), en_article)
    if strict_handoff:
        assert_exists(errors, Path("archive") / f"{slug}.md", "archive Markdown")

        cover = Path("static/img") / slug / "abstract_cover.png"
        if not cover.exists():
            fail(errors, f"missing cover image copied to blog static assets: {cover}")


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
            if str(data.get("content_source_url") or "").strip():
                fail(errors, f"WeChat 阅读原文/content_source_url must be empty: {meta}")
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
