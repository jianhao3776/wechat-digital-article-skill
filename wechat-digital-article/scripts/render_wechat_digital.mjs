#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, resolve } from 'node:path';

const args = process.argv.slice(2);

if (!args.length || args.includes('--help') || args.includes('-h')) {
  console.log('Usage: node render_wechat_digital.mjs <article.md> [--output <article.html>]');
  process.exit(args.length ? 0 : 1);
}

const inputPath = resolve(args[0]);
const outputOptionIndex = args.indexOf('--output');
const inputExtension = extname(inputPath);
const defaultOutput = resolve(dirname(inputPath), `${basename(inputPath, inputExtension)}.wechat-digital.html`);
const outputOption = outputOptionIndex >= 0 ? args[outputOptionIndex + 1] : undefined;

if (outputOptionIndex >= 0 && !outputOption) {
  throw new Error('--output requires a file path.');
}

const outputPath = outputOption ? resolve(outputOption) : defaultOutput;

const source = readFileSync(inputPath, 'utf8');

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderInline(value) {
  return escapeHtml(value).replace(/\*\*(.+?)\*\*/g, "<strong style='font-weight:800;color:inherit;'>$1</strong>");
}

function parseMarkdown(markdown) {
  const blocks = [];
  const lines = markdown.split(/\r?\n/);
  let paragraph = [];

  function push(type, text = '') {
    blocks.push({ type, text, index: blocks.length + 1 });
  }

  function flushParagraph() {
    if (!paragraph.length) return;
    push('paragraph', paragraph.join(' ').trim());
    paragraph = [];
  }

  for (const original of lines) {
    const line = original.trim();
    if (!line) {
      flushParagraph();
      continue;
    }
    if (line.startsWith('# ')) {
      flushParagraph();
      push('h1', line.slice(2).trim());
      continue;
    }
    if (line.startsWith('## ')) {
      flushParagraph();
      push('h2', line.slice(3).trim());
      continue;
    }
    if (line === '---') {
      flushParagraph();
      push('hr');
      continue;
    }
    if (line.startsWith('> ')) {
      flushParagraph();
      push('note', line.slice(2).trim());
      continue;
    }
    if (line.startsWith('*') && !line.startsWith('**') && line.endsWith('*') && !line.endsWith('**') && line.length > 2) {
      flushParagraph();
      push('caption', line.slice(1, -1).trim());
      continue;
    }
    paragraph.push(line);
  }

  flushParagraph();
  return blocks;
}

function buildDocument(blocks) {
  const titles = blocks.filter((block) => block.type === 'h1');
  if (titles.length !== 1) throw new Error(`Markdown must contain exactly one H1 title; found ${titles.length}.`);

  const title = titles[0];
  const intro = [];
  const sections = [];
  let current = null;

  for (const block of blocks) {
    if (block === title) continue;
    if (block.type === 'h1') throw new Error('Only one H1 title is supported.');
    if (block.type === 'h2') {
      current = { heading: block, blocks: [] };
      sections.push(current);
    } else if (current) {
      current.blocks.push(block);
    } else {
      intro.push(block);
    }
  }

  const sourceBlocks = blocks.filter((block) => block.type !== 'h1' && block.type !== 'hr');

  return {
    title,
    intro,
    sections,
    sourceBlocks,
    dividerCount: blocks.filter((block) => block.type === 'hr').length,
    strongCount: sourceBlocks.reduce((count, block) => count + [...block.text.matchAll(/\*\*(.+?)\*\*/g)].length, 0)
  };
}

const presentation = {
  article: 'max-width:680px;margin:0 auto;padding:28px 20px 48px;border-top:10px solid #18232a;background:#ffffff;color:#313a40;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",Arial,sans-serif;word-break:break-word;',
  note: 'margin:0 0 28px;padding:16px 17px;border:1px solid #cce3e3;border-radius:5px;background:#eef8f8;color:#5f7175;font-size:13px;line-height:1.85;',
  body: 'margin:0 0 18px;font-size:16px;line-height:1.98;color:#344047;',
  intro: 'margin:0 0 19px;font-size:17px;line-height:1.98;color:#27343b;',
  emphasis: 'margin:24px 0;padding:20px 18px;border-left:5px solid #00a6a6;background:#18232a;color:#ffffff;font-size:18px;line-height:1.9;font-weight:700;',
  caption: 'margin:25px 0 29px;padding:13px 15px;border-left:3px solid #00a6a6;background:#f0f6f6;color:#697b7f;font-size:12px;line-height:1.8;font-style:italic;',
  divider: "<section data-source-divider='true' style='height:1px;margin:34px 0;border-top:1px dashed #8fa3a7;'></section>"
};

function marker(block, kind) {
  return `data-source-index='${block.index}' data-source-kind='${kind}'`;
}

function renderParagraph(block, intro = false) {
  const text = renderInline(block.text);
  const standaloneQuote = block.text.startsWith('“') && block.text.endsWith('”');
  const standaloneEmphasis = /^\*\*.+\*\*$/.test(block.text);
  const style = standaloneQuote || standaloneEmphasis
    ? presentation.emphasis
    : intro ? presentation.intro : presentation.body;
  return `<p ${marker(block, 'paragraph')} style='${style}'>${text}</p>`;
}

function renderBlock(block, context = {}) {
  if (block.type === 'paragraph') return renderParagraph(block, context.intro);
  if (block.type === 'note') return `<p ${marker(block, 'note')} style='${presentation.note}'>${renderInline(block.text)}</p>`;
  if (block.type === 'caption') return `<p ${marker(block, 'caption')} style='${presentation.caption}'>${renderInline(block.text)}</p>`;
  if (block.type === 'hr') return presentation.divider;
  return '';
}

function renderHeading(block, index) {
  const number = String(index + 1).padStart(2, '0');
  return `<section style='margin:40px 0 20px;padding:0 0 12px;border-bottom:1px solid #9aabb0;'><p style='margin:0 0 7px;color:#00a6a6;font-size:12px;line-height:1.5;letter-spacing:2px;font-weight:800;'>话题 ${number}</p><h2 ${marker(block, 'heading')} style='margin:0;padding-left:12px;border-left:6px solid #18232a;font-size:22px;line-height:1.48;color:#18232a;font-weight:800;'>${renderInline(block.text)}</h2></section>`;
}

function renderArticle(model) {
  const intro = model.intro.map((block) => renderBlock(block, { intro: block.type === 'paragraph' })).join('\n');
  const sections = model.sections.map((section, index) => {
    const body = section.blocks.map((block) => renderBlock(block)).join('\n');
    return `${renderHeading(section.heading, index)}\n${body}`;
  }).join('\n');

  return `<section id='article' contenteditable='true' spellcheck='false' style='${presentation.article}'>\n${intro}\n${sections}\n</section>`;
}

const copyScript = `
  function cleanClone(source) {
    const clone = source.cloneNode(true);
    clone.removeAttribute('id'); clone.removeAttribute('contenteditable'); clone.removeAttribute('spellcheck');
    clone.querySelectorAll('[contenteditable]').forEach((node) => node.removeAttribute('contenteditable'));
    clone.querySelectorAll('[data-source-index]').forEach((node) => { node.removeAttribute('data-source-index'); node.removeAttribute('data-source-kind'); });
    clone.querySelectorAll('[data-source-divider]').forEach((node) => node.removeAttribute('data-source-divider'));
    return clone;
  }
  function setStatus(message, copied) {
    const status = document.getElementById('copy-status'); const button = document.getElementById('copy-button');
    status.textContent = message; button.textContent = copied ? '已复制 ✓' : '复制正文';
    if (copied) setTimeout(() => { button.textContent = '复制正文'; }, 2200);
  }
  function legacyCopy(html, plain) {
    const helper = document.createElement('div');
    helper.contentEditable = 'true'; helper.style.cssText = 'position:fixed;left:-100000px;top:0;width:680px;overflow:hidden;'; helper.innerHTML = html;
    document.body.appendChild(helper);
    const selection = window.getSelection(); const range = document.createRange(); range.selectNodeContents(helper);
    selection.removeAllRanges(); selection.addRange(range);
    let populated = false;
    const onCopy = (event) => { if (!event.clipboardData) return; event.clipboardData.setData('text/html', html); event.clipboardData.setData('text/plain', plain); event.preventDefault(); populated = true; };
    document.addEventListener('copy', onCopy, true);
    let ok = false;
    try { ok = document.execCommand('copy') || populated; } catch (error) { ok = false; }
    document.removeEventListener('copy', onCopy, true); selection.removeAllRanges(); helper.remove(); return ok;
  }
  async function copyArticle() {
    const source = document.getElementById('article'); const clone = cleanClone(source);
    const html = clone.outerHTML; const plain = clone.textContent || '';
    try {
      if (!window.isSecureContext || !navigator.clipboard || !window.ClipboardItem) throw new Error('Rich clipboard unavailable');
      const item = new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([plain], { type: 'text/plain' }) });
      await navigator.clipboard.write([item]); setStatus('已复制富文本，可粘贴到公众号编辑器', true);
    } catch (error) {
      if (legacyCopy(html, plain)) { setStatus('已用兼容模式复制，可粘贴到公众号', true); return; }
      const selection = window.getSelection(); const range = document.createRange(); range.selectNodeContents(source); selection.removeAllRanges(); selection.addRange(range);
      setStatus('正文已选中，请按 Ctrl/Cmd + C', false);
    }
  }
`;

function renderPage(model) {
  const captionCount = model.sourceBlocks.filter((block) => block.type === 'caption').length;
  const mediaNotice = captionCount
    ? `已保留 ${captionCount} 条图注，原 Markdown 未附图片文件。`
    : '原 Markdown 未附图注或图片文件。';

  return `<!doctype html>
<html lang='zh-CN'>
<head>
  <meta charset='utf-8'>
  <meta name='viewport' content='width=device-width, initial-scale=1'>
  <title>${escapeHtml(model.title.text)}｜数字媒体版</title>
  <style>
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body { margin: 0; background: #e9eef0; color: #171717; font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif; }
    .toolbar { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 12px 18px; background: #18232a; color: #fff; box-shadow: 0 8px 28px rgba(0,0,0,.2); }
    .toolbar strong { display: block; font-size: 14px; }
    .toolbar span { display: block; margin-top: 3px; color: #cbd5e1; font-size: 12px; }
    .toolbar-actions { display: flex; gap: 8px; flex-shrink: 0; }
    button { appearance: none; border: 0; border-radius: 6px; padding: 10px 15px; color: #fff; background: #00a6a6; font-size: 14px; font-weight: 800; cursor: pointer; }
    button.secondary { background: #475569; }
    button:focus-visible { outline: 3px solid #93c5fd; outline-offset: 2px; }
    .notice { max-width: 720px; margin: 18px auto 0; padding: 0 18px; color: #6b7280; font-size: 13px; line-height: 1.7; text-align: center; }
    .stage { max-width: 760px; margin: 18px auto 56px; padding: 20px; }
    #article { min-height: 500px; outline: none; box-shadow: 0 18px 60px rgba(15,23,42,.16); }
    #article:focus { box-shadow: 0 18px 60px rgba(15,23,42,.20), 0 0 0 3px #00a6a655; }
    @media (max-width: 640px) { .toolbar { align-items: flex-start; padding: 10px 12px; } .toolbar span { display:none; } .toolbar-actions { gap:6px; } button { padding:9px 11px; font-size:13px; } .stage { margin-top:10px; padding:8px; } .notice { margin-top:12px; } }
  </style>
</head>
<body>
  <header class='toolbar' contenteditable='false'>
    <div><strong>国内媒体取向｜数字媒体版</strong><span id='copy-status' role='status' aria-live='polite'>点击正文即可修改，完成后复制</span></div>
    <div class='toolbar-actions'><button class='secondary' type='button' onclick='location.reload()'>恢复原文</button><button id='copy-button' type='button' onclick='copyArticle()'>复制正文</button></div>
  </header>
  <p class='notice'>当前案例：《${escapeHtml(model.title.text)}》。复制范围从第一段正文开始，不含文章标题和顶部工具栏；${mediaNotice}</p>
  <main class='stage'>${renderArticle(model)}</main>
  <script>${copyScript}</script>
</body>
</html>
`;
}

function verifyOutput(html, model) {
  const articleStart = html.indexOf("<section id='article'");
  const articleEnd = html.indexOf('</main>', articleStart);
  if (articleStart < 0 || articleEnd < 0) throw new Error('Article boundary missing.');

  const articleHtml = html.slice(articleStart, articleEnd);
  const sourceMarkers = articleHtml.match(/data-source-index=/g) || [];
  if (sourceMarkers.length !== model.sourceBlocks.length) {
    throw new Error(`Expected ${model.sourceBlocks.length} source blocks; found ${sourceMarkers.length}.`);
  }

  const actualOrder = [...articleHtml.matchAll(/data-source-index='(\d+)'/g)].map((match) => Number(match[1]));
  const expectedOrder = model.sourceBlocks.map((block) => block.index);
  if (actualOrder.join(',') !== expectedOrder.join(',')) throw new Error('Source blocks are out of order.');
  if (articleHtml.includes('<h1') || articleHtml.includes(escapeHtml(model.title.text))) {
    throw new Error('Article title leaked into the copied body.');
  }

  const headings = articleHtml.match(/data-source-kind='heading'/g) || [];
  const dividers = articleHtml.match(/data-source-divider='true'/g) || [];
  const strong = articleHtml.match(/<strong style='font-weight:800;color:inherit;'>/g) || [];
  if (headings.length !== model.sections.length) throw new Error('Section heading count mismatch.');
  if (dividers.length !== model.dividerCount) throw new Error('Divider count mismatch.');
  if (strong.length !== model.strongCount) throw new Error('Strong emphasis count mismatch.');

  for (const block of model.sourceBlocks) {
    if (!articleHtml.includes(renderInline(block.text))) {
      throw new Error(`Missing source block ${block.index}: ${block.text.slice(0, 30)}`);
    }
  }

  if (!html.includes("'text/html'") || !html.includes("document.execCommand('copy')")) {
    throw new Error('Clipboard support is incomplete.');
  }
  if (html.includes('undefined')) throw new Error('Output contains undefined text.');
}

const blocks = parseMarkdown(source);
const model = buildDocument(blocks);
const html = renderPage(model);
verifyOutput(html, model);
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, html, 'utf8');

console.log(`Generated: ${outputPath}`);
console.log(`Copy blocks: ${model.sourceBlocks.length}; sections: ${model.sections.length}; dividers: ${model.dividerCount}; bold fragments: ${model.strongCount}`);
