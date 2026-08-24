// Generates the 4 topic hub/landing pages (research/<topic>/index.html and
// en/research/<topic>/index.html) from the current slug_topic_map.json + each
// article's own <head> meta. Modeled on the sibling ponr.org site's /topics/<topic>/
// pages. Run standalone (`node tools/generate-topic-hubs.js`) or via
// publish-article.js after every new publish, since the article list changes.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');

const TOPICS = {
  basics: {
    zhLabel: '研究方法基础', enLabel: 'Research Foundations',
    zhTitle: '加密货币研究方法基础：从链上数据到项目分析入门',
    enTitle: 'Crypto Research Foundations: From On-Chain Data to Project Analysis',
    zhIntro: '刚开始研究一个加密项目，最容易踩的坑不是不懂技术，而是不知道该核实什么、去哪核实。本类目收录的文章围绕研究方法本身展开：怎么读懂链上数据、怎么核对交易所与稳定币的基础披露、怎么建立一套可重复的核验习惯，而不是道听途说或只看营销页面。',
    enIntro: "Getting started with crypto project research usually goes wrong not from lacking technical knowledge, but from not knowing what to verify or where. This category covers research methodology itself — reading on-chain data, checking exchange and stablecoin disclosures, and building a repeatable verification habit instead of relying on marketing pages.",
  },
  governance: {
    zhLabel: '治理、资产与专项核验', enLabel: 'Governance, Assets & Special Checks',
    zhTitle: '治理与资产核验：DAO投票、多签与专项风险排查',
    enTitle: 'Governance & Asset Verification: DAO Voting, Multisig & Special-Case Checks',
    zhIntro: '治理机制看起来「去中心化」，但执行环节往往藏着可以被悄悄改动的地方：多签门槛、时间锁窗口、链下投票的执行方式、资产赎回的法律条款。本类目专注这些容易被忽视的执行细节，给出具体的核验步骤而不是泛泛而谈的治理理念。',
    enIntro: "Governance mechanisms look decentralized on paper, but execution details are where things quietly drift — multisig thresholds, timelock windows, how off-chain votes actually get executed, the legal fine print behind asset redemption. This category focuses on those overlooked execution details with concrete verification steps, not abstract governance theory.",
  },
  market: {
    zhLabel: '市场结构与流动性', enLabel: 'Market Structure & Liquidity',
    zhTitle: '市场结构与流动性研究：做市机制、清算与资金费率核验',
    enTitle: 'Market Structure & Liquidity: Market-Making, Liquidation & Funding Rate Checks',
    zhIntro: '价格图表之外，真正决定一笔交易能否顺利成交、能否按预期价格执行的是市场结构本身：流动性深度、清算机制、资金费率如何被计算与可能被操纵。本类目拆解这些结构性因素，帮助判断一个市场的真实健康程度，而不是只看K线走势。',
    enIntro: "Beyond the price chart, what actually determines whether a trade executes at the price you expect is market structure itself — liquidity depth, liquidation mechanics, and how funding rates are calculated (and sometimes manipulated). This category breaks down those structural factors to help judge a market's real health, not just its candlesticks.",
  },
  protocol: {
    zhLabel: '协议与基础设施风险', enLabel: 'Protocol & Infrastructure Risk',
    zhTitle: '协议与基础设施风险核验：跨链桥、预言机与智能合约安全',
    enTitle: 'Protocol & Infrastructure Risk: Bridges, Oracles & Smart Contract Security',
    zhIntro: '跨链桥、预言机、智能合约这些基础设施一旦出问题，影响的往往不是一个用户而是整条链上的资金安全。本类目是站内篇幅最大的分类，专注这些基础设施本身的风险点核验方法：验证者集变化、报价延迟窗口、审计覆盖范围等具体细节。',
    enIntro: "When infrastructure like cross-chain bridges, oracles, or smart contracts breaks, it rarely affects just one user — it threatens funds across an entire chain. This is the site's largest category, focused on concrete verification methods for infrastructure risk: validator set changes, quote-staleness windows, audit coverage scope, and more.",
  },
};

const slugTopicMap = JSON.parse(fs.readFileSync(path.join(root, 'slug_topic_map.json'), 'utf-8'));

function extractMeta(slug, lang) {
  const rel = lang === 'en' ? `en/research/${slugTopicMap[slug]}/${slug}.html` : `research/${slugTopicMap[slug]}/${slug}.html`;
  const html = fs.readFileSync(path.join(root, rel), 'utf-8');
  const h1 = (html.match(/<h1>([\s\S]*?)<\/h1>/) || [])[1] || '';
  const cardDesc = (html.match(/<p class="article-summary">([\s\S]*?)<\/p>/) || [])[1] || '';
  const pub = (html.match(/<meta property="article:published_time" content="([^"]*)"/) || [])[1] || '';
  return { h1, cardDesc, pub, href: `/${rel}` };
}

function truncate(s, n) {
  const clean = s.replace(/<[^>]+>/g, '');
  return clean.length > n ? clean.slice(0, n).replace(/[，,、\s]+\S*$/, '') + '…' : clean;
}

function buildHub(topic, lang) {
  const t = TOPICS[topic];
  const slugs = Object.keys(slugTopicMap).filter(s => slugTopicMap[s] === topic);
  const items = slugs.map(slug => extractMeta(slug, lang)).sort((a, b) => new Date(b.pub) - new Date(a.pub));

  const isEn = lang === 'en';
  const title = isEn ? t.enTitle : t.zhTitle;
  const intro = isEn ? t.enIntro : t.zhIntro;
  const label = isEn ? t.enLabel : t.zhLabel;
  const host = 'https://coin.ponr.org';
  const urlPath = isEn ? `/en/research/${topic}/` : `/research/${topic}/`;
  const desc = `${intro} ${isEn ? `This category collects ${items.length} articles.` : `本类目共收录${items.length}篇文章。`}`.slice(0, isEn ? 160 : 150);

  const linkList = items.map(it => {
    const desc1 = truncate(it.cardDesc, isEn ? 90 : 40);
    return `          <li><a href="${it.href}">${it.h1}</a> — ${desc1}</li>`;
  }).join('\n');

  const itemListJson = items.map((it, i) => `        { "@type": "ListItem", "position": ${i + 1}, "name": "${it.h1.replace(/"/g, '\\"')}", "url": "${host}${it.href}" }`).join(',\n');

  const nav = isEn
    ? `        <a href="/en/">Home</a>\n        <a href="/en/articles.html">All Articles</a>\n        <a href="/en/about.html">About</a>\n        <a class="lang-switch" href="${`/research/${topic}/`}" hreflang="zh-CN" lang="zh-CN">中文</a>`
    : `        <a href="/">首页</a>\n        <a href="/articles.html">全部文章</a>\n        <a href="/about.html">关于</a>\n        <a class="lang-switch" href="${`/en/research/${topic}/`}" hreflang="en" lang="en">EN</a>`;

  const backRow = isEn
    ? `<a href="/articles.html?topic=${topic}">Filter all articles by this topic</a> · <a href="/en/">Back to home</a>`
    : `<a href="/articles.html?topic=${topic}">在全部文章中按此主题筛选</a> · <a href="/">返回首页</a>`;

  return `<!doctype html>
<html lang="${isEn ? 'en' : 'zh-CN'}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}${isEn ? ' - Crypto Research Notes' : ' - 加密货币研究'}</title>
  <meta name="description" content="${desc}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <meta name="author" content="ipfsWeb">
  <link rel="canonical" href="${host}${urlPath}">
  <link rel="alternate" hreflang="zh-CN" href="${host}/research/${topic}/">
  <link rel="alternate" hreflang="en" href="${host}/en/research/${topic}/">
  <link rel="alternate" hreflang="x-default" href="${host}/research/${topic}/">
  <meta property="og:locale" content="${isEn ? 'en_US' : 'zh_CN'}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${isEn ? 'Crypto Research Notes' : '加密货币研究'}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${desc}">
  <meta property="og:url" content="${host}${urlPath}">
  <link rel="icon" href="/favicon.ico" sizes="48x48">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
  <link rel="manifest" href="/site.webmanifest">
  <link rel="alternate" type="application/rss+xml" title="${isEn ? 'Crypto Research Notes RSS' : '加密货币研究 RSS'}" href="/feed.xml">
  <meta name="theme-color" content="#2f5b8c">
  <script>(function(){try{var t=localStorage.getItem('theme');var d=t!=='light';if(d)document.documentElement.setAttribute('data-theme','dark');}catch(e){}})();</script>
  <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&display=swap">
  <link rel="stylesheet" href="/styles.css?v=__CSS_HASH__">
  <script type="application/ld+json">{
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", "@id": "${host}/#org", "name": "${isEn ? 'Crypto Research Notes' : '加密货币研究'}", "url": "${host}/", "logo": { "@type": "ImageObject", "url": "${host}/logo.png", "width": 512, "height": 512 } },
    { "@type": "WebSite", "@id": "${host}/#website", "url": "${host}/", "name": "${isEn ? 'Crypto Research Notes' : '加密货币研究'}", "inLanguage": "${isEn ? 'en-US' : 'zh-CN'}", "publisher": { "@id": "${host}/#org" } },
    { "@type": "CollectionPage", "@id": "${host}${urlPath}#webpage", "url": "${host}${urlPath}", "name": "${title}", "isPartOf": { "@id": "${host}/#website" }, "breadcrumb": { "@id": "${host}${urlPath}#breadcrumb" }, "inLanguage": "${isEn ? 'en-US' : 'zh-CN'}" },
    { "@type": "BreadcrumbList", "@id": "${host}${urlPath}#breadcrumb", "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "${isEn ? 'Home' : '首页'}", "item": "${isEn ? host + '/en/' : host + '/'}" },
        { "@type": "ListItem", "position": 2, "name": "${isEn ? 'All Articles' : '全部文章'}", "item": "${isEn ? host + '/en/articles.html' : host + '/articles.html'}" },
        { "@type": "ListItem", "position": 3, "name": "${title}", "item": "${host}${urlPath}" }
    ] },
    { "@type": "ItemList", "itemListElement": [
${itemListJson}
    ] }
  ]
}</script>
</head>
<body>
  <a class="skip-link" href="#main">${isEn ? 'Skip to main content' : '跳到主要内容'}</a>
  <header class="site-header" id="top">
    <div class="header-inner">
      <a class="brand" href="${isEn ? '/en/' : '/'}" aria-label="${isEn ? 'Crypto Research Notes home' : '加密货币研究首页'}">
        <img class="brand-logo" src="/favicon.svg" width="34" height="34" alt="" aria-hidden="true">
        <span class="brand-text"><span class="brand-name">${isEn ? 'Crypto Research Notes' : '加密货币研究'}</span></span>
      </a>
      <nav class="site-nav" aria-label="${isEn ? 'Main navigation' : '主导航'}">
${nav}
        <button type="button" class="theme-toggle" aria-label="${isEn ? 'Toggle dark mode' : '切换深色模式'}" aria-pressed="false"><svg class="theme-icon-sun" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><line x1="12" y1="2" x2="12" y2="4"></line><line x1="12" y1="20" x2="12" y2="22"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="2" y1="12" x2="4" y2="12"></line><line x1="20" y1="12" x2="22" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg><svg class="theme-icon-moon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg></button>
      </nav>
    </div>
    <div class="ticker-tape" id="ticker-tape"><div class="ticker-track" id="ticker-track"></div></div>
  </header>
  <div class="layout layout--single">
    <main class="main" id="main" tabindex="-1">
      <article class="article-shell">
        <header class="article-head">
          <h1>${title}</h1>
        </header>
        <div class="article-body">
        <p>${intro} ${isEn ? `This category collects ${items.length} articles.` : `本类目共收录${items.length}篇文章。`}</p>
        <ul class="hub-link-list">
${linkList}
        </ul>
        </div>
        <div class="back-row">${backRow}</div>
      </article>
    </main>
  </div>
  <footer class="site-foot site-foot--rich">
    <div class="site-foot-grid">
      <div class="site-foot-brand">
        <img src="/favicon.svg" width="32" height="32" alt="" aria-hidden="true">
        <div>
          <span class="site-foot-brand-name">${isEn ? 'Crypto Research Notes' : '加密货币研究'}</span>
          <p class="site-foot-desc">${isEn ? 'A research site on crypto project methodology, on-chain data, and stablecoin cross-chain flows.' : '聚焦加密货币研究方法与链上数据的中文站点，记录研究框架、链上指标解读与资金流观察。'}</p>
        </div>
      </div>
      <div class="site-foot-col site-foot-col--topics">
        <h3>${isEn ? 'Popular Topics' : '热门主题'}</h3>
        <ul>
          <li><a href="${isEn ? '/en/research/basics/' : '/research/basics/'}">${isEn ? TOPICS.basics.enLabel : TOPICS.basics.zhLabel}</a></li>
          <li><a href="${isEn ? '/en/research/protocol/' : '/research/protocol/'}">${isEn ? TOPICS.protocol.enLabel : TOPICS.protocol.zhLabel}</a></li>
          <li><a href="${isEn ? '/en/research/market/' : '/research/market/'}">${isEn ? TOPICS.market.enLabel : TOPICS.market.zhLabel}</a></li>
          <li><a href="${isEn ? '/en/research/governance/' : '/research/governance/'}">${isEn ? TOPICS.governance.enLabel : TOPICS.governance.zhLabel}</a></li>
        </ul>
      </div>
      <div class="site-foot-col">
        <h3>${isEn ? 'Site' : '站点'}</h3>
        <ul>
          <li><a href="${isEn ? '/en/articles.html' : '/articles.html'}">${isEn ? 'All Articles' : '全部文章'}</a></li>
          <li><a href="${isEn ? '/en/about.html' : '/about.html'}">${isEn ? 'About' : '关于本站'}</a></li>
          <li><a href="${isEn ? '/en/feed.xml' : '/feed.xml'}">RSS</a></li>
          <li><a href="https://github.com/alive-worker/docs-coin" target="_blank" rel="noopener">GitHub</a></li>
        </ul>
      </div>
      <div class="site-foot-col site-foot-col--friends">
        <h3>${isEn ? 'Friends' : '友情链接'}</h3>
        <ul>
          <li><a href="https://aiplussub.com/" target="_blank" rel="noopener nofollow sponsored">AI代付</a></li>
          <li><a href="https://allswap.io/" target="_blank" rel="noopener nofollow sponsored">链兑换</a></li>
          <li><a href="https://rdvcc.com/" target="_blank" rel="noopener nofollow sponsored">虚拟卡</a></li>
          <li><a href="https://chdh.me/" target="_blank" rel="noopener">出海导航</a></li>
        </ul>
      </div>
    </div>
    <div class="site-foot-bottom">
      <p>© 2026 ${isEn ? 'Crypto Research Notes' : '加密货币研究'} · <a href="${isEn ? '/en/about.html' : '/about.html'}">${isEn ? 'About & Disclaimer' : '关于本站与免责声明'}</a></p>
    </div>
  </footer>
  <script src="/js/site.js?v=__JS_HASH__"></script>
</body>
</html>
`;
}

function currentHash(file) {
  const sample = fs.readFileSync(path.join(root, 'index.html'), 'utf-8');
  const re = file === 'styles.css' ? /styles\.css\?v=([a-f0-9]+)/ : /site\.js\?v=([a-f0-9]+)/;
  return (sample.match(re) || [])[1] || '';
}

function main() {
  const cssHash = currentHash('styles.css');
  const jsHash = currentHash('site.js');
  for (const topic of Object.keys(TOPICS)) {
    for (const lang of ['zh', 'en']) {
      const html = buildHub(topic, lang).replace('__CSS_HASH__', cssHash).replace('__JS_HASH__', jsHash);
      const dir = lang === 'en' ? path.join(root, 'en/research', topic) : path.join(root, 'research', topic);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf-8');
    }
  }
  console.log('Topic hub pages generated for:', Object.keys(TOPICS).join(', '));
}

main();
