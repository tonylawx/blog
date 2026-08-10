#!/usr/bin/env python3
"""Generate static/img/og.png (1200x630) and static/img/avatar.png from the
profile avatar. Used as the site-wide Open Graph / Twitter card image via
themeConfig.image in docusaurus.config.ts.

Usage:
  python3 scripts/generate-og.py [/path/to/avatar.jpg]
If no path is given, downloads https://github.com/tonylawx.png.
Requires: Pillow (`pip install Pillow`).
"""

from __future__ import annotations

import random
import sys
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT_OG = ROOT / "static" / "img" / "og.png"
OUT_AVATAR = ROOT / "static" / "img" / "avatar.png"
GITHUB_AVATAR = "https://avatars.githubusercontent.com/u/20318651?s=460&v=4"

W, H = 1200, 630
BG_TOP = (10, 16, 36)
BG_BOT = (22, 36, 72)
ACCENT = (96, 165, 250)
TEXT = (248, 250, 252)
MUTED = (186, 198, 216)
SUBTLE = (120, 140, 170)

FONT_BOLD = "/usr/share/fonts/truetype/macos/Inter-Bold.ttf"
FONT_SEMI = "/usr/share/fonts/truetype/macos/Inter-SemiBold.ttf"
FONT_MED = "/usr/share/fonts/truetype/macos/Inter-Medium.ttf"
FONT_REG = "/usr/share/fonts/truetype/macos/Inter-Regular.ttf"


def load_font(path: str, size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.load_default()


def gradient(size: tuple[int, int], c1: tuple[int, int, int], c2: tuple[int, int, int]) -> Image.Image:
    w, h = size
    base = Image.new("RGB", size, c1)
    top = Image.new("RGB", size, c2)
    mask = Image.linear_gradient("L").resize(size)
    return Image.composite(top, base, mask)


def load_source(path: Path | None) -> Image.Image:
    if path is not None:
        return Image.open(path).convert("RGBA")
    dest = Path("/tmp/tonylaw-avatar.jpg")
    urllib.request.urlretrieve(GITHUB_AVATAR, dest)
    return Image.open(dest).convert("RGBA")


def square_crop(img: Image.Image, size: int) -> Image.Image:
    side = min(img.size)
    left = (img.width - side) // 2
    top = (img.height - side) // 2
    return img.crop((left, top, left + side, top + side)).resize(
        (size, size), Image.Resampling.LANCZOS
    )


def main() -> None:
    src_path = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    src = load_source(src_path)

    # Local author avatar (authors.yml → /img/avatar.png)
    square_crop(src, 512).convert("RGB").save(OUT_AVATAR, "PNG", optimize=True)

    canvas = gradient((W, H), BG_TOP, BG_BOT).convert("RGBA")

    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    cx, cy = 280, H // 2
    for r, a in [(260, 40), (200, 55), (140, 70)]:
        gdraw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(59, 130, 246, a))
    canvas = Image.alpha_composite(canvas, glow)

    avatar = square_crop(src, 360)
    mask = Image.new("L", (360, 360), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, 360, 360), fill=255)
    avatar_c = Image.new("RGBA", (360, 360), (0, 0, 0, 0))
    avatar_c.paste(avatar, (0, 0), mask)

    ring = Image.new("RGBA", (380, 380), (0, 0, 0, 0))
    rd = ImageDraw.Draw(ring)
    rd.ellipse((0, 0, 379, 379), outline=(96, 165, 250, 180), width=4)
    rd.ellipse((6, 6, 373, 373), outline=(255, 255, 255, 40), width=2)

    ax, ay = cx - 190, cy - 190
    canvas.paste(ring, (ax, ay), ring)
    canvas.paste(avatar_c, (ax + 10, ay + 10), avatar_c)

    draw = ImageDraw.Draw(canvas)
    font_name = load_font(FONT_BOLD, 72)
    font_tag = load_font(FONT_SEMI, 34)
    font_bio = load_font(FONT_REG, 26)
    font_url = load_font(FONT_MED, 24)

    tx, ty = 540, 155
    draw.text((tx, ty), "PERSONAL SITE", font=font_url, fill=ACCENT)
    ty += 48
    draw.text((tx, ty), "Tony Law", font=font_name, fill=TEXT)
    ty += 90
    draw.text((tx, ty), "Software engineer & options trader", font=font_tag, fill=MUTED)
    ty += 58
    for line in (
        "Fintech builder · US equity & options notes",
        "Full-stack · payments · AI-assisted finance",
    ):
        draw.text((tx, ty), line, font=font_bio, fill=SUBTLE)
        ty += 38
    ty += 28
    draw.rounded_rectangle([tx, ty, tx + 48, ty + 4], radius=2, fill=ACCENT)
    ty += 28
    draw.text((tx, ty), "tonylaw.cc", font=font_url, fill=MUTED)

    star_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(star_layer)
    rnd = random.Random(42)
    for _ in range(60):
        x = rnd.randint(0, W - 1)
        y = rnd.randint(0, H - 1)
        r = rnd.choice([1, 1, 1, 2])
        a = rnd.randint(40, 160)
        sd.ellipse([x, y, x + r, y + r], fill=(255, 255, 255, a))
    canvas = Image.alpha_composite(canvas, star_layer)

    canvas.convert("RGB").save(OUT_OG, "PNG", optimize=True)
    print(f"wrote {OUT_OG.relative_to(ROOT)} ({W}x{H})")
    print(f"wrote {OUT_AVATAR.relative_to(ROOT)} (512x512)")


if __name__ == "__main__":
    main()
