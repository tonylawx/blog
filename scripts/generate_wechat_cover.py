#!/usr/bin/env python3
"""Generate a deterministic high-resolution PNG cover without external packages."""

from __future__ import annotations

import argparse
import hashlib
import math
import random
import struct
import zlib
from pathlib import Path


Color = tuple[int, int, int]


def _clamp(value: int) -> int:
    return 0 if value < 0 else 255 if value > 255 else value


class Canvas:
    def __init__(self, width: int, height: int, seed: int) -> None:
        self.width = width
        self.height = height
        self.pixels = bytearray(width * height * 3)
        self.rng = random.Random(seed)
        self._paint_background(seed)

    def _paint_background(self, seed: int) -> None:
        width = self.width
        height = self.height
        pixels = self.pixels
        for y in range(height):
            vertical = y / max(1, height - 1)
            for x in range(width):
                horizontal = x / max(1, width - 1)
                dx = (horizontal - 0.72) / 0.58
                dy = (vertical - 0.38) / 0.78
                glow = max(0.0, 1.0 - math.sqrt(dx * dx + dy * dy))
                horizon = max(0.0, 1.0 - abs(vertical - 0.74) * 6.0)
                noise = ((x * 17 + y * 31 + seed) ^ (x * 7 + y * 13)) & 7
                index = (y * width + x) * 3
                pixels[index] = _clamp(int(3 + 7 * glow + 4 * horizon + noise // 4))
                pixels[index + 1] = _clamp(int(11 + 23 * glow + 10 * horizon + noise // 2))
                pixels[index + 2] = _clamp(int(25 + 55 * glow + 25 * horizon + noise))

    def blend(self, x: int, y: int, color: Color, alpha: int = 255) -> None:
        if x < 0 or y < 0 or x >= self.width or y >= self.height or alpha <= 0:
            return
        index = (y * self.width + x) * 3
        inverse = 255 - alpha
        self.pixels[index] = (self.pixels[index] * inverse + color[0] * alpha) // 255
        self.pixels[index + 1] = (self.pixels[index + 1] * inverse + color[1] * alpha) // 255
        self.pixels[index + 2] = (self.pixels[index + 2] * inverse + color[2] * alpha) // 255

    def rect(self, x0: int, y0: int, x1: int, y1: int, color: Color, alpha: int = 255) -> None:
        x0, x1 = sorted((max(0, x0), min(self.width, x1)))
        y0, y1 = sorted((max(0, y0), min(self.height, y1)))
        for y in range(y0, y1):
            for x in range(x0, x1):
                self.blend(x, y, color, alpha)

    def line(
        self,
        x0: int,
        y0: int,
        x1: int,
        y1: int,
        color: Color,
        alpha: int = 255,
        width: int = 1,
    ) -> None:
        dx = abs(x1 - x0)
        sx = 1 if x0 < x1 else -1
        dy = -abs(y1 - y0)
        sy = 1 if y0 < y1 else -1
        error = dx + dy
        radius = max(0, width // 2)
        while True:
            for oy in range(-radius, radius + 1):
                for ox in range(-radius, radius + 1):
                    if ox * ox + oy * oy <= radius * radius + 1:
                        self.blend(x0 + ox, y0 + oy, color, alpha)
            if x0 == x1 and y0 == y1:
                break
            twice = 2 * error
            if twice >= dy:
                error += dy
                x0 += sx
            if twice <= dx:
                error += dx
                y0 += sy

    def glow_line(self, x0: int, y0: int, x1: int, y1: int, color: Color, width: int = 3) -> None:
        self.line(x0, y0, x1, y1, color, 25, width + 16)
        self.line(x0, y0, x1, y1, color, 55, width + 8)
        self.line(x0, y0, x1, y1, color, 220, width)

    def ring(
        self,
        cx: int,
        cy: int,
        radius: int,
        color: Color,
        alpha: int = 255,
        width: int = 3,
        start: float = 0.0,
        end: float = math.tau,
    ) -> None:
        steps = max(72, int(radius * abs(end - start) / 3))
        previous = None
        for step in range(steps + 1):
            angle = start + (end - start) * step / steps
            point = (int(cx + math.cos(angle) * radius), int(cy + math.sin(angle) * radius))
            if previous is not None:
                self.line(previous[0], previous[1], point[0], point[1], color, alpha, width)
            previous = point

    def glow_ring(self, cx: int, cy: int, radius: int, color: Color, width: int = 5) -> None:
        self.ring(cx, cy, radius, color, 18, width + 20)
        self.ring(cx, cy, radius, color, 45, width + 10)
        self.ring(cx, cy, radius, color, 230, width)

    def add_grid(self) -> None:
        for x in range(40, self.width, 80):
            self.line(x, 50, x, self.height - 35, (35, 96, 142), 28, 1)
        for y in range(70, self.height, 70):
            self.line(30, y, self.width - 25, y, (35, 96, 142), 30, 1)

    def add_market_path(self) -> None:
        points: list[tuple[int, int]] = []
        x = int(self.width * 0.42)
        y = int(self.height * 0.64)
        while x < self.width - 70:
            y += self.rng.randint(-48, 25)
            y = max(int(self.height * 0.13), min(int(self.height * 0.7), y))
            points.append((x, y))
            x += self.rng.randint(42, 62)
        for first, second in zip(points, points[1:]):
            self.glow_line(first[0], first[1], second[0], second[1], (34, 231, 122), 3)

        for index, (x, center) in enumerate(points):
            bullish = index % 4 != 2
            color = (29, 235, 120) if bullish else (255, 67, 82)
            body_height = self.rng.randint(25, 62)
            wick = self.rng.randint(18, 45)
            top = center - body_height // 2
            bottom = center + body_height // 2
            self.line(x, top - wick, x, bottom + wick, color, 220, 2)
            self.rect(x - 9, top, x + 10, bottom, color, 235)

    def add_focal_rings(self) -> None:
        gold = (255, 196, 55)
        blue = (20, 166, 255)
        base_x = int(self.width * 0.23)
        base_y = int(self.height * 0.43)
        for offset, radius in ((0, 118), (118, 97), (215, 78)):
            self.glow_ring(base_x + offset, base_y, radius, gold, 8)
            self.glow_line(
                base_x + offset + radius // 2,
                base_y + radius // 2,
                base_x + offset + radius,
                base_y + radius,
                gold,
                7,
            )
        self.ring(base_x + 325, base_y - 92, 54, blue, 210, 5, math.pi * 0.2, math.pi * 1.8)

    def add_skyline(self) -> None:
        horizon = int(self.height * 0.77)
        x = 0
        while x < self.width:
            building_width = self.rng.randint(24, 58)
            building_height = self.rng.randint(35, 180)
            top = horizon - building_height
            shade = self.rng.randint(10, 24)
            self.rect(x, top, x + building_width, self.height, (4, 13 + shade // 2, 24 + shade), 230)
            for window_y in range(top + 12, horizon - 5, 18):
                for window_x in range(x + 8, x + building_width - 5, 13):
                    if self.rng.random() > 0.38:
                        color = (255, 184, 61) if self.rng.random() > 0.22 else (44, 168, 255)
                        self.rect(window_x, window_y, window_x + 4, window_y + 7, color, 155)
            x += building_width + self.rng.randint(3, 10)
        self.rect(0, horizon, self.width, self.height, (2, 8, 18), 120)
        for y in range(horizon, self.height, 14):
            self.line(0, y, self.width, y, (10, 78, 125), max(8, 42 - (y - horizon) // 4), 1)

    def add_particles(self) -> None:
        for _ in range(150):
            x = self.rng.randrange(20, self.width - 20)
            y = self.rng.randrange(20, int(self.height * 0.74))
            alpha = self.rng.randint(25, 100)
            color = (58, 180, 255) if self.rng.random() > 0.25 else (255, 196, 55)
            self.blend(x, y, color, alpha)
            if self.rng.random() > 0.83:
                self.blend(x + 1, y, color, alpha // 2)
                self.blend(x, y + 1, color, alpha // 2)

    def to_png(self) -> bytes:
        raw = bytearray()
        row_size = self.width * 3
        for y in range(self.height):
            raw.append(0)
            start = y * row_size
            raw.extend(self.pixels[start : start + row_size])

        def chunk(kind: bytes, data: bytes) -> bytes:
            return (
                struct.pack(">I", len(data))
                + kind
                + data
                + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)
            )

        header = struct.pack(">IIBBBBB", self.width, self.height, 8, 2, 0, 0, 0)
        return (
            b"\x89PNG\r\n\x1a\n"
            + chunk(b"IHDR", header)
            + chunk(b"IDAT", zlib.compress(bytes(raw), 9))
            + chunk(b"IEND", b"")
        )


def generate_cover(output: Path, *, title: str, width: int = 1280, height: int = 720) -> Path:
    if width < 900 or height < 500:
        raise ValueError("cover must be at least 900x500")
    seed = int.from_bytes(hashlib.sha256(title.encode("utf-8")).digest()[:8], "big")
    canvas = Canvas(width, height, seed)
    canvas.add_grid()
    canvas.add_particles()
    canvas.add_focal_rings()
    canvas.add_market_path()
    canvas.add_skyline()
    output = Path(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(canvas.to_png())
    return output


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--title", required=True)
    parser.add_argument("--width", type=int, default=1280)
    parser.add_argument("--height", type=int, default=720)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    output = generate_cover(args.output, title=args.title, width=args.width, height=args.height)
    print(f"generated high-resolution PNG cover: {args.width}x{args.height}, {output.stat().st_size} bytes")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
