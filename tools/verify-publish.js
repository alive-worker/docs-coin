#!/usr/bin/env node
/**
 * 发布门禁：以 slug_topic_map.json + research/ 正文为唯一计数源，核对
 * （并可 --fix 修复）首页/归档/JSON-LD/RSS/DATES/旧 URL 跳转桩。
 *
 *   node tools/verify-publish.js
 *   node tools/verify-publish.js --fix
 */
'use strict';

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const { execSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const FIX = process.argv.includes('--fix');
const HOST = 'https://coin.ponr.org';
const TOPICS = ['basics', 'governance', 'market', 'protocol'];
const failures = [];
const fixes = [];
function fail(msg) { failures.push(msg); }
function noteFix(msg) { fixes.push(msg); }

function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf-8'); }
function write(rel, t) { fs.writeFileSync(path.join(root, rel), t, 'utf-8'); }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }

const slugTopicMap = JSON.parse(read('slug_topic_map.json'));
const slugs = Object.keys(slugTopicMap);
function zhPath(slug) { return `research/${slugTopicMap[slug]}/${slug}.html`; }
function enPath(slug) { return `en/research/${slugTopicMap[slug]}/${slug}.html`; }

function extractMeta(slug, lang) {
  const rel = lang === 'en' ? enPath(slug) : zhPath(slug);
  const html = read(rel);
  const h1 = ((html.match(/<h1>([\s\S]*?)<\/h1>/) || [])[1] || '').replace(/<[^>]+>/g, '').trim();
  const desc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
  const pub = (html.match(/<meta property="article:published_time" content="([^"]*)"/) || [])[1] || '';
  // 只读 article-head 面包屑上的本篇标签，避开侧栏其它文章的 side-tag
  const head = (html.match(/<header class="article-head">[\s\S]*?<\/header>/) || [])[0] || '';
  const tagLabel = ((head.match(/<span class="side-tag archive-tag archive-tag--[a-z]+"[^>]*>\s*([^<]*?)\s*<\/span>/) || [])[1] || '').trim();
  const tagColor = (head.match(/<span class="side-tag archive-tag archive-tag--([a-z]+)"/) || [])[1] || 'blue';
  return { slug, topic: slugTopicMap[slug], h1, desc, pub, tagLabel, tagColor };
}

function sortedMeta(lang) {
  return slugs.map((s) => extractMeta(s, lang)).sort((a, b) => new Date(b.pub) - new Date(a.pub));
}

function jsonEsc(s) {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function toRFC822(iso) {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})([+-]\d{2}):(\d{2})$/);
  if (!m) return '';
  const [, y, mo, da, hh, mm, ss, offH, offMin] = m;
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const utcMs = Date.UTC(+y, +mo - 1, +da, +hh - parseInt(offH, 10), +mm, +ss);
  const dUtc = new Date(utcMs + parseInt(offH, 10) * 3600000);
  return `${days[dUtc.getUTCDay()]}, ${da} ${months[dUtc.getUTCMonth()]} ${y} ${hh}:${mm}:${ss} ${offH}${offMin}`;
}

function escapeXml(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function archiveHref(slug, lang) {
  return lang === 'en' ? `/${enPath(slug)}` : `/${zhPath(slug)}`;
}

function buildArchiveItem(it) {
  const href = archiveHref(it.slug, it.lang);
  const pubDisplay = it.pub.replace('T', ' ').replace(/\+.*/, '');
  return `        <li class="archive-item" data-topic="${it.topic}">
          <a href="${href}">
            <span class="archive-tag archive-tag--${it.tagColor}" aria-hidden="true">${it.tagLabel}</span>
            <span class="archive-title">${it.h1}</span>
            <span class="archive-date"><svg class="side-cal" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M3 10h18M8 3v4M16 3v4"></path></svg><time datetime="${it.pub}">${pubDisplay}</time></span>
          </a>
        </li>`;
}

function buildItemListJson(items, lang) {
  return items.map((it, i) => {
    const item = `${HOST}${archiveHref(it.slug, lang)}`;
    return `        { "@type": "ListItem", "position": ${i + 1}, "name": "${jsonEsc(it.h1)}", "item": "${item}" }`;
  }).join(',\n');
}

function restoreBreadcrumb(html, lang, page) {
  const specs = {
    'articles-zh': {
      id: `${HOST}/articles.html#breadcrumb`,
      items: [
        { name: '首页', item: `${HOST}/` },
        { name: '全部文章', item: `${HOST}/articles.html` },
      ],
    },
    'articles-en': {
      id: `${HOST}/en/articles.html#breadcrumb`,
      items: [
        { name: 'Home', item: `${HOST}/en/` },
        { name: 'All Articles', item: `${HOST}/en/articles.html` },
      ],
    },
  };
  const spec = specs[`${page}-${lang}`];
  if (!spec) return html;
  const inner = spec.items.map((it, i) =>
    `        { "@type": "ListItem", "position": ${i + 1}, "name": "${jsonEsc(it.name)}", "item": "${it.item}" }`
  ).join(',\n');
  const escapedId = spec.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(
    `(\\{ "@type": "BreadcrumbList", "@id": "${escapedId}", "itemListElement": \\[\\r?\\n)[\\s\\S]*?(\\n    \\] \\})`
  );
  if (!re.test(html)) return html;
  return html.replace(re, `$1${inner}$2`);
}

function replaceItemList(html, items, lang) {
  const n = items.length;
  const rebuilt = buildItemListJson(items, lang);
  const re = /("@type": "ItemList"[\s\S]*?"itemListElement": \[\r?\n)[\s\S]*?(\n    \] \})/;
  if (!re.test(html)) {
    fail(`ItemList block not found (${lang})`);
    return html;
  }
  const out = html.replace(/("@type": "ItemList"[\s\S]*?"numberOfItems":\s*)\d+/, (_, prefix) => prefix + String(n));
  return out.replace(re, (_, start, end) => start + rebuilt + end);
}

function parseArchiveTags(html) {
  const map = {};
  const re = /<li class="archive-item"[^>]*>\s*<a href="\/(?:en\/)?research\/[a-z]+\/([a-z0-9-]+)\.html">\s*<span class="archive-tag archive-tag--([a-z]+)"[^>]*>([^<]*)<\/span>/g;
  for (const m of html.matchAll(re)) {
    const label = (m[3] || '').trim();
    if (label) map[m[1]] = { color: m[2], label };
  }
  return map;
}

function parseArchiveTagsFromGit(file) {
  try {
    const hashes = execSync(`git log -30 --pretty=%H -- ${file}`, {
      cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim().split(/\r?\n/).filter(Boolean);
    for (const h of hashes) {
      const html = execSync(`git show ${h}:${file}`, {
        cwd: root, encoding: 'utf8', maxBuffer: 12 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      const map = parseArchiveTags(html);
      if (Object.keys(map).length >= slugs.length * 0.8) return map;
    }
  } catch (_) { /* 无 git 或浅克隆时退回 topic 默认标签 */ }
  return {};
}

const TOPIC_TAG_FALLBACK = {
  zh: {
    basics: { label: '研究方法', color: 'teal' },
    governance: { label: '治理核验', color: 'violet' },
    market: { label: '市场核验', color: 'azure' },
    protocol: { label: '协议核验', color: 'rust' },
  },
  en: {
    basics: { label: 'Research', color: 'teal' },
    governance: { label: 'Governance', color: 'violet' },
    market: { label: 'Market', color: 'azure' },
    protocol: { label: 'Protocol', color: 'rust' },
  },
};

function fillItemTags(items, lang) {
  const file = lang === 'en' ? 'en/articles.html' : 'articles.html';
  let map = parseArchiveTags(read(file));
  const needGit = items.some((it) => !(it.tagLabel || '').trim() && !(map[it.slug] && map[it.slug].label));
  if (needGit) map = { ...parseArchiveTagsFromGit(file), ...map };
  return items.map((it) => {
    let label = (it.tagLabel || '').trim();
    let color = it.tagColor;
    if (!label && map[it.slug]) {
      label = map[it.slug].label;
      color = map[it.slug].color;
    }
    if (!label) {
      const fb = TOPIC_TAG_FALLBACK[lang][it.topic];
      label = fb.label;
      if (!color || color === 'blue') color = fb.color;
    }
    return { ...it, tagLabel: label, tagColor: color || 'blue', lang };
  });
}

function countEmptyArchiveTags(html) {
  const ul = (html.match(/<ul class="archive-list"[^>]*>[\s\S]*?<\/ul>/) || [])[0] || '';
  return [...ul.matchAll(/<span class="archive-tag archive-tag--[a-z]+"[^>]*>([^<]*)<\/span>/g)]
    .filter((m) => !m[1].trim()).length;
}

function countEmptyHomeTags(html) {
  return [...html.matchAll(/<span class="archive-tag archive-tag--[a-z]+"[^>]*>([^<]*)<\/span>/g)]
    .filter((m) => !m[1].trim()).length;
}

const TOPIC_HUB = {
  zh: {
    basics: { href: '/research/basics/', label: '研究方法基础' },
    governance: { href: '/research/governance/', label: '治理、资产与专项核验' },
    market: { href: '/research/market/', label: '市场结构与流动性' },
    protocol: { href: '/research/protocol/', label: '协议与基础设施风险' },
  },
  en: {
    basics: { href: '/en/research/basics/', label: 'Research Foundations' },
    governance: { href: '/en/research/governance/', label: 'Governance, Assets &amp; Special Checks' },
    market: { href: '/en/research/market/', label: 'Market Structure &amp; Liquidity' },
    protocol: { href: '/en/research/protocol/', label: 'Protocol &amp; Infrastructure Risk' },
  },
};

function fillHomepageEmptyTags(html, items) {
  const bySlug = Object.fromEntries(items.map((it) => [it.slug, it]));
  return html.replace(
    /(<article class="post-card[^"]*" id="([a-z0-9-]+)"[\s\S]{0,1200}?<span class="archive-tag archive-tag--)([a-z]+)(">)([^<]*)(<\/span>)/g,
    (full, pre, slug, color, mid, inner, end) => {
      const it = bySlug[slug];
      if (!it || inner.trim()) return full;
      return `${pre}${it.tagColor}${mid}${it.tagLabel}${end}`;
    }
  );
}

function ensureArticleSideTags(items, lang) {
  let n = 0;
  for (const it of items) {
    const rel = lang === 'en' ? enPath(it.slug) : zhPath(it.slug);
    const html = read(rel);
    const head = (html.match(/<header class="article-head">[\s\S]*?<\/header>/) || [])[0] || '';
    if (/class="side-tag archive-tag/.test(head)) continue;
    const hub = TOPIC_HUB[lang][it.topic];
    const kicker = `          <p><a href="${hub.href}">${hub.label}</a> / <span class="side-tag archive-tag archive-tag--${it.tagColor}">${it.tagLabel}</span></p>\n`;
    const next = html.replace(
      /(<header class="article-head">\s*)(<h1>)/,
      (_, a, b) => a + kicker + '          ' + b
    );
    if (next === html) {
      fail(`could not insert side-tag: ${rel}`);
      continue;
    }
    write(rel, next);
    n++;
  }
  if (n) noteFix(`article side-tag inserted (${lang}): ${n}`);
}

function normalizeArticleHeads(items, lang) {
  let n = 0;
  for (const it of items) {
    const rel = lang === 'en' ? enPath(it.slug) : zhPath(it.slug);
    const html = read(rel);
    const next = html.replace(
      /(<header class="article-head">)\s*(<p><a href="\/(?:en\/)?research\/[\s\S]*?<\/p>)\s*(<h1>)/,
      (_, a, p, h) => `${a}\n          ${p}\n          ${h}`
    );
    if (next !== html) {
      write(rel, next);
      n++;
    }
  }
  if (n) noteFix(`article-head indent normalized (${lang}): ${n}`);
}

function parseArchiveEntries(ulInner) {
  return [...ulInner.matchAll(/<li class="archive-item"[\s\S]*?<\/li>/g)].map((m) => {
    const block = m[0];
    const slug = (block.match(/\/([a-z0-9-]+)\.html"/) || [])[1];
    return { slug, block };
  });
}

function fillTagInBlock(block, it) {
  return block.replace(
    /<span class="archive-tag archive-tag--[a-z]+"[^>]*>[^<]*<\/span>/,
    `<span class="archive-tag archive-tag--${it.tagColor}" aria-hidden="true">${it.tagLabel}</span>`
  );
}

function replaceArchiveChrome(html, items, lang) {
  const n = items.length;
  const counts = {};
  for (const t of TOPICS) counts[t] = items.filter((it) => it.topic === t).length;
  let out = html;
  if (lang === 'en') out = out.replace(/\d+ articles ·/, `${n} articles ·`);
  else out = out.replace(/共 \d+ 篇/, `共 ${n} 篇`);
  for (const t of TOPICS) {
    const re = new RegExp(`(class="topic-tag-btn" data-topic="${t}"[^>]*>[^<]*<span class="topic-tag-count">)\\d+(</span>)`);
    if (!re.test(out)) fail(`topic-tag-count for ${t} (${lang}) not found`);
    else out = out.replace(re, `$1${counts[t]}$2`);
  }
  const ulRe = /(<ul class="archive-list"[^>]*>\r?\n)([\s\S]*?)(\n      <\/ul>)/;
  const ul = out.match(ulRe);
  if (!ul) {
    fail(`archive-list block not found (${lang})`);
    return out;
  }
  const bySlug = new Map(parseArchiveEntries(ul[2]).map((e) => [e.slug, e]));
  let filled = 0;
  let missing = 0;
  const ordered = items.map((it) => {
    const existing = bySlug.get(it.slug);
    if (!existing) {
      missing++;
      return buildArchiveItem({ ...it, lang });
    }
    const label = ((existing.block.match(/<span class="archive-tag archive-tag--[a-z]+"[^>]*>([^<]*)<\/span>/) || [])[1] || '').trim();
    const block = existing.block.replace(/^\s*/, '        ');
    if (label) return block;
    filled++;
    return fillTagInBlock(block, it);
  });
  if (ordered.length !== n) fail(`archive (${lang}) ordered ${ordered.length} !== ${n}`);
  if (missing) noteFix(`archive (${lang}) inserted ${missing} missing slug(s) in date order`);
  if (filled) noteFix(`archive (${lang}) filled ${filled} empty tag pills`);
  return out.replace(ulRe, (_, a, _old, c) => a + ordered.join('\n') + c);
}

function fillFeedCategories(xml, items) {
  let out = xml;
  let n = 0;
  for (const it of items) {
    const guid = `${HOST}${archiveHref(it.slug, it.lang)}`;
    const esc = guid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(<guid isPermaLink="true">${esc}</guid>\\s*<pubDate>[^<]*</pubDate>\\s*)<category></category>`);
    const next = out.replace(re, `$1<category>${escapeXml(it.tagLabel)}</category>`);
    if (next !== out) n++;
    out = next;
  }
  if (n) noteFix(`feed categories filled (${items[0] && items[0].lang}): ${n}`);
  return out;
}

function replaceHeroCount(html, n) {
  return html.replace(
    /(<span class="hero-stat-num">)\d+(<\/span><span class="hero-stat-label">(?:篇文章|Articles))/,
    `$1${n}$2`
  );
}

function buildFeed(items, lang) {
  const isEn = lang === 'en';
  const itemsXml = items.map((it) => `  <item>
    <title><![CDATA[${it.h1}]]></title>
    <link>${HOST}${archiveHref(it.slug, lang)}</link>
    <guid isPermaLink="true">${HOST}${archiveHref(it.slug, lang)}</guid>
    <pubDate>${toRFC822(it.pub)}</pubDate>
    <category>${escapeXml(it.tagLabel)}</category>
    <description><![CDATA[${it.desc}]]></description>
  </item>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${isEn ? 'Crypto Research Notes' : '加密货币研究'}</title>
  <link>${isEn ? `${HOST}/en/` : `${HOST}/`}</link>
  <atom:link href="${isEn ? `${HOST}/en/feed.xml` : `${HOST}/feed.xml`}" rel="self" type="application/rss+xml"/>
  <description>${isEn ? 'Original long-form research on crypto research methodology, on-chain data analysis, tokenomics, smart contract security, DAO governance, oracles, cross-chain bridge security, and Sybil address detection. For learning and research only — not investment advice.' : '围绕加密货币研究方法、链上数据分析、代币经济学、智能合约安全、DAO治理、预言机、跨链桥安全与女巫地址识别的原创研究长文，中文更新。内容仅供学习研究，不构成投资建议。'}</description>
  <language>${isEn ? 'en-us' : 'zh-cn'}</language>
  <lastBuildDate>${toRFC822(items[0].pub)}</lastBuildDate>
${itemsXml}
</channel>
</rss>
`;
}

function legacyStub(slug, lang) {
  const target = `${HOST}${archiveHref(slug, lang)}`;
  const meta = extractMeta(slug, lang);
  const isEn = lang === 'en';
  const title = isEn
    ? `Moved: ${meta.h1} - Crypto Research Notes`
    : `页面已迁移：${meta.h1} - 加密货币研究（内容已整体移至新地址）`;
  const body = isEn
    ? `This page has moved. <a href="${target}">Go to the new address</a>.`
    : `本页已迁移，<a href="${target}">点击前往新地址</a>。`;
  return `<!doctype html>
<html lang="${isEn ? 'en' : 'zh-CN'}">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex, follow">
<title>${title}</title>
<meta name="description" content="${meta.desc.replace(/"/g, '&quot;')}">
<link rel="canonical" href="${target}">
<meta http-equiv="refresh" content="0; url=${target}">
</head>
<body>
<p>${body}</p>
</body>
</html>
`;
}

function buildNginxRedirects() {
  const lines = [
    '# Generated by tools/verify-publish.js — include from the coin.ponr.org server nginx config.',
    '# Real 301s for the pre-2026-08-22 /articles/<slug>.html URL scheme.',
    '',
  ];
  for (const slug of slugs.slice().sort()) {
    lines.push(`rewrite ^/articles/${slug}\\.html$ /${zhPath(slug)} permanent;`);
    lines.push(`rewrite ^/en/articles/${slug}\\.html$ /${enPath(slug)} permanent;`);
  }
  lines.push(`rewrite ^/virtual-card\\.html$ /research/basics/research-tools-virtual-card-guide.html permanent;`);
  lines.push(`rewrite ^/en/virtual-card\\.html$ /en/research/basics/research-tools-virtual-card-guide.html permanent;`);
  lines.push('');
  return lines.join('\n');
}

function buildRedirectMap() {
  const lines = [];
  for (const slug of slugs.slice().sort()) {
    lines.push(`/articles/${slug}.html -> /${zhPath(slug)}`);
    lines.push(`/en/articles/${slug}.html -> /${enPath(slug)}`);
  }
  lines.push(`/virtual-card.html -> /research/basics/research-tools-virtual-card-guide.html`);
  lines.push(`/en/virtual-card.html -> /en/research/basics/research-tools-virtual-card-guide.html`);
  return lines.join('\n') + '\n';
}

function stripSitemapUrl(xml, loc) {
  const marker = `<loc>${loc}</loc>`;
  let out = xml;
  let idx = out.indexOf(marker);
  while (idx !== -1) {
    const start = out.lastIndexOf('<url>', idx);
    const end = out.indexOf('</url>', idx);
    if (start < 0 || end < 0) break;
    const lineStart = out.lastIndexOf('\n', start - 1) + 1;
    const after = end + '</url>'.length;
    const cutEnd = out[after] === '\n' ? after + 1 : after;
    out = out.slice(0, lineStart) + out.slice(cutEnd);
    idx = out.indexOf(marker);
  }
  return out;
}

function ensureDates(js, items) {
  let out = js;
  let added = 0;
  for (const lang of ['zh', 'en']) {
    for (const it of items[lang]) {
      const key = archiveHref(it.slug, lang);
      if (out.includes(`'${key}':`)) continue;
      const pubDisplay = it.pub.replace('T', ' ').replace(/\+.*/, '');
      const needle = '  var DATES = {\n';
      if (!out.includes(needle)) { fail('DATES object not found in js/site.js'); return out; }
      out = out.replace(needle, `${needle}    '${key}': '${pubDisplay}',\n`);
      added++;
    }
  }
  if (added) noteFix(`js/site.js DATES: added ${added} missing keys`);
  return out;
}

function sha1prefix(rel) {
  return crypto.createHash('sha1').update(fs.readFileSync(path.join(root, rel))).digest('hex').slice(0, 8);
}

function propagateJsHash() {
  const newHash = sha1prefix('js/site.js');
  const sample = read('index.html');
  const oldHash = (sample.match(/site\.js\?v=([a-f0-9]+)/) || [])[1];
  if (!oldHash || oldHash === newHash) return;
  const needle = `site.js?v=${oldHash}`;
  const next = `site.js?v=${newHash}`;
  let n = 0;
  function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ent.name === 'node_modules' || ent.name.startsWith('.')) continue;
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (ent.name.endsWith('.html')) {
        const t = fs.readFileSync(p, 'utf-8');
        if (!t.includes(needle)) continue;
        fs.writeFileSync(p, t.split(needle).join(next), 'utf-8');
        n++;
      }
    }
  }
  walk(root);
  noteFix(`site.js cache-bust ${oldHash} → ${newHash} (${n} html files)`);
}

function applyFix() {
  const zhItems = fillItemTags(sortedMeta('zh'), 'zh');
  const enItems = fillItemTags(sortedMeta('en'), 'en');
  const n = zhItems.length;
  if (enItems.length !== n) fail(`zh/en meta length mismatch ${n} vs ${enItems.length}`);

  write('articles.html', restoreBreadcrumb(replaceItemList(replaceArchiveChrome(read('articles.html'), zhItems, 'zh'), zhItems, 'zh'), 'zh', 'articles'));
  write('en/articles.html', restoreBreadcrumb(replaceItemList(replaceArchiveChrome(read('en/articles.html'), enItems, 'en'), enItems, 'en'), 'en', 'articles'));
  write('index.html', fillHomepageEmptyTags(replaceHeroCount(replaceItemList(read('index.html'), zhItems, 'zh'), n), zhItems));
  write('en/index.html', fillHomepageEmptyTags(replaceHeroCount(replaceItemList(read('en/index.html'), enItems, 'en'), n), enItems));
  ensureArticleSideTags(zhItems, 'zh');
  ensureArticleSideTags(enItems, 'en');
  normalizeArticleHeads(zhItems, 'zh');
  normalizeArticleHeads(enItems, 'en');
  noteFix(`index/articles numberOfItems, JSON-LD positions, hero, lede, topic-tag-count → ${n}`);

  write('feed.xml', buildFeed(zhItems, 'zh'));
  write('en/feed.xml', buildFeed(enItems, 'en'));
  noteFix(`feed.xml / en/feed.xml regenerated (${n} items)`);

  const beforeJs = read('js/site.js');
  const afterJs = ensureDates(beforeJs, { zh: zhItems, en: enItems });
  write('js/site.js', afterJs);
  if (afterJs !== beforeJs) propagateJsHash();

  let stubCount = 0;
  for (const slug of slugs) {
    const zhStub = `articles/${slug}.html`;
    const enStub = `en/articles/${slug}.html`;
    if (!exists(zhStub)) { write(zhStub, legacyStub(slug, 'zh')); stubCount++; }
    if (!exists(enStub)) { write(enStub, legacyStub(slug, 'en')); stubCount++; }
  }
  if (stubCount) noteFix(`legacy /articles/ stubs created: ${stubCount}`);

  write('tools/nginx-legacy-redirects.conf', buildNginxRedirects());
  write('REDIRECT_MAP.txt', buildRedirectMap());
  noteFix('tools/nginx-legacy-redirects.conf + REDIRECT_MAP.txt regenerated');

  let sitemap = read('sitemap.xml');
  const before = sitemap;
  sitemap = stripSitemapUrl(sitemap, `${HOST}/virtual-card.html`);
  sitemap = stripSitemapUrl(sitemap, `${HOST}/en/virtual-card.html`);
  if (sitemap !== before) {
    write('sitemap.xml', sitemap);
    noteFix('sitemap.xml: removed virtual-card.html entries');
  }

  propagateJsHash();
}

function runChecks() {
  const index = read('index.html');
  if (!index.includes('https://coin.ponr.org/') || index.includes('https://ponr.org/articles/')) {
    fail('this script is for coin.ponr.org (docs-coin); do not run it in docs');
  }

  for (const slug of slugs) {
    if (!exists(zhPath(slug))) fail(`missing ${zhPath(slug)}`);
    if (!exists(enPath(slug))) fail(`missing ${enPath(slug)}`);
  }

  const n = slugs.length;
  const topicCounts = {};
  for (const t of TOPICS) topicCounts[t] = slugs.filter((s) => slugTopicMap[s] === t).length;

  for (const t of TOPICS) {
    const zhFiles = fs.readdirSync(path.join(root, 'research', t)).filter((f) => f.endsWith('.html') && f !== 'index.html');
    const enFiles = fs.readdirSync(path.join(root, 'en', 'research', t)).filter((f) => f.endsWith('.html') && f !== 'index.html');
    if (zhFiles.length !== topicCounts[t]) fail(`research/${t} has ${zhFiles.length} files, map has ${topicCounts[t]}`);
    if (enFiles.length !== topicCounts[t]) fail(`en/research/${t} has ${enFiles.length} files, map has ${topicCounts[t]}`);
  }

  const files = {
    'index.html': read('index.html'),
    'en/index.html': read('en/index.html'),
    'articles.html': read('articles.html'),
    'en/articles.html': read('en/articles.html'),
    'feed.xml': read('feed.xml'),
    'en/feed.xml': read('en/feed.xml'),
    'sitemap.xml': read('sitemap.xml'),
    'js/site.js': read('js/site.js'),
  };

  for (const f of ['index.html', 'en/index.html', 'articles.html', 'en/articles.html']) {
    const m = files[f].match(/"numberOfItems":\s*(\d+)/);
    if (!m) fail(`${f}: no numberOfItems`);
    else if (+m[1] !== n) fail(`${f}: numberOfItems ${m[1]} !== ${n}`);
    const listBlock = (files[f].match(/"@type": "ItemList"[\s\S]*?"itemListElement": \[[\s\S]*?\n    \] \}/) || [])[0] || '';
    const listPos = [...listBlock.matchAll(/"position":\s*(\d+)/g)].map((x) => +x[1]);
    const expected = Array.from({ length: n }, (_, i) => i + 1);
    if (listPos.join(',') !== expected.join(',')) {
      fail(`${f}: JSON-LD positions not 1..${n} (got ${listPos.slice(0, 5).join(',')}… len=${listPos.length})`);
    }
    if ((listBlock.match(/"@type": "ItemList"/g) || []).length !== 1) {
      fail(`${f}: ItemList JSON-LD looks concatenated into a title (unescaped $ in replace)`);
    }
  }

  const heroZh = files['index.html'].match(/hero-stat-num">(\d+)<\/span><span class="hero-stat-label">篇文章/);
  const heroEn = files['en/index.html'].match(/hero-stat-num">(\d+)<\/span><span class="hero-stat-label">Articles/);
  if (!heroZh || +heroZh[1] !== n) fail(`index.html hero ${heroZh && heroZh[1]} !== ${n}`);
  if (!heroEn || +heroEn[1] !== n) fail(`en/index.html hero ${heroEn && heroEn[1]} !== ${n}`);

  if (!files['articles.html'].includes(`共 ${n} 篇`)) fail(`articles.html lede is not 共 ${n} 篇`);
  if (!files['en/articles.html'].includes(`${n} articles`)) fail(`en/articles.html lede is not ${n} articles`);
  const emptyZh = countEmptyArchiveTags(files['articles.html']);
  const emptyEn = countEmptyArchiveTags(files['en/articles.html']);
  if (emptyZh) fail(`articles.html has ${emptyZh} empty archive-tag pills`);
  if (emptyEn) fail(`en/articles.html has ${emptyEn} empty archive-tag pills`);
  const emptyHomeZh = countEmptyHomeTags(files['index.html']);
  const emptyHomeEn = countEmptyHomeTags(files['en/index.html']);
  if (emptyHomeZh) fail(`index.html has ${emptyHomeZh} empty archive-tag pills`);
  if (emptyHomeEn) fail(`en/index.html has ${emptyHomeEn} empty archive-tag pills`);

  let missingZhSide = 0;
  let missingEnSide = 0;
  for (const slug of slugs) {
    const zhHead = (read(zhPath(slug)).match(/<header class="article-head">[\s\S]*?<\/header>/) || [])[0] || '';
    const enHead = (read(enPath(slug)).match(/<header class="article-head">[\s\S]*?<\/header>/) || [])[0] || '';
    if (!/class="side-tag archive-tag/.test(zhHead)) missingZhSide++;
    if (!/class="side-tag archive-tag/.test(enHead)) missingEnSide++;
  }
  if (missingZhSide) fail(`${missingZhSide} zh articles missing article-head side-tag`);
  if (missingEnSide) fail(`${missingEnSide} en articles missing article-head side-tag`);

  for (const t of TOPICS) {
    const zhItems = (files['articles.html'].match(new RegExp(`<li class="archive-item" data-topic="${t}">`, 'g')) || []).length;
    if (zhItems !== topicCounts[t]) fail(`articles.html archive ${t}=${zhItems}, map=${topicCounts[t]}`);
    const tag = files['articles.html'].match(new RegExp(`data-topic="${t}"[^>]*>[^<]*<span class="topic-tag-count">(\\d+)</span>`));
    if (!tag || +tag[1] !== topicCounts[t]) fail(`articles.html topic-tag-count ${t}=${tag && tag[1]}, map=${topicCounts[t]}`);
    const enItems = (files['en/articles.html'].match(new RegExp(`<li class="archive-item" data-topic="${t}">`, 'g')) || []).length;
    if (enItems !== topicCounts[t]) fail(`en/articles.html archive ${t}=${enItems}, map=${topicCounts[t]}`);
  }

  const feedZh = (files['feed.xml'].match(/<item>/g) || []).length;
  const feedEn = (files['en/feed.xml'].match(/<item>/g) || []).length;
  if (feedZh !== n) fail(`feed.xml items ${feedZh} !== ${n}`);
  if (feedEn !== n) fail(`en/feed.xml items ${feedEn} !== ${n}`);

  for (const slug of slugs) {
    if (!files['js/site.js'].includes(`'/${zhPath(slug)}':`)) fail(`DATES missing /${zhPath(slug)}`);
    if (!files['js/site.js'].includes(`'/${enPath(slug)}':`)) fail(`DATES missing /${enPath(slug)}`);
    if (!files['sitemap.xml'].includes(`${HOST}/${zhPath(slug)}`)) fail(`sitemap missing ${zhPath(slug)}`);
    if (!files['sitemap.xml'].includes(`${HOST}/${enPath(slug)}`)) fail(`sitemap missing ${enPath(slug)}`);
    if (!exists(`articles/${slug}.html`)) fail(`legacy stub missing articles/${slug}.html`);
    if (!exists(`en/articles/${slug}.html`)) fail(`legacy stub missing en/articles/${slug}.html`);
    else {
      const stub = read(`articles/${slug}.html`);
      if (!stub.includes('noindex')) fail(`legacy stub not noindex: articles/${slug}.html`);
      if (!stub.includes(`/${zhPath(slug)}`)) fail(`legacy stub canonical mismatch: articles/${slug}.html`);
    }
  }

  const vc = read('virtual-card.html');
  const vcEn = read('en/virtual-card.html');
  if (!/noindex/.test(vc)) fail('virtual-card.html still indexable');
  if (!/noindex/.test(vcEn)) fail('en/virtual-card.html still indexable');
  if (!vc.includes('research-tools-virtual-card-guide.html')) fail('virtual-card.html canonical not pointing at research article');
  if (files['sitemap.xml'].includes(`${HOST}/virtual-card.html`)) fail('sitemap still lists /virtual-card.html');
  if (files['sitemap.xml'].includes(`${HOST}/en/virtual-card.html`)) fail('sitemap still lists /en/virtual-card.html');

  if (!exists('tools/nginx-legacy-redirects.conf')) fail('tools/nginx-legacy-redirects.conf missing');
  else {
    const ngx = read('tools/nginx-legacy-redirects.conf');
    const rewrites = (ngx.match(/^rewrite /gm) || []).length;
    if (rewrites !== n * 2 + 2) fail(`nginx redirect map has ${rewrites} rewrites, expected ${n * 2 + 2}`);
    if (!ngx.includes('virtual-card')) fail('nginx redirect map missing virtual-card');
  }
  if (!exists('REDIRECT_MAP.txt')) fail('REDIRECT_MAP.txt missing');

  const jsHash = sha1prefix('js/site.js');
  if (!files['index.html'].includes(`site.js?v=${jsHash}`)) {
    fail(`index.html site.js hash != sha1 of js/site.js (${jsHash})`);
  }

  if (!exists('CLAUDE.md')) fail('CLAUDE.md missing (publish/editorial entry)');
}

if (FIX) applyFix();
runChecks();

if (fixes.length) {
  console.log('Fixed:');
  for (const m of fixes) console.log('  - ' + m);
}
if (failures.length) {
  console.log(`\nFAIL ${failures.length} check(s):`);
  for (const m of failures) console.log('  - ' + m);
  process.exit(1);
}
console.log(`OK  ${slugs.length} slugs, 4 topics, JSON-LD 1..n, feeds, DATES, legacy stubs, virtual-card noindex`);
process.exit(0);
