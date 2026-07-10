/* ============================================================
   Miró — FAQs page: search-within-FAQs, grouped accordions
   (one open per group), deep links (#returns, #care …) and a
   scrollspy topics nav. Requires store.js + layout.js.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Money copy via the shared formatter ---------- */
  if (window.Miro) {
    var MONEY = {
      threshold: Miro.fmt(Miro.FREE_SHIP_THRESHOLD),
      fee: Miro.fmt(Miro.shipping(1))
    };
    document.querySelectorAll(".js-money").forEach(function (el) {
      var key = el.getAttribute("data-money");
      if (MONEY[key]) el.textContent = MONEY[key];
    });
  }

  /* ---------- Element handles ---------- */
  var groups = Array.prototype.slice.call(document.querySelectorAll(".js-faq-group"));
  var items = Array.prototype.slice.call(document.querySelectorAll(".js-faq-item"));
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".js-faq-navlink"));
  var searchForm = document.querySelector(".js-faq-form");
  var searchInput = document.querySelector(".js-faq-search");
  var countEl = document.querySelector(".js-faq-count");
  var emptyEl = document.querySelector(".js-faq-empty");

  function triggerOf(item) { return item.querySelector(".accordion__trigger"); }
  function panelOf(item) { return item.querySelector(".accordion__panel"); }
  function isOpen(item) { return triggerOf(item).getAttribute("aria-expanded") === "true"; }

  /* ---------- Accordions — one open per group ---------- */
  function setOpen(item, open) {
    var panel = panelOf(item);
    triggerOf(item).setAttribute("aria-expanded", String(open));
    item.classList.toggle("is-open", open);
    if (open) {
      panel.style.maxHeight = panel.scrollHeight + "px";
    } else {
      if (panel.style.maxHeight === "none") {
        panel.style.maxHeight = panel.scrollHeight + "px";
        void panel.offsetHeight; /* commit the pixel height before collapsing */
      }
      panel.style.maxHeight = "";
    }
  }

  function openItem(item) {
    var group = item.closest(".js-faq-group");
    items.forEach(function (other) {
      if (other !== item && isOpen(other) && other.closest(".js-faq-group") === group) {
        setOpen(other, false);
      }
    });
    setOpen(item, true);
  }

  items.forEach(function (item) {
    triggerOf(item).addEventListener("click", function () {
      if (isOpen(item)) setOpen(item, false);
      else openItem(item);
    });
    /* Free the height once opened so answers stay healthy across
       font loads, rotations and viewport resizes. */
    panelOf(item).addEventListener("transitionend", function (e) {
      if (e.propertyName === "max-height" && isOpen(item)) {
        panelOf(item).style.maxHeight = "none";
      }
    });
  });

  /* ---------- Search-within-FAQs (built after money spans fill) ---------- */
  var searchIndex = items.map(function (item) {
    return {
      item: item,
      groupId: item.closest(".js-faq-group").id,
      text: (item.textContent || "").replace(/\s+/g, " ").toLowerCase()
    };
  });

  function applyFilter(query) {
    var tokens = (query || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
    var total = 0;
    var perGroup = {};
    groups.forEach(function (g) { perGroup[g.id] = 0; });

    searchIndex.forEach(function (entry) {
      var hit = tokens.every(function (t) { return entry.text.indexOf(t) !== -1; });
      entry.item.hidden = !hit;
      if (hit) { total++; perGroup[entry.groupId]++; }
    });

    groups.forEach(function (g) { g.hidden = perGroup[g.id] === 0; });

    navLinks.forEach(function (link) {
      var n = perGroup[link.getAttribute("data-group")] || 0;
      var badge = link.querySelector(".js-nav-count");
      if (badge) badge.textContent = String(n);
      link.classList.toggle("is-dim", n === 0);
      if (n === 0) link.setAttribute("tabindex", "-1");
      else link.removeAttribute("tabindex");
    });

    if (countEl) countEl.textContent = total === 1 ? "1 answer" : total + " answers";
    if (emptyEl) emptyEl.hidden = total !== 0;
  }

  applyFilter("");

  if (searchInput) {
    searchInput.addEventListener("input", function () { applyFilter(searchInput.value); });
  }
  if (searchForm) {
    searchForm.addEventListener("submit", function (e) { e.preventDefault(); });
  }

  /* ---------- Deep links: #orders … #appointments ---------- */
  function groupFromHash() {
    var hash = window.location.hash.replace("#", "");
    for (var i = 0; i < groups.length; i++) {
      if (groups[i].id === hash) return groups[i];
    }
    return null;
  }

  function revealFromHash(force) {
    var group = groupFromHash();
    if (!group || group.hidden) return;
    var alreadyOpen = group.querySelector('.accordion__trigger[aria-expanded="true"]');
    var first = group.querySelector(".js-faq-item:not([hidden])");
    if (first && (force || !alreadyOpen)) openItem(first);
    window.setTimeout(function () { group.scrollIntoView({ block: "start" }); }, 60);
  }

  if (window.location.hash) {
    /* Let the browser's native anchor jump land first, then open. */
    window.setTimeout(function () { revealFromHash(true); }, 120);
  }
  window.addEventListener("hashchange", function () { revealFromHash(false); });

  /* ---------- Scrollspy for the topics nav ---------- */
  function setActive(id) {
    navLinks.forEach(function (link) {
      var on = link.getAttribute("data-group") === id;
      link.classList.toggle("is-active", on);
      if (on) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
  }

  if ("IntersectionObserver" in window && groups.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    }, { rootMargin: "-30% 0px -58% 0px", threshold: 0 });
    groups.forEach(function (g) { spy.observe(g); });
  }

  /* Re-run reveal binding for any nodes layout.js hasn't reached */
  if (window.IntersectionObserver) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    document.querySelectorAll(".reveal:not(.is-visible)").forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("is-visible"); });
  }
})();
