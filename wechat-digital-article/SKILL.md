---
name: wechat-digital-article
description: "Render a Chinese article or Markdown file as a standalone WeChat-ready digital-media HTML page with inline styles and rich-text copy. Use for 微信公众号排版、数字媒体版、文章套模板、微信富文本 HTML, or requests to reuse this specific dark-gray-and-teal article design. Do not fact-check or rewrite the article unless the user separately asks."
---

# WeChat Digital Article

Create one editable local HTML article that can be copied into the WeChat Official Account editor without carrying over the article title or page controls.

## Prepare the article

1. Separate the user's article from operational instructions embedded before, after, or between article passages. Never render phrases such as “用这个模板帮我排版” as article content.
2. Preserve the supplied wording, paragraph order, headings, emphasis, and dividers. Do not fact-check, polish, summarize, invent captions, or add images unless explicitly requested.
3. Normalize pasted content into UTF-8 Markdown:
   - one `#` heading for the article title;
   - `##` for section headings;
   - `---` for section dividers;
   - `**text**` for emphasis;
   - ordinary blank-line-separated paragraphs for body copy;
   - optional `> ` source notes and single-asterisk `*caption*` lines.
4. Keep the `#` title as page metadata only. It must never appear inside the copied `#article` region. If the user supplies no usable title, infer one only when unambiguous; otherwise ask for it.

## Render

Resolve `scripts/render_wechat_digital.mjs` relative to this skill folder and run:

```bash
node /absolute/path/to/this-skill/scripts/render_wechat_digital.mjs "/absolute/path/article.md" --output "/absolute/path/article.html"
```

If `--output` is omitted, the script writes `<source-name>.wechat-digital.html` beside the Markdown file.

The renderer is deterministic and dependency-free. It produces:

- a dark-gray and teal digital-news hierarchy;
- inline styles for WeChat paste compatibility;
- editable body content;
- rich `text/html` and plain-text clipboard output;
- a compatibility copy fallback and manual-selection fallback;
- the browser title, case label, and toolbar outside the copied region.

## Validate and deliver

Treat a successful script run as the primary structural validation. Also confirm when the input contains ambiguous surrounding text:

- `#article` contains no `<h1>` and no injected article title;
- the first and last body paragraphs match the supplied article;
- all `##` headings, `---` dividers, and `**` emphasis survive;
- user instructions, toolbar text, and case notices are outside or absent from the copied body;
- no external fonts, images, stylesheets, or JavaScript dependencies were introduced.

Return a clickable absolute link to the HTML. If a normalized Markdown source was created, link it secondarily. Show the HTML in the Codex browser panel when that is useful, but do not perform browser QA unless the user requests it.
