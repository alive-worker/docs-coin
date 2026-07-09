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

  // Reusable client-side paginator: shows `pageSize` items per page and builds controls in `pager`.
  function paginate(anchor, items, pageSize, pager) {
    if (!pager || items.length <= pageSize) return;
    var pageCount = Math.ceil(items.length / pageSize);
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
      items.forEach(function (el, i) {
        el.style.display = (Math.floor(i / pageSize) + 1 === current) ? '' : 'none';
      });
      pager.innerHTML = '';

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

    render();
    return { render: render };
  }

  // Publish dates keyed by article URL — single source for the sidebar time labels.
  var DATES = {
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
  var gridPaginator = null; // set if .card-grid pagination is ever created; lets search-clear restore the current page instead of showing every item

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
        if (!q) {
          if (gridPaginator) { gridPaginator.render(); } else { archiveItems.forEach(function (li) { li.style.display = ''; }); }
          emptyMsg2.hidden = true;
          if (pager) pager.style.display = '';
          return;
        }
        var anyMatch = false;
        archiveItems.forEach(function (li) {
          var titleEl = li.querySelector(titleSelector);
          var descEl = descSelector ? li.querySelector(descSelector) : null;
          var title = titleEl ? titleEl.textContent.toLowerCase() : '';
          var desc = descEl ? descEl.textContent.toLowerCase() : '';
          var match = title.indexOf(q) !== -1 || desc.indexOf(q) !== -1;
          li.style.display = match ? '' : 'none';
          if (match) anyMatch = true;
        });
        emptyMsg2.hidden = anyMatch;
        // A search match may fall outside the current page's slice — show every match
        // instead of leaving pagination's per-page display:none in charge while searching.
        if (pager) pager.style.display = 'none';
      };

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
  // Home: the teaser grid under "最新文章" is a fixed preview (no pagination) —
  // "查看全部" links out to the full archive instead. gridPaginator stays null here on
  // purpose, so the search-clear handler above just un-hides all cards.
  // --- Archive page: paginate the titles list ---
  var archive = document.querySelector('.archive-list');
  if (archive) paginate(archive, Array.prototype.slice.call(archive.querySelectorAll('.archive-item')), 20, pager);

  // --- Back-to-top button: injected on every page, shown after a small fixed scroll distance
  // (not tied to viewport height, so it doesn't wait until the reader is nearly at the bottom
  // on a tall/maximized browser window), scrolls smoothly back to the top on click. ---
  var BACK_TO_TOP_THRESHOLD = 300;
  var backToTop = document.createElement('button');
  backToTop.type = 'button';
  backToTop.className = 'back-to-top';
  backToTop.setAttribute('aria-label', STR.backToTop);
  backToTop.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>';
  document.body.appendChild(backToTop);
  var toggleBackToTop = function () {
    backToTop.classList.toggle('is-visible', window.scrollY > BACK_TO_TOP_THRESHOLD);
  };
  window.addEventListener('scroll', toggleBackToTop, { passive: true });
  toggleBackToTop();
  backToTop.addEventListener('click', function () {
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  });
})();
