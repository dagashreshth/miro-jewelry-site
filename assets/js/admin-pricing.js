/* ============================================================
   Miró — Back office: gold rate strip + product editor
   Adds the pricing workflow the client asked for:
     · a daily-locked gold rate that drives every piece
     · a per-piece pricing tab built on her sheet's formulas
     · serial numbers, photo upload and category assignment
   Requires pricing.js + admin.js (loaded after both).
   ============================================================ */
(function () {
  "use strict";

  var P = window.MiroPricing;
  if (!P || !window.Miro) return;

  var MAX_PHOTO_PX = 1200;   /* photos are stored as data URLs — keep them small */
  var MAX_PHOTOS = 6;

  /* ---------- Helpers ---------- */
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function money(n) { return window.Miro.fmt(Math.round(n || 0)); }
  function dec(n, places) {
    var f = Math.pow(10, places == null ? 2 : places);
    return String(Math.round((n || 0) * f) / f);
  }
  function toast(msg) { if (window.MiroToast) window.MiroToast(msg); }

  function fmtStamp(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    if (isNaN(d)) return "—";
    return d.toLocaleString("en-IN", {
      weekday: "short", day: "numeric", month: "short",
      hour: "numeric", minute: "2-digit", hour12: true
    });
  }

  /* ============================================================
     Daily rate feed
     A scheduled job commits assets/data/gold-rate.json. It is offered as a
     suggestion rather than applied automatically — the published figure is a
     retail quote, and the client still has to confirm it reflects her cost.
     ============================================================ */
  var feed = null;

  function feedRate(f) {
    if (!f || !f.perGram) return 0;
    var basis = P.read().settings.feedBasis || "k24_995";
    return P.num(f.perGram[basis]);
  }

  function loadFeed() {
    if (!window.fetch) return;
    fetch("assets/data/gold-rate.json", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (json) {
        if (!json || !json.perGram) return;
        feed = json;
        renderGoldStrip();
      })
      .catch(function () { /* no feed committed yet — manual entry still works */ });
  }

  function feedHTML() {
    if (!feed) return "";
    var suggested = feedRate(feed);
    if (!(suggested > 0)) return "";
    var current = P.num(P.read().goldRate.rate24k);
    var same = Math.abs(current - suggested) < 0.5;
    var basis = P.read().settings.feedBasis === "k24_999" ? "24K as published" : "995 fine";

    return (
      '<div class="goldfeed' + (same ? " goldfeed--matched" : "") + '">' +
        '<p class="goldfeed__text">' +
          "<strong>" + esc(feed.source || "Feed") + "</strong> · " + esc(feed.city || "") + " " +
          esc(feed.rateDate || "") + " — " + money(suggested) + "/g <span>(" + esc(basis) + ")</span>" +
        "</p>" +
        (same
          ? '<p class="goldfeed__ok">In use</p>'
          : '<button type="button" class="gbtn js-gold-apply-feed">Use this rate</button>') +
      "</div>"
    );
  }

  /* ============================================================
     Gold rate strip
     ============================================================ */
  function goldStripHTML() {
    var data = P.read();
    var g = data.goldRate;
    var rates = P.karatRates(g);
    var locked = P.isLocked(g);
    var hasRate = P.num(g.rate24k) > 0 || rates.k14 > 0;

    return (
      '<div class="goldbar' + (hasRate ? "" : " goldbar--unset") + '">' +
        '<div class="goldbar__main">' +
          '<p class="goldbar__label">Gold rate · 995 / 24K</p>' +
          '<p class="goldbar__rate">' + (hasRate ? money(rates.k24) + " <span>/g</span>" : "Not set") + "</p>" +
        "</div>" +
        '<dl class="goldbar__karats">' +
          "<div><dt>14K</dt><dd>" + (rates.k14 ? money(rates.k14) + "/g" : "—") +
            (g.override14k != null && g.override14k !== "" ? ' <span class="goldbar__flag">set</span>' : "") + "</dd></div>" +
          "<div><dt>18K</dt><dd>" + (rates.k18 ? money(rates.k18) + "/g" : "—") +
            (g.override18k != null && g.override18k !== "" ? ' <span class="goldbar__flag">set</span>' : "") + "</dd></div>" +
        "</dl>" +
        '<div class="goldbar__meta">' +
          "<p>" + (hasRate ? "Updated " + esc(fmtStamp(g.updatedAt)) : "Enter today's 995 rate to price pieces") + "</p>" +
          (locked
            ? '<p class="goldbar__lock">Locked until ' + esc(fmtStamp(g.lockedUntil)) + "</p>"
            : (hasRate ? '<p class="goldbar__lock goldbar__lock--open">Lock expired — refresh the rate</p>' : "")) +
        "</div>" +
        '<button type="button" class="btn btn--sm js-gold-edit">' + (hasRate ? "Update rate" : "Set rate") + "</button>" +
      "</div>" +
      feedHTML()
    );
  }

  function renderGoldStrip() {
    var host = document.querySelector(".js-goldbar");
    if (host) host.innerHTML = goldStripHTML();
  }

  /* Apply the fed rate exactly as a manual entry would — same lock, same
     recalculation — so there is one code path for "the rate changed". */
  function applyFeedRate() {
    var suggested = feedRate(feed);
    if (!(suggested > 0)) return;
    var d = P.read();
    d.goldRate.rate24k = suggested;
    d.goldRate.updatedAt = new Date().toISOString();
    d.goldRate.lockedUntil = P.nextLockBoundary(new Date(), d.goldRate.lockHour).toISOString();
    d.goldRate.source = (feed.source || "feed");
    if (!P.write(d)) { toast("Couldn't save — browser storage is full."); return; }
    renderGoldStrip();
    if (window.MiroAdmin && window.MiroAdmin.refreshProducts) window.MiroAdmin.refreshProducts();
    toast("Rate applied from " + esc(feed.source || "feed") + " — every piece repriced.");
  }

  function openGoldDialog() {
    var data = P.read();
    var g = data.goldRate;
    var s = data.settings;

    var body =
      '<div class="pform">' +
        '<div class="pform__row">' +
          '<label class="pfield"><span>995 / 24K rate — per gram</span>' +
            '<input class="input js-g-24k" type="number" min="0" step="0.01" value="' + (P.num(g.rate24k) || "") + '" placeholder="12424">' +
            '<small>The one number to update daily. 14K and 18K are derived from it.</small>' +
          "</label>" +
          '<label class="pfield"><span>Lock until (hour)</span>' +
            '<input class="input js-g-hour" type="number" min="0" max="23" step="1" value="' + P.num(g.lockHour, 13) + '">' +
            "<small>Rate holds for 24h from this hour. 13 = 1:00 pm.</small>" +
          "</label>" +
        "</div>" +

        '<details class="pdetails"' + ((g.override14k != null && g.override14k !== "") || (g.override18k != null && g.override18k !== "") ? " open" : "") + ">" +
          "<summary>Override karat rates</summary>" +
          '<p class="pform__note">Leave blank to derive from the 24K rate ' +
            "(14K = 24K × 14/24, 18K = 24K × 18/24). Fill these in only if your supplier's " +
            "per-karat rates carry a premium over the pure purity conversion.</p>" +
          '<div class="pform__row">' +
            '<label class="pfield"><span>14K rate — per gram</span>' +
              '<input class="input js-g-14k" type="number" min="0" step="0.01" value="' + (g.override14k == null ? "" : g.override14k) + '" placeholder="derived"></label>' +
            '<label class="pfield"><span>18K rate — per gram</span>' +
              '<input class="input js-g-18k" type="number" min="0" step="0.01" value="' + (g.override18k == null ? "" : g.override18k) + '" placeholder="derived"></label>' +
          "</div>" +
        "</details>" +

        '<hr class="pform__rule">' +
        '<p class="pform__legend">House defaults — used by every piece unless overridden on the piece itself</p>' +
        '<div class="pform__row pform__row--3">' +
          '<label class="pfield"><span>Labour — per gram of gold</span>' +
            '<input class="input js-s-labour" type="number" min="0" step="0.01" value="' + P.num(s.labourRatePerGram) + '"></label>' +
          '<label class="pfield"><span>Margin on cost</span>' +
            '<input class="input js-s-margin" type="number" min="0" step="0.1" value="' + P.num(s.marginPct) + '"><small>Percent added to cost.</small></label>' +
          '<label class="pfield"><span>Round listed price up to</span>' +
            '<input class="input js-s-round" type="number" min="0" step="100" value="' + P.num(s.roundingStep) + '"><small>Nearest ₹. 0 = no rounding.</small></label>' +
        "</div>" +
        '<label class="pfield"><span>Daily feed applies</span>' +
          '<select class="select js-s-basis">' +
            '<option value="k24_995"' + (s.feedBasis !== "k24_999" ? " selected" : "") + ">995 fine — converted from the published 24K</option>" +
            '<option value="k24_999"' + (s.feedBasis === "k24_999" ? " selected" : "") + ">24K exactly as published</option>" +
          "</select>" +
          "<small>Which figure the “use this rate” button takes from the daily feed.</small></label>" +
      "</div>";

    openModal({
      title: "Gold rate & pricing defaults",
      body: body,
      saveLabel: "Save rate",
      onSave: function (root) {
        var d = P.read();
        var v24 = P.num(root.querySelector(".js-g-24k").value);
        var o14 = root.querySelector(".js-g-14k").value.trim();
        var o18 = root.querySelector(".js-g-18k").value.trim();

        d.goldRate.rate24k = v24;
        d.goldRate.override14k = o14 === "" ? null : P.num(o14);
        d.goldRate.override18k = o18 === "" ? null : P.num(o18);
        d.goldRate.lockHour = Math.max(0, Math.min(23, Math.round(P.num(root.querySelector(".js-g-hour").value, 13))));
        d.goldRate.updatedAt = new Date().toISOString();
        d.goldRate.lockedUntil = P.nextLockBoundary(new Date(), d.goldRate.lockHour).toISOString();
        d.goldRate.source = "manual";

        d.settings.labourRatePerGram = P.num(root.querySelector(".js-s-labour").value);
        d.settings.marginPct = P.num(root.querySelector(".js-s-margin").value);
        d.settings.roundingStep = P.num(root.querySelector(".js-s-round").value);
        d.settings.feedBasis = root.querySelector(".js-s-basis").value;

        if (!P.write(d)) { toast("Couldn't save — browser storage is full."); return false; }
        renderGoldStrip();
        if (window.MiroAdmin && window.MiroAdmin.refreshProducts) window.MiroAdmin.refreshProducts();
        toast("Gold rate saved — every piece repriced.");
        return true;
      }
    });
  }

  /* ============================================================
     Product editor
     ============================================================ */
  var editing = null;   /* { id, piece } */

  function blankStone() {
    return { label: "", type: "Diamond", shape: "Round", quality: "GH/VS", charni: "", perStoneCt: "", perCaratPrice: "", qty: "" };
  }

  /* A piece record, seeded from the catalogue entry when one exists.
     A catalogue piece keeps the serial the Products table already shows for
     it (derived from its position); only genuinely new pieces draw a fresh
     number from above the catalogue block. */
  function pieceFor(id) {
    var data = P.read();
    var stored = data.pieces[id];
    if (stored) return JSON.parse(JSON.stringify(stored));

    var cat = null, catIndex = -1;
    for (var i = 0; i < window.Miro.PRODUCTS.length; i++) {
      if (window.Miro.PRODUCTS[i].id === id) { cat = window.Miro.PRODUCTS[i]; catIndex = i; break; }
    }
    return {
      serial: cat ? P.serialFrom(catIndex + 1) : P.nextSerial(data.pieces, window.Miro.PRODUCTS.length),
      name: cat ? cat.name : "",
      category: cat ? cat.category : "rings",
      collection: cat ? cat.collection : "",
      description: cat ? cat.description : "",
      stock: "",
      goldGrams: "",
      stones: [blankStone()],
      photos: [],
      labourRatePerGram: "",
      marginPct: "",
      roundingStep: ""
    };
  }

  /* Per-piece overrides fall back to the house defaults. */
  function effectiveSettings(piece) {
    var s = P.read().settings;
    return {
      labourRatePerGram: piece.labourRatePerGram === "" || piece.labourRatePerGram == null
        ? s.labourRatePerGram : P.num(piece.labourRatePerGram),
      marginPct: piece.marginPct === "" || piece.marginPct == null
        ? s.marginPct : P.num(piece.marginPct),
      roundingStep: piece.roundingStep === "" || piece.roundingStep == null
        ? s.roundingStep : P.num(piece.roundingStep)
    };
  }

  function optionList(values, selected) {
    return values.map(function (v) {
      return '<option value="' + esc(v) + '"' + (String(v) === String(selected) ? " selected" : "") + ">" + esc(v) + "</option>";
    }).join("");
  }

  /* Client request 2026-07-31: a diamond's ₹/carat is no longer typed here —
     it is read from the Diamond Inventory. Coloured stones have no rate card,
     so they keep the manual field.
     Client feedback 2026-09-04: round melee is sized by charni, not carat.
     The charni is picked from what the rate card offers for that shape and
     clarity, and the carat per stone comes from the same row. */
  function charniOptionsHTML(row, dropStale) {
    var current = P.normCharni(row.charni);
    var list = P.diamondCharnis(row, P.read().diamonds);
    var onCard = false;
    var html = '<option value="">By carat weight</option>';
    list.forEach(function (c) {
      var sel = !!current && P.normCharni(c.charni) === current;
      if (sel) onCard = true;
      html += '<option value="' + esc(c.charni) + '"' + (sel ? " selected" : "") + ">" +
        esc(c.charni) + (c.ctw > 0 ? " · " + dec(c.ctw, 3) + " ct" : "") + "</option>";
    });
    /* A saved charni that has since left the card stays visible rather than
       vanishing — unless the shape or clarity just changed, when it no
       longer applies and the row falls back to carat weight. */
    if (current && !onCard && !dropStale) {
      html = '<option value="' + esc(row.charni) + '" selected>' + esc(String(row.charni).trim()) +
        " (not on rate card)</option>" + html;
    }
    return html;
  }

  function stoneRowHTML(row, i) {
    var isDiamond = String(row.type || "").toLowerCase() === "diamond";
    return (
      '<tr class="stone-row" data-i="' + i + '">' +
        '<td data-label="Label"><input class="input js-st-label" type="text" value="' + esc(row.label) + '" placeholder="DIA 1"></td>' +
        '<td data-label="Stone"><select class="select js-st-type">' + optionList(P.STONE_TYPES, row.type) + "</select></td>" +
        '<td data-label="Shape"><select class="select js-st-shape">' + optionList(P.SHAPES, row.shape) + "</select></td>" +
        '<td data-label="Colour/Clarity"><input class="input js-st-quality" type="text" value="' + esc(row.quality) + '" placeholder="GH/VS"></td>' +
        '<td data-label="Charni">' +
          '<select class="select js-st-charni" aria-label="Charni size"' + (isDiamond ? "" : " hidden") + ">" +
            charniOptionsHTML(row) +
          "</select>" +
          '<span class="st-dash js-st-nocharni"' + (isDiamond ? " hidden" : "") + ' aria-hidden="true">—</span>' +
        "</td>" +
        '<td data-label="Ct / stone" class="num">' +
          '<input class="input num js-st-ct" type="number" min="0" step="0.001" value="' + esc(row.perStoneCt) + '">' +
          '<span class="st-rate js-st-ctauto" hidden></span>' +
        "</td>" +
        '<td data-label="Stones" class="num"><input class="input num js-st-qty" type="number" min="0" step="1" value="' + esc(row.qty) + '"></td>' +
        '<td data-label="₹ / carat" class="num js-st-ratecell">' +
          '<input class="input num js-st-rate" type="number" min="0" step="0.01" value="' + esc(row.perCaratPrice) + '">' +
          '<span class="st-rate js-st-rateauto" hidden></span>' +
        "</td>" +
        '<td data-label="Total ct" class="num js-st-totalct">—</td>' +
        '<td data-label="Value" class="num js-st-value">—</td>' +
        '<td class="cell-actions"><button type="button" class="gbtn js-st-remove" aria-label="Remove this stone row">Remove</button></td>' +
      "</tr>"
    );
  }

  /* The charni list depends on shape + clarity, so rebuild it whenever
     either changes — keeping the current pick if the new list still has it. */
  function rebuildCharni(tr) {
    if (!tr) return;
    var sel = tr.querySelector(".js-st-charni");
    if (!sel) return;
    sel.innerHTML = charniOptionsHTML({
      type: tr.querySelector(".js-st-type").value,
      shape: tr.querySelector(".js-st-shape").value,
      quality: tr.querySelector(".js-st-quality").value,
      charni: sel.value
    }, true);
  }

  function editorBodyHTML(piece) {
    var cats = Object.keys(window.Miro.CATEGORY_LABEL);
    var eff = effectiveSettings(piece);

    return (
      '<div class="ptabs" role="tablist" aria-label="Product editor sections">' +
        '<button type="button" class="ptab is-active" role="tab" aria-selected="true" data-tab="details">Details</button>' +
        '<button type="button" class="ptab" role="tab" aria-selected="false" data-tab="pricing">Pricing</button>' +
        '<button type="button" class="ptab" role="tab" aria-selected="false" data-tab="photos">Photos</button>' +
      "</div>" +

      /* ---- Details ---- */
      '<div class="ppane is-active" data-pane="details">' +
        '<div class="pform">' +
          '<div class="pform__row">' +
            '<label class="pfield"><span>Serial number</span>' +
              '<input class="input js-p-serial" type="text" value="' + esc(piece.serial) + '">' +
              "<small>Assigned automatically — edit only if you keep your own numbering.</small></label>" +
            '<label class="pfield"><span>Name of the piece</span>' +
              '<input class="input js-p-name" type="text" value="' + esc(piece.name) + '" placeholder="Aurelia Halo Ring"></label>' +
          "</div>" +
          '<div class="pform__row pform__row--3">' +
            '<label class="pfield"><span>Category</span><select class="select js-p-category">' +
              cats.map(function (c) {
                return '<option value="' + esc(c) + '"' + (c === piece.category ? " selected" : "") + ">" +
                  esc(window.Miro.CATEGORY_LABEL[c]) + "</option>";
              }).join("") + "</select></label>" +
            '<label class="pfield"><span>Collection</span><select class="select js-p-collection">' +
              '<option value="">— none —</option>' +
              window.Miro.COLLECTIONS.map(function (c) {
                return '<option value="' + esc(c.filter) + '"' + (c.filter === piece.collection ? " selected" : "") + ">" + esc(c.name) + "</option>";
              }).join("") + "</select></label>" +
            '<label class="pfield"><span>Stock</span>' +
              '<input class="input js-p-stock" type="number" min="0" step="1" value="' + esc(piece.stock) + '"></label>' +
          "</div>" +
          '<label class="pfield"><span>Description</span>' +
            '<textarea class="textarea js-p-desc" rows="3">' + esc(piece.description) + "</textarea></label>" +
        "</div>" +
      "</div>" +

      /* ---- Pricing ---- */
      '<div class="ppane" data-pane="pricing" hidden>' +
        '<div class="pform">' +
          '<div class="pform__row pform__row--4">' +
            '<label class="pfield"><span>Net gold weight (g)</span>' +
              '<input class="input js-p-grams" type="number" min="0" step="0.001" value="' + esc(piece.goldGrams) + '" placeholder="7.65"></label>' +
            '<label class="pfield"><span>Labour ₹/g</span>' +
              '<input class="input js-p-labour" type="number" min="0" step="0.01" value="' + esc(piece.labourRatePerGram) + '" placeholder="' + P.num(eff.labourRatePerGram) + '"><small>Blank = house default.</small></label>' +
            '<label class="pfield"><span>Margin %</span>' +
              '<input class="input js-p-margin" type="number" min="0" step="0.1" value="' + esc(piece.marginPct) + '" placeholder="' + P.num(eff.marginPct) + '"><small>Blank = house default.</small></label>' +
            '<label class="pfield"><span>Round up to ₹</span>' +
              '<input class="input js-p-round" type="number" min="0" step="100" value="' + esc(piece.roundingStep) + '" placeholder="' + P.num(eff.roundingStep) + '"><small>Blank = house default.</small></label>' +
          "</div>" +
        "</div>" +

        '<div class="stones">' +
          '<div class="stones__bar">' +
            "<h3>Stones</h3>" +
            '<button type="button" class="gbtn js-st-add">+ Add stone</button>' +
          "</div>" +
          '<div class="stones__scroll">' +
            '<table class="atable stones__table">' +
              "<thead><tr>" +
                "<th scope=\"col\">Label</th><th scope=\"col\">Stone</th><th scope=\"col\">Shape</th>" +
                "<th scope=\"col\">Colour/Clarity</th><th scope=\"col\">Charni</th>" +
                "<th scope=\"col\" class=\"num\">Ct / stone</th>" +
                "<th scope=\"col\" class=\"num\">Stones</th><th scope=\"col\" class=\"num\">₹ / carat</th>" +
                "<th scope=\"col\" class=\"num\">Total ct</th><th scope=\"col\" class=\"num\">Value</th>" +
                "<th scope=\"col\"><span class=\"sr-only\">Actions</span></th>" +
              "</tr></thead>" +
              '<tbody class="js-stone-rows">' +
                piece.stones.map(stoneRowHTML).join("") +
              "</tbody>" +
            "</table>" +
          "</div>" +
          '<p class="stones__hint">Diamonds price from the Diamond Inventory. Round melee: pick the charni size, and the ' +
            "carat weight and rate fill in from the card. Larger stones and fancy shapes: leave charni on " +
            "“By carat weight” and type the carat per stone.</p>" +
        "</div>" +

        '<div class="psummary js-psummary"></div>' +
      "</div>" +

      /* ---- Photos ---- */
      '<div class="ppane" data-pane="photos" hidden>' +
        '<div class="photos">' +
          '<label class="photos__drop">' +
            '<input class="js-p-photos" type="file" accept="image/*" multiple>' +
            "<span><strong>Choose photographs</strong>" +
            "<small>Up to " + MAX_PHOTOS + " images. Large files are resized to " + MAX_PHOTO_PX + "px before saving.</small></span>" +
          "</label>" +
          '<div class="photos__grid js-photo-grid"></div>' +
        "</div>" +
      "</div>"
    );
  }

  /* ---------- Live pricing ---------- */
  function readStonesFromDOM(root) {
    return [].slice.call(root.querySelectorAll(".stone-row")).map(function (tr) {
      return {
        label: tr.querySelector(".js-st-label").value,
        type: tr.querySelector(".js-st-type").value,
        shape: tr.querySelector(".js-st-shape").value,
        quality: tr.querySelector(".js-st-quality").value,
        charni: tr.querySelector(".js-st-charni").value,
        perStoneCt: tr.querySelector(".js-st-ct").value,
        qty: tr.querySelector(".js-st-qty").value,
        perCaratPrice: tr.querySelector(".js-st-rate").value
      };
    });
  }

  function readPieceFromDOM(root) {
    var p = {
      serial: root.querySelector(".js-p-serial").value.trim(),
      name: root.querySelector(".js-p-name").value.trim(),
      category: root.querySelector(".js-p-category").value,
      collection: root.querySelector(".js-p-collection").value,
      description: root.querySelector(".js-p-desc").value.trim(),
      stock: root.querySelector(".js-p-stock").value,
      goldGrams: root.querySelector(".js-p-grams").value,
      labourRatePerGram: root.querySelector(".js-p-labour").value.trim(),
      marginPct: root.querySelector(".js-p-margin").value.trim(),
      roundingStep: root.querySelector(".js-p-round").value.trim(),
      stones: readStonesFromDOM(root),
      photos: editing.piece.photos.slice()
    };
    return p;
  }

  function recalc(root) {
    var piece = readPieceFromDOM(root);
    var eff = effectiveSettings(piece);
    var store = P.read();
    var gold = store.goldRate;
    var diamonds = store.diamonds;
    var r = P.price(piece, { settings: eff, goldRate: gold, diamonds: diamonds });

    /* Per-row echo. Diamonds show the rate the inventory supplied and hide
       the manual field, so there is one place a diamond price comes from.
       A charni-sized row also shows the carat the card gives that sieve. */
    [].slice.call(root.querySelectorAll(".stone-row")).forEach(function (tr, i) {
      var data = piece.stones[i];
      var row = P.stoneRow(data, diamonds);
      var isDiamond = String(data.type || "").toLowerCase() === "diamond";
      var byCharni = isDiamond && row.mode === "charni";
      var input = tr.querySelector(".js-st-rate");
      var auto = tr.querySelector(".js-st-rateauto");
      var ctInput = tr.querySelector(".js-st-ct");
      var ctAuto = tr.querySelector(".js-st-ctauto");

      /* Charni is a diamond thing — coloured stones show a dash instead */
      tr.querySelector(".js-st-charni").hidden = !isDiamond;
      tr.querySelector(".js-st-nocharni").hidden = isDiamond;
      input.hidden = isDiamond;
      auto.hidden = !isDiamond;
      ctInput.hidden = byCharni;
      ctAuto.hidden = !byCharni;

      if (isDiamond) {
        var hit = P.diamondRate(data, diamonds);
        if (byCharni) {
          ctAuto.textContent = hit.found && hit.ctw > 0 ? dec(hit.ctw, 3) : "—";
          ctAuto.title = hit.found ? "Carat per stone for " + hit.row.charni + ", from the Diamond Inventory" : "";
        }
        auto.className = "st-rate js-st-rateauto" + (hit.found ? "" : " st-rate--missing");
        if (hit.found) {
          auto.textContent = money(hit.rate);
          auto.title = "From the Diamond Inventory" + (byCharni ? " · " + hit.row.charni : "");
        } else if (hit.reason === "charni") {
          auto.textContent = "not on card";
          auto.title = "The Diamond Inventory has no “" + String(data.charni || "").trim() + "” row for this shape and clarity" +
            (hit.available && hit.available.length ? ". It lists " + hit.available.join(", ") + "." : ".");
        } else if (hit.reason === "size") {
          /* Right stone, size not on the card. Never borrow a nearby rate —
             price per carat climbs steeply with size. */
          auto.textContent = "add " + dec(hit.wanted, 3) + " ct";
          auto.title = "The Diamond Inventory has no " + dec(hit.wanted, 3) + " ct rate for this stone" +
            (hit.available.length ? ". It lists " + hit.available.map(function (c) { return dec(c, 3); }).join(", ") + " ct" : "") +
            " — add this size there.";
        } else if (hit.reason === "nosize") {
          auto.textContent = "pick a size";
          auto.title = "Choose a charni size, or type the carat per stone.";
        } else {
          auto.textContent = "no rate";
          auto.title = "Nothing in the Diamond Inventory matches this shape and clarity";
        }
      }

      tr.querySelector(".js-st-totalct").textContent = row.totalCt ? dec(row.totalCt, 3) : "—";
      tr.querySelector(".js-st-value").textContent = row.value ? money(row.value) : "—";
    });

    var rates = r.rates;
    var noRate = !(rates.k14 > 0 || rates.k18 > 0);

    root.querySelector(".js-psummary").innerHTML =
      (noRate ? '<p class="psummary__warn">No gold rate set yet — metal cost is counted as zero. Set the 995 rate on the Products page.</p>' : "") +
      (r.stones.unpriced
        ? '<p class="psummary__warn"><strong>' + r.stones.unpriced + " diamond row" +
          (r.stones.unpriced === 1 ? " has" : "s have") + " no price.</strong> " +
          "Those stones count as zero, so this price is too low. Pick a charni size the rate card " +
          "knows, or add the missing charni or carat weight to the Diamond Inventory — a rate for a " +
          "different size is never borrowed, because price per carat changes sharply with stone size.</p>"
        : "") +
      '<table class="psum">' +
        "<caption>Cost breakdown</caption>" +
        "<thead><tr><th scope=\"col\">Line</th><th scope=\"col\" class=\"num\">14K</th><th scope=\"col\" class=\"num\">18K</th></tr></thead>" +
        "<tbody>" +
          "<tr><th scope=\"row\">Stones <span>" + dec(r.stones.carats, 3) + " ct · " + Math.round(r.stones.count) + " stones</span></th>" +
            '<td class="num">' + money(r.stones.value) + '</td><td class="num">' + money(r.stones.value) + "</td></tr>" +
          "<tr><th scope=\"row\">Labour <span>" + dec(r.grams, 3) + " g × " + money(eff.labourRatePerGram) + "/g</span></th>" +
            '<td class="num">' + money(r.labour) + '</td><td class="num">' + money(r.labour) + "</td></tr>" +
          "<tr><th scope=\"row\">Gold <span>" + dec(r.grams, 3) + " g × " + money(rates.k14) + " / " + money(rates.k18) + " per g</span></th>" +
            '<td class="num">' + money(r.metal.k14) + '</td><td class="num">' + money(r.metal.k18) + "</td></tr>" +
          '<tr class="psum__sub"><th scope="row">Total cost</th>' +
            '<td class="num">' + money(r.cost.k14) + '</td><td class="num">' + money(r.cost.k18) + "</td></tr>" +
          "<tr><th scope=\"row\">Retail <span>+" + dec(eff.marginPct, 2) + "% on cost</span></th>" +
            '<td class="num">' + money(r.retail.k14) + '</td><td class="num">' + money(r.retail.k18) + "</td></tr>" +
          '<tr class="psum__total"><th scope="row">Listed price <span>rounded up to ' + money(eff.roundingStep) + "</span></th>" +
            '<td class="num">' + money(r.listed.k14) + '</td><td class="num">' + money(r.listed.k18) + "</td></tr>" +
        "</tbody>" +
      "</table>";
  }

  /* ---------- Photos ---------- */
  function renderPhotos(root) {
    var grid = root.querySelector(".js-photo-grid");
    if (!grid) return;
    if (!editing.piece.photos.length) {
      grid.innerHTML = '<p class="photos__empty">No photographs yet.</p>';
      return;
    }
    /* Client request 2026-07-31: the order photographs appear in on the
       listing is hers to set — first is the one the storefront leads with. */
    var last = editing.piece.photos.length - 1;
    grid.innerHTML = editing.piece.photos.map(function (src, i) {
      return (
        '<figure class="photo' + (i === 0 ? " is-primary" : "") + '">' +
          '<img src="' + src + '" alt="Photograph ' + (i + 1) + '">' +
          '<figcaption>' +
            '<span class="photo__pos">' + (i === 0 ? "Primary" : "#" + (i + 1)) + "</span>" +
            '<span class="photo__moves">' +
              '<button type="button" class="gbtn js-photo-move" data-i="' + i + '" data-dir="-1"' +
                (i === 0 ? " disabled" : "") + ' aria-label="Move photograph ' + (i + 1) + ' earlier">←</button>' +
              '<button type="button" class="gbtn js-photo-move" data-i="' + i + '" data-dir="1"' +
                (i === last ? " disabled" : "") + ' aria-label="Move photograph ' + (i + 1) + ' later">→</button>' +
              '<button type="button" class="gbtn js-photo-remove" data-i="' + i + '" aria-label="Remove photograph ' + (i + 1) + '">Remove</button>' +
            "</span>" +
          "</figcaption>" +
        "</figure>"
      );
    }).join("");
  }

  /* Downscale before storing — full-size data URLs blow the storage quota fast. */
  function shrink(file, cb) {
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () {
        var w = img.naturalWidth, h = img.naturalHeight;
        var scale = Math.min(1, MAX_PHOTO_PX / Math.max(w, h));
        var cw = Math.max(1, Math.round(w * scale));
        var ch = Math.max(1, Math.round(h * scale));
        var canvas = document.createElement("canvas");
        canvas.width = cw; canvas.height = ch;
        canvas.getContext("2d").drawImage(img, 0, 0, cw, ch);
        try { cb(canvas.toDataURL("image/jpeg", 0.82)); }
        catch (e) { cb(reader.result); }
      };
      img.onerror = function () { cb(null); };
      img.src = reader.result;
    };
    reader.onerror = function () { cb(null); };
    reader.readAsDataURL(file);
  }

  /* ---------- Modal shell ---------- */
  var modalEl = null;
  var lastFocus = null;

  function closeModal() {
    if (!modalEl) return;
    modalEl.remove();
    modalEl = null;
    document.body.classList.remove("no-scroll");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function openModal(opts) {
    closeModal();
    lastFocus = document.activeElement;

    modalEl = document.createElement("div");
    modalEl.className = "pmodal";
    modalEl.innerHTML =
      '<div class="pmodal__scrim js-pm-close"></div>' +
      '<div class="pmodal__panel" role="dialog" aria-modal="true" aria-label="' + esc(opts.title) + '">' +
        '<header class="pmodal__head">' +
          "<h2>" + esc(opts.title) + "</h2>" +
          '<button type="button" class="icon-btn js-pm-close" aria-label="Close">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke-linecap="round"/></svg>' +
          "</button>" +
        "</header>" +
        '<div class="pmodal__body js-pm-body">' + opts.body + "</div>" +
        '<footer class="pmodal__foot">' +
          (opts.extraFoot || "") +
          '<button type="button" class="gbtn js-pm-close">Cancel</button>' +
          '<button type="button" class="btn btn--sm js-pm-save">' + esc(opts.saveLabel || "Save") + "</button>" +
        "</footer>" +
      "</div>";
    document.body.appendChild(modalEl);
    document.body.classList.add("no-scroll");

    modalEl.addEventListener("click", function (e) {
      if (e.target.closest(".js-pm-close")) { closeModal(); return; }
      if (e.target.closest(".js-pm-save")) {
        if (opts.onSave(modalEl) !== false) closeModal();
      }
    });

    var first = modalEl.querySelector("input, select, textarea, button");
    if (first) setTimeout(function () { first.focus(); }, 60);
    return modalEl;
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && modalEl) closeModal();
  });

  /* ---------- Open the product editor ---------- */
  function openEditor(productId) {
    var isNew = !productId;
    var id = productId || ("piece-" + Date.now());
    editing = { id: id, piece: pieceFor(id) };

    var root = openModal({
      title: isNew ? "Add product" : "Edit · " + (editing.piece.name || "piece"),
      body: editorBodyHTML(editing.piece),
      saveLabel: isNew ? "Add product" : "Save changes",
      extraFoot: isNew ? "" : '<button type="button" class="gbtn gbtn--danger js-p-delete">Delete pricing</button>',
      onSave: function (r) {
        var piece = readPieceFromDOM(r);
        if (!piece.name) { toast("Give the piece a name first."); return false; }
        var data = P.read();
        data.pieces[id] = piece;
        if (!P.write(data)) {
          toast("Couldn't save — browser storage is full. Try fewer or smaller photos.");
          return false;
        }
        if (window.MiroAdmin && window.MiroAdmin.refreshProducts) window.MiroAdmin.refreshProducts();
        toast(esc(piece.serial) + " saved.");
        /* Push it to the live site straight away once connected, so an edit
           in the dashboard doesn't sit here invisibly. */
        if (window.MiroAdminCatalog && window.MiroAdminCatalog.autoPublish) window.MiroAdminCatalog.autoPublish();
        return true;
      }
    });

    renderPhotos(root);
    recalc(root);

    /* Tabs */
    root.addEventListener("click", function (e) {
      var tab = e.target.closest(".ptab");
      if (tab) {
        var name = tab.getAttribute("data-tab");
        root.querySelectorAll(".ptab").forEach(function (t) {
          var on = t === tab;
          t.classList.toggle("is-active", on);
          t.setAttribute("aria-selected", String(on));
        });
        root.querySelectorAll(".ppane").forEach(function (p) {
          var on = p.getAttribute("data-pane") === name;
          p.classList.toggle("is-active", on);
          p.hidden = !on;
        });
        return;
      }

      if (e.target.closest(".js-st-add")) {
        var tbody = root.querySelector(".js-stone-rows");
        var i = tbody.children.length;
        tbody.insertAdjacentHTML("beforeend", stoneRowHTML(blankStone(), i));
        recalc(root);
        return;
      }

      var rm = e.target.closest(".js-st-remove");
      if (rm) {
        var tr = rm.closest(".stone-row");
        var tb = tr.parentNode;
        tr.remove();
        if (!tb.children.length) tb.insertAdjacentHTML("beforeend", stoneRowHTML(blankStone(), 0));
        recalc(root);
        return;
      }

      var move = e.target.closest(".js-photo-move");
      if (move) {
        var from = parseInt(move.getAttribute("data-i"), 10);
        var to = from + parseInt(move.getAttribute("data-dir"), 10);
        if (to >= 0 && to < editing.piece.photos.length) {
          var shifted = editing.piece.photos.splice(from, 1)[0];
          editing.piece.photos.splice(to, 0, shifted);
          renderPhotos(root);
        }
        return;
      }

      var rmPhoto = e.target.closest(".js-photo-remove");
      if (rmPhoto) {
        editing.piece.photos.splice(parseInt(rmPhoto.getAttribute("data-i"), 10), 1);
        renderPhotos(root);
        return;
      }

      var del = e.target.closest(".js-p-delete");
      if (del) {
        var d = P.read();
        delete d.pieces[id];
        P.write(d);
        if (window.MiroAdmin && window.MiroAdmin.refreshProducts) window.MiroAdmin.refreshProducts();
        toast("Pricing removed — the piece falls back to its catalogue price.");
        closeModal();
      }
    });

    root.addEventListener("input", function (e) {
      /* Clarity narrows which charni sizes apply, so refresh the list as she types */
      if (e.target.closest(".js-st-quality")) rebuildCharni(e.target.closest(".stone-row"));
      if (e.target.closest(".ppane[data-pane='pricing']")) recalc(root);
    });
    root.addEventListener("change", function (e) {
      if (e.target.closest(".js-st-type") || e.target.closest(".js-st-shape")) rebuildCharni(e.target.closest(".stone-row"));
      if (e.target.closest(".ppane[data-pane='pricing']")) recalc(root);

      var picker = e.target.closest(".js-p-photos");
      if (picker && picker.files && picker.files.length) {
        var files = [].slice.call(picker.files);
        var room = MAX_PHOTOS - editing.piece.photos.length;
        if (room <= 0) { toast("That's the maximum of " + MAX_PHOTOS + " photographs."); picker.value = ""; return; }
        files.slice(0, room).forEach(function (f) {
          shrink(f, function (dataUrl) {
            if (!dataUrl) { toast("Couldn't read " + f.name + "."); return; }
            editing.piece.photos.push(dataUrl);
            renderPhotos(root);
          });
        });
        picker.value = "";
      }
    });
  }

  /* ---------- Wiring ---------- */
  document.addEventListener("click", function (e) {
    if (e.target.closest(".js-gold-apply-feed")) { applyFeedRate(); return; }
    if (e.target.closest(".js-gold-edit")) { openGoldDialog(); return; }
    if (e.target.closest(".js-add-product")) { openEditor(null); return; }
    var edit = e.target.closest(".js-edit-product");
    if (edit) openEditor(edit.getAttribute("data-id"));
  });

  /* Shared so admin-catalog.js can reuse the same dialog shell */
  window.MiroModal = openModal;
  window.MiroModalClose = closeModal;
  window.MiroAdminPricing = { renderGoldStrip: renderGoldStrip, openEditor: openEditor };
  renderGoldStrip();
  loadFeed();
})();
