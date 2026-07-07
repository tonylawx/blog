#!/usr/bin/env python3
"""Render English blog posts (blog/<slug>/index.mdx markdown) into the same
rich inline-styled article.html the Chinese posts use, and rewire each
index.mdx to inject it (import ... ?raw + dangerouslySetInnerHTML).

This makes English posts match the Chinese stt-article visual format:
blue section-header bands with a divider, styled paragraphs, top tag band,
and a styled disclaimer. The WeChat QR card is omitted (Chinese-only).

Usage:
  python3 scripts/render_en_article_html.py <slug>...   # specific posts
  python3 scripts/render_en_article_html.py --all       # every blog/*/ post
  python3 scripts/render_en_article_html.py --dry-run <slug>   # print, no write
"""

from __future__ import annotations

import argparse
import html
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BLOG = ROOT / "blog"

TOP = (
    '<p style="text-align:center;color:#2763e9;font-size:11px;'
    'letter-spacing:0.16em;font-weight:700;margin:0 0 28px;">'
    "US Stocks · Options · News · Views</p>"
)
SEC_OPEN = '<section style="margin:0 0 32px;">'
SEC_CLOSE = "</section>"
HDR_OPEN = '<div style="display:flex;align-items:center;gap:12px;margin:0 0 16px;">'
HDR_CLOSE = "</div>"
DIVIDER = '<span style="flex:1;height:1px;background:#d7e2ff;"></span>'
P_STYLE = (
    "margin:0 0 16px;color:#454550;font-size:16px;line-height:1.9;"
)
DISCLAIMER_STYLE = (
    "margin:36px 0 0;padding-top:20px;border-top:1px solid #f0f2f5;"
    "color:#9a9aa8;font-size:12px;line-height:1.8;text-align:center;"
)

IMPORT_LINE = "import articleHtml from './article.html?raw';"
DIV_LINE = (
    '<div className="stt-article" dangerouslySetInnerHTML={{__html: articleHtml}} />'
)


def hdr_span(label: str) -> str:
    return (
        '<span style="color:#2763e9;font-size:12px;font-weight:800;'
        f'letter-spacing:0.14em;white-space:nowrap;">{html.escape(label)}</span>'
    )


def para(text: str) -> str:
    return f'<p style="{P_STYLE}">{text}</p>'


def figure(src: str, alt: str = "") -> str:
    return (
        '<figure style="margin:0 0 20px;text-align:center;">'
        f'<img src="{html.escape(src)}" alt="{html.escape(alt)}" '
        'style="max-width:100%;border-radius:8px;" /></figure>'
    )


def disclaimer_p(text: str) -> str:
    return f'<p style="{DISCLAIMER_STYLE}">{text}</p>'


def inline(text: str) -> str:
    """Convert inline markdown to HTML, escaping everything else."""
    t = html.escape(text)
    # images inline ![alt](src)
    t = re.sub(
        r"!\[([^\]]*)\]\(([^)]+)\)",
        lambda m: (
            '<img src="' + html.escape(m.group(2)) + '" alt="'
            + html.escape(m.group(1)) + '" style="max-width:100%;border-radius:8px;" />'
        ),
        t,
    )
    # links [text](url)
    t = re.sub(
        r"\[([^\]]+)\]\(([^)]+)\)",
        lambda m: f'<a href="{html.escape(m.group(2))}">{m.group(1)}</a>',
        t,
    )
    # bold **x**
    t = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", t)
    # inline code `x`
    t = re.sub(r"`([^`]+)`", r"<code>\1</code>", t)
    # italic *x* (after bold so ** is gone)
    t = re.sub(r"(?<!\*)\*([^*\n]+)\*(?!\*)", r"<em>\1</em>", t)
    return t


def split_frontmatter(text: str) -> tuple[str, str]:
    lines = text.split("\n")
    if lines and lines[0].strip() == "---":
        for i in range(1, len(lines)):
            if lines[i].strip() == "---":
                return "\n".join(lines[: i + 1]), "\n".join(lines[i + 1 :])
    return "", text


def parse_blocks(body: str) -> list[tuple]:
    blocks: list[tuple] = []
    para_buf: list[str] = []

    def flush() -> None:
        nonlocal para_buf
        if para_buf:
            text = " ".join(s.strip() for s in para_buf if s.strip())
            if text:
                blocks.append(("para", text))
        para_buf = []

    for raw in body.split("\n"):
        s = raw.strip()
        if not s:
            flush()
            continue
        m = re.match(r"^#{1,6}\s+(?:(\d+)\.\s*)?(.+)$", s)
        if m:
            flush()
            blocks.append(("heading", m.group(1), m.group(2).strip()))
            continue
        if re.match(r"^(-{3,}|\*{3,}|_{3,})$", s):
            flush()
            blocks.append(("hr",))
            continue
        mi = re.match(r"^!\[([^\]]*)\]\(([^)]+)\)$", s)
        if mi:
            flush()
            blocks.append(("image", mi.group(2), mi.group(1)))
            continue
        if re.match(r"^[*_]?Disclaimer[:：]", s, re.I):
            flush()
            blocks.append(("disclaimer", re.sub(r"^[*_]+|[*_]+$", "", s).strip()))
            continue
        if s.startswith("> "):
            s = s[2:]
        if re.match(r"^[-*]\s+", s):
            flush()
            blocks.append(("li", re.sub(r"^[-*]\s+", "", s)))
            continue
        para_buf.append(s)
    flush()
    return blocks


def render(blocks: list[tuple]) -> str:
    out: list[str] = [TOP]
    in_section = False
    disclaimer: str | None = None

    def open_section(num: str | None, title: str | None) -> None:
        nonlocal in_section
        in_section = True
        out.append(SEC_OPEN)
        if title is not None:
            label = f"{num} · {title}" if num else title
            out.append(HDR_OPEN + hdr_span(label) + DIVIDER + HDR_CLOSE)

    def close_section() -> None:
        nonlocal in_section
        if in_section:
            out.append(SEC_CLOSE)
            in_section = False

    for b in blocks:
        kind = b[0]
        if kind == "heading":
            close_section()
            open_section(b[1], b[2])
        elif kind == "para":
            if not in_section:
                open_section(None, None)
            out.append(para(inline(b[1])))
        elif kind == "image":
            if not in_section:
                open_section(None, None)
            out.append(figure(b[1], b[2]))
        elif kind == "li":
            if not in_section:
                open_section(None, None)
            out.append(para("• " + inline(b[1])))
        elif kind == "disclaimer":
            close_section()
            disclaimer = b[1]
        # hr: ignore
    close_section()
    if disclaimer:
        out.append(disclaimer_p(inline(disclaimer)))
    return "\n".join(out) + "\n"


def process_slug(slug: str, *, dry_run: bool) -> str:
    post = BLOG / slug / "index.mdx"
    if not post.exists():
        return f"skip {slug}: no index.mdx"
    text = post.read_text(encoding="utf-8")
    fm, body = split_frontmatter(text)
    # Skip posts already using the article.html import (idempotent — avoids
    # re-parsing the import/div lines as content and corrupting article.html).
    if "article.html?raw" in body or "stt-article" in body:
        return f"skip {slug}: already uses article.html"
    blocks = parse_blocks(body)
    article_html = render(blocks)
    new_mdx = f"{fm}\n\n{IMPORT_LINE}\n\n{DIV_LINE}\n"

    if dry_run:
        return f"=== {slug} article.html ===\n{article_html}\n\n=== new index.mdx ===\n{new_mdx}"

    (BLOG / slug / "article.html").write_text(article_html, encoding="utf-8")
    post.write_text(new_mdx, encoding="utf-8")
    return f"rendered {slug}"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("slugs", nargs="*")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if args.all:
        slugs = sorted(p.name for p in BLOG.iterdir() if (p / "index.mdx").exists())
    else:
        slugs = args.slugs
    if not slugs:
        ap.error("give slugs or --all")

    rc = 0
    for slug in slugs:
        try:
            print(process_slug(slug, dry_run=args.dry_run))
        except Exception as exc:  # noqa: BLE001
            print(f"ERROR {slug}: {exc}", file=sys.stderr)
            rc = 1
    return rc


if __name__ == "__main__":
    raise SystemExit(main())
