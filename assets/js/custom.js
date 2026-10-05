/* Site enhancements: pagination, topic filters, reading progress,
   back-to-top, copy-code buttons and active nav state. No dependencies. */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Active nav link ---------- */
  function markActiveNav() {
    var path = window.location.pathname.replace(/\/+$/, "") || "/";
    document.querySelectorAll(".greedy-nav .visible-links a").forEach(function (a) {
      var href = a.getAttribute("href").replace(/\/+$/, "") || "/";
      if (href !== "/" && path.indexOf(href) === 0) a.classList.add("is-active");
    });
  }

  /* ---------- Back to top ---------- */
  function initBackToTop() {
    var btn = document.createElement("button");
    btn.className = "back-to-top";
    btn.type = "button";
    btn.setAttribute("aria-label", "Back to top");
    btn.innerHTML = '<i class="fas fa-arrow-up" aria-hidden="true"></i>';
    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
    document.body.appendChild(btn);
    return function () {
      btn.classList.toggle("is-visible", window.scrollY > 500);
    };
  }

  /* ---------- Reading progress (posts only) ---------- */
  function initProgress() {
    var content = document.querySelector(".page__content");
    if (!content || !document.querySelector(".page__meta-readtime")) return null;
    var bar = document.createElement("div");
    bar.className = "read-progress";
    bar.setAttribute("aria-hidden", "true");
    document.body.appendChild(bar);
    return function () {
      var rect = content.getBoundingClientRect();
      var total = content.offsetHeight - window.innerHeight;
      var pct = total > 0 ? Math.min(100, Math.max(0, (-rect.top / total) * 100)) : 100;
      bar.style.width = pct + "%";
    };
  }

  /* ---------- Copy buttons on code blocks ---------- */
  function initCopyButtons() {
    document.querySelectorAll(".page__content pre").forEach(function (pre) {
      var wrap = pre.parentElement;
      wrap.classList.add("code-wrap");
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "copy-code";
      btn.textContent = "Copy";
      btn.setAttribute("aria-label", "Copy code to clipboard");
      btn.addEventListener("click", function () {
        var text = (pre.querySelector("code") || pre).innerText;
        var done = function () {
          btn.textContent = "Copied!";
          btn.classList.add("is-copied");
          setTimeout(function () {
            btn.textContent = "Copy";
            btn.classList.remove("is-copied");
          }, 1600);
        };
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(text).then(done);
        } else {
          var ta = document.createElement("textarea");
          ta.value = text;
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          try { document.execCommand("copy"); done(); } catch (e) { /* ignore */ }
          document.body.removeChild(ta);
        }
      });
      wrap.insertBefore(btn, pre);
    });
  }

  /* ---------- Typing tagline on the home hero ---------- */
  function initTyped() {
    var el = document.querySelector("[data-typed]");
    if (!el) return;
    var phrases = el.getAttribute("data-typed").split("|");
    if (reduceMotion) { el.textContent = phrases[0]; return; }
    var i = 0, j = 0, deleting = false;
    (function tick() {
      var word = phrases[i];
      j += deleting ? -1 : 1;
      el.textContent = word.slice(0, j);
      var delay = deleting ? 35 : 70;
      if (!deleting && j === word.length) { deleting = true; delay = 1800; }
      else if (deleting && j === 0) { deleting = false; i = (i + 1) % phrases.length; delay = 350; }
      setTimeout(tick, delay);
    })();
  }

  /* ---------- Home page: filters + pagination ---------- */
  function initPostList() {
    var list = document.querySelector(".layout--home .entries-list");
    var nav = document.querySelector(".layout--home .pagination");
    if (!list || !nav) return;

    var perPage = parseInt(list.getAttribute("data-per-page"), 10) || 3;
    var items = Array.prototype.slice.call(list.querySelectorAll(".list__item"));
    var chips = Array.prototype.slice.call(document.querySelectorAll(".filter-chips .chip"));
    var status = document.querySelector(".pagination__status");
    var empty = document.querySelector(".no-results");
    var anchor = document.getElementById("posts");
    var state = { page: 1, tag: "all" };

    function readHash() {
      var m = window.location.hash.match(/^#posts(?:\/([\w-]+))?(?:\/page-(\d+))?$/);
      if (!m) return;
      state.tag = m[1] || "all";
      state.page = parseInt(m[2], 10) || 1;
    }

    function writeHash() {
      var h = "#posts" + (state.tag !== "all" ? "/" + state.tag : "") + (state.page > 1 ? "/page-" + state.page : "");
      if (state.tag === "all" && state.page === 1) h = window.location.pathname;
      if (history.replaceState) history.replaceState(null, "", h);
    }

    function matches(item) {
      if (state.tag === "all") return true;
      return (" " + item.getAttribute("data-tags") + " ").indexOf(" " + state.tag + " ") !== -1;
    }

    function pageLink(label, page, opts) {
      opts = opts || {};
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = "#posts";
      a.innerHTML = label;
      if (opts.aria) a.setAttribute("aria-label", opts.aria);
      if (opts.current) { a.className = "current"; a.setAttribute("aria-current", "page"); }
      if (opts.disabled) { a.className = (a.className + " disabled").trim(); a.setAttribute("aria-disabled", "true"); a.tabIndex = -1; }
      a.addEventListener("click", function (e) {
        e.preventDefault();
        if (opts.disabled || opts.current) return;
        go(page, true);
      });
      li.appendChild(a);
      return li;
    }

    function render(scroll) {
      var visible = items.filter(matches);
      var pages = Math.max(1, Math.ceil(visible.length / perPage));
      if (state.page > pages) state.page = pages;
      if (state.page < 1) state.page = 1;
      var start = (state.page - 1) * perPage;
      var shown = visible.slice(start, start + perPage);

      items.forEach(function (item) {
        var on = shown.indexOf(item) !== -1;
        item.hidden = !on;
        if (on) { item.style.animation = "none"; void item.offsetWidth; item.style.animation = ""; }
      });

      chips.forEach(function (c) {
        var active = c.getAttribute("data-tag") === state.tag;
        c.classList.toggle("is-active", active);
        c.setAttribute("aria-pressed", active ? "true" : "false");
      });

      var ul = nav.querySelector("ul");
      ul.innerHTML = "";
      ul.appendChild(pageLink('<i class="fas fa-chevron-left" aria-hidden="true"></i> Previous', state.page - 1,
        { disabled: state.page === 1, aria: "Previous page" }));
      for (var p = 1; p <= pages; p++) {
        ul.appendChild(pageLink(String(p), p, { current: p === state.page, aria: "Page " + p }));
      }
      ul.appendChild(pageLink('Next <i class="fas fa-chevron-right" aria-hidden="true"></i>', state.page + 1,
        { disabled: state.page === pages, aria: "Next page" }));
      nav.hidden = visible.length <= perPage;

      if (empty) empty.hidden = visible.length !== 0;
      if (status) {
        status.textContent = visible.length
          ? "Showing " + (shown.length > 1 ? (start + 1) + "–" + (start + shown.length) : start + 1) +
            " of " + visible.length + " post" + (visible.length === 1 ? "" : "s")
          : "";
      }

      writeHash();
      if (scroll && anchor) {
        var top = anchor.getBoundingClientRect().top + window.scrollY - 80;
        if (window.scrollY > top) window.scrollTo({ top: top, behavior: reduceMotion ? "auto" : "smooth" });
      }
    }

    function go(page, scroll) { state.page = page; render(scroll); }

    chips.forEach(function (c) {
      c.addEventListener("click", function () {
        state.tag = c.getAttribute("data-tag");
        state.page = 1;
        render(false);
      });
    });

    // Tag pills on cards act as filters too
    list.querySelectorAll(".post-tags .tag").forEach(function (t) {
      t.addEventListener("click", function (e) {
        e.preventDefault();
        state.tag = t.getAttribute("data-tag");
        state.page = 1;
        render(true);
      });
    });

    // Left / right arrow keys flip pages when focus isn't in a form field
    document.addEventListener("keydown", function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey || /input|textarea|select/i.test(e.target.tagName)) return;
      var pages = Math.max(1, Math.ceil(items.filter(matches).length / perPage));
      if (e.key === "ArrowRight" && state.page < pages) go(state.page + 1, true);
      if (e.key === "ArrowLeft" && state.page > 1) go(state.page - 1, true);
    });

    readHash();
    render(false);
  }

  /* ---------- Boot ---------- */
  function boot() {
    markActiveNav();
    initTyped();
    initPostList();
    initCopyButtons();
    var onScrollFns = [initBackToTop(), initProgress()].filter(Boolean);
    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        onScrollFns.forEach(function (fn) { fn(); });
        ticking = false;
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
