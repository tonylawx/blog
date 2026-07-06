#!/usr/bin/env python3
"""Run the WeChat draft publisher from the whitelisted droplet.

This wrapper keeps the public interface of scripts/wechat_draft.py, but executes
the actual WeChat API calls on root@167.71.219.62 so draft/add sees the
whitelisted outbound IP.
"""

from __future__ import annotations

import argparse
import os
import re
import shlex
import subprocess
import sys
import tempfile
import urllib.parse
import urllib.request
from pathlib import Path


DEFAULT_REMOTE = "root@167.71.219.62"
REMOTE_SCRIPT_NAME = "wechat_draft.py"
LOCAL_SCRIPT = Path(__file__).with_name(REMOTE_SCRIPT_NAME)


def run(command: list[str], *, capture: bool = False) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        command,
        check=True,
        text=True,
        stdout=subprocess.PIPE if capture else None,
        stderr=subprocess.PIPE if capture else None,
    )


def scp_upload(local_path: Path, remote_path: str) -> None:
    # The droplet does not reliably support OpenSSH's default SFTP-backed scp.
    run(["scp", "-O", str(local_path), remote_path])


def load_wechat_env() -> tuple[str, str]:
    appid = os.environ.get("WECHAT_APPID", "")
    secret = os.environ.get("WECHAT_APPSECRET", "")
    if appid and secret:
        return appid, secret

    command = (
        "source ~/.zshrc >/dev/null 2>&1; "
        "python3 - <<'PY'\n"
        "import os\n"
        "print(os.environ.get('WECHAT_APPID', ''))\n"
        "print(os.environ.get('WECHAT_APPSECRET', ''))\n"
        "PY"
    )
    result = run(["zsh", "-lc", command], capture=True)
    lines = result.stdout.splitlines()
    if len(lines) >= 2 and lines[0] and lines[1]:
        return lines[0], lines[1]
    raise SystemExit("WECHAT_APPID and WECHAT_APPSECRET are required.")


def parse_known_paths(argv: list[str]) -> tuple[argparse.Namespace, list[str]]:
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument("--html-file", type=Path, required=True)
    parser.add_argument("--thumb-image", type=Path)
    parser.add_argument("--write-cleaned-html", type=Path)
    return parser.parse_known_args(argv)


def replace_arg_value(argv: list[str], option: str, value: str) -> list[str]:
    replaced = argv[:]
    if option not in replaced:
        return replaced
    index = replaced.index(option)
    if index + 1 >= len(replaced):
        raise SystemExit(f"Missing value for {option}")
    replaced[index + 1] = value
    return replaced


def local_src_to_path(src: str, base_dir: Path) -> Path | None:
    parsed = urllib.parse.urlparse(src)
    if parsed.scheme == "file":
        return Path(urllib.request.url2pathname(parsed.path))
    if parsed.scheme:
        return None
    path = Path(src)
    if path.is_absolute():
        return path
    return base_dir / path


def stage_html_content_images(html_file: Path, remote_dir: str) -> tuple[Path, list[tuple[Path, str]]]:
    html = html_file.read_text(encoding="utf-8")
    uploads: list[tuple[Path, str]] = []
    staged_paths: dict[Path, str] = {}

    def replace_src(match: re.Match[str]) -> str:
        quote = match.group(1)
        src = match.group(2)
        image_path = local_src_to_path(src, html_file.parent)
        if image_path is None:
            return match.group(0)
        image_path = image_path.expanduser().resolve()
        if not image_path.exists():
            return match.group(0)
        if image_path not in staged_paths:
            remote_path = f"{remote_dir}/content-image-{len(staged_paths) + 1}{image_path.suffix or '.png'}"
            staged_paths[image_path] = remote_path
            uploads.append((image_path, remote_path))
        return f"src={quote}{staged_paths[image_path]}{quote}"

    staged_html = re.sub(r'src=(["\'])(.*?)\1', replace_src, html, flags=re.IGNORECASE)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", suffix=".html", delete=False) as handle:
        handle.write(staged_html)
        staged_file = Path(handle.name)
    return staged_file, uploads


def main() -> None:
    paths, _ = parse_known_paths(sys.argv[1:])
    if not LOCAL_SCRIPT.exists():
        raise SystemExit(f"Local publisher script not found: {LOCAL_SCRIPT}")
    if not paths.html_file.exists():
        raise SystemExit(f"HTML file not found: {paths.html_file}")
    if paths.thumb_image and not paths.thumb_image.exists():
        raise SystemExit(f"Thumb image not found: {paths.thumb_image}")

    remote = os.environ.get("WECHAT_DRAFT_PROXY_HOST", DEFAULT_REMOTE)
    appid, secret = load_wechat_env()

    remote_dir = f"/tmp/wechat-draft-{next(tempfile._get_candidate_names())}"
    run(["ssh", remote, "mkdir", "-p", remote_dir])
    scp_upload(LOCAL_SCRIPT, f"{remote}:{remote_dir}/{REMOTE_SCRIPT_NAME}")
    staged_html, content_images = stage_html_content_images(paths.html_file, remote_dir)
    scp_upload(staged_html, f"{remote}:{remote_dir}/article.html")
    staged_html.unlink(missing_ok=True)
    for local_image, remote_image in content_images:
        scp_upload(local_image, f"{remote}:{remote_image}")

    remote_args = sys.argv[1:]
    remote_args = replace_arg_value(remote_args, "--html-file", f"{remote_dir}/article.html")
    if paths.thumb_image:
        suffix = paths.thumb_image.suffix or ".png"
        remote_thumb = f"{remote_dir}/thumb{suffix}"
        scp_upload(paths.thumb_image, f"{remote}:{remote_thumb}")
        remote_args = replace_arg_value(remote_args, "--thumb-image", remote_thumb)

    remote_cleaned = None
    if paths.write_cleaned_html:
        remote_cleaned = f"{remote_dir}/article.draft-add.html"
        remote_args = replace_arg_value(remote_args, "--write-cleaned-html", remote_cleaned)

    quoted_args = " ".join(shlex.quote(arg) for arg in remote_args)
    command = (
        f"WECHAT_APPID={shlex.quote(appid)} "
        f"WECHAT_APPSECRET={shlex.quote(secret)} "
        f"python3 {shlex.quote(remote_dir + '/' + REMOTE_SCRIPT_NAME)} {quoted_args}"
    )
    run(["ssh", remote, command])

    if remote_cleaned and paths.write_cleaned_html:
        run(["scp", "-O", f"{remote}:{remote_cleaned}", str(paths.write_cleaned_html)])


if __name__ == "__main__":
    main()
