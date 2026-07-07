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


def validate_english_post(errors: list[str], slug: str) -> None:
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
    assert_exists(errors, Path("i18n/zh/docusaurus-plugin-content-blog") / slug / "article.html", "Chinese article HTML")
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
    if assert_exists(errors, article, "WeChat draft HTML"):
        html = read_text(article)
        if "<html" in html.lower():
            fail(errors, f"WeChat draft HTML should be draft/add body HTML, not a full document: {article}")
        if not re.search(r"<(section|p|div|img|span)\b", html, flags=re.I):
            fail(errors, f"WeChat draft HTML does not look like rendered HTML: {article}")
    assert_exists(errors, cover, "WeChat abstract cover")
    if assert_exists(errors, meta, "WeChat metadata"):
        try:
            data = json.loads(read_text(meta))
        except json.JSONDecodeError as exc:
            fail(errors, f"invalid WeChat meta JSON: {meta}: {exc}")
        else:
            if not str(data.get("title", "")).strip():
                fail(errors, f"WeChat meta is missing title: {meta}")

    forbidden = list((ROOT / run_dir).glob("*.html"))
    for path in forbidden:
        rel = path.relative_to(ROOT)
        if path.name != "article.wechat.html":
            fail(errors, f"wechat-runs may only contain article.wechat.html, not raw HTML: {rel}")


def validate_slug(errors: list[str], slug: str) -> None:
    if not DATE_SLUG_RE.match(slug):
        return
    if (ROOT / "blog" / slug).exists():
        validate_english_post(errors, slug)
    if (ROOT / "wechat-runs" / slug).exists():
        validate_wechat_run(errors, slug)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", help="Base git ref to diff against. Defaults to HEAD~1.")
    parser.add_argument("--slug", action="append", help="Validate one generated date slug. Can be passed more than once.")
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

    errors: list[str] = []
    for slug in sorted(slugs):
        validate_slug(errors, slug)

    if errors:
        print("blog artifact validation failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    print(f"blog artifact validation passed for {len(slugs)} slug(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
