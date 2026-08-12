#!/usr/bin/env python3
"""Run the WeChat draft publisher from the whitelisted droplet.

This wrapper keeps the public interface of scripts/wechat_draft.py, but executes
the actual WeChat API calls on root@167.71.219.62 so draft/add sees the
whitelisted outbound IP.

Cover thumbs can arrive as:
- ``--thumb-image PATH`` local file (existing)
- ``--thumb-image-url URL`` Image2/CDN URL fetched here, then SCP'd to the VPS
- ``--thumb-image-stdin`` raw PNG/JPEG bytes on stdin, then SCP'd to the VPS
- ``--articles-json PATH`` multi-article manifest (头条 first); each item may
  carry ``thumb_image`` / ``thumb_image_url``

The remote process always receives concrete local paths for HTML and thumbs.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shlex
import subprocess
import sys
import tempfile
import urllib.parse
import urllib.request
from pathlib import Path

try:
    from wechat_draft import materialize_thumb_image, strip_thumb_source_args
except ModuleNotFoundError:
    from scripts.wechat_draft import materialize_thumb_image, strip_thumb_source_args


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
    parser.add_argument("--html-file", type=Path)
    parser.add_argument("--articles-json", type=Path)
    parser.add_argument("--thumb-image", type=Path)
    parser.add_argument("--thumb-image-url")
    parser.add_argument("--thumb-image-stdin", action="store_true")
    parser.add_argument("--write-cleaned-html", type=Path)
    return parser.parse_known_args(argv)


def replace_arg_value(argv: list[str], option: str, value: str) -> list[str]:
    replaced = argv[:]
    if option not in replaced:
        return replaced + [option, value]
    index = replaced.index(option)
    if index + 1 >= len(replaced):
        raise SystemExit(f"Missing value for {option}")
    replaced[index + 1] = value
    return replaced


def remove_arg(argv: list[str], option: str) -> list[str]:
    cleaned: list[str] = []
    skip_next = False
    for arg in argv:
        if skip_next:
            skip_next = False
            continue
        if arg == option:
            skip_next = True
            continue
        if arg.startswith(f"{option}="):
            continue
        cleaned.append(arg)
    return cleaned


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


def stage_html_content_images(
    html_file: Path,
    remote_dir: str,
    *,
    start_index: int = 1,
    name_prefix: str = "content-image",
) -> tuple[Path, list[tuple[Path, str]], int]:
    html = html_file.read_text(encoding="utf-8")
    uploads: list[tuple[Path, str]] = []
    staged_paths: dict[Path, str] = {}
    next_index = start_index

    def replace_src(match: re.Match[str]) -> str:
        nonlocal next_index
        quote = match.group(1)
        src = match.group(2)
        image_path = local_src_to_path(src, html_file.parent)
        if image_path is None:
            return match.group(0)
        image_path = image_path.expanduser().resolve()
        if not image_path.exists():
            return match.group(0)
        if image_path not in staged_paths:
            remote_path = f"{remote_dir}/{name_prefix}-{next_index}{image_path.suffix or '.png'}"
            next_index += 1
            staged_paths[image_path] = remote_path
            uploads.append((image_path, remote_path))
        return f"src={quote}{staged_paths[image_path]}{quote}"

    staged_html = re.sub(r'src=(["\'])(.*?)\1', replace_src, html, flags=re.IGNORECASE)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", suffix=".html", delete=False) as handle:
        handle.write(staged_html)
        staged_file = Path(handle.name)
    return staged_file, uploads, next_index


def stage_articles_json(
    articles_json: Path,
    remote_dir: str,
) -> tuple[Path, list[tuple[Path, str]], list[Path]]:
    """Rewrite articles manifest paths for the droplet and stage files.

    Returns (local_rewritten_json, uploads, temp_files_to_delete).
    """
    raw = json.loads(articles_json.read_text(encoding="utf-8"))
    if not isinstance(raw, list) or not raw:
        raise SystemExit(f"--articles-json must be a non-empty JSON array: {articles_json}")

    uploads: list[tuple[Path, str]] = []
    temps: list[Path] = []
    remote_articles: list[dict] = []
    content_index = 1

    for index, item in enumerate(raw):
        if not isinstance(item, dict):
            raise SystemExit(f"articles[{index}] must be an object")
        html_file = Path(item["html_file"]).expanduser()
        if not html_file.is_absolute():
            html_file = (articles_json.parent / html_file).resolve()
        else:
            html_file = html_file.resolve()
        if not html_file.exists():
            raise SystemExit(f"HTML file not found: {html_file}")

        staged_html, content_uploads, content_index = stage_html_content_images(
            html_file,
            remote_dir,
            start_index=content_index,
            name_prefix=f"a{index}-content",
        )
        temps.append(staged_html)
        remote_html = f"{remote_dir}/article-{index}.html"
        uploads.append((staged_html, remote_html))
        uploads.extend(content_uploads)

        remote_item = {
            "title": item.get("title"),
            "author": item.get("author") or "AI 美股分析师",
            "digest": item.get("digest") or "",
            "html_file": remote_html,
            "content_source_url": item.get("content_source_url") or "",
            "need_open_comment": int(item.get("need_open_comment", 1)),
            "only_fans_can_comment": int(item.get("only_fans_can_comment", 0)),
        }
        if item.get("thumb_media_id"):
            remote_item["thumb_media_id"] = item["thumb_media_id"]
        else:
            thumb_arg = None
            if item.get("thumb_image"):
                thumb_arg = Path(item["thumb_image"]).expanduser()
                if not thumb_arg.is_absolute():
                    thumb_arg = (articles_json.parent / thumb_arg).resolve()
            thumb_path, thumb_temp = materialize_thumb_image(
                thumb_image=thumb_arg,
                thumb_image_url=item.get("thumb_image_url"),
                thumb_image_stdin=False,
            )
            if thumb_temp is not None:
                temps.append(thumb_temp)
            if thumb_path is not None:
                suffix = thumb_path.suffix or ".png"
                remote_thumb = f"{remote_dir}/thumb-{index}{suffix}"
                uploads.append((thumb_path, remote_thumb))
                remote_item["thumb_image"] = remote_thumb
        remote_articles.append(remote_item)

    with tempfile.NamedTemporaryFile("w", encoding="utf-8", suffix=".json", delete=False) as handle:
        json.dump(remote_articles, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
        staged_json = Path(handle.name)
    temps.append(staged_json)
    return staged_json, uploads, temps


def main(argv: list[str] | None = None) -> None:
    argv = list(sys.argv[1:] if argv is None else argv)
    paths, _ = parse_known_paths(argv)
    if not LOCAL_SCRIPT.exists():
        raise SystemExit(f"Local publisher script not found: {LOCAL_SCRIPT}")

    remote = os.environ.get("WECHAT_DRAFT_PROXY_HOST", DEFAULT_REMOTE)
    appid, secret = load_wechat_env()
    remote_dir = f"/tmp/wechat-draft-{next(tempfile._get_candidate_names())}"
    thumb_temps: list[Path] = []
    staged_temps: list[Path] = []

    try:
        run(["ssh", remote, "mkdir", "-p", remote_dir])
        scp_upload(LOCAL_SCRIPT, f"{remote}:{remote_dir}/{REMOTE_SCRIPT_NAME}")

        if paths.articles_json is not None:
            if not paths.articles_json.exists():
                raise SystemExit(f"Articles JSON not found: {paths.articles_json}")
            staged_json, uploads, temps = stage_articles_json(paths.articles_json, remote_dir)
            staged_temps.extend(temps)
            remote_json = f"{remote_dir}/articles.json"
            scp_upload(staged_json, f"{remote}:{remote_json}")
            for local_path, remote_path in uploads:
                if local_path == staged_json:
                    continue
                # staged html temps are in uploads as (temp_html, remote_html)
                scp_upload(local_path, f"{remote}:{remote_path}")

            remote_args = strip_thumb_source_args(argv)
            remote_args = remove_arg(remote_args, "--html-file")
            remote_args = remove_arg(remote_args, "--title")
            remote_args = remove_arg(remote_args, "--author")
            remote_args = remove_arg(remote_args, "--digest")
            remote_args = remove_arg(remote_args, "--thumb-image")
            remote_args = replace_arg_value(remote_args, "--articles-json", remote_json)

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
            return

        if paths.html_file is None or not paths.html_file.exists():
            raise SystemExit(f"HTML file not found: {paths.html_file}")

        thumb_path, thumb_temp = materialize_thumb_image(
            thumb_image=paths.thumb_image,
            thumb_image_url=paths.thumb_image_url,
            thumb_image_stdin=paths.thumb_image_stdin,
        )
        if thumb_temp is not None:
            thumb_temps.append(thumb_temp)

        staged_html, content_images, _ = stage_html_content_images(paths.html_file, remote_dir)
        staged_temps.append(staged_html)
        scp_upload(staged_html, f"{remote}:{remote_dir}/article.html")
        for local_image, remote_image in content_images:
            scp_upload(local_image, f"{remote}:{remote_image}")

        remote_args = strip_thumb_source_args(argv)
        remote_args = replace_arg_value(remote_args, "--html-file", f"{remote_dir}/article.html")
        if thumb_path is not None:
            suffix = thumb_path.suffix or ".png"
            remote_thumb = f"{remote_dir}/thumb{suffix}"
            scp_upload(thumb_path, f"{remote}:{remote_thumb}")
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
    finally:
        for path in thumb_temps + staged_temps:
            path.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
