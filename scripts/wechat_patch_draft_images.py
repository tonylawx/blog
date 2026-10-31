#!/usr/bin/env python3
"""Replace uniquely identified IMG/src values in an existing two-article draft.

Run through --via-droplet from the blog diagnostic Action, never through the
normal draft/add workflow. The default mode only reads and validates. Credentials
and the existing media id reach the worker over SSH stdin, not its command line.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import html
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import re
import secrets
import shlex
import subprocess
import sys
import tempfile
import urllib.parse

try:
    import wechat_draft as api
except ModuleNotFoundError:
    from scripts import wechat_draft as api

DRAFT_GET_URL = "https://api.weixin.qq.com/cgi-bin/draft/get"
DRAFT_UPDATE_URL = "https://api.weixin.qq.com/cgi-bin/draft/update"
DRAFT_BATCHGET_URL = "https://api.weixin.qq.com/cgi-bin/draft/batchget"
WRITABLE_FIELDS = {
    "article_type", "title", "author", "digest", "content", "content_source_url",
    "thumb_media_id", "show_cover_pic", "need_open_comment", "only_fans_can_comment",
    "pic_crop_235_1", "pic_crop_1_1", "image_info", "cover_info", "product_info",
}
READ_ONLY_FIELDS = {"url", "thumb_url"}
ATTR = re.compile(r'''([^\s/>=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?''')


class PatchError(Exception):
    """A safe-to-log error: never include content, media ids, or credentials."""


def digest(value: object) -> str:
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True,
                                     separators=(",", ":")).encode()).hexdigest()


def canonical_src(value: str) -> str:
    parsed = urllib.parse.urlsplit(html.unescape(value))
    if parsed.scheme not in {"http", "https"} or parsed.netloc != "mmbiz.qpic.cn":
        raise PatchError("Image selector must be a WeChat content-image URL")
    return urllib.parse.urlunsplit(("https", parsed.netloc, parsed.path, parsed.query, parsed.fragment))


class ImageSources(HTMLParser):
    def __init__(self, source: str):
        super().__init__(convert_charrefs=False)
        self.source = source
        self.line_starts = [0] + [m.end() for m in re.finditer("\n", source)]
        self.spans: list[tuple[int, int, str]] = []
        self.attributes: list[list[tuple[str, str | None]]] = []
        self.feed(source)

    def handle_starttag(self, tag: str, attrs: list) -> None:
        if tag.lower() != "img":
            return
        self.attributes.append(attrs)
        raw = self.get_starttag_text()
        assert raw is not None
        row, col = self.getpos()
        offset = self.line_starts[row - 1] + col
        srcs = [m for m in ATTR.finditer(raw, 4) if m.group(1).lower() == "src"]
        if len(srcs) > 1:
            raise PatchError("An IMG tag has duplicate src attributes")
        for match in srcs:
            group = next((i for i in (2, 3, 4) if match.group(i) is not None), None)
            if group is None:
                raise PatchError("An IMG src attribute has no value")
            self.spans.append((offset + match.start(group), offset + match.end(group), match.group(group)))

    handle_startendtag = handle_starttag


def find_targets(content: str, replacements: list[dict]) -> list[tuple[int, int]]:
    selectors = [canonical_src(item["old_src"]) for item in replacements]
    if len(set(selectors)) != len(selectors):
        raise PatchError("Image selectors are duplicated")
    targets = []
    for selector in selectors:
        matches = []
        for start, end, src in ImageSources(content).spans:
            try:
                same = canonical_src(src) == selector
            except PatchError:
                same = False
            if same:
                matches.append((start, end))
        if len(matches) != 1:
            hashes = []
            for _, _, src in ImageSources(content).spans:
                try:
                    hashes.append(hashlib.sha256(canonical_src(src).encode()).hexdigest())
                except PatchError:
                    pass
            raise PatchError("Every old image selector must match exactly one IMG/src; "
                             f"matched={len(matches)}; cn_img_src_sha256={json.dumps(hashes)}")
        targets.append(matches[0])
    return targets


def replace_sources(content: str, targets: list[tuple[int, int]], new_urls: list[str]) -> str:
    changes = []
    for (start, end), url in zip(targets, new_urls, strict=True):
        canonical_src(url)
        changes.append((start, end, html.escape(url, quote=True)))
    for start, end, replacement in sorted(changes, reverse=True):
        content = content[:start] + replacement + content[end:]
    return content


def validate_draft(draft: dict, expected_title: str, replacements: list[dict]) -> list[tuple[int, int]]:
    articles = draft.get("news_item")
    if not isinstance(articles, list) or len(articles) != 2 or not all(isinstance(a, dict) for a in articles):
        raise PatchError("Expected exactly two articles in the existing draft")
    cn = articles[0]
    if cn.get("title") != expected_title or not isinstance(cn.get("content"), str):
        raise PatchError("Chinese headline title or content does not match the target")
    if cn.get("article_type", "news") != "news":
        raise PatchError("Only standard news articles are supported")
    if set(cn) - WRITABLE_FIELDS - READ_ONLY_FIELDS:
        raise PatchError("Chinese article has unrecognized fields; inspect their API contract first")
    if not cn.get("thumb_media_id"):
        raise PatchError("The existing Chinese cover media id is missing")
    return find_targets(cn["content"], replacements)


def validate_images(replacements: list[dict], base_dir: Path) -> list[Path]:
    if not replacements or len(replacements) > 2:
        raise PatchError("Expected one or two image replacements")
    images = []
    for spec in replacements:
        path = (base_dir / spec["image"]).resolve()
        data = path.read_bytes()
        if not data.startswith((b"\x89PNG\r\n\x1a\n", b"\xff\xd8\xff")):
            raise PatchError("Replacement must be a PNG or JPEG")
        if not re.fullmatch(r"[0-9a-f]{64}", spec.get("sha256", "")) or hashlib.sha256(data).hexdigest() != spec["sha256"]:
            raise PatchError("Replacement image SHA256 does not match the reviewed bytes")
        images.append(path)
    return images


def checked_call(stage: str, function, *args):
    try:
        result = function(*args)
    except (Exception, SystemExit) as exc:
        raise PatchError(f"{stage} failed; private API details suppressed") from exc
    if not isinstance(result, dict) or result.get("errcode", 0) != 0:
        code = result.get("errcode") if isinstance(result, dict) else "invalid-response"
        raise PatchError(f"{stage} failed (errcode={code})")
    return result


def private_json(path: Path, value: dict) -> None:
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as handle:
        json.dump(value, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
        handle.flush()
        os.fsync(handle.fileno())


def matching_draft_metadata(token: str, expected_title: str) -> tuple[int, int, list[dict]]:
    """Read metadata only. Returned media ids remain private worker data."""
    query = urllib.parse.urlencode({"access_token": token})
    offset = 0
    matches = []
    while True:
        response = checked_call("draft/batchget", api.post_json, f"{DRAFT_BATCHGET_URL}?{query}",
                                {"offset": offset, "count": 20, "no_content": 1})
        items, total = response.get("item"), response.get("total_count")
        if not isinstance(items, list) or not isinstance(total, int):
            raise PatchError("draft/batchget returned an unexpected metadata structure")
        for item in items:
            articles = item.get("content", {}).get("news_item", [])
            if articles and articles[0].get("title") == expected_title:
                media_id = item.get("media_id")
                if not isinstance(media_id, str) or not media_id:
                    raise PatchError("Matching draft metadata has no media id")
                matches.append({"media_id": media_id,
                                "media_id_sha256": hashlib.sha256(media_id.encode()).hexdigest(),
                                "article_count": len(articles), "title_matches": True,
                                "update_time": item.get("update_time")})
        offset += len(items)
        if offset >= total:
            break
        if not items or offset >= 1000:
            raise PatchError("Draft metadata scan could not finish safely")
    return total, offset, matches


def locate_drafts(token: str, expected_title: str) -> dict:
    """Only report safe counts/hashes; never selects or updates a matching draft."""
    total, offset, matches = matching_draft_metadata(token, expected_title)
    return {"mode": "locate-only", "total_draft_count": total, "scanned_draft_count": offset,
            "matching_draft_count": len(matches),
            "matches": [{k: v for k, v in m.items() if k != "media_id"} for m in matches]}


def resolve_draft_id(token: str, expected_title: str, expected_hash: str) -> str:
    _, _, matches = matching_draft_metadata(token, expected_title)
    if len(matches) != 1 or matches[0]["media_id_sha256"] != expected_hash:
        raise PatchError("The exact-title draft is not unique or its reviewed media-id hash changed")
    return matches[0]["media_id"]


def inspect_draft(token: str, media_id: str, expected_title: str) -> dict:
    query = urllib.parse.urlencode({"access_token": token})
    draft = checked_call("draft/get", api.post_json, f"{DRAFT_GET_URL}?{query}", {"media_id": media_id})
    items = draft.get("news_item")
    if not isinstance(items, list) or len(items) != 2 or items[0].get("title") != expected_title:
        raise PatchError("Inspect target does not have the expected two-article title")
    cn, en = items
    hashes = []
    parser = ImageSources(cn.get("content", ""))
    for _, _, src in parser.spans:
        try:
            hashes.append(hashlib.sha256(canonical_src(src).encode()).hexdigest())
        except PatchError:
            pass
    image_metadata = []
    for attributes in parser.attributes:
        source_hashes = {}
        for name, value in attributes:
            if name in {"src", "data-src", "data-original"} and value is not None:
                value = html.unescape(value)
                normalized = re.sub(r"^http:", "https:", value)
                source_hashes[name] = hashlib.sha256(normalized.encode()).hexdigest()
        image_metadata.append({"attribute_names": sorted(n for n, _ in attributes),
                               "source_attribute_sha256": source_hashes})
    return {"mode": "inspect-only", "article_count": 2, "title_matches": True,
            "cn_field_names": sorted(cn),
            "cn_empty_fields": sorted(k for k, v in cn.items() if v is None or v == ""),
            "cn_field_types": {k: type(v).__name__ for k, v in cn.items()},
            "cn_content_sha256": digest(cn.get("content")),
            "cn_content_length": len(cn.get("content", "")),
            "cn_image_metadata": image_metadata,
            "cover_info_field_names": sorted(cn.get("cover_info", {})),
            "cn_other_fields_sha256": digest({k: v for k, v in cn.items() if k != "content"}),
            "cn_img_src_sha256": hashes, "en_sha256": digest(en)}


def patch_draft(token: str, media_id: str, manifest: dict, base_dir: Path,
                backup_dir: Path, *, apply: bool = False) -> dict:
    specs = manifest["replacements"]
    images = validate_images(specs, base_dir)
    query = urllib.parse.urlencode({"access_token": token})

    def get_draft():
        return checked_call("draft/get", api.post_json, f"{DRAFT_GET_URL}?{query}", {"media_id": media_id})

    before = get_draft()
    targets = validate_draft(before, manifest["expected_title"], specs)
    cn, en = before["news_item"]
    other_fields = {k: v for k, v in cn.items() if k != "content"}
    summary = {"mode": "apply" if apply else "check-only", "article_count": 2,
               "replacement_count": len(specs), "before_sha256": digest(before),
               "cn_other_fields_sha256": digest(other_fields), "en_sha256": digest(en),
               "images_sha256": [s["sha256"] for s in specs]}
    if not apply:
        return summary

    backup_dir.mkdir(parents=True, mode=0o700, exist_ok=True)
    if backup_dir.is_symlink():
        raise PatchError("Backup directory must not be a symlink")
    backup_dir.chmod(0o700)
    backup_stem = "draft-" + secrets.token_hex(12)
    private_json(backup_dir / f"{backup_stem}.before.json", {"media_id": media_id, "draft": before})
    new_urls = [checked_call("content-image upload", api.upload_content_image, token, image)["url"] for image in images]
    content = replace_sources(cn["content"], targets, new_urls)
    article = {k: copy.deepcopy(v) for k, v in cn.items() if k in WRITABLE_FIELDS}
    article["content"] = content
    payload = {"media_id": media_id, "index": 0, "articles": article}
    private_json(backup_dir / f"{backup_stem}.intended.json", {"payload": payload})

    # WeChat has no compare-and-swap draft update. Abort if either article changed
    # during uploads; make the guarded update immediately after this last read.
    if digest(get_draft()) != digest(before):
        raise PatchError("Draft changed during image upload; no draft/update was sent")
    checked_call("draft/update", api.post_json, f"{DRAFT_UPDATE_URL}?{query}", payload)
    after = get_draft()
    private_json(backup_dir / f"{backup_stem}.after.json", {"draft": after})
    actual = after.get("news_item", [])
    if len(actual) != 2 or actual[0].get("content") != content:
        raise PatchError("Post-update content verification failed; inspect private VPS backups")
    if digest({k: v for k, v in actual[0].items() if k != "content"}) != digest(other_fields) or digest(actual[1]) != digest(en):
        raise PatchError("Post-update metadata/English verification failed; inspect private VPS backups")
    summary.update({"verified": True, "after_sha256": digest(after), "backup_stem": backup_stem,
                    "cn_other_fields_unchanged": True, "en_unchanged": True})
    return summary


def via_droplet(args: argparse.Namespace, manifest: dict) -> None:
    remote = os.environ.get("WECHAT_DRAFT_PROXY_HOST", "")
    if not re.fullmatch(r"[A-Za-z0-9_.@:-]+", remote):
        raise PatchError("WECHAT_DRAFT_PROXY_HOST is required")
    config = {k: os.environ.get(k, "") for k in ("WECHAT_APPID", "WECHAT_APPSECRET", "WECHAT_DRAFT_MEDIA_ID")}
    if not all(config.values()):
        raise PatchError("The Action requires app credentials and an existing draft id")
    images = validate_images(manifest["replacements"], args.manifest.parent)
    result = subprocess.run(["ssh", remote, "umask 077; mktemp -d /tmp/wechat-chart-patch.XXXXXXXX"],
                            check=True, text=True, capture_output=True)
    remote_dir = result.stdout.strip()
    if not re.fullmatch(r"/tmp/wechat-chart-patch\.[A-Za-z0-9]+", remote_dir):
        raise PatchError("Invalid remote temporary directory")
    try:
        with tempfile.TemporaryDirectory() as staging:
            staging_path = Path(staging)
            remote_manifest = copy.deepcopy(manifest)
            uploads = [Path(__file__).resolve(), Path(api.__file__).resolve()]
            for i, image in enumerate(images):
                name = f"replacement-{i}{image.suffix}"
                (staging_path / name).write_bytes(image.read_bytes())
                remote_manifest["replacements"][i]["image"] = name
                uploads.append(staging_path / name)
            staged_manifest = staging_path / "manifest.json"
            staged_manifest.write_text(json.dumps(remote_manifest), encoding="utf-8")
            uploads.append(staged_manifest)
            subprocess.run(["scp", "-O", *map(str, uploads), f"{remote}:{remote_dir}/"], check=True,
                           stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        command = " ".join(shlex.quote(a) for a in ["python3", f"{remote_dir}/wechat_patch_draft_images.py",
                          "--droplet-worker", "--manifest", f"{remote_dir}/manifest.json"] +
                          (["--apply"] if args.apply else []) + (["--locate-only"] if args.locate_only else []))
        if args.inspect_only:
            command += " --inspect-only"
        subprocess.run(["ssh", remote, command], input=json.dumps(config), text=True, check=True)
    finally:
        subprocess.run(["ssh", remote, f"rm -rf -- {shlex.quote(remote_dir)}"], check=False,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, required=True)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--via-droplet", action="store_true")
    mode.add_argument("--droplet-worker", action="store_true", help=argparse.SUPPRESS)
    parser.add_argument("--apply", action="store_true", help="Upload and update; default only reads/checks")
    parser.add_argument("--locate-only", action="store_true", help="Only scan draft metadata for a matching title")
    parser.add_argument("--inspect-only", action="store_true", help="Only inspect safe field names, empty flags, and hashes")
    args = parser.parse_args(argv)
    if sum((args.apply, args.locate_only, args.inspect_only)) > 1:
        parser.error("--apply, --locate-only, and --inspect-only are mutually exclusive")
    try:
        manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
        if args.via_droplet:
            via_droplet(args, manifest)
        else:
            config = json.load(sys.stdin)
            token = checked_call("access token", lambda: {"token": api.get_access_token(config["WECHAT_APPID"], config["WECHAT_APPSECRET"])})["token"]
            if args.locate_only:
                summary = locate_drafts(token, manifest["expected_title"])
            else:
                media_id = config["WECHAT_DRAFT_MEDIA_ID"]
                if manifest.get("target_draft_media_id_sha256"):
                    media_id = resolve_draft_id(token, manifest["expected_title"], manifest["target_draft_media_id_sha256"])
                if args.inspect_only:
                    summary = inspect_draft(token, media_id, manifest["expected_title"])
                else:
                    summary = patch_draft(token, media_id, manifest, args.manifest.parent,
                                          Path.home() / ".local/state/wechat-chart-patch", apply=args.apply)
            print(json.dumps(summary, ensure_ascii=False, sort_keys=True))
    except (Exception, SystemExit) as exc:
        message = str(exc) if isinstance(exc, PatchError) else "Patch worker failed; private error details suppressed"
        print(message, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
