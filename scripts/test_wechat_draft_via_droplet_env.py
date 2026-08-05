#!/usr/bin/env python3
"""Unit tests for WeChat credential loading without requiring zsh."""

from __future__ import annotations

import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import wechat_draft_via_droplet as droplet


class WechatDraftViaDropletEnvTest(unittest.TestCase):
    def test_prefers_process_environment(self) -> None:
        with patch.dict(
            os.environ,
            {"WECHAT_APPID": "app-from-env", "WECHAT_APPSECRET": "secret-from-env"},
            clear=False,
        ):
            appid, secret = droplet.load_wechat_env()
        self.assertEqual(appid, "app-from-env")
        self.assertEqual(secret, "secret-from-env")

    def test_reads_wechat_env_file_without_shell(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            env_path = Path(tmp) / "wechat.env"
            env_path.write_text(
                'export WECHAT_APPID="app-from-file"\n'
                "WECHAT_APPSECRET='secret-from-file'\n",
                encoding="utf-8",
            )
            with patch.dict(
                os.environ,
                {"WECHAT_APPID": "", "WECHAT_APPSECRET": "", "WECHAT_ENV_FILE": str(env_path)},
                clear=False,
            ):
                with patch.object(droplet, "_credentials_from_login_shell", return_value=None):
                    appid, secret = droplet.load_wechat_env()
        self.assertEqual(appid, "app-from-file")
        self.assertEqual(secret, "secret-from-file")

    def test_login_shell_fallback_uses_bash_not_hardcoded_zsh(self) -> None:
        calls: list[list[str]] = []

        def fake_run(command, *, capture=False):  # noqa: ANN001
            calls.append(command)
            class Result:
                stdout = "app-from-bash\nsecret-from-bash\n"
            return Result()

        with patch.dict(os.environ, {"WECHAT_APPID": "", "WECHAT_APPSECRET": ""}, clear=False):
            with patch.object(droplet, "_credentials_from_env_files", return_value=None):
                with patch.object(droplet, "run", side_effect=fake_run):
                    with patch.object(droplet.shutil, "which", side_effect=lambda name: f"/bin/{name}" if name in {"bash", "sh", "zsh"} else None):
                        appid, secret = droplet.load_wechat_env()

        self.assertEqual(appid, "app-from-bash")
        self.assertEqual(secret, "secret-from-bash")
        self.assertTrue(calls)
        self.assertEqual(calls[0][0], "/bin/bash")
        self.assertNotEqual(calls[0][0], "/bin/zsh")


if __name__ == "__main__":
    unittest.main()
