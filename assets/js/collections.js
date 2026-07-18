/* ============================================================
   Miró — Collections page: live search, category pills, price
   bands, sorting, URL-synced state, mobile filter sheet and
   the collection cross-link band.
   Requires store.js + layout.js.
   ============================================================ */
(function () {
  "use strict";
  if (!window.Miro) return;

  /* ---------- Constants ---------- */
  var TOTAL = Miro.PRODUCTS.length;
  var CATS = ["all", "rings", "earrings", "necklaces", "bracelets"];
  var SORTS = ["featured", "price-asc", "price-desc", "new"];

  var BANDS = [
    { id: "under-40000",  min: 0,      max: 40000,    label: "Under " + Miro.fmt(40000) },
    { id: "40000-75000",  min: 40000,  max: 75000,    label: Miro.fmt(40000) + " – " + Miro.fmt(75000) },
    { id: "75000-125000", min: 75000,  max: 125000,   label: Miro.fmt(75000) + " – " + Miro.fmt(125000) },
    { id: "above-125000", min: 125000, max: Infinity, label: "Above " + Miro.fmt(125000) }
  ];

  var CATEGORY_LEDE = {
    rings: "Solitaires, stacking sets, signets and the occasional cocktail hour — everything we make for hands.",
    earrings: "Studs for weekdays, chandeliers for weddings, and hoops for everything in between.",
    necklaces: "Whisper chains, coin pendants, Akoya pearls and temple gold — each made to sit exactly where it should.",
    bracelets: "Curb links, diamond lines and pavé petals with a satisfying weight — the pieces you never take off."
  };

  var BANNER_ALT = {
    solitaire: "A diamond halo ring catching soft window light — from The Solitaire Edit",
    everyday: "A gold curb-chain bracelet worn against a white cuff — from Everyday Gold",
    heirloom: "A diamond collar necklace arranged on deep velvet — from The Heirloom Room"
  };

  var X_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke-linecap="round"/></svg>';

  /* Catalog order lookup for stable sorting */
  var ORDER = {};
  Miro.PRODUCTS.forEach(function (p, i) { ORDER[p.id] = i; });

  /* ---------- Elements ---------- */
  var els = {
    q: document.querySelector(".js-q"),
    sort: document.querySelector(".js-sort"),
    grid: document.querySelector(".js-grid"),
    count: document.querySelector(".js-count"),
    chips: document.querySelector(".js-chips"),
    empty: document.querySelector(".js-empty"),
    emptyWa: document.querySelector(".js-empty-wa"),
    heroEyebrow: document.querySelector(".js-hero-eyebrow"),
    heroTitle: document.querySelector(".js-hero-title"),
    heroLede: document.querySelector(".js-hero-lede"),
    heroBanner: document.querySelector(".js-hero-banner"),
    heroBannerImg: document.querySelector(".js-hero-banner-img"),
    crumbCurrent: document.querySelector(".js-crumb-current"),
    priceRowsPop: document.querySelector(".js-price-rows-pop"),
    priceRowsSheet: document.querySelector(".js-price-rows-sheet"),
    priceToggle: document.querySelector(".js-price-toggle"),
    pricePop: document.querySelector(".js-pricepop"),
    priceN: document.querySelector(".js-price-n"),
    sheet: document.querySelector(".js-sheet"),
    sheetOpen: document.querySelector(".js-sheet-open"),
    sheetX: document.querySelector(".js-sheet-x"),
    sheetApply: document.querySelector(".js-sheet-apply"),
    fcount: document.querySelector(".js-fcount"),
    fcountSr: document.querySelector(".js-fcount-sr"),
    xlinks: document.querySelector(".js-xlinks")
  };

  var DEFAULT_EYEBROW = els.heroEyebrow ? els.heroEyebrow.textContent : "The collection";
  var DEFAULT_TITLE = els.heroTitle ? els.heroTitle.textContent : "All jewelry";
  var DEFAULT_LEDE = els.heroLede ? els.heroLede.textContent : "";
  var DEFAULT_DOC_TITLE = document.title;

  var lastCount = TOTAL;

  /* ---------- Small helpers ---------- */
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function findBand(id) {
    for (var i = 0; i < BANDS.length; i++) if (BANDS[i].id === id) return BANDS[i];
    return null;
  }
  function findCollection(id) {
    for (var i = 0; i < Miro.COLLECTIONS.length; i++) if (Miro.COLLECTIONS[i].id === id) return Miro.COLLECTIONS[i];
    return null;
  }
  function all(sel) { return document.querySelectorAll(sel); }

  /* ---------- State ← URL ---------- */
  function readURL() {
    var s = { q: "", category: "all", collection: "", price: [], sort: "featured" };
    var cat = Miro.getParam("category");
    if (cat && CATS.indexOf(cat) > 0) s.category = cat;
    var col = Miro.getParam("collection");
    if (col && findCollection(col)) s.collection = col;
    var q = Miro.getParam("q");
    if (q) s.q = q;
    var sort = Miro.getParam("sort");
    if (sort && SORTS.indexOf(sort) !== -1) s.sort = sort;
    var price = Miro.getParam("price");
    if (price) {
      price.split(",").forEach(function (id) {
        if (findBand(id) && s.price.indexOf(id) === -1) s.price.push(id);
      });
    }
    return s;
  }
  var state = readURL();

  /* ---------- State → URL (debounced replaceState) ---------- */
  var urlTimer = null;
  function writeURL() {
    clearTimeout(urlTimer);
    urlTimer = setTimeout(function () {
      try {
        var params = new URLSearchParams(window.location.search);
        ["collection", "category", "q", "price", "sort"].forEach(function (k) { params.delete(k); });
        if (state.collection) params.set("collection", state.collection);
        if (state.category !== "all") params.set("category", state.category);
        if (state.q.trim()) params.set("q", state.q.trim());
        if (state.price.length) params.set("price", state.price.join(","));
        if (state.sort !== "featured") params.set("sort", state.sort);
        var qs = params.toString();
        history.replaceState(null, "", window.location.pathname + (qs ? "?" + qs : "") + window.location.hash);
      } catch (e) { /* URL sync is an enhancement — never fatal */ }
    }, 180);
  }

  /* ---------- Filtering & sorting ---------- */
  function matchesQuery(p, q) {
    var hay = (p.name + " " + p.category + " " + Miro.CATEGORY_LABEL[p.category] + " " +
      p.collection + " " + (p.stone ? p.stone.type : "") + " " + p.description).toLowerCase();
    return hay.indexOf(q) !== -1;
  }
  function inSelectedBands(p) {
    if (!state.price.length) return true;
    for (var i = 0; i < state.price.length; i++) {
      var b = findBand(state.price[i]);
      if (b && p.price >= b.min && p.price < b.max) return true;
    }
    return false;
  }
  function filtered(skipPrice) {
    var q = state.q.trim().toLowerCase();
    return Miro.PRODUCTS.filter(function (p) {
      if (state.collection && p.collection !== state.collection) return false;
      if (state.category !== "all" && p.category !== state.category) return false;
      if (q && !matchesQuery(p, q)) return false;
      if (!skipPrice && !inSelectedBands(p)) return false;
      return true;
    });
  }
  function featuredWeight(p) {
    return p.badge === "Bestseller" ? 0 : p.badge === "New" ? 1 : 2;
  }
  function sorted(list) {
    var arr = list.slice();
    arr.sort(function (a, b) {
      var d = 0;
      if (state.sort === "price-asc") d = a.price - b.price;
      else if (state.sort === "price-desc") d = b.price - a.price;
      else if (state.sort === "new") d = (a.badge === "New" ? 0 : 1) - (b.badge === "New" ? 0 : 1);
      else d = featuredWeight(a) - featuredWeight(b);
      return d || ORDER[a.id] - ORDER[b.id];
    });
    return arr;
  }
  function activeFilterCount() {
    return (state.q.trim() ? 1 : 0) +
      (state.category !== "all" ? 1 : 0) +
      (state.collection ? 1 : 0) +
      state.price.length;
  }

  /* ---------- Hero (default / category / collection) ---------- */
  function setBanner(collection) {
    if (!els.heroBanner || !els.heroBannerImg) return;
    if (!collection) { els.heroBanner.hidden = true; return; }
    var src = Miro.img(collection.image.id, 1600, "&fit=crop&ar=16:6");
    if (els.heroBannerImg.getAttribute("src") !== src) {
      els.heroBannerImg.setAttribute("src", src);
      els.heroBannerImg.setAttribute("alt", BANNER_ALT[collection.id] || (collection.name + " — collection editorial photograph"));
    }
    els.heroBanner.hidden = false;
  }
  function updateHero() {
    /* Hero is title-only now — guard every optional node */
    var c = state.collection ? findCollection(state.collection) : null;
    if (c) {
      if (els.heroEyebrow) els.heroEyebrow.textContent = "A Miró collection";
      if (els.heroTitle) els.heroTitle.textContent = c.name;
      if (els.heroLede) els.heroLede.textContent = c.tagline;
      if (els.crumbCurrent) els.crumbCurrent.textContent = c.name;
      document.title = c.name + " — Miró Fine Jewelry";
      setBanner(c);
    } else if (state.category !== "all") {
      var label = Miro.CATEGORY_LABEL[state.category];
      if (els.heroEyebrow) els.heroEyebrow.textContent = DEFAULT_EYEBROW;
      if (els.heroTitle) els.heroTitle.textContent = label;
      if (els.heroLede) els.heroLede.textContent = CATEGORY_LEDE[state.category] || DEFAULT_LEDE;
      if (els.crumbCurrent) els.crumbCurrent.textContent = label;
      document.title = label + " — Miró Fine Jewelry";
      setBanner(null);
    } else {
      if (els.heroEyebrow) els.heroEyebrow.textContent = DEFAULT_EYEBROW;
      if (els.heroTitle) els.heroTitle.textContent = DEFAULT_TITLE;
      if (els.heroLede) els.heroLede.textContent = DEFAULT_LEDE;
      if (els.crumbCurrent) els.crumbCurrent.textContent = DEFAULT_TITLE;
      document.title = DEFAULT_DOC_TITLE;
      setBanner(null);
    }
  }

  /* ---------- Active-filter chips ---------- */
  function chipHTML(type, val, label) {
    return '<button class="fchip" type="button" data-chip="' + type + '" data-val="' + esc(val) + '"' +
      ' aria-label="Remove filter: ' + esc(label) + '">' +
      "<span>" + esc(label) + "</span>" + X_ICON +
      "</button>";
  }
  function renderChips() {
    if (!els.chips) return;
    var html = [];
    if (state.collection) {
      var c = findCollection(state.collection);
      if (c) html.push(chipHTML("collection", c.id, c.name));
    }
    if (state.category !== "all") html.push(chipHTML("category", state.category, Miro.CATEGORY_LABEL[state.category]));
    if (state.q.trim()) html.push(chipHTML("q", "q", "“" + state.q.trim() + "”"));
    state.price.forEach(function (id) {
      var b = findBand(id);
      if (b) html.push(chipHTML("price", b.id, b.label));
    });
    if (html.length) {
      html.push('<button class="btn--text lclear js-clear-all" type="button">Clear all</button>');
    }
    els.chips.innerHTML = html.join("");
  }

  /* ---------- Price rows (rendered into popover + sheet) ---------- */
  function renderPriceRows() {
    var rows = BANDS.map(function (b) {
      return '<label class="prow">' +
        '<input type="checkbox" data-price="' + b.id + '">' +
        '<span class="prow__label">' + b.label + "</span>" +
        '<span class="prow__n" data-band-count="' + b.id + '" aria-hidden="true"></span>' +
        "</label>";
    }).join("");
    if (els.priceRowsPop) els.priceRowsPop.innerHTML = rows;
    if (els.priceRowsSheet) els.priceRowsSheet.innerHTML = rows;
  }
  function renderBandCounts() {
    var base = filtered(true); /* respect every filter except price */
    BANDS.forEach(function (b) {
      var n = 0;
      base.forEach(function (p) { if (p.price >= b.min && p.price < b.max) n++; });
      all('[data-band-count="' + b.id + '"]').forEach(function (el) { el.textContent = String(n); });
    });
  }

  /* ---------- Control sync (toolbar + popover + sheet mirror one state) ---------- */
  function syncControls() {
    all("[data-cat]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-cat") === state.category));
    });
    all("[data-price]").forEach(function (c) {
      c.checked = state.price.indexOf(c.getAttribute("data-price")) !== -1;
    });
    if (els.sort && els.sort.value !== state.sort) els.sort.value = state.sort;
    all("[data-sortopt]").forEach(function (r) {
      r.checked = r.getAttribute("data-sortopt") === state.sort;
    });
    if (els.q && els.q.value !== state.q) els.q.value = state.q;

    var pn = state.price.length;
    if (els.priceN) {
      els.priceN.hidden = !pn;
      els.priceN.textContent = String(pn);
    }
    if (els.priceToggle) {
      els.priceToggle.setAttribute("aria-label", pn
        ? "Filter by price — " + pn + (pn === 1 ? " range" : " ranges") + " selected"
        : "Filter by price");
    }

    var fn = activeFilterCount();
    if (els.fcount) {
      els.fcount.hidden = !fn;
      els.fcount.textContent = String(fn);
    }
    if (els.fcountSr) {
      els.fcountSr.textContent = fn ? " — " + fn + (fn === 1 ? " filter" : " filters") + " active" : "";
    }
    if (els.sheetApply) {
      els.sheetApply.textContent = lastCount === 0
        ? "No matches — clear all"
        : "Show " + lastCount + (lastCount === 1 ? " piece" : " pieces");
    }
  }

  /* ---------- Render pipeline ---------- */
  function render(animate) {
    var list = sorted(filtered(false));
    lastCount = list.length;

    if (els.grid) {
      els.grid.classList.toggle("plist--anim", animate !== false);
      els.grid.innerHTML = list.map(function (p) {
        /* Client feedback: larger images, no name/price/badge on the page —
           name + secondary photo appear on hover only */
        return Miro.productCard(p, { width: 900, minimal: true });
      }).join("");
    }
    if (els.empty) els.empty.hidden = list.length !== 0;
    if (els.count) {
      els.count.textContent = list.length === TOTAL
        ? "Showing all " + TOTAL + " pieces"
        : list.length + " of " + TOTAL + " pieces";
    }
    renderChips();
    renderBandCounts();
    syncControls();
    updateHero();
    writeURL();
  }

  /* ---------- Clearing ---------- */
  function clearAll() {
    state.q = "";
    state.category = "all";
    state.collection = "";
    state.price = [];
    render(true);
  }
  function removeChip(type, val) {
    if (type === "q") state.q = "";
    else if (type === "category") state.category = "all";
    else if (type === "collection") state.collection = "";
    else if (type === "price") {
      var at = state.price.indexOf(val);
      if (at !== -1) state.price.splice(at, 1);
    }
    render(true);
  }

  /* ---------- Price popover (desktop) ---------- */
  function setPop(open) {
    if (!els.pricePop || !els.priceToggle) return;
    els.pricePop.hidden = !open;
    els.priceToggle.setAttribute("aria-expanded", String(open));
  }
  function popIsOpen() {
    return !!(els.pricePop && !els.pricePop.hidden);
  }

  /* ---------- Bottom sheet (mobile) ---------- */
  function setSheet(open) {
    if (!els.sheet) return;
    var wasOpen = els.sheet.classList.contains("is-open");
    if (open === wasOpen) return;
    els.sheet.classList.toggle("is-open", open);
    els.sheet.setAttribute("aria-hidden", String(!open));
    document.body.classList.toggle("no-scroll", open);
    if (els.sheetOpen) els.sheetOpen.setAttribute("aria-expanded", String(open));
    if (open && els.sheetX) {
      setTimeout(function () { els.sheetX.focus(); }, 80);
    }
    if (!open && els.sheetOpen && els.sheet.contains(document.activeElement)) {
      els.sheetOpen.focus();
    }
  }

  /* ---------- Cross-link band ---------- */
  function renderXlinks() {
    if (!els.xlinks) return;
    els.xlinks.innerHTML = Miro.COLLECTIONS.map(function (c) {
      var n = Miro.PRODUCTS.filter(function (p) { return p.collection === c.filter; }).length;
      return '<a class="xtile" href="collections.html?collection=' + c.id + '">' +
        '<span class="xtile__media">' +
          '<img src="' + Miro.img(c.image.id, 240, "&fit=crop&ar=1:1") + '" alt="' +
            esc(BANNER_ALT[c.id] || c.name) + '" loading="lazy" width="240" height="240">' +
        "</span>" +
        '<span class="xtile__body">' +
          '<span class="xtile__kicker">' + n + " pieces</span>" +
          '<span class="xtile__name">' + c.name + "</span>" +
          '<span class="xtile__tag">' + c.tagline + "</span>" +
        "</span>" +
        '<span class="xtile__arrow" aria-hidden="true">' + (window.MiroIcons ? MiroIcons.arrow : "") + "</span>" +
      "</a>";
    }).join("");
  }

  /* ---------- Events ---------- */
  if (els.q) {
    els.q.addEventListener("input", function () {
      state.q = els.q.value;
      render(false); /* no card animation while typing */
    });
  }
  if (els.sort) {
    els.sort.addEventListener("change", function () {
      if (SORTS.indexOf(els.sort.value) !== -1) state.sort = els.sort.value;
      render(true);
    });
  }

  document.addEventListener("click", function (e) {
    var pill = e.target.closest("[data-cat]");
    if (pill) {
      var cat = pill.getAttribute("data-cat");
      if (CATS.indexOf(cat) !== -1 && cat !== state.category) {
        state.category = cat;
        render(true);
      }
      return;
    }
    var chip = e.target.closest(".fchip");
    if (chip) {
      removeChip(chip.getAttribute("data-chip"), chip.getAttribute("data-val"));
      return;
    }
    if (e.target.closest(".js-clear-all")) { clearAll(); setPop(false); return; }
    if (e.target.closest(".js-sheet-open")) { setSheet(true); return; }
    if (e.target.closest(".js-sheet-apply")) {
      if (lastCount === 0) clearAll();
      setSheet(false);
      return;
    }
    if (e.target.closest(".js-sheet-close")) { setSheet(false); return; }
    if (e.target.closest(".js-pop-done")) { setPop(false); return; }
    if (e.target.closest(".js-pop-clear")) {
      state.price = [];
      render(true);
      return;
    }
    if (e.target.closest(".js-price-toggle")) {
      setPop(!popIsOpen());
      return;
    }
    /* Click anywhere outside the popover closes it */
    if (popIsOpen() && !e.target.closest(".js-pricepop")) setPop(false);
  });

  document.addEventListener("change", function (e) {
    var cb = e.target.closest("[data-price]");
    if (cb) {
      var id = cb.getAttribute("data-price");
      var at = state.price.indexOf(id);
      if (cb.checked && at === -1) state.price.push(id);
      if (!cb.checked && at !== -1) state.price.splice(at, 1);
      render(true);
      return;
    }
    var radio = e.target.closest("[data-sortopt]");
    if (radio && radio.checked) {
      var sort = radio.getAttribute("data-sortopt");
      if (SORTS.indexOf(sort) !== -1) state.sort = sort;
      render(true);
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      setPop(false);
      setSheet(false);
    }
  });

  /* ---------- Init ---------- */
  if (els.emptyWa && window.MiroLinks) {
    els.emptyWa.setAttribute("href", MiroLinks.whatsapp);
    els.emptyWa.setAttribute("target", "_blank");
    els.emptyWa.setAttribute("rel", "noopener");
  }
  renderPriceRows();
  renderXlinks();
  render(true);

  /* Observe reveal elements that were still hidden when layout.js ran
     (e.g. the collection banner un-hidden during init) */
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
