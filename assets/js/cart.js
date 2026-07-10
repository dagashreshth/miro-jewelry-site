/* ============================================================
   Miró — Shopping bag: line items, qty steppers, free-shipping
   progress, order summary, gift note, empty state.
   Requires store.js + layout.js.
   ============================================================ */
(function () {
  "use strict";

  var THRESHOLD = Miro.FREE_SHIP_THRESHOLD || 50000;
  var GIFT_KEY = "miro_gift_note";
  var MAX_QTY = 5;

  var CHECK_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15" aria-hidden="true">' +
    '<path d="M4.5 12.5l5 5 10-11" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var CROSS_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" width="13" height="13" aria-hidden="true">' +
    '<path d="M6 6l12 12M18 6 6 18" stroke-linecap="round"/></svg>';

  function $(sel) { return document.querySelector(sel); }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  var els = {
    count: $(".js-bag-count"),
    filled: $(".js-bag-filled"),
    empty: $(".js-bag-empty"),
    lines: $(".js-lines"),
    shipNote: $(".js-ship-note"),
    shipText: $(".js-ship-text"),
    shipFill: $(".js-ship-fill"),
    sumSub: $(".js-sum-subtotal"),
    sumShip: $(".js-sum-shipping"),
    sumTotal: $(".js-sum-total"),
    checkout: $(".js-checkout"),
    icons: $(".js-icons"),
    iconsRail: $(".js-icons-rail"),
    wa: $(".js-wa-help")
  };

  /* ---------- Line item template ---------- */
  function lineHTML(item) {
    var p = Miro.findProduct(item.productId);
    var im = p.images[0];
    var line = esc(item.lineId);
    var name = esc(p.name);
    var pdp = "product.html?id=" + esc(p.id);

    var meta = [];
    if (item.metal) meta.push("<li>" + esc(item.metal) + "</li>");
    if (item.size) meta.push("<li>Size " + esc(item.size) + "</li>");
    if (item.engraving) meta.push('<li>Engraved <em class="h-serif-italic">“' + esc(item.engraving) + "”</em></li>");
    if (item.giftWrap) meta.push("<li>Signature gift wrap</li>");

    var unit = Miro.fmt(p.price) +
      (p.compareAt ? " <s>" + Miro.fmt(p.compareAt) + "</s>" : "") +
      (item.qty > 1 ? ' <span class="line__each">each</span>' : "");

    return (
      '<li class="line">' +
        '<a class="line__media" href="' + pdp + '">' +
          '<img src="' + Miro.img(im.id, 340, im.p) + '" alt="' + name + " — " + Miro.CATEGORY_LABEL[p.category] + '" loading="lazy" width="340" height="453">' +
        "</a>" +
        '<div class="line__info">' +
          '<p class="line__cat">' + Miro.CATEGORY_LABEL[p.category] + "</p>" +
          '<h3 class="line__name"><a href="' + pdp + '">' + name + "</a></h3>" +
          (meta.length ? '<ul class="line__meta" role="list">' + meta.join("") + "</ul>" : "") +
          '<p class="line__unit">' + unit + "</p>" +
        "</div>" +
        '<div class="line__foot">' +
          '<div class="qty">' +
            '<button type="button" data-act="dec" data-line="' + line + '" aria-label="Decrease quantity of ' + name + '"' +
              (item.qty <= 1 ? " disabled" : "") + ">−</button>" +
            '<input type="number" data-act="input" data-line="' + line + '" min="1" max="' + MAX_QTY + '" inputmode="numeric" ' +
              'value="' + item.qty + '" aria-label="Quantity of ' + name + '">' +
            '<button type="button" data-act="inc" data-line="' + line + '" aria-label="Increase quantity of ' + name + '"' +
              (item.qty >= MAX_QTY ? " disabled" : "") + ">+</button>" +
          "</div>" +
          (item.qty >= MAX_QTY ? '<span class="line__max">Max ' + MAX_QTY + " per piece</span>" : "") +
          '<button type="button" class="line__remove" data-act="remove" data-line="' + line + '" aria-label="Remove ' + name + ' from your bag">' +
            CROSS_SVG + "Remove" +
          "</button>" +
          '<span class="line__total"><span class="sr-only">Line total: </span>' + Miro.fmt(p.price * item.qty) + "</span>" +
        "</div>" +
      "</li>"
    );
  }

  /* ---------- Free-shipping progress ---------- */
  function renderShip(subtotal) {
    var unlocked = subtotal >= THRESHOLD;
    els.shipNote.classList.toggle("ship-note--unlocked", unlocked);
    if (unlocked) {
      els.shipText.innerHTML = CHECK_SVG + " Complimentary insured shipping unlocked";
    } else {
      els.shipText.innerHTML =
        "Add <strong>" + Miro.fmt(THRESHOLD - subtotal) + "</strong> for complimentary insured shipping";
    }
    els.shipFill.style.width = Math.min(100, (subtotal / THRESHOLD) * 100) + "%";
  }

  /* ---------- Keep focus on the same control across re-renders ---------- */
  function captureFocus() {
    var a = document.activeElement;
    if (a && a.getAttribute && a.getAttribute("data-line")) {
      return { line: a.getAttribute("data-line"), act: a.getAttribute("data-act") };
    }
    return null;
  }
  function findControl(line, act) {
    var nodes = els.lines.querySelectorAll("[data-act]");
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].getAttribute("data-line") === line && nodes[i].getAttribute("data-act") === act) return nodes[i];
    }
    return null;
  }
  function restoreFocus(saved) {
    if (!saved) return;
    var el = findControl(saved.line, saved.act);
    if (el && el.disabled) el = findControl(saved.line, "input");
    if (!el) {
      var removes = els.lines.querySelectorAll('[data-act="remove"]');
      el = removes.length ? removes[0] : $(".js-empty-cta");
    }
    if (el && el.focus) {
      try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
    }
  }

  /* ---------- Render ---------- */
  function render() {
    var saved = captureFocus();
    var items = Miro.cart.items();
    var count = Miro.cart.count();
    var subtotal = Miro.cart.subtotal();
    var ship = Miro.shipping(subtotal);
    var has = items.length > 0;

    els.count.textContent = has
      ? count + (count === 1 ? " piece" : " pieces") + ", reserved for 48 hours"
      : "Your bag is currently empty";

    els.filled.hidden = !has;
    els.empty.hidden = has;
    els.icons.hidden = has;

    if (has) {
      els.lines.innerHTML = items.map(lineHTML).join("");
      renderShip(subtotal);
      els.sumSub.textContent = Miro.fmt(subtotal);
      if (ship === 0) {
        els.sumShip.innerHTML = '<span class="sum-free">Complimentary</span>';
      } else {
        els.sumShip.textContent = Miro.fmt(ship);
      }
      els.sumTotal.textContent = Miro.fmt(subtotal + ship);
    }

    els.checkout.classList.toggle("is-disabled", !has);
    els.checkout.setAttribute("aria-disabled", String(!has));
    if (has) els.checkout.removeAttribute("tabindex");
    else els.checkout.setAttribute("tabindex", "-1");

    restoreFocus(saved);
  }

  /* ---------- Stepper / remove (delegated) ---------- */
  els.lines.addEventListener("click", function (e) {
    var btn = e.target.closest ? e.target.closest("button[data-act]") : null;
    if (!btn) return;
    var act = btn.getAttribute("data-act");
    var line = btn.getAttribute("data-line");
    var items = Miro.cart.items();
    var item = null;
    for (var i = 0; i < items.length; i++) if (items[i].lineId === line) item = items[i];
    if (!item) return;

    if (act === "dec") {
      Miro.cart.update(line, item.qty - 1);
    } else if (act === "inc") {
      Miro.cart.update(line, item.qty + 1);
    } else if (act === "remove") {
      var p = Miro.findProduct(item.productId);
      Miro.cart.remove(line);
      if (window.MiroToast && p) {
        MiroToast("Removed <strong>" + esc(p.name) + "</strong> from your bag");
      }
    }
  });

  els.lines.addEventListener("change", function (e) {
    var input = e.target;
    if (!input || input.getAttribute("data-act") !== "input") return;
    var line = input.getAttribute("data-line");
    var v = parseInt(input.value, 10);
    if (isNaN(v)) { render(); return; }
    Miro.cart.update(line, Math.max(1, Math.min(MAX_QTY, v)));
  });

  /* ---------- Checkout guard ---------- */
  els.checkout.addEventListener("click", function (e) {
    if (els.checkout.classList.contains("is-disabled")) e.preventDefault();
  });

  /* ---------- Gift note (persists to localStorage) ---------- */
  var giftToggle = $(".js-gift-toggle");
  var giftPanel = document.getElementById("gift-panel");
  var giftText = $(".js-gift-text");
  var giftCount = $(".js-gift-count");

  function giftRead() {
    try { return localStorage.getItem(GIFT_KEY) || ""; } catch (e) { return ""; }
  }
  function giftSave() {
    try {
      if (giftToggle.checked) localStorage.setItem(GIFT_KEY, giftText.value);
      else localStorage.removeItem(GIFT_KEY);
    } catch (e) { /* private mode — note simply won't persist */ }
  }
  function giftCounter() { giftCount.textContent = giftText.value.length + "/240"; }
  function giftSync(moveFocus) {
    giftPanel.hidden = !giftToggle.checked;
    giftCounter();
    if (moveFocus && giftToggle.checked) giftText.focus();
  }

  var savedNote = giftRead();
  if (savedNote) { giftToggle.checked = true; giftText.value = savedNote; }
  giftSync(false);
  giftToggle.addEventListener("change", function () { giftSync(true); giftSave(); });
  giftText.addEventListener("input", function () { giftCounter(); giftSave(); });

  /* ---------- WhatsApp concierge link ---------- */
  if (els.wa && window.MiroLinks) {
    els.wa.href = MiroLinks.whatsapp;
    els.wa.innerHTML = (window.MiroIcons ? MiroIcons.whatsapp : "") +
      "<span>Questions? WhatsApp our concierge</span>";
  }

  /* ---------- Empty-state rail: bestsellers first, then new ---------- */
  if (els.iconsRail) {
    var picks = Miro.PRODUCTS.filter(function (p) { return p.badge === "Bestseller"; });
    Miro.PRODUCTS.forEach(function (p) {
      if (picks.length < 4 && p.badge === "New" && picks.indexOf(p) === -1) picks.push(p);
    });
    els.iconsRail.innerHTML = picks.slice(0, 4).map(function (p) {
      return Miro.productCard(p, { width: 700 });
    }).join("");
  }

  /* ---------- First render + live updates ---------- */
  render();
  window.addEventListener("miro:cartchange", render);
  window.addEventListener("storage", function (e) {
    if (!e || !e.key || e.key === "miro_cart_v1") render();
  });

  /* Re-run reveal binding for injected nodes */
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
