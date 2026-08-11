const fs = require('fs');
const slug = 'usdt-crosschain-transfer-security-recovery-guide';

const zh = fs.readFileSync('articles/' + slug + '.html', 'utf-8');
const en = fs.readFileSync('en/articles/' + slug + '.html', 'utf-8');
const zhIdx = fs.readFileSync('index.html', 'utf-8');
const enIdx = fs.readFileSync('en/index.html', 'utf-8');
const zhArc = fs.readFileSync('articles.html', 'utf-8');
const enArc = fs.readFileSync('en/articles.html', 'utf-8');
const sitemap = fs.readFileSync('sitemap.xml', 'utf-8');
const jsFile = fs.readFileSync('js/site.js', 'utf-8');

const checks = [
  ['ZH H1 correct', zh.includes('USDT跨链转账安全指南：网络选择、桥接核验与找回骗局防范')],
  ['EN H1 correct', en.includes('USDT Cross-Chain Transfer Security: Network Selection')],
  ['ZH summary correct', zh.includes('最危险的往往不是手续费高')],
  ['EN summary correct', en.includes('same-name token may be a different contract')],
  ['ZH sec-1 to sec-7', [1,2,3,4,5,6,7].every(n => zh.includes('id="sec-' + n + '"'))],
  ['EN sec-1 to sec-7', [1,2,3,4,5,6,7].every(n => en.includes('id="sec-' + n + '"'))],
  ['ZH rdvcc.com link', zh.includes('href="https://rdvcc.com/"')],
  ['EN rdvcc.com link', en.includes('href="https://rdvcc.com/"')],
  ['ZH chdh.me link', zh.includes('href="https://chdh.me/"')],
  ['EN chdh.me link', en.includes('href="https://chdh.me/"')],
  ['ZH canonical correct', zh.includes('https://coin.ponr.org/articles/' + slug + '.html')],
  ['EN canonical correct', en.includes('https://coin.ponr.org/en/articles/' + slug + '.html')],
  ['ZH featured = new article', zhIdx.includes('featured-article') && zhIdx.includes('/articles/' + slug + '.html')],
  ['EN featured = new article', enIdx.includes('featured-article') && enIdx.includes('/en/articles/' + slug + '.html')],
  ['ZH no TODO-cardDesc', !zhIdx.includes('TODO-cardDesc')],
  ['EN no TODO-cardDesc', !enIdx.includes('TODO-cardDesc')],
  ['ZH homepage article count 49', zhIdx.includes('>49<')],
  ['EN homepage article count 49', enIdx.includes('>49<')],
  ['ZH archive has new slug', zhArc.includes(slug)],
  ['EN archive has new slug', enArc.includes(slug)],
  ['ZH archive counter 49', zhArc.includes('共 49 篇')],
  ['EN archive counter 49', enArc.includes('49 articles')],
  ['Sitemap ZH url', sitemap.includes('coin.ponr.org/articles/' + slug + '.html')],
  ['Sitemap EN url', sitemap.includes('coin.ponr.org/en/articles/' + slug + '.html')],
  ['site.js ZH date entry', jsFile.includes('/articles/' + slug + '.html')],
  ['site.js EN date entry', jsFile.includes('/en/articles/' + slug + '.html')],
  ['JS hash no backslash prefix', !zhIdx.includes('site.js?v=\\')],
];

let pass = 0, fail = 0;
checks.forEach(([label, ok]) => {
  console.log((ok ? 'OK  ' : 'FAIL') + ' ' + label);
  ok ? pass++ : fail++;
});
console.log('\nResult: ' + pass + '/' + checks.length + ' passed' + (fail ? ' (' + fail + ' failed)' : ' ALL OK'));
