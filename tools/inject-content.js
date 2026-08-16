const fs = require('fs');
const path = require('path');
const slug = 'usdt-crosschain-transfer-security-recovery-guide';
const root = path.join(__dirname, '..');

// ---- ZH ----
const ZH_SUMMARY = 'USDT跨链时，最危险的往往不是手续费高，而是把"同名代币"当成同一种资产、把搜索结果当成官方桥、在交易卡住后把助记词交给所谓客服。本文从USDT的基础、交易所出入金的路径选择开始，讲清跨链桥与代币合约怎么核验、DeFi/链上安全如何落地，以及遇到延迟或失败交易时真正该做什么。仅供学习研究，不构成投资建议。';

const ZH_BODY = [
  '<section id="sec-1">',
  '<h2>1. USDT基础：同一个名称，不代表同一种转账路径</h2>',
  '<p>USDT是锚定美元的稳定币，但它并不只存在于一条链上。以太坊（ERC20）、波场（TRC20）、Arbitrum、Solana上的USDT可能名称完全相同，背后却是不同网络的代币合约，到账规则和手续费也截然不同。跨链操作之前，先把"我持有的是哪条链的USDT、目标是哪条链、接收方是否支持这个版本"说清楚，远比盯着最低手续费更重要。</p>',
  '<p>稳定币也不是无风险现金：它涉及发行方储备信用、所在交易平台的安全性、网络拥堵以及智能合约本身的风险。理解USDT基础，是后续交易所出入金路径选择和DeFi/链上安全操作的前提。</p>',
  '</section>',
  '',
  '<section id="sec-2">',
  '<h2>2. 交易所出入金教程：能直提，就别把跨链当默认选项</h2>',
  '<p>很多"跨链"需求其实可以在交易所的出入金阶段直接消化。入金前确认交易所支持哪些充值网络；出金前确认目标钱包或平台接收什么网络。如果交易所可以直接把USDT提到目标链，通常比"先提到一条链再经桥转到另一条"少一层合约交互、少一次授权签名，出问题也更容易排查。</p>',
  '<p>必须用桥时，先比较最小转账金额、预计到账时间、目标链所需Gas代币以及桥的官方支持范围。地址、网络、Memo/Tag（如有）必须逐项核对到位；大额操作一律先小额测试。所谓"一键跨链教程"无法替代这四项基础核对。</p>',
  '</section>',
  '',
  '<section id="sec-3">',
  '<h2>3. 原生提现、跨链桥和跨链兑换：三种动作信任假设不同</h2>',
  '<p>交易所网络提现是平台在指定网络上直接向你发币；规范跨链桥通常在源链锁定或销毁资产，在目标链释放或铸造对应表示；跨链兑换可能经流动性池撮合，最终收到的可能是另一种路由产物。界面看起来都是"从A到B"，但信任链路差异很大。</p>',
  '<p>核验时不要只看品牌名称或界面风格。检查官网域名（不要从搜索结果广告位进入）、源链和目标链的代币合约地址、支持资产列表、合约升级与管理权限、限额和最近公告。桥接后的代币是官方发行版本、封装版本还是第三方映射版本，直接决定了它能否被目标协议或交易所识别。</p>',
  '</section>',
  '',
  '<section id="sec-4">',
  '<h2>4. DeFi/链上安全：转账前的八项核验清单</h2>',
  '<ul>',
  '<li>从项目官方文档进入，不从广告、私信或陌生群链接进入。</li>',
  '<li>核对链ID、接收地址和USDT代币合约地址，而不是只看图标与名称。</li>',
  '<li>确认钱包里有足够的目标链原生Gas代币，避免资产到账后无法操作。</li>',
  '<li>确认桥的最小金额、手续费、预计确认数和目标链到账的确切资产形式。</li>',
  '<li>用小额资金测试完整路线，确认目标地址真正收到了正确资产，再转大额。</li>',
  '<li>签名前读清钱包弹窗：普通转账、指定额度授权和无限额度授权是三种完全不同的操作。</li>',
  '<li>把高风险DeFi交互与长期持有资产隔离到不同钱包地址，降低授权泄漏风险。</li>',
  '<li>定期检查并撤销已不再使用的代币授权额度。</li>',
  '</ul>',
  '<p>链上安全不是某个插件的开关，而是每次签名前把"资产、网络、合约、权限、后果"串起来核对的习惯。</p>',
  '</section>',
  '',
  '<section id="sec-5">',
  '<h2>5. 交易延迟或失败时：先保留证据，再定位卡在哪一层</h2>',
  '<p>遇到"USDT没到账"，第一件事不是反复重发交易。保存交易哈希、发送与接收地址、网络、金额和操作时间；在源链浏览器确认交易状态是待确认、失败还是已成功上链。若源链显示成功，再通过桥的官方状态页面或目标链浏览器查看是否已被中继、是否需要手动领取。</p>',
  '<p>交易所充值还需额外确认平台是否支持该网络和该种资产表示。不要按陌生人的截图或指令操作，也不要向任何声称"客服"的账号支付"解冻费"。真正的官方支持渠道不会索取助记词、私钥、屏幕共享权限或远程控制。一旦有人要求任何一项，立即中止沟通。</p>',
  '</section>',
  '',
  '<section id="sec-6">',
  '<h2>6. 支付与工具订阅：虚拟卡是结算桥梁，但不是风控工具</h2>',
  '<p>当USDT用于合规的研究工具或软件订阅场景时，<a href="https://rdvcc.com/" target="_blank" rel="noopener nofollow sponsored">虚拟卡、虚拟信用卡、美国虚拟信用卡、visa虚拟卡</a>等支付产品可以提供一层结算衔接。选择任何虚拟信用卡平台或虚拟卡发卡平台时，都应自行核对服务条款、费率结构、支持地区和发卡资质；<a href="https://rdvcc.com/" target="_blank" rel="noopener nofollow sponsored">融达虚拟信用卡</a>的具体功能和费率同样应以其官网最新披露为准，本文不作背书。</p>',
  '<p>虚拟卡只应用于真实、合法的消费场景，严禁用于套现、洗钱或规避任何地区性限制。需要查找公开工具或出海资源时，可参考<a href="https://chdh.me/" target="_blank" rel="noopener nofollow sponsored">出海导航</a>这类资源目录，但任何外部链接的具体内容仍需独立核实。</p>',
  '</section>',
  '',
  '<section id="sec-7">',
  '<h2>7. 总结与常见长尾问题</h2>',
  '<p>USDT跨链的安全逻辑链路是：先理解USDT基础和代币网络版本，在交易所出入金阶段尽量选直接网络提现，非必要不走跨链桥；必须跨链时，按八项清单核验合约、桥的可信度、权限范围和目标链Gas；DeFi/链上安全的底线是小额测试、最小授权、只从官方入口进入，以及对任何形式的"找回客服"保持零信任。</p>',
  '<p>常见长尾问题：TRC20和ERC20 USDT能否直接互发？不能，必须经过支持该路径的交易所或桥；跨链需要多久？取决于源链确认数、桥的中继速度和目标链的领取操作，差异可能从数分钟到数小时；转错网络能找回吗？取决于接收方是否控制该地址以及其支持政策，没有任何保证；资产到了为什么不能动？大概率是目标链缺少原生Gas。以上内容仅供学习与研究参考，不构成任何投资建议，加密资产价格波动剧烈且存在风险，请自行判断并对自己的决策负责。</p>',
  '</section>',
].join('\n        ');

const ZH_TOC = [
  '<li><a href="#sec-1">1. USDT基础：同一个名称，不代表同一种转账路径</a></li>',
  '          <li><a href="#sec-2">2. 交易所出入金教程：能直提，就别把跨链当默认选项</a></li>',
  '          <li><a href="#sec-3">3. 原生提现、跨链桥和跨链兑换：信任假设不同</a></li>',
  '          <li><a href="#sec-4">4. DeFi/链上安全：转账前的八项核验清单</a></li>',
  '          <li><a href="#sec-5">5. 交易延迟或失败时怎么办</a></li>',
  '          <li><a href="#sec-6">6. 支付与工具订阅：虚拟卡是结算桥梁</a></li>',
  '          <li><a href="#sec-7">7. 总结与常见长尾问题</a></li>',
].join('\n          ');

const ZH_REFS = [
  '<li><a href="https://tether.to/en/transparency/" target="_blank" rel="noopener noreferrer">Tether 透明度页面</a> —— USDT储备官方来源</li>',
  '            <li><a href="https://ethereum.org/zh/bridges/" target="_blank" rel="noopener noreferrer">Ethereum.org：跨链桥基础说明</a></li>',
  '            <li><a href="https://etherscan.io/tokenapprovalchecker" target="_blank" rel="noopener noreferrer">Etherscan 代币授权检查工具</a></li>',
].join('\n            ');

const ZH_RELATED = [
  '<li><a href="/articles/usdt-beginner-onramp-defi-security-guide.html">USDT新手完全指南：交易所出入金教程与DeFi链上安全核验</a></li>',
  '          <li><a href="/articles/stablecoin-crosschain-flows.html">稳定币与跨链资金流动</a></li>',
  '          <li><a href="/articles/bridge-security-research-guide.html">跨链桥安全研究指南</a></li>',
  '          <li><a href="/articles/onchain-forensics.html">链上取证与资金追踪方法论</a></li>',
].join('\n          ');

// ---- EN ----
const EN_SUMMARY = 'Moving USDT across chains can go wrong long before a transaction fails: a same-name token may be a different contract, a bridge page may be a clone, or a fake recovery agent may appear when funds are delayed. This guide connects USDT fundamentals, exchange on/off-ramp route planning, bridge checks, and DeFi/on-chain security into a practical response plan. For learning and research only — not investment advice.';

const EN_BODY = [
  '<section id="sec-1">',
  '<h2>1. USDT Fundamentals: the Same Ticker Does Not Mean the Same Transfer Route</h2>',
  '<p>USDT is a dollar-pegged stablecoin, but it does not live on one chain. ERC20, TRC20, Arbitrum, and Solana versions share the same name while using different token contracts with different confirmation rules and fee structures. Before moving anything, establish which chain your USDT actually lives on, which chain you need it on, and whether the recipient supports exactly that version.</p>',
  '<p>Stablecoins carry their own risks: issuer reserve quality, the security of the platform you use, network congestion, and smart contract exposure all matter. These USDT fundamentals are the starting point for every exchange on/off-ramp routing decision and DeFi security judgment that follows.</p>',
  '</section>',
  '',
  '<section id="sec-2">',
  '<h2>2. Exchange On/Off-Ramp Tutorial: a Direct Withdrawal Route Beats a Bridge</h2>',
  '<p>Many cross-chain needs can be satisfied at the exchange withdrawal step. Before depositing, check which networks the exchange supports for receiving. Before withdrawing, confirm the network the destination wallet or platform expects. If an exchange can send USDT directly on the target chain, it typically removes one contract interaction and one signature step compared to withdrawing to chain A then bridging to chain B, and any failure is much easier to diagnose.</p>',
  '<p>When bridging is unavoidable, compare minimum amounts, expected arrival time, the destination-chain gas token required, and the bridge official support scope. Address, network, and any Memo/Tag requirement all need to match exactly. Always test the full route with a small amount before moving significant funds.</p>',
  '</section>',
  '',
  '<section id="sec-3">',
  '<h2>3. Native Withdrawals, Bridges, and Cross-Chain Swaps Have Different Trust Models</h2>',
  '<p>An exchange network withdrawal sends an asset on a specified chain. A canonical bridge locks or burns on the source chain and mints or releases a representation on the destination. A cross-chain swap may route through liquidity pools and leave you with a different output asset. The interface says A to B in all three cases; the underlying trust assumptions are not the same.</p>',
  '<p>Verification means more than checking a brand name. Look up the official domain — never enter from a search ad — the token contract on source and destination chains, the supported asset list, upgrade and admin controls, limits, and recent announcements. Whether the output is issuer-native USDT, a wrapped representation, or a third-party mapping determines where it can actually be used or deposited afterward.</p>',
  '</section>',
  '',
  '<section id="sec-4">',
  '<h2>4. DeFi and On-Chain Security: an Eight-Point Pre-Transfer Checklist</h2>',
  '<ul>',
  '<li>Enter through official documentation links — not ads, DMs, or group-chat URLs.</li>',
  '<li>Check the chain ID, recipient address, and USDT token contract address, not just the icon.</li>',
  '<li>Keep enough native gas on the destination chain so you can move assets after they arrive.</li>',
  '<li>Confirm the bridge minimum, fees, expected confirmation count, and exact output asset.</li>',
  '<li>Test the complete route with a small amount and verify the correct asset reached the right address before sending more.</li>',
  '<li>Read the wallet prompt carefully: a plain transfer, a specific allowance, and an unlimited approval are three different actions.</li>',
  '<li>Separate experimental DeFi activity from long-term holdings across different wallet addresses.</li>',
  '<li>Periodically review and revoke token approvals you no longer need.</li>',
  '</ul>',
  '<p>On-chain security is not a plugin setting. It is the habit of connecting the asset, network, contract, permission scope, and consequence before signing any transaction.</p>',
  '</section>',
  '',
  '<section id="sec-5">',
  '<h2>5. When a Transfer Is Delayed or Fails: Preserve Evidence Before You Act</h2>',
  '<p>If USDT has not arrived, do not resend the transaction repeatedly. Save the transaction hash, sender and recipient addresses, network, amount, and time of operation. Check the source-chain explorer first: pending, failed, and confirmed all call for different next steps. If the source transaction confirmed, use the bridge official status page and the destination-chain explorer to find out whether relaying is pending or a manual claim step is needed.</p>',
  '<p>For exchange deposits, separately confirm that the platform supports both the network and the specific asset representation. Do not follow instructions from a stranger screenshot, and do not pay any unsolicited unlock fee. Legitimate support does not need your seed phrase, private key, screen-sharing access, or remote control under any circumstances. If anyone asks for those, end the interaction immediately.</p>',
  '</section>',
  '',
  '<section id="sec-6">',
  '<h2>6. Payments and Tool Subscriptions: a Virtual Card Is a Settlement Bridge, Not a Security Layer</h2>',
  '<p>For lawful research-tool or software subscription payments, a <a href="https://rdvcc.com/" target="_blank" rel="noopener nofollow sponsored">virtual card, virtual credit card, US virtual credit card, or Visa virtual card</a> can act as a payment bridge. When evaluating any virtual credit card platform or virtual card issuing platform, verify terms, fee structure, supported regions, and issuing credentials yourself. The features of <a href="https://rdvcc.com/" target="_blank" rel="noopener nofollow sponsored">RDVCC virtual credit cards</a> should likewise be confirmed from its current official disclosures — nothing in this article constitutes an endorsement of its performance.</p>',
  '<p>These services should only be used for genuine, lawful spending — never for cash-out, money laundering, or circumventing geographic restrictions. For publicly available tool and resource discovery, <a href="https://chdh.me/" target="_blank" rel="noopener nofollow sponsored">CHDH Tools Directory</a> is an external reference directory, but every outbound link still requires independent verification before use.</p>',
  '</section>',
  '',
  '<section id="sec-7">',
  '<h2>7. Summary and Long-Tail Questions</h2>',
  '<p>Safe USDT cross-chain transfers start with fundamentals and token-version clarity, lean on direct exchange on/off-ramp routes wherever possible, and apply a systematic verification checklist when bridging is unavoidable: contracts, bridge credibility, permission scope, and destination-chain gas. The DeFi/on-chain security baseline is small test transfers, minimum approvals, official entry points only, and zero trust in any unsolicited recovery contact.</p>',
  '<p>Common long-tail questions: Can TRC20 and ERC20 USDT be sent directly to each other? No — a supported routing path is required. How long does bridging take? It depends on confirmations, relayer speed, and any claim step, and can range from minutes to hours. Can a wrong-network transfer be recovered? Only if the recipient controls that address and chooses to assist — there is no guarantee. Why cannot assets be moved after they arrive? The destination chain may lack native gas. This article is for learning and research only and is not investment advice; crypto asset prices are highly volatile, so make your own decisions and take responsibility for them.</p>',
  '</section>',
].join('\n        ');

const EN_TOC = [
  '<li><a href="#sec-1">1. USDT Fundamentals and transfer routes</a></li>',
  '          <li><a href="#sec-2">2. Exchange on/off-ramp route planning</a></li>',
  '          <li><a href="#sec-3">3. Withdrawals, bridges, and swaps</a></li>',
  '          <li><a href="#sec-4">4. DeFi/on-chain security checklist</a></li>',
  '          <li><a href="#sec-5">5. Delayed or failed transfers</a></li>',
  '          <li><a href="#sec-6">6. Payments and tool subscriptions</a></li>',
  '          <li><a href="#sec-7">7. Summary and long-tail questions</a></li>',
].join('\n          ');

const EN_REFS = [
  '<li><a href="https://tether.to/en/transparency/" target="_blank" rel="noopener noreferrer">Tether Transparency Page</a> — official USDT reserve disclosures</li>',
  '            <li><a href="https://ethereum.org/en/bridges/" target="_blank" rel="noopener noreferrer">Ethereum.org: Bridge fundamentals</a></li>',
  '            <li><a href="https://etherscan.io/tokenapprovalchecker" target="_blank" rel="noopener noreferrer">Etherscan Token Approval Checker</a></li>',
].join('\n            ');

const EN_RELATED = [
  '<li><a href="/en/articles/usdt-beginner-onramp-defi-security-guide.html">USDT Beginner\'s Guide: Exchange On/Off-Ramp Tutorial and DeFi Security Checks</a></li>',
  '          <li><a href="/en/articles/stablecoin-crosschain-flows.html">Stablecoins, Cross-Chain Activity, and On-Chain Fund Flows</a></li>',
  '          <li><a href="/en/articles/bridge-security-research-guide.html">Cross-Chain Bridge Security Research Guide</a></li>',
  '          <li><a href="/en/articles/onchain-forensics.html">On-Chain Forensics and Fund Tracing</a></li>',
].join('\n          ');

function injectContent(html, summary, body, toc, refs, related) {
  // summary
  html = html.replace(/<p class="article-summary">[\s\S]*?<\/p>/, '<p class="article-summary">' + summary + '</p>');
  // body sections
  html = html.replace(/(<div class="article-body">)([\s\S]*?)(<\/div>\s*<nav class="toc")/, '$1\n        ' + body + '\n        $3');
  // toc items
  html = html.replace(/(<nav class="toc"[^>]*>[\s\S]*?<ol>)([\s\S]*?)(<\/ol>)/, '$1\n          ' + toc + '\n          $3');
  // refs
  html = html.replace(/(<aside class="references"[\s\S]*?<ul>)([\s\S]*?)(<\/ul>)/, '$1\n            ' + refs + '\n            $3');
  // related
  html = html.replace(/(<aside class="related"[\s\S]*?<ul>)([\s\S]*?)(<\/ul>)/, '$1\n          ' + related + '\n          $3');
  return html;
}

let zh = fs.readFileSync(path.join(root, 'articles', slug + '.html'), 'utf-8');
zh = injectContent(zh, ZH_SUMMARY, ZH_BODY, ZH_TOC, ZH_REFS, ZH_RELATED);
fs.writeFileSync(path.join(root, 'articles', slug + '.html'), zh, 'utf-8');
console.log('ZH written: ' + path.join(root, 'articles', slug + '.html'));

let en = fs.readFileSync(path.join(root, 'en/articles', slug + '.html'), 'utf-8');
en = injectContent(en, EN_SUMMARY, EN_BODY, EN_TOC, EN_REFS, EN_RELATED);
fs.writeFileSync(path.join(root, 'en/articles', slug + '.html'), en, 'utf-8');
console.log('EN written: ' + path.join(root, 'en/articles', slug + '.html'));
