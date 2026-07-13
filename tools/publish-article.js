// One-shot site-wide integration for publishing a new article.
// Fill in CONFIG below, then: node tools/publish-article.js
//
// What it does (all 24-30 existing files, both languages):
//   1. Inserts a sidebar <a class="side-item"> entry into every article/404 page.
//   2. Inserts a related-article <li> into every existing article's "related" aside.
//   3. Bumps numberOfItems and prepends a ListItem in the ItemList JSON-LD on
//      index.html / articles.html (zh + en).
//   4. Promotes the new article to the homepage's featured card, demotes the
//      previous featured article to the top of the "latest" grid, and drops the
//      oldest grid card to keep the grid at 9 items (zh + en).
//   5. Inserts an archive-item row into articles.html / en/articles.html.
//   6. Adds <url> entries to sitemap.xml.
//   7. Regenerates feed.xml / en/feed.xml from each article page's own <head> meta.
//   8. Adds DATES entries to js/site.js.
//   9. Recomputes and propagates the styles.css / site.js cache-bust hash IF (and
//      only if) either file's content actually changed (e.g. a new tag color).
//
// What it does NOT do (do these yourself first):
//   - Write the article's own two HTML pages (zh + en) — build those the way this
//     session did (clone a similar existing article as a template, splice in the
//     generated sections, keep an eye out for the corruption patterns the verify
//     step catches: truncated paragraphs, "see above" placeholder subsections,
//     a sponsored link that's plain text instead of an <a>).
//   - Add a brand-new archive-tag color to styles.css if the topic needs one not
//     already defined (grep for archive-tag--<color> first).
//   - Draw the AI-tech cover SVGs (zh + en) if the topic is new.
//
// Idempotent: safe to re-run — each step early-outs if the new slug is already present.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// CONFIG — fill this in for each new article, then run the script.
// ---------------------------------------------------------------------------
const CONFIG = {
  slug: 'REPLACE-ME-slug-here',           // e.g. 'dex-liquidity-research-guide'
  publishedISO: '2026-01-01T00:00:00+08:00',
  tagColor: 'violet',                      // must already exist as .archive-tag--<color> in styles.css

  zh: {
    h1: 'REPLACE ME',
    tagLabel: 'REPLACE ME',                // short sidebar/tag label, e.g. "DEX流动性"
    cardDesc: 'REPLACE ME',                // short one-liner used in sidebar + featured-desc
  },
  en: {
    h1: 'REPLACE ME',
    tagLabel: 'REPLACE ME',
    cardDesc: 'REPLACE ME',
  },

  // Every OTHER existing article slug, in the site's current newest-first order.
  // Copy this from the previous run of this script / from articles.html's <ol>,
  // and just leave off the slug you're publishing now.
  existingSlugsNewestFirst: [
    'airdrop-sybil-detection-research-guide',
    'bridge-security-research-guide',
    'oracle-price-feed-research-guide',
    'team-developer-activity-research-guide',
    'exchange-reserves-research-guide',
    'dao-governance-research-guide',
    'contract-security-audit-guide',
    'tokenomics-research-guide',
    'research-tools-virtual-card-guide',
    'crypto-research-fundamentals',
    'onchain-data-analysis',
    'stablecoin-crosschain-flows',
  ],
};
// ---------------------------------------------------------------------------

function readArticle(slug, lang) {
  const dir = lang === 'en' ? 'en/articles' : 'articles';
  return fs.readFileSync(path.join(root, dir, `${slug}.html`), 'utf-8');
}

function extractArticleMeta(slug, lang) {
  const html = readArticle(slug, lang);
  const h1 = (html.match(/<h1>([\s\S]*?)<\/h1>/) || [])[1] || '';
  const desc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
  const pub = (html.match(/<meta property="article:published_time" content="([^"]*)"/) || [])[1] || '';
  const tagLabel = (html.match(/<span class="side-tag archive-tag archive-tag--[a-z]+">([^<]*)<\/span>/) || [])[1] || '';
  const tagColor = (html.match(/<span class="side-tag archive-tag archive-tag--([a-z]+)">/) || [])[1] || '';
  const cover = (html.match(/<img class="article-cover" src="([^"]*)"/) || [])[1] || '';
  const cardDesc = (html.match(/<p class="article-summary">([\s\S]*?)<\/p>/) || [])[1] || '';
  return { h1, desc, pub, tagLabel, tagColor, cover };
}

function replacer(str, regex, fn) {
  return str.replace(regex, fn);
}

// --- Step 1: sidebar item -----------------------------------------------------
function insertSidebarItems() {
  const files = [
    'index.html', '404.html',
    ...CONFIG.existingSlugsNewestFirst.map(s => `articles/${s}.html`),
    'en/index.html', 'en/404.html',
    ...CONFIG.existingSlugsNewestFirst.map(s => `en/articles/${s}.html`),
  ];
  const zhItem = `        <a class="side-item" href="/articles/${CONFIG.slug}.html">
          <span class="side-body">
            <span class="side-title"><span class="side-tag archive-tag archive-tag--${CONFIG.tagColor}">${CONFIG.zh.tagLabel}</span>${CONFIG.zh.h1}</span>
            <span class="side-desc">${CONFIG.zh.cardDesc}</span>
          </span>
        </a>
`;
  const enItem = `        <a class="side-item" href="/en/articles/${CONFIG.slug}.html">
          <span class="side-body">
            <span class="side-title"><span class="side-tag archive-tag archive-tag--${CONFIG.tagColor}">${CONFIG.en.tagLabel}</span>${CONFIG.en.h1}</span>
            <span class="side-desc">${CONFIG.en.cardDesc}</span>
          </span>
        </a>
`;
  let count = 0;
  for (const rel of files) {
    const p = path.join(root, rel);
    if (!fs.existsSync(p)) { console.log('  [sidebar] missing file, skip:', rel); continue; }
    let t = fs.readFileSync(p, 'utf-8');
    if (t.includes(`${CONFIG.slug}.html`)) continue; // already has it (idempotent)
    const isEn = rel.startsWith('en/');
    const re = /(<nav class="sidebar-nav">\n)(\s*<a class="side-item)/;
    if (!re.test(t)) continue; // homepage no longer has a sidebar since the redesign — expected skip
    t = t.replace(re, (m, g1, g2) => g1 + (isEn ? enItem : zhItem) + g2);
    fs.writeFileSync(p, t, 'utf-8');
    count++;
  }
  console.log(`[1/9] sidebar items inserted: ${count}`);
}

// --- Step 2: related-article item ---------------------------------------------
function insertRelatedItems() {
  const files = [
    ...CONFIG.existingSlugsNewestFirst.map(s => `articles/${s}.html`),
    ...CONFIG.existingSlugsNewestFirst.map(s => `en/articles/${s}.html`),
  ];
  const zhLink = `          <li><a href="/articles/${CONFIG.slug}.html">${CONFIG.zh.h1}</a></li>\n`;
  const enLink = `          <li><a href="/en/articles/${CONFIG.slug}.html">${CONFIG.en.h1}</a></li>\n`;
  let count = 0;
  for (const rel of files) {
    const p = path.join(root, rel);
    if (!fs.existsSync(p)) continue;
    let t = fs.readFileSync(p, 'utf-8');
    const isEn = rel.startsWith('en/');
    const re = /(<aside class="related"[^>]*>[\s\S]*?)(\s*<\/ul>\s*<\/aside>)/;
    const m0 = t.match(re);
    if (m0 && m0[0].includes(`${CONFIG.slug}.html`)) continue;
    if (!re.test(t)) { console.log('  [related] SKIP (pattern not found):', rel); continue; }
    t = t.replace(re, (m, before, after) => before + (isEn ? enLink : zhLink) + after);
    fs.writeFileSync(p, t, 'utf-8');
    count++;
  }
  console.log(`[2/9] related-article items inserted: ${count}`);
}

// --- Step 3: ItemList JSON-LD ---------------------------------------------------
function updateItemLists() {
  const targets = [
    { file: 'articles.html', prefix: 'https://coin.ponr.org', name: CONFIG.zh.h1 },
    { file: 'index.html', prefix: 'https://coin.ponr.org', name: CONFIG.zh.h1 },
    { file: 'en/articles.html', prefix: 'https://coin.ponr.org/en', name: CONFIG.en.h1 },
    { file: 'en/index.html', prefix: 'https://coin.ponr.org/en', name: CONFIG.en.h1 },
  ];
  let count = 0;
  for (const t of targets) {
    const p = path.join(root, t.file);
    let content = fs.readFileSync(p, 'utf-8');
    if (content.includes(`"item": "${t.prefix}/articles/${CONFIG.slug}.html"`)) continue;
    const start = content.indexOf('"@type": "ItemList"');
    const blockEnd = content.indexOf('] }', start) + 3;
    let block = content.slice(start, blockEnd);
    const numMatch = block.match(/"numberOfItems": (\d+)/);
    if (numMatch) block = block.replace(numMatch[0], `"numberOfItems": ${parseInt(numMatch[1], 10) + 1}`);
    const anchor = /(itemListElement": \[\n)/;
    if (!anchor.test(block)) { console.log('  [itemlist] SKIP (anchor not found):', t.file); continue; }
    const newItem = `        { "@type": "ListItem", "position": 1, "name": "${t.name}", "item": "${t.prefix}/articles/${CONFIG.slug}.html" },\n`;
    block = block.replace(anchor, (m, g1) => g1 + newItem);
    const positions = [...block.matchAll(/"position": (\d+)/g)];
    for (let i = positions.length - 1; i >= 1; i--) {
      const m = positions[i];
      const newNum = parseInt(m[1], 10) + 1;
      block = block.slice(0, m.index) + `"position": ${newNum}` + block.slice(m.index + m[0].length);
    }
    content = content.slice(0, start) + block + content.slice(blockEnd);
    fs.writeFileSync(p, content, 'utf-8');
    count++;
  }
  console.log(`[3/9] ItemList JSON-LD updated: ${count}`);
}

// Topic count = number of curated "READING PATHS" categories on articles.html
// (研究方法基础 / 协议与基础设施风险 / 市场结构与流动性 / 治理资产与专项核验 — currently
// 4). This is a hand-curated taxonomy, not a per-article tag count: every new
// article gets manually slotted into one of these <section class="topic-path">
// groups (see insertArchiveItem or the manual step it replaced), so the count
// only changes when a category is added/split/removed, never on a routine
// per-article publish. Must be called after that categorization step, not
// derived from archive-tag labels (which are per-article and always ~= article
// count, not a meaningful "topics" number).
function countDistinctTopics(lang) {
  const file = lang === 'en' ? 'en/articles.html' : 'articles.html';
  const t = fs.readFileSync(path.join(root, file), 'utf-8');
  const gridMatch = t.match(/<div class="topic-path-grid">([\s\S]*?)<\/div>\s*<\/section>/);
  if (!gridMatch) return null; // no reading-paths section found — leave the stat untouched
  const categories = [...gridMatch[1].matchAll(/<section class="topic-path">/g)];
  return categories.length;
}

// --- Step 4: homepage featured + grid ------------------------------------------
function updateHomepage(lang) {
  const file = lang === 'en' ? 'en/index.html' : 'index.html';
  const p = path.join(root, file);
  let t = fs.readFileSync(p, 'utf-8');
  if (t.includes(`${CONFIG.slug}.html`)) { console.log(`  [homepage-${lang}] already updated, skip`); return; }

  const prevFeaturedSlug = CONFIG.existingSlugsNewestFirst[0];
  const prevFeatured = extractArticleMeta(prevFeaturedSlug, lang);
  const dropSlug = CONFIG.existingSlugsNewestFirst[CONFIG.existingSlugsNewestFirst.length - 1]; // oldest, currently last in grid
  const cfgLang = lang === 'en' ? CONFIG.en : CONFIG.zh;
  const artPrefix = lang === 'en' ? '/en/articles/' : '/articles/';
  const coverSuffix = lang === 'en' ? '-en.svg' : '.svg';

  // "篇文章" is a plain count. "个主题" is NOT the same number by coincidence —
  // it must NOT be blindly bumped alongside the article count (see git history:
  // prior to this fix the two counters were bumped in lockstep every publish,
  // which drifted from reality the moment a new article's tag wasn't a brand
  // new category). It now reflects the curated reading-paths category count —
  // see countDistinctTopics() — which this repo intentionally keeps fixed at 4.
  // A brand-new article usually slots into an EXISTING category, so 个主题 stays
  // unchanged on a routine publish; only bump it by hand if you add a new
  // <section class="topic-path"> category.
  const oldArticleCount = CONFIG.existingSlugsNewestFirst.length;
  const newArticleCount = oldArticleCount + 1;
  const topicCount = countDistinctTopics(lang);
  t = t.replace(
    /(<span class="hero-stat-num">)\d+(<\/span><span class="hero-stat-label">(?:篇文章|Articles))/,
    `$1${newArticleCount}$2`
  );
  if (topicCount !== null) {
    t = t.replace(
      /(<span class="hero-stat-num">)\d+(<\/span><span class="hero-stat-label">(?:个主题|Topics))/,
      `$1${topicCount}$2`
    );
  }

  // swap featured card
  const featuredRe = /<section class="featured-article"[\s\S]*?<\/section>/;
  const label = lang === 'en' ? '— FEATURED' : '— 置顶阅读';
  const readMore = lang === 'en' ? 'Read more →' : '阅读详情 →';
  const ariaLabel = lang === 'en' ? 'Featured article' : '精选文章';
  const newFeatured = `<section class="featured-article" aria-label="${ariaLabel}">
        <a class="featured-card" href="${artPrefix}${CONFIG.slug}.html">
          <span class="featured-cover-wrap">
            <img class="featured-cover" src="/img/article-${CONFIG.slug.replace(/-research-guide$/, '')}${coverSuffix}" width="480" height="240" alt="${cfgLang.h1} ${lang === 'en' ? 'cover image' : '封面图'}" fetchpriority="high">
          </span>
          <span class="featured-body">
            <span class="featured-label">${label}</span>
            <span class="featured-title-row">
              <span class="archive-tag archive-tag--${CONFIG.tagColor}">${cfgLang.tagLabel}</span>
              <span class="featured-title">${cfgLang.h1}</span>
            </span>
            <span class="featured-desc">${cfgLang.cardDesc}</span>
            <span class="featured-meta">
              <time datetime="${CONFIG.publishedISO}">${CONFIG.publishedISO.replace('T', ' ').replace(/\+.*/, '')}</time>
              <span class="featured-more">${readMore}</span>
            </span>
          </span>
        </a>
      </section>`;
  if (!featuredRe.test(t)) throw new Error(`[homepage-${lang}] featured-article section not found`);
  t = t.replace(featuredRe, newFeatured);

  // demote previous featured article into the top of the grid
  const readLabel = lang === 'en' ? 'Read more' : '阅读详情';
  const prevPub = prevFeatured.pub;
  const prevPubDisplay = prevPub.replace('T', ' ').replace(/\+.*/, '');
  const newGridCard = `      <article class="post-card" id="${prevFeaturedSlug}">
        <a class="post-card-cover-link" href="${artPrefix}${prevFeaturedSlug}.html" tabindex="-1" aria-hidden="true"><img class="post-card-cover" src="${prevFeatured.cover}" width="600" height="300" alt="${prevFeatured.h1} ${lang === 'en' ? 'cover image' : '封面图'}" fetchpriority="high"></a>
        <div class="post-card-body">
          <div class="post-card-tags"><span class="archive-tag archive-tag--${prevFeatured.tagColor}">${prevFeatured.tagLabel}</span></div>
          <h2 class="post-card-title"><a href="${artPrefix}${prevFeaturedSlug}.html">${prevFeatured.h1}</a></h2>
          <p class="post-card-desc">TODO-cardDesc-not-auto-extracted</p>
          <div class="post-card-meta">
            <time datetime="${prevPub}">${prevPubDisplay}</time>
            <a class="read-link" href="${artPrefix}${prevFeaturedSlug}.html">${readLabel}</a>
          </div>
        </div>
      </article>

`;
  const gridOpenRe = new RegExp(`(<div class="card-grid" aria-label="[^"]*">\\n)`);
  if (!gridOpenRe.test(t)) throw new Error(`[homepage-${lang}] card-grid opening not found`);
  t = t.replace(gridOpenRe, (m, g1) => g1 + newGridCard);

  // drop the oldest grid card (last one) to keep the grid at a fixed size
  const dropCardRe = new RegExp(`\\n?      <article class="post-card" id="${dropSlug}">[\\s\\S]*?<\\/article>\\n`);
  if (dropCardRe.test(t)) {
    t = t.replace(dropCardRe, '');
  } else {
    console.log(`  [homepage-${lang}] WARN: could not find grid card to drop for id="${dropSlug}" — check manually`);
  }

  fs.writeFileSync(p, t, 'utf-8');
  console.log(`[4/9] homepage (${lang}) featured+grid updated (drop candidate: ${dropSlug}; NOTE: post-card-desc placeholder needs a manual fix — see WARN above or grep TODO-cardDesc)`);
}

// --- Step 5: archive list (articles.html) --------------------------------------
function insertArchiveItem(lang) {
  const file = lang === 'en' ? 'en/articles.html' : 'articles.html';
  const p = path.join(root, file);
  let t = fs.readFileSync(p, 'utf-8');
  if (t.includes(`${CONFIG.slug}.html`)) return;
  const cfgLang = lang === 'en' ? CONFIG.en : CONFIG.zh;
  const artPrefix = lang === 'en' ? '/en/articles/' : '/articles/';
  const pubDisplay = CONFIG.publishedISO.replace('T', ' ').replace(/\+.*/, '');
  const item = `        <li class="archive-item">
          <a href="${artPrefix}${CONFIG.slug}.html">
            <span class="archive-tag archive-tag--${CONFIG.tagColor}" aria-hidden="true">${cfgLang.tagLabel}</span>
            <span class="archive-title">${cfgLang.h1}</span>
            <span class="archive-date"><svg class="side-cal" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M3 10h18M8 3v4M16 3v4"></path></svg><time datetime="${CONFIG.publishedISO}">${pubDisplay}</time></span>
          </a>
        </li>
`;
  const re = /(<ul class="archive-list"[^>]*>\n)(\s*<li class="archive-item">)/;
  if (!re.test(t)) { console.log(`  [archive-${lang}] SKIP (anchor not found)`); return; }
  t = t.replace(re, (m, g1, g2) => g1 + item + g2);
  fs.writeFileSync(p, t, 'utf-8');
  console.log(`[5/9] archive item inserted (${lang})`);
}

// --- Step 6: sitemap.xml --------------------------------------------------------
function updateSitemap() {
  const p = path.join(root, 'sitemap.xml');
  let t = fs.readFileSync(p, 'utf-8');
  if (t.includes(`${CONFIG.slug}.html`)) { console.log('[6/9] sitemap already updated, skip'); return; }
  const zhAnchor = `  <url>\n    <loc>https://coin.ponr.org/articles/${CONFIG.existingSlugsNewestFirst[0]}.html</loc>`;
  const enAnchor = `  <url>\n    <loc>https://coin.ponr.org/en/articles/${CONFIG.existingSlugsNewestFirst[0]}.html</loc>`;
  const zhEntry = `  <url>\n    <loc>https://coin.ponr.org/articles/${CONFIG.slug}.html</loc>\n    <lastmod>${CONFIG.publishedISO}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
  const enEntry = `  <url>\n    <loc>https://coin.ponr.org/en/articles/${CONFIG.slug}.html</loc>\n    <lastmod>${CONFIG.publishedISO}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
  if (!t.includes(zhAnchor) || !t.includes(enAnchor)) { console.log('[6/9] SKIP (anchor not found in sitemap.xml)'); return; }
  t = t.replace(zhAnchor, zhEntry + zhAnchor);
  t = t.replace(enAnchor, enEntry + enAnchor);
  fs.writeFileSync(p, t, 'utf-8');
  console.log('[6/9] sitemap.xml updated');
}

// --- Step 7: RSS feeds -----------------------------------------------------------
function toRFC822(iso) {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})([+-]\d{2}):(\d{2})$/);
  if (!m) return '';
  const [, y, mo, da, hh, mm, ss, offH, offMin] = m;
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const utcMs = Date.UTC(+y, +mo - 1, +da, +hh - parseInt(offH, 10), +mm, +ss);
  const dUtc = new Date(utcMs + parseInt(offH, 10) * 3600000);
  return `${days[dUtc.getUTCDay()]}, ${da} ${months[dUtc.getUTCMonth()]} ${y} ${hh}:${mm}:${ss} ${offH}${offMin}`;
}
function escapeXml(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function regenerateFeeds() {
  const allSlugs = [CONFIG.slug, ...CONFIG.existingSlugsNewestFirst];
  function buildFeed(lang) {
    const items = allSlugs.map(slug => {
      const meta = extractArticleMeta(slug, lang);
      const artPrefix = lang === 'en' ? 'https://coin.ponr.org/en/articles/' : 'https://coin.ponr.org/articles/';
      return { title: meta.h1, link: `${artPrefix}${slug}.html`, pub: meta.pub, category: meta.tagLabel, desc: meta.desc };
    });
    items.sort((a, b) => new Date(b.pub) - new Date(a.pub));
    const itemsXml = items.map(it => `  <item>
    <title><![CDATA[${it.title}]]></title>
    <link>${it.link}</link>
    <guid isPermaLink="true">${it.link}</guid>
    <pubDate>${toRFC822(it.pub)}</pubDate>
    <category>${escapeXml(it.category)}</category>
    <description><![CDATA[${it.desc}]]></description>
  </item>`).join('\n');
    const isEn = lang === 'en';
    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${isEn ? 'Crypto Research Notes' : '加密货币研究'}</title>
  <link>${isEn ? 'https://coin.ponr.org/en/' : 'https://coin.ponr.org/'}</link>
  <atom:link href="${isEn ? 'https://coin.ponr.org/en/feed.xml' : 'https://coin.ponr.org/feed.xml'}" rel="self" type="application/rss+xml"/>
  <description>${isEn ? 'Original long-form research on crypto research methodology, on-chain data analysis, tokenomics, smart contract security, DAO governance, oracles, cross-chain bridge security, and Sybil address detection. For learning and research only — not investment advice.' : '围绕加密货币研究方法、链上数据分析、代币经济学、智能合约安全、DAO治理、预言机、跨链桥安全与女巫地址识别的原创研究长文，中文更新。内容仅供学习研究，不构成投资建议。'}</description>
  <language>${isEn ? 'en-us' : 'zh-cn'}</language>
  <lastBuildDate>${toRFC822(items[0].pub)}</lastBuildDate>
${itemsXml}
</channel>
</rss>
`;
  }
  fs.writeFileSync(path.join(root, 'feed.xml'), buildFeed('zh'), 'utf-8');
  fs.writeFileSync(path.join(root, 'en/feed.xml'), buildFeed('en'), 'utf-8');
  console.log(`[7/9] feeds regenerated (${allSlugs.length} items each)`);
}

// --- Step 8: site.js DATES -------------------------------------------------------
function updateSiteJsDates() {
  const p = path.join(root, 'js/site.js');
  let t = fs.readFileSync(p, 'utf-8');
  if (t.includes(`${CONFIG.slug}.html`)) { console.log('[8/9] site.js DATES already updated, skip'); return; }
  const pubDisplay = CONFIG.publishedISO.replace('T', ' ').replace(/\+.*/, '');
  const zhAnchor = `  var DATES = {\n    '/articles/${CONFIG.existingSlugsNewestFirst[0]}.html':`;
  const enAnchor = `    '/en/articles/${CONFIG.existingSlugsNewestFirst[0]}.html':`;
  if (!t.includes(zhAnchor) || !t.includes(enAnchor)) { console.log('[8/9] SKIP (anchor not found in site.js)'); return; }
  t = t.replace(zhAnchor, `  var DATES = {\n    '/articles/${CONFIG.slug}.html': '${pubDisplay}',\n    '/articles/${CONFIG.existingSlugsNewestFirst[0]}.html':`);
  t = t.replace(enAnchor, `'/en/articles/${CONFIG.slug}.html': '${pubDisplay}',\n    '/en/articles/${CONFIG.existingSlugsNewestFirst[0]}.html':`);
  fs.writeFileSync(p, t, 'utf-8');
  console.log('[8/9] site.js DATES updated');
}

// --- Step 9: hash propagation (only if content changed) -------------------------
function sha1(filePath) {
  return execSync(`sha1sum "${filePath}"`).toString().trim().split(/\s+/)[0].slice(0, 8);
}
function propagateHashesIfChanged() {
  const cssPath = path.join(root, 'styles.css');
  const jsPath = path.join(root, 'js/site.js');
  const newCssHash = sha1(cssPath);
  const newJsHash = sha1(jsPath);
  const sampleFile = path.join(root, 'index.html');
  const sample = fs.readFileSync(sampleFile, 'utf-8');
  const oldCssHash = (sample.match(/styles\.css\?v=([a-f0-9]+)/) || [])[1];
  const oldJsHash = (sample.match(/site\.js\?v=([a-f0-9]+)/) || [])[1];

  function replaceHashEverywhere(oldHash, newHash, filePattern) {
    if (oldHash === newHash) return 0;
    const out = execSync(`grep -rl "${filePattern}?v=${oldHash}" --include="*.html" "${root}"`, { encoding: 'utf-8' }).trim();
    if (!out) return 0;
    const files = out.split('\n');
    for (const f of files) {
      let t = fs.readFileSync(f, 'utf-8');
      t = t.split(`${filePattern}?v=${oldHash}`).join(`${filePattern}?v=${newHash}`);
      fs.writeFileSync(f, t, 'utf-8');
    }
    return files.length;
  }
  const cssCount = replaceHashEverywhere(oldCssHash, newCssHash, 'styles.css');
  const jsCount = replaceHashEverywhere(oldJsHash, newJsHash, 'site.js');
  console.log(`[9/9] hash propagation: css ${oldCssHash}->${newCssHash} (${cssCount} files), js ${oldJsHash}->${newJsHash} (${jsCount} files)`);
}

// ---------------------------------------------------------------------------
function main() {
  if (CONFIG.slug.startsWith('REPLACE-ME')) {
    console.error('Fill in CONFIG at the top of this script before running.');
    process.exit(1);
  }
  insertSidebarItems();
  insertRelatedItems();
  updateItemLists();
  insertArchiveItem('zh');
  insertArchiveItem('en');
  updateHomepage('zh');
  updateHomepage('en');
  updateSitemap();
  regenerateFeeds();
  updateSiteJsDates();
  propagateHashesIfChanged();
  console.log('\nDone. Now: (1) fix the TODO-cardDesc placeholder(s) in index.html/en/index.html left where the');
  console.log('previously-featured article got demoted into the grid, (2) spot-check JSON-LD validity and tag');
  console.log('balance on the touched files, (3) verify in the browser.');
}

main();
