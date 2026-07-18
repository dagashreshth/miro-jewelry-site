/* ============================================================
   Miró — Fine Jewelry · Shared chrome
   Injects announcement bar, header, mobile drawer, search
   overlay, footer and WhatsApp float. Wires cart badge,
   live search, reveal-on-scroll and a toast helper.
   Requires store.js to be loaded first.
   ============================================================ */
(function () {
  "use strict";

  var WA_LINK = "https://wa.me/919820012345?text=" +
    encodeURIComponent("Hello Miró — I'd like some help with a piece.");
  var IG_LINK = "https://instagram.com/miro.finejewelry";

  var ICONS = {
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.8-3.8" stroke-linecap="round"/></svg>',
    bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M6 8h12l-1 12.5a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 20.5L6 8Z"/><path d="M9 10V6a3 3 0 0 1 6 0v4" stroke-linecap="round"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke-linecap="round"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke-linecap="round"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2Zm0 1.8a8.2 8.2 0 1 1-4.2 15.3l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 0 1 12 3.8Zm-3.1 4c-.2 0-.5.1-.7.4-.2.3-.9.9-.9 2.1 0 1.3.9 2.5 1 2.7.1.2 1.8 2.9 4.5 4 2.2.9 2.7.7 3.2.7.5-.1 1.6-.7 1.8-1.3.2-.6.2-1.2.2-1.3-.1-.1-.2-.2-.5-.3l-1.8-.9c-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.4-3c-.1-.2 0-.4.1-.5l.6-.8c.1-.2.1-.4 0-.6L10 8.2c-.1-.3-.3-.4-.5-.4h-.6Z"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11Z"/><circle cx="12" cy="10" r="2.6"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="5.5" width="18" height="13" rx="1.5"/><path d="m4 7 8 6 8-6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true" width="16" height="16"><path d="M4 12h15M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };

  /* Client mockup 2026-07: Home · Collections · Bespoke on the left */
  var NAV = [
    { href: "index.html", label: "Home", page: "home" },
    { href: "collections.html", label: "Collections", page: "collections" },
    { href: "contact.html", label: "Bespoke", page: "contact" }
  ];

  function current(page, item) {
    return page === item.page ? ' aria-current="page"' : "";
  }

  function buildTop(page) {
    var nav = NAV.map(function (n) {
      return '<a href="' + n.href + '"' + current(page, n) + ">" + n.label + "</a>";
    }).join("");
    var drawerNav = NAV.map(function (n) {
      return '<a href="' + n.href + '"' + current(page, n) + ">" + n.label + "</a>";
    }).join("");

    return (
      '<header class="site-header">' +
        '<div class="site-header__inner">' +
          '<button class="icon-btn hamburger js-open-drawer" aria-label="Open menu" aria-expanded="false">' + ICONS.menu + "</button>" +
          '<nav class="site-nav" aria-label="Primary">' + nav + "</nav>" +
          '<a class="site-header__logo" href="index.html" aria-label="Miró — Fine Jewelry, home">' +
            '<span class="logo-script" aria-hidden="true">Miró</span>' +
            '<span class="logo-tag">Fine Jewelry · Est. 2025</span>' +
          "</a>" +
          '<div class="site-header__icons">' +
            '<button class="icon-btn js-open-search" aria-label="Search the collection">' + ICONS.search + "</button>" +
            '<a class="icon-btn" href="contact.html" aria-label="Write to the atelier">' + ICONS.mail + "</a>" +
            '<a class="icon-btn" href="cart.html" aria-label="Shopping bag">' + ICONS.bag +
              '<span class="cart-count js-cart-count" aria-hidden="true">0</span>' +
            "</a>" +
          "</div>" +
        "</div>" +
      "</header>" +

      '<div class="drawer js-drawer" aria-hidden="true">' +
        '<div class="drawer__scrim js-close-drawer"></div>' +
        '<div class="drawer__panel" role="dialog" aria-modal="true" aria-label="Menu">' +
          '<div class="drawer__head">' +
            '<span class="logo-script">Miró</span>' +
            '<button class="icon-btn js-close-drawer" aria-label="Close menu">' + ICONS.close + "</button>" +
          "</div>" +
          '<nav class="drawer__nav" aria-label="Mobile">' + drawerNav + "</nav>" +
          '<div class="drawer__foot">' +
            '<a href="' + WA_LINK + '" target="_blank" rel="noopener">' + ICONS.whatsapp + " WhatsApp concierge</a>" +
            '<a href="' + IG_LINK + '" target="_blank" rel="noopener">' + ICONS.instagram + " @miro.finejewelry</a>" +
            '<a href="contact.html">' + ICONS.pin + " Kala Ghoda atelier, Mumbai</a>" +
          "</div>" +
        "</div>" +
      "</div>" +

      '<div class="search-overlay js-search" role="dialog" aria-modal="true" aria-label="Search">' +
        '<button class="icon-btn search-overlay__close js-close-search" aria-label="Close search">' + ICONS.close + "</button>" +
        '<div class="search-overlay__inner">' +
          '<div class="search-overlay__bar">' + ICONS.search +
            '<input class="search-overlay__input js-search-input" type="search" ' +
              'placeholder="Search rings, pearls, sapphires…" aria-label="Search products">' +
          "</div>" +
          '<p class="search-overlay__hint">Try “solitaire”, “hoops”, “pearl” or “temple”</p>' +
          '<div class="search-overlay__results js-search-results" aria-live="polite"></div>' +
        "</div>" +
      "</div>"
    );
  }

  function buildBottom() {
    return (
      '<footer class="site-footer">' +
        '<div class="container">' +
          '<div class="site-footer__main">' +
            '<div class="site-footer__brand">' +
              '<a href="index.html" aria-label="Miró home"><span class="logo-script">Miró</span></a>' +
              '<span class="logo-tag">Fine Jewelry · Est. 2025</span>' +
              "<p>Fine jewelry made in small ateliers, hallmarked by the Bureau of Indian Standards and designed to be inherited — not replaced.</p>" +
              '<div class="site-footer__social">' +
                '<a href="' + IG_LINK + '" target="_blank" rel="noopener" aria-label="Miró on Instagram">' + ICONS.instagram + "</a>" +
                '<a href="' + WA_LINK + '" target="_blank" rel="noopener" aria-label="Miró on WhatsApp">' + ICONS.whatsapp + "</a>" +
              "</div>" +
            "</div>" +
            '<nav class="site-footer__col" aria-label="Shop">' +
              "<h4>Shop</h4><ul>" +
                '<li><a href="collections.html">All jewelry</a></li>' +
                '<li><a href="collections.html?collection=solitaire">The Solitaire Edit</a></li>' +
                '<li><a href="collections.html?collection=everyday">Everyday Gold</a></li>' +
                '<li><a href="collections.html?collection=heirloom">The Heirloom Room</a></li>' +
              "</ul></nav>" +
            '<nav class="site-footer__col" aria-label="Care">' +
              "<h4>Client care</h4><ul>" +
                '<li><a href="faqs.html">FAQs</a></li>' +
                '<li><a href="contact.html">Contact us</a></li>' +
                '<li><a href="faqs.html#care">Jewelry care</a></li>' +
              "</ul></nav>" +
            '<div class="site-footer__col">' +
              "<h4>The atelier</h4>" +
              "<address>Miró Fine Jewelry<br>14 Ropewalk Lane, Kala Ghoda<br>Mumbai 400 001, India<br><br>" +
              '<a href="tel:+912266001414">+91 22 6600 1414</a><br>' +
              '<a href="mailto:care@mirojewelry.in">care@mirojewelry.in</a></address>' +
            "</div>" +
          "</div>" +
          '<div class="site-footer__bottom">' +
            '<div class="site-footer__pay"><span>Razorpay</span><span>UPI</span><span>Cards</span><span>EMI</span><span>Netbanking</span></div>' +
            "<p>© 2026 Miró Fine Jewelry LLP · GSTIN 27ABCFM1234A1Z5 · All prices include 3% GST · BIS hallmarked</p>" +
          "</div>" +
        "</div>" +
      "</footer>" +
      '<a class="wa-float" href="' + WA_LINK + '" target="_blank" rel="noopener" aria-label="Chat with Miró on WhatsApp">' +
        ICONS.whatsapp +
      "</a>" +
      '<div class="toast js-toast" role="status" aria-live="polite"></div>'
    );
  }

  /* ---------- Mount ---------- */
  var page = document.body.getAttribute("data-page") || "";
  var top = document.getElementById("site-chrome-top");
  var bottom = document.getElementById("site-chrome-bottom");
  if (top) top.innerHTML = buildTop(page);
  if (bottom) bottom.innerHTML = buildBottom();

  /* ---------- Cart badge ---------- */
  function refreshBadge() {
    var el = document.querySelector(".js-cart-count");
    if (!el || !window.Miro) return;
    var n = Miro.cart.count();
    el.textContent = n > 9 ? "9+" : String(n);
    el.classList.toggle("is-visible", n > 0);
    var link = el.closest("a");
    if (link) {
      link.setAttribute("aria-label",
        n === 0 ? "Shopping bag, empty" :
        n === 1 ? "Shopping bag, 1 item" : "Shopping bag, " + n + " items");
    }
  }
  refreshBadge();
  window.addEventListener("miro:cartchange", refreshBadge);
  window.addEventListener("storage", refreshBadge);

  /* ---------- Drawer ---------- */
  var drawer = document.querySelector(".js-drawer");
  function setDrawer(open) {
    if (!drawer) return;
    var wasOpen = drawer.classList.contains("is-open");
    if (open === wasOpen) return;
    drawer.classList.toggle("is-open", open);
    drawer.setAttribute("aria-hidden", String(!open));
    document.body.classList.toggle("no-scroll", open);
    var burger = document.querySelector(".js-open-drawer");
    if (burger) burger.setAttribute("aria-expanded", String(open));
    if (open) {
      var closeBtn = drawer.querySelector(".drawer__panel .js-close-drawer");
      if (closeBtn) setTimeout(function () { closeBtn.focus(); }, 120);
    } else if (burger) {
      burger.focus();
    }
  }
  document.addEventListener("click", function (e) {
    if (e.target.closest(".js-open-drawer")) setDrawer(true);
    if (e.target.closest(".js-close-drawer")) setDrawer(false);
  });

  /* ---------- Search overlay ---------- */
  var overlay = document.querySelector(".js-search");
  var searchInput = document.querySelector(".js-search-input");
  var searchResults = document.querySelector(".js-search-results");

  function setSearch(open) {
    if (!overlay) return;
    overlay.classList.toggle("is-open", open);
    document.body.classList.toggle("no-scroll", open);
    if (open && searchInput) setTimeout(function () { searchInput.focus(); }, 80);
    if (!open && searchInput) { searchInput.value = ""; renderSearch(""); }
  }
  function renderSearch(q) {
    if (!searchResults || !window.Miro) return;
    q = (q || "").trim().toLowerCase();
    if (!q) { searchResults.innerHTML = ""; return; }
    var hits = Miro.PRODUCTS.filter(function (p) {
      var hay = (p.name + " " + p.category + " " + p.collection + " " +
        (p.stone ? p.stone.type : "") + " " + p.description).toLowerCase();
      return hay.indexOf(q) !== -1;
    });
    if (!hits.length) {
      searchResults.innerHTML =
        '<div class="search-overlay__empty"><span class="h-serif-italic">Nothing yet…</span>' +
        "We couldn't find “" + q.replace(/</g, "&lt;") + "”. Try a stone, a category or a collection name." +
        "</div>";
      return;
    }
    searchResults.innerHTML =
      '<div class="grid grid--2 grid--4">' +
      hits.slice(0, 8).map(function (p) { return Miro.productCard(p, { width: 500 }); }).join("") +
      "</div>";
  }
  document.addEventListener("click", function (e) {
    if (e.target.closest(".js-open-search")) setSearch(true);
    if (e.target.closest(".js-close-search")) setSearch(false);
  });
  if (searchInput) {
    searchInput.addEventListener("input", function () { renderSearch(searchInput.value); });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { setSearch(false); setDrawer(false); }
  });

  /* ---------- Reveal on scroll ---------- */
  function initReveal() {
    var els = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    els.forEach(function (el) { io.observe(el); });
  }
  initReveal();

  /* ---------- Toast ---------- */
  var toastTimer = null;
  window.MiroToast = function (html, ms) {
    var t = document.querySelector(".js-toast");
    if (!t) return;
    t.innerHTML = html;
    t.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("is-visible"); }, ms || 3200);
  };

  /* Expose shared icons for page scripts that need them */
  window.MiroIcons = ICONS;
  window.MiroLinks = { whatsapp: WA_LINK, instagram: IG_LINK };
})();
