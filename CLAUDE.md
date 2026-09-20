# coin.ponr.org — 加密货币研究（docs-coin）

静态站，无构建框架。中文根目录 + `/en/` 英文镜像，**同一 slug**，靠路径区分语言。线上 https://coin.ponr.org。

这不是 ponr.org（`docs`）。那边是 AI 订阅/支付指南，中英常 **不同 slug**，首页网格不封顶，CSS/JS 走 minify+MD5。**不要把那边的 `publish-article.js` 拿到这里跑，也不要把这里的脚本拷过去。**

## 选题边界

只写四个 topic：`basics` / `governance` / `market` / `protocol`。

不要抢姐妹站 ponr.org 已经占的支付、订阅、虚拟卡操作垂直。虚拟卡文章只有「链上/研究核验」角度才能写。禁止「what is X」百科文；每篇必须有可执行的核验动作。

## 发文

1. 手写 `research/<topic>/<slug>.html` 与 `en/research/<topic>/<slug>.html`（含核验清单）。
2. 填 `tools/publish-article.js` 的 `CONFIG`，跑 `node tools/publish-article.js`。
3. 立刻再跑 `node tools/verify-publish.js`。计数、DATES、旧 URL 跳转桩、JSON-LD position 对不上时，用 `node tools/verify-publish.js --fix` 以 `slug_topic_map.json` 为源对齐，再复查。`--fix` 只补空的归档/RSS 标签，不会整表重写已有标题。

文章计数以 `slug_topic_map.json` 为准，不要手工改首页 127/128。

## 旧 URL 与 301

2026-08-22 起正式路径是 `/research/<topic>/<slug>.html`。旧 `/articles/<slug>.html` 只留 `noindex` + meta refresh 桩。服务端 301 规则在：

- `REDIRECT_MAP.txt`（与 ponr.org/docs 同格式，给现有 nginx 地图用）
- `tools/nginx-legacy-redirects.conf`（`rewrite ... permanent;`，include 进 coin.ponr.org 的 server 块才会变成真 301）

没有把这份 conf include 进源站 nginx 之前，搜索引擎仍可能只吃到客户端跳转。

## 资源缓存

页面引用未压缩的 `styles.css` / `js/site.js`，`?v=` 是 sha1 前 8 位。改了 `js/site.js`（包括只加 DATES）必须重算哈希，否则边缘缓存还是旧文件。
