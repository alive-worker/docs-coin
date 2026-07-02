(function () {
  'use strict';

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

      var prev = make('上一页', function () {
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

      var next = make('下一页', function () {
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
  }

  var DATES = {
    '/articles/crypto-research-fundamentals.html': '2026-07-02 09:30:09',
    '/articles/onchain-data-analysis.html': '2026-07-01 22:34:44',
    '/articles/stablecoin-crosschain-flows.html': '2026-07-01 17:33:12'
  };

  // --- Sidebar: add date labels, keep the recent N, link the rest to the archive page ---
  var SIDEBAR_LIMIT = 10;
  var onArchive = location.pathname === '/articles.html';
  var nav = document.querySelector('.sidebar-nav');
  if (nav) {
    var items = Array.prototype.slice.call(nav.querySelectorAll('.side-item'));
    items.forEach(function (link) {
      var href = link.getAttribute('href');
      var date = DATES[href];
      var body = link.querySelector('.side-body');

      if (location.pathname === href) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }

      if (date && body && !body.querySelector('.side-date')) {
        var badge = document.createElement('span');
        badge.className = 'side-date';
        var iso = date.replace(' ', 'T') + '+08:00';
        badge.innerHTML = '<svg class="side-cal" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M3 10h18M8 3v4M16 3v4"></path></svg><span>发布于 <time datetime="' + iso + '">' + date + '</time></span>';
        body.appendChild(badge);
      }
    });
    if (items.length > SIDEBAR_LIMIT) {
      items.forEach(function (link, i) {
        if (i >= SIDEBAR_LIMIT && !link.classList.contains('active')) link.style.display = 'none';
      });
      var aside = nav.closest('.sidebar');
      var heading = aside && aside.querySelector('h2 .sidebar-heading-text');
      if (heading) heading.textContent = '近期文章';
      if (!onArchive) {
        var more = document.createElement('a');
        more.className = 'side-more';
        more.href = '/articles.html';
        more.textContent = '查看全部文章 →';
        nav.appendChild(more);
      }
    }
  }

  if (location.pathname.indexOf('/articles/') === 0) {
    var articlesLink = document.querySelector('.site-nav a[href="/articles.html"]');
    if (articlesLink) {
      articlesLink.classList.add('active');
      articlesLink.setAttribute('aria-current', 'page');
    }
  }

  var pager = document.querySelector('.pager');
  // --- Home: paginate the article cards (5 / page) ---
  var grid = document.querySelector('.summary-grid');
  if (grid) paginate(grid, Array.prototype.slice.call(grid.querySelectorAll('.summary-card')), 5, pager);

  // --- Archive page: paginate the titles list ---
  var archive = document.querySelector('.archive-list');
  if (archive) paginate(archive, Array.prototype.slice.call(archive.querySelectorAll('.archive-item')), 20, pager);
})();
