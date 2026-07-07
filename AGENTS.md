# Agent Handoff

- This repository owns distribution, archive, and the public blog surface.
- Do not generate RhinoFinance / 美股分析师 article content here. The content-production workflow lives in `/Users/tonylaw/Documents/us-stock-analyst`.
- Do not implement transcription here. STT belongs to `/Users/tonylaw/Documents/stt`.
- This repo receives finalized bilingual blog content, `archive/**`, static cover assets, and `wechat-runs/**` from the analyst repo.
- The normal WeChat draft path is `.github/workflows/wechat.yml`, triggered by pushes that include `wechat-runs/**`.
- The WeChat Action must consume the analyst-produced `article.wechat.html`, not raw rendered HTML and not ad hoc blog-cleaned HTML.
- If Chinese/English language classification breaks, debug the blog renderer and generated files here; if the source article itself is wrong, fix it in `/Users/tonylaw/Documents/us-stock-analyst`.
