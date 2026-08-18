(function () {
  'use strict';

  // --- i18n: the /en/ tree shares this exact script with the zh-CN pages, so every
  // user-facing string it injects at runtime is looked up by language here. ---
  var IS_EN = location.pathname === '/en' || location.pathname.indexOf('/en/') === 0;
  var STR = IS_EN ? {
    prev: 'Previous', next: 'Next',
    recentHeading: 'Recent Articles', allHeading: 'All Articles', searchHeading: 'Search Results',
    viewAll: 'View all articles →', noMatch: 'No matching articles found', publishedOn: 'Published ',
    toDark: 'Switch to dark mode', toLight: 'Switch to light mode', backToTop: 'Back to top'
  } : {
    prev: '上一页', next: '下一页',
    recentHeading: '近期文章', allHeading: '全部文章', searchHeading: '搜索结果',
    viewAll: '查看全部文章 →', noMatch: '没有找到匹配的文章', publishedOn: '发布于 ',
    toDark: '切换到深色模式', toLight: '切换到浅色模式', backToTop: '回到顶部'
  };

  // Theme toggle: the <head> inline script already set data-theme before paint to
  // avoid a flash of the wrong theme; this just wires up the button and persists choices.
  var themeToggle = document.querySelector('.theme-toggle');
  if (themeToggle) {
    var refreshThemeLabel = function () {
      var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      themeToggle.setAttribute('aria-pressed', String(isDark));
      themeToggle.setAttribute('aria-label', isDark ? STR.toLight : STR.toDark);
    };
    refreshThemeLabel();
    themeToggle.addEventListener('click', function () {
      var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      if (isDark) { document.documentElement.removeAttribute('data-theme'); }
      else { document.documentElement.setAttribute('data-theme', 'dark'); }
      try { localStorage.setItem('theme', isDark ? 'light' : 'dark'); } catch (e) {}
      refreshThemeLabel();
    });
  }

  // Measure the real rendered height of header + search bar and publish it as a CSS var,
  // so sticky offsets below never drift from a hardcoded guess (avoids a sub-pixel gap
  // where scrolled content could peek through between the sticky layers).
  function syncStickyOffset() {
    var header = document.querySelector('.site-header');
    var bar = document.querySelector('.search-bar');
    if (!header) return;
    var headerHeight = header.getBoundingClientRect().height;
    var barHeight = bar ? bar.getBoundingClientRect().height : 0;
    document.documentElement.style.setProperty('--header-offset', Math.ceil(headerHeight) + 'px');
    document.documentElement.style.setProperty('--sticky-offset', Math.ceil(headerHeight + barHeight) + 'px');
  }
  syncStickyOffset();
  window.addEventListener('resize', syncStickyOffset);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(syncStickyOffset);
  }

  var tickerTrack = document.getElementById('ticker-track');
  if (tickerTrack) {
    var COINS = [
      { id: 'bitcoin', sym: 'BTC' },
      { id: 'ethereum', sym: 'ETH' },
      { id: 'binancecoin', sym: 'BNB' },
      { id: 'solana', sym: 'SOL' },
      { id: 'ripple', sym: 'XRP' },
      { id: 'dogecoin', sym: 'DOGE' },
      { id: 'cardano', sym: 'ADA' }
    ];
    var fmtPrice = function(n) {
      if (n >= 1) return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return n.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    };
    var renderTicker = function(data) {
      var itemsHtml = COINS.map(function(c) {
        var d = data[c.id];
        if (!d) return '';
        var price = d.usd;
        var chg = d.usd_24h_change || 0;
        var up = chg >= 0;
        var chgText = (up ? '+' : '') + chg.toFixed(2) + '%';
        return '<a class="ticker-item" href="https://www.coingecko.com/en/coins/' + c.id + '" target="_blank" rel="noopener noreferrer"><span class="ticker-sym">' + c.sym + '</span>' +
          '<span class="ticker-price">$' + fmtPrice(price) + '</span>' +
          '<span class="ticker-chg ' + (up ? 'ticker-up' : 'ticker-down') + '">' + chgText + '</span></a>';
      }).join('');
      tickerTrack.innerHTML = itemsHtml;
      var setWidth = tickerTrack.getBoundingClientRect().width || 1;
      var repeatCount = Math.max(2, Math.ceil((window.innerWidth * 1.5) / setWidth));
      var block = new Array(repeatCount).fill(itemsHtml).join('');
      tickerTrack.innerHTML = block + block;
    };
    var CACHE_KEY = 'ticker-price-cache';
    var CACHE_TTL = 90000;
    var readCache = function() {
      try {
        var raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
      } catch (e) { return null; }
    };
    var writeCache = function(data) {
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: data })); } catch (e) {}
    };
    var loadTicker = function() {
      var cached = readCache();
      if (cached && (Date.now() - cached.ts) < CACHE_TTL) {
        renderTicker(cached.data);
        return;
      }
      var ids = COINS.map(function(c) { return c.id; }).join(',');
      fetch('https://api.coingecko.com/api/v3/simple/price?ids=' + ids + '&vs_currencies=usd&include_24hr_change=true')
        .then(function(r) { if (!r.ok) throw new Error('bad status'); return r.json(); })
        .then(function(data) { writeCache(data); renderTicker(data); })
        .catch(function() {
          if (cached) renderTicker(cached.data);
        });
    };
    loadTicker();
    setInterval(loadTicker, CACHE_TTL);
  }

  // Reusable client-side paginator: shows `pageSize` items per page and builds controls in
  // `pager`. setItems() lets a filter (search/topic) hand in a different subset later —
  // pagination re-applies to whatever set is current, always at the same page size, instead
  // of a filtered view falling back to one long unpaginated scroll.
  function paginate(anchor, initialItems, pageSize, pager) {
    var items = initialItems;
    var current = 1;

    function make(label, onClick) {
      var button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.addEventListener('click', onClick);
      return button;
    }

    function toTop() {
      var y = anchor.getBoundingClientRect().top + window.pageYOffset - 84;
      window.scrollTo({ top: y < 0 ? 0 : y, behavior: 'smooth' });
    }

    function render() {
      var pageCount = Math.max(1, Math.ceil(items.length / pageSize));
      if (current > pageCount) current = pageCount;
      items.forEach(function (el, i) {
        el.style.display = (Math.floor(i / pageSize) + 1 === current) ? '' : 'none';
      });
      if (!pager) return;
      pager.innerHTML = '';
      if (pageCount <= 1) { pager.style.display = 'none'; return; }
      pager.style.display = '';

      var prev = make(STR.prev, function () {
        if (current > 1) {
          current--;
          render();
          toTop();
        }
      });
      prev.disabled = current === 1;
      pager.appendChild(prev);

      for (var p = 1; p <= pageCount; p++) {
        (function (page) {
          var button = make(String(page), function () {
            if (current !== page) {
              current = page;
              render();
              toTop();
            }
          });
          if (page === current) button.setAttribute('aria-current', 'true');
          pager.appendChild(button);
        })(p);
      }

      var next = make(STR.next, function () {
        if (current < pageCount) {
          current++;
          render();
          toTop();
        }
      });
      next.disabled = current === pageCount;
      pager.appendChild(next);
    }

    function setItems(newItems) {
      items = newItems;
      current = 1;
      render();
    }

    render();
    return { render: render, setItems: setItems };
  }

  // Publish dates keyed by article URL — single source for the sidebar time labels.
  var DATES = {
    '/articles/stablecoin-virtual-card-topup-verification-guide.html': '2026-08-18 18:00:00',
    '/en/articles/stablecoin-virtual-card-topup-verification-guide.html': '2026-08-18 18:00:00',
    '/articles/crosschain-swap-dry-run-verification-guide.html': '2026-08-18 14:00:00',
    '/en/articles/crosschain-swap-dry-run-verification-guide.html': '2026-08-18 14:00:00',
    '/articles/cross-chain-swap-slippage-fee-verification-guide.html': '2026-08-18 10:00:00',
    '/en/articles/cross-chain-swap-slippage-fee-verification-guide.html': '2026-08-18 10:00:00',
    '/articles/agent-usage-billing-verification.html': '2026-08-17 15:00:00',
    '/en/articles/agent-usage-billing-verification.html': '2026-08-17 15:00:00',
    '/articles/usdt-reserve-transparency-onramp-defi-security-guide.html': '2026-08-11 14:40:00',
    '/articles/usdt-crosschain-transfer-security-recovery-guide.html': '2026-08-11 12:00:00',
  '/articles/usdt-beginner-onramp-defi-security-guide.html': '2026-08-10 11:00:00',
    '/articles/data-availability-layer-verification.html': '2026-08-07 16:40:00',
    '/articles/cross-chain-messaging-protocol-verification.html': '2026-08-07 14:30:00',
    '/articles/restaking-avs-slashing-risk.html': '2026-08-07 10:17:24',
    '/articles/depin-compute-network-verification.html': '2026-08-06 15:21:30',
    '/articles/account-abstraction-wallet-security.html': '2026-08-06 10:51:44',
    '/articles/intent-centric-solver-verification.html': '2026-08-05 17:20:11',
    '/articles/onchain-forensics.html': '2026-08-05 11:08:20',
    '/articles/agent-audit-log-integrity-verification.html': '2026-08-04 10:24:07',
    '/articles/agent-strategy-execution-verification.html': '2026-08-03 11:18:42',
'/en/articles/usdt-reserve-transparency-onramp-defi-security-guide.html': '2026-08-11 14:40:00',
    '/en/articles/usdt-crosschain-transfer-security-recovery-guide.html': '2026-08-11 12:00:00',
    '/en/articles/usdt-beginner-onramp-defi-security-guide.html': '2026-08-10 11:00:00',
'/en/articles/data-availability-layer-verification.html': '2026-08-07 16:40:00',
'/en/articles/cross-chain-messaging-protocol-verification.html': '2026-08-07 14:30:00',
'/en/articles/restaking-avs-slashing-risk.html': '2026-08-07 10:17:24',
    '/en/articles/depin-compute-network-verification.html': '2026-08-06 15:21:30',
    '/en/articles/account-abstraction-wallet-security.html': '2026-08-06 10:51:44',
    '/en/articles/intent-centric-solver-verification.html': '2026-08-05 17:20:11',
    '/en/articles/onchain-forensics.html': '2026-08-05 11:08:20',
    '/en/articles/agent-audit-log-integrity-verification.html': '2026-08-04 10:24:07',
    '/en/articles/agent-strategy-execution-verification.html': '2026-08-03 11:18:42',
    '/articles/zkml-onchain-model-verification.html': '2026-07-28 10:35:54',
    '/en/articles/zkml-onchain-model-verification.html': '2026-07-28 10:35:54',
    '/articles/ai-oracle-data-verification.html': '2026-07-27 15:18:36',
    '/en/articles/ai-oracle-data-verification.html': '2026-07-27 15:18:36',
    '/articles/prediction-market-resolution-risk.html': '2026-07-23 18:06:51',
    '/en/articles/prediction-market-resolution-risk.html': '2026-07-23 18:06:51',
    '/articles/credit-pool-tranche-risk.html': '2026-07-23 13:41:58',
    '/en/articles/credit-pool-tranche-risk.html': '2026-07-23 13:41:58',
    '/articles/options-vault-tail-risk.html': '2026-07-20 11:12:01',
    '/en/articles/options-vault-tail-risk.html': '2026-07-20 11:12:01',
    '/articles/perpetual-dex-vault-counterparty.html': '2026-07-20 10:07:57',
    '/en/articles/perpetual-dex-vault-counterparty.html': '2026-07-20 10:07:57',
    '/articles/vote-escrow-lock-verification.html': '2026-07-16 10:07:11',
    '/en/articles/vote-escrow-lock-verification.html': '2026-07-16 10:07:11',
    '/articles/auto-deleveraging-insurance-fund.html': '2026-07-15 17:56:32',
    '/en/articles/auto-deleveraging-insurance-fund.html': '2026-07-15 17:56:32',
    '/articles/liquid-staking-token-price-deviation.html': '2026-07-14 14:43:00',
    '/en/articles/liquid-staking-token-price-deviation.html': '2026-07-14 14:43:00',
    '/articles/rwa-tokenization-trust-structure.html': '2026-07-13 17:49:22',
    '/en/articles/rwa-tokenization-trust-structure.html': '2026-07-13 17:49:22',
    '/articles/mev-private-order-flow.html': '2026-07-10 17:26:57',
    '/en/articles/mev-private-order-flow.html': '2026-07-10 17:26:57',
    '/articles/funding-rate-divergence.html': '2026-07-10 16:00:05',
    '/en/articles/funding-rate-divergence.html': '2026-07-10 16:00:05',
    '/articles/stablecoin-peg-mechanism-research-guide.html': '2026-07-10 15:36:59',
    '/en/articles/stablecoin-peg-mechanism-research-guide.html': '2026-07-10 15:36:59',
    '/articles/onchain-insurance-research-guide.html': '2026-07-10 15:17:28',
    '/en/articles/onchain-insurance-research-guide.html': '2026-07-10 15:17:28',
    '/articles/restaking-research-guide.html': '2026-07-10 14:53:46',
    '/en/articles/restaking-research-guide.html': '2026-07-10 14:53:46',
    '/articles/swap-routing-research-guide.html': '2026-07-10 13:47:53',
    '/en/articles/swap-routing-research-guide.html': '2026-07-10 13:47:53',
    '/articles/vote-market-research-guide.html': '2026-07-10 11:20:08',
    '/en/articles/vote-market-research-guide.html': '2026-07-10 11:20:08',
    '/articles/liquidity-mining-research-guide.html': '2026-07-10 10:44:36',
    '/en/articles/liquidity-mining-research-guide.html': '2026-07-10 10:44:36',
    '/articles/layer2-rollup-research-guide.html': '2026-07-10 10:34:23',
    '/en/articles/layer2-rollup-research-guide.html': '2026-07-10 10:34:23',
    '/articles/nft-collection-research-guide.html': '2026-07-09 20:10:00',
    '/en/articles/nft-collection-research-guide.html': '2026-07-09 20:10:00',
    '/articles/lending-liquidation-research-guide.html': '2026-07-09 19:15:00',
    '/en/articles/lending-liquidation-research-guide.html': '2026-07-09 19:15:00',
    '/articles/dex-liquidity-research-guide.html': '2026-07-08 15:01:32',
    '/articles/airdrop-sybil-detection-research-guide.html': '2026-07-07 16:00:00',
    '/articles/bridge-security-research-guide.html': '2026-07-07 12:30:00',
    '/articles/oracle-price-feed-research-guide.html': '2026-07-07 11:35:00',
    '/articles/team-developer-activity-research-guide.html': '2026-07-07 10:00:00',
    '/articles/exchange-reserves-research-guide.html': '2026-07-06 20:30:00',
    '/articles/dao-governance-research-guide.html': '2026-07-06 17:45:00',
    '/articles/contract-security-audit-guide.html': '2026-07-06 09:20:00',
    '/articles/tokenomics-research-guide.html': '2026-07-03 10:15:32',
    '/articles/research-tools-virtual-card-guide.html': '2026-07-02 15:45:00',
    '/articles/crypto-research-fundamentals.html': '2026-07-02 09:30:09',
    '/articles/onchain-data-analysis.html': '2026-07-01 22:34:44',
    '/articles/stablecoin-crosschain-flows.html': '2026-07-01 17:33:12',
    '/en/articles/dex-liquidity-research-guide.html': '2026-07-08 15:01:32',
    '/en/articles/airdrop-sybil-detection-research-guide.html': '2026-07-07 16:00:00',
    '/en/articles/bridge-security-research-guide.html': '2026-07-07 12:30:00',
    '/en/articles/oracle-price-feed-research-guide.html': '2026-07-07 11:35:00',
    '/en/articles/team-developer-activity-research-guide.html': '2026-07-07 10:00:00',
    '/en/articles/exchange-reserves-research-guide.html': '2026-07-06 20:30:00',
    '/en/articles/dao-governance-research-guide.html': '2026-07-06 17:45:00',
    '/en/articles/contract-security-audit-guide.html': '2026-07-06 09:20:00',
    '/en/articles/tokenomics-research-guide.html': '2026-07-03 10:15:32',
    '/en/articles/research-tools-virtual-card-guide.html': '2026-07-02 15:45:00',
    '/en/articles/crypto-research-fundamentals.html': '2026-07-02 09:30:09',
    '/en/articles/onchain-data-analysis.html': '2026-07-01 22:34:44',
    '/en/articles/stablecoin-crosschain-flows.html': '2026-07-01 17:33:12'
  };

  // --- Sidebar: add date labels, keep the recent N, link the rest to the archive page ---
  // Mobile shows the list right under the search box, so a shorter teaser (3) reads better
  // than the desktop panel's 10 — the rest is always one tap away via "查看全部文章".
  var SIDEBAR_LIMIT_DESKTOP = 10;
  var SIDEBAR_LIMIT_MOBILE = 3;
  var mobileMedia = window.matchMedia('(max-width: 880px)');
  function currentSidebarLimit() {
    return mobileMedia.matches ? SIDEBAR_LIMIT_MOBILE : SIDEBAR_LIMIT_DESKTOP;
  }
  var onArchive = location.pathname === '/articles.html' || location.pathname === '/en/articles.html';
  var nav = document.querySelector('.sidebar-nav');
  var sidebarItems = [];
  var sidebarHeading = null;
  var sidebarMoreLink = null;
  var sidebarCollapsed = false;

  if (nav) {
    sidebarItems = Array.prototype.slice.call(nav.querySelectorAll('.side-item'));
    sidebarItems.forEach(function (a) {
      var href = a.getAttribute('href');
      var d = DATES[href];
      var body = a.querySelector('.side-body');
      var descEl = a.querySelector('.side-desc');

      if (location.pathname === href) {
        a.classList.add('active');
        a.setAttribute('aria-current', 'page');
      }

      if (d && body && descEl && !body.querySelector('.side-date')) {
        // Wrap the description so the date badge sits beside it on the same row instead of its own line.
        // The line-clamp box goes in its own flex child (descWrap) because -webkit-box ignores flex-shrink directly.
        var metaWrap = document.createElement('span');
        metaWrap.className = 'side-meta';
        var descWrap = document.createElement('span');
        descWrap.className = 'side-desc-wrap';
        descEl.parentNode.insertBefore(metaWrap, descEl);
        descWrap.appendChild(descEl);
        metaWrap.appendChild(descWrap);
        var badge = document.createElement('span');
        badge.className = 'side-date';
        var iso = d.replace(' ', 'T') + '+08:00';
        badge.innerHTML = '<svg class="side-cal" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M3 10h18M8 3v4M16 3v4"></path></svg><span class="sr-only">' + STR.publishedOn + '</span><time datetime="' + iso + '">' + d + '</time>';
        metaWrap.appendChild(badge);
      }
    });

    var aside = nav.closest('.sidebar');
    sidebarHeading = aside && aside.querySelector('h2 .sidebar-heading-text');

    // Restores the default (non-search) sidebar state: recent N items + "view all" link if collapsed.
    // Re-evaluates the limit each call so resizing across the mobile breakpoint updates it live.
    function showDefaultSidebar() {
      var limit = currentSidebarLimit();
      sidebarCollapsed = sidebarItems.length > limit;
      if (sidebarCollapsed) {
        sidebarItems.forEach(function (a, i) {
          a.style.display = (i >= limit && !a.classList.contains('active')) ? 'none' : '';
        });
        if (sidebarHeading) sidebarHeading.textContent = STR.recentHeading;
        if (!onArchive) {
          if (!sidebarMoreLink) {
            sidebarMoreLink = document.createElement('a');
            sidebarMoreLink.className = 'side-more';
            sidebarMoreLink.href = IS_EN ? '/en/articles.html' : '/articles.html';
            sidebarMoreLink.textContent = STR.viewAll;
            nav.appendChild(sidebarMoreLink);
          }
          sidebarMoreLink.style.display = '';
        }
      } else {
        sidebarItems.forEach(function (a) { a.style.display = ''; });
        if (sidebarHeading) sidebarHeading.textContent = STR.allHeading;
        if (sidebarMoreLink) sidebarMoreLink.style.display = 'none';
      }
    }
    showDefaultSidebar();

    // --- Mobile: the "近期文章" panel starts collapsed (heading only) since it now sits
    // right under the search box, ahead of the page's actual content. Desktop never collapses.
    var sidebarToggle = aside && aside.querySelector('h2');
    function setSidebarCollapsed(collapsed) {
      if (!aside) return;
      aside.classList.toggle('is-collapsed', collapsed);
      if (sidebarToggle) sidebarToggle.setAttribute('aria-expanded', String(!collapsed));
    }
    if (sidebarToggle) {
      sidebarToggle.setAttribute('role', 'button');
      sidebarToggle.setAttribute('tabindex', '0');
      sidebarToggle.addEventListener('click', function () {
        if (!mobileMedia.matches) return;
        setSidebarCollapsed(!aside.classList.contains('is-collapsed'));
      });
      sidebarToggle.addEventListener('keydown', function (e) {
        if (!mobileMedia.matches) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setSidebarCollapsed(!aside.classList.contains('is-collapsed'));
        }
      });
    }
    setSidebarCollapsed(mobileMedia.matches);

    mobileMedia.addEventListener('change', function (e) {
      // Don't clobber an in-progress search — it'll pick up the new limit/collapse state next time it's cleared.
      var searchInput = document.querySelector('.sidebar-search-input');
      if (!searchInput || !searchInput.value.trim()) {
        showDefaultSidebar();
        setSidebarCollapsed(e.matches);
      }
    });

    // --- Sidebar search: filters the visible article list in place (reads titles/descriptions already in the DOM) ---
    var searchInput = document.querySelector('.sidebar-search-input');
    var searchWrap = document.querySelector('.sidebar-search');
    var searchClear = document.querySelector('.sidebar-search-clear');
    if (searchInput && searchWrap) {
      var emptyMsg = document.createElement('p');
      emptyMsg.className = 'sidebar-search-empty';
      emptyMsg.hidden = true;
      emptyMsg.textContent = STR.noMatch;
      nav.parentNode.insertBefore(emptyMsg, nav.nextSibling);

      var applySearch = function () {
        var q = searchInput.value.trim().toLowerCase();
        searchWrap.classList.toggle('has-value', !!q);
        if (!q) {
          showDefaultSidebar();
          setSidebarCollapsed(mobileMedia.matches);
          emptyMsg.hidden = true;
          return;
        }
        setSidebarCollapsed(false);
        if (sidebarMoreLink) sidebarMoreLink.style.display = 'none';
        var anyMatch = false;
        sidebarItems.forEach(function (a) {
          var titleEl = a.querySelector('.side-title');
          var descEl = a.querySelector('.side-desc');
          var title = titleEl ? titleEl.textContent.toLowerCase() : '';
          var desc = descEl ? descEl.textContent.toLowerCase() : '';
          var match = title.indexOf(q) !== -1 || desc.indexOf(q) !== -1;
          a.style.display = match ? '' : 'none';
          if (match) anyMatch = true;
        });
        emptyMsg.hidden = anyMatch;
        if (sidebarHeading) sidebarHeading.textContent = STR.searchHeading;
      };

      searchInput.addEventListener('input', applySearch);
      if (searchClear) {
        searchClear.addEventListener('click', function () {
          searchInput.value = '';
          applySearch();
          searchInput.focus();
        });
      }
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && document.activeElement === searchInput && searchInput.value) {
          searchInput.value = '';
          applySearch();
        }
      });
    }
  } else {
    // No sidebar list on this page — search filters whatever list is shown in the main
    // column instead: the archive page's title list, or the homepage's teaser card grid.
    var archiveList = document.querySelector('.archive-list');
    var cardGrid = document.querySelector('.post-list .card-grid');
    var listEl = archiveList || cardGrid;
    var searchInput2 = document.querySelector('.sidebar-search-input');
    var searchWrap2 = document.querySelector('.sidebar-search');
    var searchClear2 = document.querySelector('.sidebar-search-clear');
    // Topic-tag row atop the archive page (articles.html only) — clicking a tag filters
    // the list below by each item's data-topic, combined with any active text search.
    var topicButtons = archiveList ? Array.prototype.slice.call(document.querySelectorAll('.topic-tag-btn[data-topic]')) : [];
    var activeTopic = null;
    if (listEl && searchInput2 && searchWrap2) {
      var itemSelector = archiveList ? '.archive-item' : '.post-card';
      var titleSelector = archiveList ? '.archive-title' : '.post-card-title';
      var descSelector = archiveList ? null : '.post-card-desc';
      var archiveItems = Array.prototype.slice.call(listEl.querySelectorAll(itemSelector));
      var emptyMsg2 = document.createElement('p');
      emptyMsg2.className = 'sidebar-search-empty';
      emptyMsg2.hidden = true;
      emptyMsg2.textContent = STR.noMatch;
      listEl.parentNode.insertBefore(emptyMsg2, listEl.nextSibling);

      var applyArchiveSearch = function () {
        var q = searchInput2.value.trim().toLowerCase();
        searchWrap2.classList.toggle('has-value', !!q);
        // Homepage only: collapse the hero/featured sections while searching so the
        // filtered "最新文章" grid sits right under the search box instead of way down the page.
        document.body.classList.toggle('is-searching', !!q && !!cardGrid);
        var matches = [];
        archiveItems.forEach(function (li) {
          var topicOk = !activeTopic || li.getAttribute('data-topic') === activeTopic;
          if (!topicOk) { li.style.display = 'none'; return; }
          var titleEl = li.querySelector(titleSelector);
          var descEl = descSelector ? li.querySelector(descSelector) : null;
          var title = titleEl ? titleEl.textContent.toLowerCase() : '';
          var desc = descEl ? descEl.textContent.toLowerCase() : '';
          var match = !q || title.indexOf(q) !== -1 || desc.indexOf(q) !== -1;
          if (match) matches.push(li);
          else li.style.display = 'none';
        });
        emptyMsg2.hidden = matches.length > 0;
        // Archive page: re-paginate over just the matching subset (same 20/page as
        // unfiltered), so a filtered result set doesn't turn into one long scroll.
        // Other pages (homepage teaser grid) have no true paginator — just show matches.
        if (archivePaginator) archivePaginator.setItems(matches);
        else matches.forEach(function (li) { li.style.display = ''; });
      };

      topicButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
          var topic = btn.getAttribute('data-topic');
          activeTopic = activeTopic === topic ? null : topic;
          topicButtons.forEach(function (b) { b.classList.toggle('is-active', b === btn && activeTopic !== null); });
          applyArchiveSearch();
        });
      });

      searchInput2.addEventListener('input', applyArchiveSearch);
      if (searchClear2) {
        searchClear2.addEventListener('click', function () {
          searchInput2.value = '';
          applyArchiveSearch();
          searchInput2.focus();
        });
      }
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && document.activeElement === searchInput2 && searchInput2.value) {
          searchInput2.value = '';
          applyArchiveSearch();
        }
      });
    }
  }

  if (location.pathname.indexOf('/articles/') === 0 || location.pathname.indexOf('/en/articles/') === 0) {
    var articlesLink = document.querySelector('.site-nav a[href="/articles.html"], .site-nav a[href="/en/articles.html"]');
    if (articlesLink) {
      articlesLink.classList.add('active');
      articlesLink.setAttribute('aria-current', 'page');
    }
  }

  var pager = document.querySelector('.pager');
  // --- Archive page: paginate the titles list. applyArchiveSearch() (defined above, called
  // below and on every filter/search change) hands this paginator whatever subset currently
  // matches, so filtered results stay paginated too instead of one long unpaginated scroll.
  var archive = document.querySelector('.archive-list');
  var archivePaginator = archive
    ? paginate(archive, Array.prototype.slice.call(archive.querySelectorAll('.archive-item')), 20, pager)
    : null;

  // Makes footer/nav "hot topic" links addressable: /articles.html?topic=protocol
  // pre-selects and applies that chip's filter on load, same idea as the ?q= search backfill.
  // Must run AFTER the paginate() call above, which otherwise re-shows/hides items by
  // page position and clobbers whatever display values a filter set during page load.
  if (typeof topicButtons !== 'undefined' && typeof applyArchiveSearch !== 'undefined') {
    var urlTopic = new URLSearchParams(location.search).get('topic');
    if (urlTopic) {
      var matchBtn = topicButtons.filter(function (b) { return b.getAttribute('data-topic') === urlTopic; })[0];
      if (matchBtn) {
        activeTopic = urlTopic;
        matchBtn.classList.add('is-active');
        applyArchiveSearch();
      }
    }
  }

  // --- Back-to-top: fades in once you've scrolled past ~one screen, not just near the bottom ---
  var backToTop = document.createElement('button');
  backToTop.type = 'button';
  backToTop.className = 'back-to-top';
  backToTop.setAttribute('aria-label', STR.backToTop);
  backToTop.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>';
  document.body.appendChild(backToTop);
  var updateBackToTop = function () { backToTop.classList.toggle('is-visible', window.scrollY > 480); };
  var backToTopTicking = false;
  var requestBackToTopUpdate = function () {
    if (backToTopTicking) return;
    backToTopTicking = true;
    requestAnimationFrame(function () { updateBackToTop(); backToTopTicking = false; });
  };
  updateBackToTop();
  window.addEventListener('scroll', requestBackToTopUpdate, { passive: true });
  backToTop.addEventListener('click', function () {
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  });

  // --- Article page: highlight the current section in the right-rail TOC while scrolling ---
  var tocRail = document.querySelector('.article-columns .toc');
  if (tocRail && 'IntersectionObserver' in window) {
    var tocLinks = Array.prototype.slice.call(tocRail.querySelectorAll('a[href^="#"]'));
    var tocSections = tocLinks
      .map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); })
      .filter(Boolean);
    var setActiveTocLink = function (id) {
      tocLinks.forEach(function (a) {
        a.classList.toggle('active', a.getAttribute('href') === '#' + id);
      });
    };
    var visibleTocSections = new Set();
    var tocObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) visibleTocSections.add(entry.target.id);
        else visibleTocSections.delete(entry.target.id);
      });
      if (visibleTocSections.size) {
        var topMost = tocSections.find(function (s) { return visibleTocSections.has(s.id); });
        if (topMost) setActiveTocLink(topMost.id);
      }
    }, { rootMargin: '-96px 0px -70% 0px', threshold: 0 });
    tocSections.forEach(function (s) { tocObserver.observe(s); });
  }

  // --- Homepage: featured-article carousel ---
  var carousel = document.getElementById('featured-carousel');
  if (carousel) {
    var track = carousel.querySelector('.carousel-track');
    var slides = Array.prototype.slice.call(carousel.querySelectorAll('.carousel-slide'));
    var dots = Array.prototype.slice.call(carousel.querySelectorAll('.carousel-dot'));
    var index = 0;
    var timer = null;
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function render() {
      track.style.transform = 'translateX(-' + (index * 100) + '%)';
      dots.forEach(function (d, i) {
        d.classList.toggle('is-active', i === index);
        d.setAttribute('aria-selected', i === index ? 'true' : 'false');
      });
    }
    function goTo(i) {
      index = (i + slides.length) % slides.length;
      render();
    }
    function next() { goTo(index + 1); }
    function prev() { goTo(index - 1); }
    function startAuto() {
      if (reduceMotion || slides.length < 2) return;
      stopAuto();
      timer = setInterval(next, 6000);
    }
    function stopAuto() { if (timer) { clearInterval(timer); timer = null; } }

    dots.forEach(function (d, i) {
      d.addEventListener('click', function () { goTo(i); startAuto(); });
    });
    carousel.addEventListener('mouseenter', stopAuto);
    carousel.addEventListener('mouseleave', startAuto);
    carousel.addEventListener('focusin', stopAuto);
    carousel.addEventListener('focusout', startAuto);

    // basic touch swipe support
    var touchStartX = null;
    track.addEventListener('touchstart', function (e) { touchStartX = e.touches[0].clientX; }, { passive: true });
    track.addEventListener('touchend', function (e) {
      if (touchStartX === null) return;
      var dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 40) { dx < 0 ? next() : prev(); startAuto(); }
      touchStartX = null;
    }, { passive: true });

    render();
    startAuto();
  }
})();
