# Agent Handoff

- This repository owns distribution, archive, and the public blog surface.
- Do not generate RhinoFinance / 美股分析师 article content here. The content-production workflow lives in `/Users/tonylaw/Documents/us-stock-analyst`.
- Do not implement transcription here. STT belongs to `/Users/tonylaw/Documents/stt`.
- This repo receives finalized bilingual blog content, `archive/**`, static cover assets, and `wechat-runs/**` from the analyst repo.
- The normal WeChat draft path is `.github/workflows/wechat.yml`, triggered by pushes that include `wechat-runs/**`.
- The WeChat Action **requires** `wechat-runs/<slug>/abstract_cover.png`. It builds
  `https://raw.githubusercontent.com/<repo>/<sha>/wechat-runs/<slug>/abstract_cover.png`,
  fetches that URL with `GITHUB_TOKEN`, SCPs the bytes to the whitelisted droplet,
  and calls WeChat `material/add_material` → `draft/add`. Secrets `WECHAT_*` and
  `DROPLET_*` live in GitHub Actions — not on DevSpace.
- Keep `scripts/wechat_draft.py` and `scripts/wechat_draft_via_droplet.py` mirrored
  from `/Users/tonylaw/Documents/us-stock-analyst/scripts/` (analyst is source of truth).
- The WeChat Action must consume the analyst-produced `article.wechat.html`, not raw rendered HTML and not ad hoc blog-cleaned HTML.
- If Chinese/English language classification breaks, debug the blog renderer and generated files here; if the source article itself is wrong, fix it in `/Users/tonylaw/Documents/us-stock-analyst`.
