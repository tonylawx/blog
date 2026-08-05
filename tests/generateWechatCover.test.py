from __future__ import annotations

import hashlib
import importlib.util
import struct
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "generate_wechat_cover.py"


def load_module():
    spec = importlib.util.spec_from_file_location("generate_wechat_cover", SCRIPT)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load {SCRIPT}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def png_dimensions(path: Path) -> tuple[int, int]:
    data = path.read_bytes()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise AssertionError("not a PNG")
    return struct.unpack(">II", data[16:24])


class GenerateWechatCoverTests(unittest.TestCase):
    def test_generates_deterministic_high_resolution_png(self):
        module = load_module()
        with tempfile.TemporaryDirectory() as temp_dir:
            first = Path(temp_dir) / "first.png"
            second = Path(temp_dir) / "second.png"

            module.generate_cover(first, title="SPX新高之后，真正的门槛在QQQ", width=1280, height=720)
            module.generate_cover(second, title="SPX新高之后，真正的门槛在QQQ", width=1280, height=720)

            self.assertEqual(png_dimensions(first), (1280, 720))
            self.assertGreater(first.stat().st_size, 50_000)
            self.assertEqual(
                hashlib.sha256(first.read_bytes()).digest(),
                hashlib.sha256(second.read_bytes()).digest(),
            )


if __name__ == "__main__":
    unittest.main()
