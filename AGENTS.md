# Agent Handoff

- This repository owns distribution, archive, and the public blog surface.
- Do not generate RhinoFinance / 美股分析师 article content here. The content-production workflow lives in `/Users/tonylaw/Documents/us-stock-analyst`.
- Do not implement transcription here. STT belongs to `/Users/tonylaw/Documents/stt`.
- This repo receives finalized bilingual blog content, `archive/**`, static cover assets, and `wechat-runs/**` from the analyst repo.
- The normal WeChat draft path is `.github/workflows/wechat.yml`, triggered by pushes that include `wechat-runs/**`.
- **WeChat content policy**: Follow `tonylawx/us-stock-analyst/docs/wechat-content-compliance.md` and current WeChat platform rules. The WeChat Action creates **drafts only**, never automated mass sends or freepublish. The old `.github/workflows/wechat-freepublish.yml` API publishing dispatch has been deleted to enforce human publication in the official WeChat editor; do not recreate it. A human creator/editor must substantively author, verify, preview, and manually publish. In April 2026 WeChat reiterated its prohibition on wholly non-human automated AI writing/publishing; AI is for assistance, not an unattended content farm. The final content preflight (`scripts/validate_blog_artifacts.py`) blocks promotional banners/QR/contact, click redirects, incomplete body, investment profit guarantees, headline bait, unsupported embedded content and missing image assets. It is not a substitute for legal/financial/medical review, evidence verification, AI disclosure, rights clearance or image-level QR inspection. Any false positive is routed to editorial review, not silently bypassed. Keep the regression tests in the WeChat Action.
- **Standing daily publish shape: one 多图文 draft.** When `wechat-runs/<slug>/` and `wechat-runs/<slug>-en/` both exist, the Action calls `draft/add` once with `articles: [CN, EN]` (Chinese = 头条 / large cover, English listening = 次条 / small cover). Do not create two separate drafts for the daily pair.
- The WeChat Action **requires** `wechat-runs/<slug>/abstract_cover.png`. It builds
  `https://raw.githubusercontent.com/<repo>/<sha>/wechat-runs/<slug>/abstract_cover.png`,
  fetches that URL with `GITHUB_TOKEN`, SCPs the bytes to the whitelisted droplet,
  and calls WeChat `material/add_material` → `draft/add` (multi via `--articles-json`). Secrets `WECHAT_*` and
  `DROPLET_*` live in GitHub Actions — not on DevSpace.
- Keep `scripts/wechat_draft.py` and `scripts/wechat_draft_via_droplet.py` mirrored
  from `/Users/tonylaw/Documents/us-stock-analyst/scripts/` (analyst is source of truth).
- The WeChat Action must consume the analyst-produced `article.wechat.html`, not raw rendered HTML and not ad hoc blog-cleaned HTML.
- If Chinese/English language classification breaks, debug the blog renderer and generated files here; if the source article itself is wrong, fix it in `/Users/tonylaw/Documents/us-stock-analyst`.

- **微信公众号推荐合规基线（2026-11-16）：** 与上游 `tonylawx/us-stock-analyst/docs/wechat-content-compliance.md` 保持一致。公众号正文必须完整且不靠跳转获取结论，默认不包含 THETA/讨论群广告头图、关注二维码、外站链接、“阅读原文”、联系方式或诱导交易。保留普通数据图表和真实资料来源的文字标注。
- **WeChat Action 严格前检：** `scripts/validate_blog_artifacts.py` 对每个待交付 `wechat-runs/**` 检查短/空稿、促销元素、外链、阅读原文元数据及本地图片；有错误立即退出，不创建/更新草稿。即使使用 `workflow_dispatch`，也不能跳过预检。上游去除营销元素，当前仓库独立复查；通过静态校验不等于官方审核通过，人工仍须复核事实、原创、截图和宣传暗示。
- 现存/已提交的微信草稿不会随代码调整自动修正；如要发布旧稿，须手动删除导流元素并在公众号后台预览。不要靠批量删文重发处理不予推荐。
