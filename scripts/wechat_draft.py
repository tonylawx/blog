#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import mimetypes
import os
import re
import socket
import ssl
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path


TOKEN_URL = "https://api.weixin.qq.com/cgi-bin/stable_token"
DRAFT_ADD_URL = "https://api.weixin.qq.com/cgi-bin/draft/add"
MEDIA_UPLOAD_URL = "https://api.weixin.qq.com/cgi-bin/material/add_material"
CONTENT_IMAGE_UPLOAD_URL = "https://api.weixin.qq.com/cgi-bin/media/uploadimg"
ARTICLE_BLUE = "#2763e9"
ARTICLE_EN_TO_ZH_LABELS = {
    "SUMMARY": "摘要",
    "FOCUS": "焦点",
    "SEMIS": "半导体",
    "RISK": "风险",
    "SETUP": "策略",
    "MOMENTUM": "动量",
    "SOFTWARE": "软件",
    "MARKET": "市场",
    "STRUCTURE": "结构",
    "CAPEX": "资本开支",
    "COMPUTE": "算力",
    "HARDWARE": "硬件",
    "LIQUIDITY": "流动性",
    "INDEX": "指数",
    "STOCKS": "个股",
    "TECH": "科技",
    "MACRO": "宏观",
    "FED": "美联储",
    "EARNINGS": "财报",
    "OPTIONS": "期权",
    "TRADE": "交易",
    "WATCH": "观察",
    "MARKET READ": "市场判断",
    "RISK WATCH": "风险提示",
}
ARTICLE_ZH_TO_EN_LABELS = {value: key for key, value in ARTICLE_EN_TO_ZH_LABELS.items()}


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Create a WeChat Official Account draft from a local HTML file."
    )
    parser.add_argument("--title", required=True, help="Draft title.")
    parser.add_argument("--html-file", type=Path, required=True, help="Path to the rendered HTML file.")
    parser.add_argument("--author", default="AI 美股分析师", help="WeChat article author name.")
    parser.add_argument("--digest", default="", help="Optional digest/summary.")
    parser.add_argument("--thumb-media-id", default=None, help="Optional cover thumbnail media id.")
    parser.add_argument("--thumb-image", type=Path, default=None, help="Optional local cover image to upload.")
    parser.add_argument(
        "--thumb-image-url",
        default=None,
        help="Downloadable cover image URL (e.g. Image2/CDN). Fetched locally then uploaded as thumb.",
    )
    parser.add_argument(
        "--thumb-image-stdin",
        action="store_true",
        help="Read raw cover image bytes from stdin and upload as thumb (no DevSpace/GitHub land).",
    )
    parser.add_argument("--content-source-url", default="", help="Optional source URL shown in WeChat.")
    parser.add_argument(
        "--sanitize-for-draft-add",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Clean editor-oriented HTML into a more stable draft/add-friendly shape before upload.",
    )
    parser.add_argument(
        "--write-cleaned-html",
        type=Path,
        default=None,
        help="Optional output path to write the cleaned HTML used for draft/add.",
    )
    parser.add_argument("--appid", default=os.environ.get("WECHAT_APPID"), help="WeChat AppID.")
    parser.add_argument(
        "--app-secret",
        default=os.environ.get("WECHAT_APPSECRET"),
        help="WeChat AppSecret.",
    )
    return parser.parse_args(argv)


def _detect_image_suffix(data: bytes, fallback: str = ".png") -> str:
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png"
    if data.startswith(b"\xff\xd8\xff"):
        return ".jpg"
    if data.startswith((b"GIF87a", b"GIF89a")):
        return ".gif"
    if data.startswith(b"BM"):
        return ".bmp"
    if data.startswith(b"RIFF") and len(data) >= 12 and data[8:12] == b"WEBP":
        return ".webp"
    return fallback


def _suffix_from_url(url: str) -> str:
    path = urllib.parse.urlparse(url).path
    suffix = Path(path).suffix.lower()
    if suffix == ".jpeg":
        return ".jpg"
    if suffix in {".png", ".jpg", ".gif", ".bmp", ".webp"}:
        return suffix
    return ".png"


_GITHUB_FETCH_HOSTS = frozenset({"raw.githubusercontent.com", "github.com", "api.github.com"})


def _github_token_from_env() -> str:
    return (os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN") or "").strip()


def _thumb_fetch_headers(url: str) -> dict[str, str]:
    headers = {"User-Agent": "us-stock-analyst-wechat-thumb/1.0"}
    host = urllib.parse.urlparse(url).hostname or ""
    token = _github_token_from_env()
    if token and host in _GITHUB_FETCH_HOSTS:
        headers["Authorization"] = f"Bearer {token}"
        headers["Accept"] = "application/vnd.github.raw"
    return headers


def fetch_thumb_image_url(url: str, *, timeout: int = 120) -> bytes:
    request = urllib.request.Request(
        url,
        headers=_thumb_fetch_headers(url),
        method="GET",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            data = response.read()
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise SystemExit(f"Thumb image URL HTTP {exc.code}: {body}") from exc
    except urllib.error.URLError as exc:
        raise SystemExit(f"Failed to fetch thumb image URL: {exc}") from exc
    if not data:
        raise SystemExit("Thumb image URL returned empty body")
    return data


def count_thumb_sources(
    *,
    thumb_image: Path | None,
    thumb_image_url: str | None,
    thumb_image_stdin: bool,
    thumb_media_id: str | None = None,
) -> int:
    return sum(
        [
            bool(thumb_image),
            bool(thumb_image_url),
            bool(thumb_image_stdin),
            bool(thumb_media_id),
        ]
    )


def materialize_thumb_image(
    *,
    thumb_image: Path | None = None,
    thumb_image_url: str | None = None,
    thumb_image_stdin: bool = False,
) -> tuple[Path | None, Path | None]:
    """Resolve thumb bytes to a local path.

    Returns ``(path, temp_path)``. ``temp_path`` is set when this function created
    a temporary file that the caller should delete after upload/SCP.
    """
    sources = count_thumb_sources(
        thumb_image=thumb_image,
        thumb_image_url=thumb_image_url,
        thumb_image_stdin=thumb_image_stdin,
    )
    if sources > 1:
        raise SystemExit(
            "Provide at most one of --thumb-image, --thumb-image-url, --thumb-image-stdin"
        )
    if thumb_image is not None:
        path = thumb_image.expanduser()
        if not path.exists():
            raise SystemExit(f"Thumb image not found: {path}")
        return path, None
    if not thumb_image_url and not thumb_image_stdin:
        return None, None

    if thumb_image_stdin:
        data = sys.stdin.buffer.read()
        if not data:
            raise SystemExit("stdin was empty; expected raw cover image bytes")
        suffix = _detect_image_suffix(data)
    else:
        assert thumb_image_url is not None
        data = fetch_thumb_image_url(thumb_image_url)
        suffix = _detect_image_suffix(data, fallback=_suffix_from_url(thumb_image_url))

    handle = tempfile.NamedTemporaryFile(prefix="wechat-thumb-", suffix=suffix, delete=False)
    temp_path = Path(handle.name)
    try:
        handle.write(data)
    finally:
        handle.close()
    return temp_path, temp_path


def strip_thumb_source_args(argv: list[str]) -> list[str]:
    """Remove local-only thumb source flags before forwarding to the remote script."""
    cleaned: list[str] = []
    skip_next = False
    for arg in argv:
        if skip_next:
            skip_next = False
            continue
        if arg in {"--thumb-image-url", "--thumb-image"}:
            skip_next = True
            continue
        if arg == "--thumb-image-stdin" or arg.startswith("--thumb-image-url=") or arg.startswith(
            "--thumb-image="
        ):
            continue
        cleaned.append(arg)
    return cleaned


def post_json(url: str, payload: dict) -> dict:
    ssl_context = build_ssl_context()
    request = urllib.request.Request(
        url,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=30, context=ssl_context) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise SystemExit(f"HTTP error from WeChat API: {exc.code} {body}") from exc
    except urllib.error.URLError as exc:
        raise SystemExit(f"Failed to reach WeChat API: {exc}") from exc


def post_multipart(url: str, field_name: str, file_path: Path) -> dict:
    boundary = "----CodexWeChatBoundary7MA4YWxkTrZu0gW"
    mime_type = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
    file_bytes = file_path.read_bytes()
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="{field_name}"; filename="{file_path.name}"\r\n'
        f"Content-Type: {mime_type}\r\n\r\n"
    ).encode("utf-8") + file_bytes + f"\r\n--{boundary}--\r\n".encode("utf-8")

    ssl_context = build_ssl_context()
    request = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=60, context=ssl_context) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise SystemExit(f"HTTP error from WeChat API: {exc.code} {body}") from exc
    except urllib.error.URLError as exc:
        raise SystemExit(f"Failed to reach WeChat API: {exc}") from exc


def build_ssl_context() -> ssl.SSLContext:
    context = ssl.create_default_context()
    try:
        import certifi

        return ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        return context


def configure_wechat_proxy() -> None:
    """Route WeChat API calls through an optional SOCKS proxy.

    urllib handles HTTP(S)_PROXY environment variables itself, but it does not
    understand socks5/socks5h URLs.  The RhinoFinance workflow uses an SSH
    dynamic forward for the WeChat draft step, exposed as RHF_WECHAT_PROXY.
    """
    proxy_url = (
        os.environ.get("RHF_WECHAT_PROXY")
        or os.environ.get("ALL_PROXY")
        or os.environ.get("all_proxy")
        or ""
    ).strip()
    if not proxy_url:
        return
    parsed = urllib.parse.urlparse(proxy_url)
    if parsed.scheme not in {"socks5", "socks5h"}:
        return
    if not parsed.hostname or not parsed.port:
        raise SystemExit(f"Invalid SOCKS proxy URL: {proxy_url}")
    try:
        import socks
    except ImportError as exc:
        raise SystemExit("PySocks is required for socks5 RHF_WECHAT_PROXY") from exc

    username = urllib.parse.unquote(parsed.username) if parsed.username else None
    password = urllib.parse.unquote(parsed.password) if parsed.password else None
    proxy_type = socks.SOCKS5
    proxy_host = parsed.hostname
    proxy_port = parsed.port
    proxy_rdns = parsed.scheme == "socks5h"

    def socks_create_connection(address, timeout=None, source_address=None):
        sock = socks.socksocket()
        sock.set_proxy(
            proxy_type,
            proxy_host,
            proxy_port,
            rdns=proxy_rdns,
            username=username,
            password=password,
        )
        if timeout is not None:
            sock.settimeout(timeout)
        if source_address:
            sock.bind(source_address)
        sock.connect(address)
        return sock

    socket.create_connection = socks_create_connection
    # macOS system proxy settings can make urllib try to reach the local Clash
    # HTTP proxy through the SOCKS tunnel.  Disable urllib's ProxyHandler here;
    # the socket create_connection wrapper is the proxy layer for this process.
    urllib.request.install_opener(urllib.request.build_opener(urllib.request.ProxyHandler({})))


def get_access_token(appid: str, app_secret: str) -> str:
    response = post_json(
        TOKEN_URL,
        {
            "grant_type": "client_credential",
            "appid": appid,
            "secret": app_secret,
            "force_refresh": False,
        },
    )
    if "access_token" not in response:
        raise SystemExit(f"Failed to get access token: {json.dumps(response, ensure_ascii=False)}")
    return response["access_token"]


def upload_thumb_image(access_token: str, thumb_image: Path) -> dict:
    if not thumb_image.exists():
        raise SystemExit(f"Thumb image not found: {thumb_image}")
    url = (
        f"{MEDIA_UPLOAD_URL}?"
        f"{urllib.parse.urlencode({'access_token': access_token, 'type': 'thumb'})}"
    )
    response = post_multipart(url, "media", thumb_image)
    if response.get("errcode", 0) != 0:
        raise SystemExit(f"Failed to upload thumb image: {json.dumps(response, ensure_ascii=False)}")
    return response


def upload_content_image(access_token: str, image_path: Path) -> dict:
    if not image_path.exists():
        raise SystemExit(f"Content image not found: {image_path}")
    url = f"{CONTENT_IMAGE_UPLOAD_URL}?{urllib.parse.urlencode({'access_token': access_token})}"
    response = post_multipart(url, "media", image_path)
    if response.get("errcode", 0) != 0:
        raise SystemExit(f"Failed to upload content image: {json.dumps(response, ensure_ascii=False)}")
    if not response.get("url"):
        raise SystemExit(f"WeChat content image upload returned no url: {json.dumps(response, ensure_ascii=False)}")
    return response


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


def upload_local_content_images(html: str, access_token: str, base_dir: Path) -> tuple[str, list[dict]]:
    uploads: list[dict] = []
    cache: dict[Path, str] = {}

    def replace_src(match: re.Match[str]) -> str:
        quote = match.group(1)
        src = match.group(2)
        image_path = local_src_to_path(src, base_dir)
        if image_path is None:
            return match.group(0)
        image_path = image_path.expanduser().resolve()
        if image_path not in cache:
            upload = upload_content_image(access_token, image_path)
            cache[image_path] = upload["url"]
            uploads.append({"path": str(image_path), "url": upload["url"]})
        return f'src={quote}{cache[image_path]}{quote}'

    html = re.sub(r'src=(["\'])(.*?)\1', replace_src, html, flags=re.IGNORECASE)
    return html, uploads


def strip_attrs(html: str) -> str:
    html = re.sub(r'\s+leaf="[^"]*"', "", html)
    html = re.sub(r"\s+leaf='[^']*'", "", html)
    html = re.sub(r'\s+data-[a-zA-Z0-9_-]+="[^"]*"', "", html)
    html = re.sub(r"\s+data-[a-zA-Z0-9_-]+='[^']*'", "", html)
    html = re.sub(r'\s+mpa-font-style="[^"]*"', "", html)
    html = re.sub(r"\s+mpa-font-style='[^']*'", "", html)
    return html


def normalize_styles(style_text: str) -> str:
    entries: list[tuple[str, str]] = []
    seen: set[str] = set()
    raw_entries = [part.strip() for part in style_text.split(";") if part.strip()]
    for raw_entry in raw_entries:
        if ":" not in raw_entry:
            continue
        key, value = raw_entry.split(":", 1)
        key = key.strip().lower()
        value = value.strip()
        normalized_value = re.sub(r"\s*!important\s*$", "", value, flags=re.IGNORECASE).strip().lower()
        if key == "text-align" and normalized_value == "justify":
            value = "left !important"
        elif key == "text-align" and normalized_value == "left":
            value = "left !important"
        if key == "max-width":
            continue
        if key == "margin" and value == "0 auto":
            value = "0"
        if key == "text-indent":
            value = "0"
        if key in {"padding-left", "margin-left"} and value in {"auto", "inherit"}:
            value = "0"
        if key == "letter-spacing" and value.endswith("px"):
            try:
                px_value = float(value[:-2])
            except ValueError:
                px_value = None
            if px_value is not None and px_value > 1.2:
                value = "1px"
        if key not in seen:
            entries.append((key, value))
            seen.add(key)
        else:
            entries = [(existing_key, existing_value) for existing_key, existing_value in entries if existing_key != key]
            entries.append((key, value))
    values_by_key = {key: value for key, value in entries}
    text_align = values_by_key.get("text-align", "")
    normalized_align = re.sub(r"\s*!important\s*$", "", text_align, flags=re.IGNORECASE).strip().lower()
    if normalized_align == "left":
        left_defaults = {
            "text-align-last": "left",
            "letter-spacing": "0",
            "word-spacing": "normal",
            "white-space": "normal",
            "word-break": "normal",
        }
        for key, value in left_defaults.items():
            if key not in seen:
                entries.append((key, value))
                seen.add(key)
    if "box-sizing" not in seen:
        entries.append(("box-sizing", "border-box"))
    return ";".join(f"{key}:{value}" for key, value in entries) + ";"


def normalize_style_attributes(html: str) -> str:
    def replace_style(match: re.Match[str]) -> str:
        quote = match.group(1)
        style_text = match.group(2)
        return f'style={quote}{normalize_styles(style_text)}{quote}'

    return re.sub(r'style=(["\'])(.*?)\1', replace_style, html, flags=re.IGNORECASE | re.DOTALL)


def flatten_editor_markup(html: str) -> str:
    html = re.sub(r"</?section\b", lambda match: match.group(0).replace("section", "div"), html, flags=re.IGNORECASE)

    def replace_heading(match: re.Match[str]) -> str:
        attrs = match.group(1) or ""
        inner_html = match.group(2)
        return f"<p{attrs}>{inner_html}</p>"

    html = re.sub(r"<h1([^>]*)>(.*?)</h1>", replace_heading, html, flags=re.IGNORECASE | re.DOTALL)
    html = re.sub(r"<h2([^>]*)>(.*?)</h2>", replace_heading, html, flags=re.IGNORECASE | re.DOTALL)
    return html


def infer_article_locale(html: str) -> str:
    head = re.sub(r"<[^>]+>", " ", html[:2000]).upper()
    if "US EQUITIES" in head or "US STOCKS" in head:
        return "en"
    if "美股" in head or "期权" in head:
        return "zh"
    cjk_count = len(re.findall(r"[\u3400-\u9fff]", head))
    latin_count = len(re.findall(r"[A-Z]", head))
    return "zh" if cjk_count > latin_count * 0.2 else "en"


def normalize_article_label_text(text: str, locale: str) -> str:
    match = re.match(r"^(\s*\d+)(\s*(?:[·.]\s*|\s+))(.+?)(\s*)$", text)
    if not match:
        return text
    number, delimiter, label, trailing = match.groups()
    # Approved template uses English labels for both locales. Never remap
    # MACRO/SEMIS/... into Chinese (English listening drafts must stay English);
    # only map accidental Chinese labels back to English.
    _ = locale
    mapped = ARTICLE_ZH_TO_EN_LABELS.get(label.strip())
    if not mapped:
        return text
    return f"{number}{delimiter}{mapped}{trailing}"


def normalize_article_presentation(html: str) -> str:
    locale = infer_article_locale(html)

    def replace_label(match: re.Match[str]) -> str:
        open_tag, text, close_tag = match.groups()
        return f"{open_tag}{normalize_article_label_text(text, locale)}{close_tag}"

    html = re.sub(
        r"(<span\b[^>]*>)(\s*\d+\s*(?:[·.]|\s)\s*[^<]{1,80}?)(</span>)",
        replace_label,
        html,
        flags=re.IGNORECASE,
    )
    html = re.sub(
        r"(background(?:-color)?\s*:\s*)#d7e2ff",
        rf"\g<1>{ARTICLE_BLUE}",
        html,
        flags=re.IGNORECASE,
    )
    html = re.sub(
        r"(border-bottom\s*:\s*1px\s+solid\s*)#d7e2ff",
        rf"\g<1>{ARTICLE_BLUE}",
        html,
        flags=re.IGNORECASE,
    )
    return html


def clean_html_for_draft_add(html: str) -> str:
    html = html.replace("\r\n", "\n").replace("\r", "\n").strip()
    html = strip_attrs(html)
    html = flatten_editor_markup(html)
    html = normalize_style_attributes(html)
    html = normalize_article_presentation(html)
    html = re.sub(r">\s+<", "><", html)
    html = re.sub(r"\n{3,}", "\n\n", html)
    return html + "\n"


def create_draft(args: argparse.Namespace, access_token: str) -> dict:
    html = args.html_file.read_text(encoding="utf-8")
    content_image_uploads = []
    html, content_image_uploads = upload_local_content_images(
        html,
        access_token,
        args.html_file.parent,
    )
    if args.sanitize_for_draft_add:
        html = clean_html_for_draft_add(html)
    if args.write_cleaned_html is not None:
        args.write_cleaned_html.write_text(html, encoding="utf-8")
    article = {
        "title": args.title,
        "author": args.author,
        "digest": args.digest,
        "content": html,
        "content_source_url": args.content_source_url,
        "need_open_comment": 1,
        "only_fans_can_comment": 0,
        # Full-frame 2.35:1 crop (no zoom). 1:1 uses the horizontal center square.
        "cover_info": {
            "crop_percent_list": [
                {
                    "ratio": "2.35_1",
                    "x1": "0",
                    "y1": "0",
                    "x2": "1",
                    "y2": "1",
                },
                {
                    "ratio": "1_1",
                    "x1": "0.2857",
                    "y1": "0",
                    "x2": "0.7143",
                    "y2": "1",
                },
            ]
        },
    }
    if args.thumb_media_id:
        article["thumb_media_id"] = args.thumb_media_id

    url = f"{DRAFT_ADD_URL}?{urllib.parse.urlencode({'access_token': access_token})}"
    response = post_json(url, {"articles": [article]})
    if response.get("errcode", 0) != 0:
        raise SystemExit(f"Failed to create draft: {json.dumps(response, ensure_ascii=False)}")
    if content_image_uploads:
        response["content_image_uploads"] = content_image_uploads
    return response


def main(argv: list[str] | None = None) -> int:
    configure_wechat_proxy()
    args = parse_args(argv)
    if args.appid:
        args.appid = args.appid.strip()
    if args.app_secret:
        args.app_secret = args.app_secret.strip()
    if not args.appid or not args.app_secret:
        raise SystemExit("WECHAT_APPID and WECHAT_APPSECRET are required.")
    if not args.html_file.exists():
        raise SystemExit(f"HTML file not found: {args.html_file}")
    if args.thumb_media_id and count_thumb_sources(
        thumb_image=args.thumb_image,
        thumb_image_url=args.thumb_image_url,
        thumb_image_stdin=args.thumb_image_stdin,
    ):
        raise SystemExit(
            "Do not combine --thumb-media-id with --thumb-image / --thumb-image-url / --thumb-image-stdin"
        )

    thumb_path, thumb_temp = materialize_thumb_image(
        thumb_image=args.thumb_image,
        thumb_image_url=args.thumb_image_url,
        thumb_image_stdin=args.thumb_image_stdin,
    )
    args.thumb_image = thumb_path

    try:
        access_token = get_access_token(args.appid, args.app_secret)
        thumb_upload = None
        if not args.thumb_media_id and args.thumb_image:
            thumb_upload = upload_thumb_image(access_token, args.thumb_image)
            args.thumb_media_id = thumb_upload.get("media_id")
        response = create_draft(args, access_token)
        payload = {"draft": response}
        if thumb_upload is not None:
            payload["thumb_upload"] = thumb_upload
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return 0
    finally:
        if thumb_temp is not None:
            thumb_temp.unlink(missing_ok=True)


if __name__ == "__main__":
    sys.exit(main())
