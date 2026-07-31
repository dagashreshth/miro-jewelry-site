/* ============================================================
   Miró — Back office (admin.html)
   Hash-routed single-page dashboard over demo data.
   Requires store.js only — layout.js is intentionally not
   loaded here, so a local MiroToast fallback is provided.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Toast (layout.js is absent on this page) ---------- */
  var toastTimer = null;
  if (!window.MiroToast) {
    window.MiroToast = function (html, ms) {
      var t = document.querySelector(".js-toast");
      if (!t) return;
      t.innerHTML = html;
      t.classList.add("is-visible");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { t.classList.remove("is-visible"); }, ms || 3200);
    };
  }

  if (!window.Miro) return;

  /* ---------- Small helpers ---------- */
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function readJSON(key) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function parseDate(v) {
    if (v == null || v === "") return null;
    if (typeof v === "number") { var dn = new Date(v); return isNaN(dn) ? null : dn; }
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v));
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    var d = new Date(v);
    return isNaN(d) ? null : d;
  }
  function fmtDate(v) {
    var d = parseDate(v);
    if (!d) return v ? esc(v) : "Just now";
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }
  function fmtDay(v) {
    var d = parseDate(v);
    if (!d) return { day: "—", mon: "TBC" };
    return {
      day: String(d.getDate()),
      mon: d.toLocaleDateString("en-IN", { month: "short" })
    };
  }
  function fmtTime(t) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(String(t || "").trim());
    if (!m) return t ? String(t) : "";
    var h = +m[1];
    var suffix = h >= 12 ? "pm" : "am";
    var h12 = h % 12 || 12;
    return h12 + ":" + m[2] + " " + suffix;
  }
  var CHEVRON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" width="16" height="16" aria-hidden="true"><path d="m6 9 6 6 6-6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var CATS = ["rings", "earrings", "necklaces", "bracelets"];
  var STOCK_TARGET = 14;

  function thumb(p, size) {
    var im = p.images[0];
    return Miro.img(im.id, size || 96, im.p);
  }

  /* ---------- Deterministic demo stock (0–14 from id hash) ---------- */
  function stockOf(id) {
    var h = 0;
    for (var i = 0; i < id.length; i++) h = (h * 33 + id.charCodeAt(i)) % 2147483647;
    return h % 15;
  }
  function stockPill(s) {
    if (s === 0) return '<span class="pill pill--out">Out of stock</span>';
    if (s <= 3) return '<span class="pill pill--low">Low stock</span>';
    return '<span class="pill pill--ok">In stock</span>';
  }
  function statusPill(status) {
    var s = String(status || "New");
    var key = s.toLowerCase();
    var cls = "pill--atelier";
    if (key === "new") cls = "pill--new";
    else if (key === "in atelier") cls = "pill--atelier";
    else if (key === "hallmarking") cls = "pill--hallmark";
    else if (key === "shipped") cls = "pill--shipped";
    else if (key === "delivered") cls = "pill--ok";
    return '<span class="pill ' + cls + '">' + esc(s) + "</span>";
  }

  /* ---------- Seeded orders ---------- */
  var SEED_ORDERS = [
    {
      id: "MIR-10032", customer: "Ananya Iyer", city: "Mumbai",
      placed: "2026-07-03", status: "New", payment: "UPI via Razorpay",
      address: "1202 Marlow Towers, Carter Road, Bandra West, Mumbai 400 050",
      items: [{ productId: "aurelia-halo", qty: 1, note: "18K White Gold · Size 12" }]
    },
    {
      id: "MIR-10031", customer: "Riya Kapoor", city: "New Delhi",
      placed: "2026-07-01", status: "In atelier", payment: "Card via Razorpay",
      address: "48 Poorvi Marg, Vasant Vihar, New Delhi 110 057",
      items: [
        { productId: "croissant-hoops", qty: 1, note: "14K Yellow Gold" },
        { productId: "amoretto-stacking", qty: 1, note: "14K Rose Gold · Size 10" }
      ]
    },
    {
      id: "MIR-10030", customer: "Meera Krishnan", city: "Bengaluru",
      placed: "2026-06-29", status: "Hallmarking", payment: "UPI via Razorpay",
      address: "22 Cambridge Road, Halasuru, Bengaluru 560 008",
      items: [{ productId: "lumiere-pendant", qty: 1, note: "18K White Gold · Engraved “M · 14.02”" }]
    },
    {
      id: "MIR-10029", customer: "Zara Sheikh", city: "Hyderabad",
      placed: "2026-06-27", status: "Shipped", payment: "Netbanking via Razorpay",
      address: "Villa 9, Road No. 12, Banjara Hills, Hyderabad 500 034",
      items: [{ productId: "azure-heart-drops", qty: 1, note: "14K Yellow Gold · Gift wrapped" }]
    },
    {
      id: "MIR-10028", customer: "Aditi Deshpande", city: "Pune",
      placed: "2026-06-24", status: "Shipped", payment: "Card · 6-month EMI via Razorpay",
      address: "301 Verde Residences, Lane 6, Koregaon Park, Pune 411 001",
      items: [{ productId: "blossom-pave", qty: 1, note: "14K Rose Gold" }]
    },
    {
      id: "MIR-10027", customer: "Nikhil Malhotra", city: "Gurugram",
      placed: "2026-06-22", status: "Delivered", payment: "UPI via Razorpay",
      address: "C-72 The Crest, DLF Phase 5, Gurugram 122 009",
      items: [
        { productId: "mer-pearl-strand", qty: 1, note: "Presented in the pearl folio" },
        { productId: "sovereign-coin", qty: 1, note: "Engraved “N + S”" }
      ]
    }
  ];

  function orderSubtotal(o) {
    var sub = 0;
    (o.items || []).forEach(function (it) {
      var p = Miro.findProduct(it.productId || it.id);
      var unit = p ? p.price : (Number(it.price) || 0);
      sub += unit * (Number(it.qty) || 1);
    });
    return sub;
  }
  function orderTotal(o) {
    if (typeof o.amount === "number" && o.amount > 0) return o.amount;
    var sub = orderSubtotal(o);
    return sub ? sub + Miro.shipping(sub) : 0;
  }

  /* Storefront orders saved by the demo checkout in this browser */
  function normalizeWebOrder(o, idx) {
    if (!o || typeof o !== "object") return null;
    var addr = o.address || o.shippingAddress || o.shipping || "";
    var addrText = "";
    if (typeof addr === "string") addrText = addr;
    else if (addr && typeof addr === "object") {
      addrText = [addr.line1 || addr.address || "", addr.line2 || "", addr.city || "", addr.state || "", addr.pincode || addr.pin || ""]
        .filter(function (x) { return x; }).join(", ");
    }
    var name = "";
    if (typeof o.customer === "string") name = o.customer;
    else if (o.customer && o.customer.name) name = o.customer.name;
    name = name || o.name || (addr && typeof addr === "object" && (addr.fullName || addr.name)) || "Storefront client";
    var pay = o.payment;
    if (pay && typeof pay === "object") pay = pay.label || pay.method || "";
    pay = pay || o.paymentMethod || "";
    if (pay && !/razorpay/i.test(pay)) pay += " via Razorpay";
    var items = (o.items || []).map(function (it) {
      var bits = [];
      if (it.metal) bits.push(it.metal);
      if (it.size) bits.push("Size " + it.size);
      if (it.engraving) bits.push("Engraved “" + it.engraving + "”");
      return { productId: it.productId || it.id, qty: it.qty || 1, note: bits.join(" · "), price: it.price };
    });
    var amount = Number(o.total || o.grandTotal || o.amount) || 0;
    return {
      id: o.id || o.orderId || o.orderNumber || o.number || ("MIR-WEB" + (idx + 1)),
      web: true,
      customer: name,
      city: (addr && addr.city) || o.city || "",
      placed: o.placedAt || o.date || o.createdAt || o.timestamp || null,
      status: o.status || "New",
      payment: pay || "Razorpay",
      address: addrText,
      items: items,
      amount: amount > 0 ? amount : undefined
    };
  }
  function webOrders() {
    var out = [];
    var stored = readJSON("miro_orders");
    if (Object.prototype.toString.call(stored) === "[object Array]") {
      stored.forEach(function (o, i) {
        var n = normalizeWebOrder(o, i);
        if (n) out.push(n);
      });
    }
    var last = readJSON("miro_last_order");
    if (last && typeof last === "object") {
      var n2 = normalizeWebOrder(last, out.length);
      if (n2) {
        var dupe = out.some(function (o) { return o.id === n2.id; });
        if (!dupe) out.push(n2);
      }
    }
    out.reverse(); /* newest first */
    return out;
  }
  var ALL_ORDERS = webOrders().concat(SEED_ORDERS);

  /* ---------- Seeded customers ---------- */
  var CUSTOMERS = [
    { name: "Ananya Iyer", city: "Mumbai", ltv: 241300, pieces: 4, last: "2026-07-03", note: "Solitaire Edit loyalist · ring size 12" },
    { name: "Riya Kapoor", city: "New Delhi", ltv: 112700, pieces: 3, last: "2026-07-01", note: "Prefers 14K rose gold" },
    { name: "Meera Krishnan", city: "Bengaluru", ltv: 187400, pieces: 3, last: "2026-06-29", note: "Anniversary buyer · engraving on everything" },
    { name: "Zara Sheikh", city: "Hyderabad", ltv: 63900, pieces: 2, last: "2026-06-27", note: "Found us on Instagram" },
    { name: "Aditi Deshpande", city: "Pune", ltv: 96500, pieces: 1, last: "2026-06-24", note: "First piece — the Blossom Pavé" },
    { name: "Nikhil Malhotra", city: "Gurugram", ltv: 153900, pieces: 2, last: "2026-06-22", note: "Gift shopper · always gift wrap" }
  ];

  /* ---------- Appointments & inquiries ---------- */
  var SEED_APPTS = [
    {
      name: "Ishita Rao",
      purpose: "Bridal consultation — the Empress collar and Minuit chandeliers",
      date: "2026-07-05", time: "11:30 am", phone: "+91 98211 44780",
      channel: "Contact page", status: "Confirmed"
    },
    {
      name: "Kabir & Alisha Mehta",
      purpose: "Engagement fitting — Aurelia Halo, sizes 10 and 12",
      date: "2026-07-07", time: "4:00 pm", phone: "+91 99303 51462",
      channel: "WhatsApp concierge", status: "To confirm"
    }
  ];

  function readInquiries() {
    var appts = [];
    var inqs = [];
    var stored = readJSON("miro_inquiries");
    if (Object.prototype.toString.call(stored) === "[object Array]") {
      stored.forEach(function (q) {
        if (!q || typeof q !== "object") return;
        var topic = String(q.topic || q.subject || "General inquiry");
        var entry = {
          name: q.name || "Storefront visitor",
          email: q.email || "",
          phone: q.phone || "",
          topic: topic,
          message: q.message || "",
          date: q.preferredDate || q.date || q.appointmentDate || null,
          time: q.time || q.preferredTime || null,
          submitted: q.submittedAt || q.createdAt || q.timestamp || q.ts || null
        };
        if (/appoint/i.test(topic)) appts.push(entry); else inqs.push(entry);
      });
    }
    return { appointments: appts, inquiries: inqs };
  }
  var INBOX = readInquiries();
  var APPTS = SEED_APPTS.concat(INBOX.appointments.map(function (a) {
    return {
      name: a.name,
      purpose: a.message ? a.message : "Private appointment request from the contact page",
      date: a.date, time: a.time ? fmtTime(a.time) : "Time to be confirmed",
      phone: a.phone || a.email || "",
      channel: "Contact page", status: "New request", web: true
    };
  }));
  APPTS.sort(function (a, b) {
    var da = parseDate(a.date), db = parseDate(b.date);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da - db;
  });

  /* ============================================================
     Renderers
     ============================================================ */

  /* ---------- Dashboard ---------- */
  function renderDashboard() {
    var rev = document.querySelector(".js-kpi-revenue");
    var aov = document.querySelector(".js-kpi-aov");
    var apc = document.querySelector(".js-kpi-appts");
    var nxt = document.querySelector(".js-kpi-next");
    if (rev) rev.textContent = Miro.fmt(1842600);
    if (aov) aov.textContent = Miro.fmt(Math.round(1842600 / 47));
    if (apc) apc.textContent = String(APPTS.length);
    if (nxt && APPTS.length) {
      var first = APPTS[0];
      var d = parseDate(first.date);
      nxt.textContent = "Next: " +
        (d ? d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }) : "date TBC") +
        (first.time && first.time !== "Time to be confirmed" ? ", " + first.time : "") +
        " — " + first.name;
    }

    var latest = document.querySelector(".js-latest-orders");
    if (latest) {
      latest.innerHTML = ALL_ORDERS.slice(0, 5).map(function (o) {
        return (
          "<tr>" +
            '<td class="cell-main"><div><span class="prod-cell__name nowrap">' + esc(o.id) +
              (o.web ? ' <span class="pill pill--plain">Web</span>' : "") + "</span>" +
              '<span class="prod-cell__sub">' + fmtDate(o.placed) + "</span></div></td>" +
            '<td data-label="Customer">' + esc(o.customer) + (o.city ? " · " + esc(o.city) : "") + "</td>" +
            '<td data-label="Total" class="num"><span class="cell-strong">' + Miro.fmt(orderTotal(o)) + "</span></td>" +
            '<td data-label="Status">' + statusPill(o.status) + "</td>" +
          "</tr>"
        );
      }).join("");
    }

    var low = document.querySelector(".js-low-stock");
    if (low) {
      var lows = Miro.PRODUCTS
        .map(function (p) { return { p: p, s: stockOf(p.id) }; })
        .filter(function (x) { return x.s <= 3; })
        .sort(function (a, b) { return a.s - b.s; });
      low.innerHTML = lows.map(function (x) {
        var left = x.s === 0 ? "none left" : (x.s === 1 ? "1 piece left" : x.s + " pieces left");
        return (
          "<li>" +
            '<img src="' + thumb(x.p, 96) + '" alt="' + esc(x.p.name) + '" loading="lazy" width="44" height="44">' +
            '<div><span class="stocklist__name">' + esc(x.p.name) + "</span>" +
            '<span class="stocklist__sub">' + Miro.CATEGORY_LABEL[x.p.category] + " · " + left + "</span></div>" +
            stockPill(x.s) +
          "</li>"
        );
      }).join("");
    }
  }

  /* ---------- Products ---------- */
  /* Serials are assigned in catalogue order for pieces that have never been
     opened in the editor, so the column is never blank. */
  function pricingIndex() {
    var P = window.MiroPricing;
    if (!P) return { pieces: {}, priced: {} };
    var data = P.read();
    var priced = {};
    Object.keys(data.pieces).forEach(function (id) {
      var piece = data.pieces[id];
      priced[id] = P.price(piece, {
        settings: {
          labourRatePerGram: piece.labourRatePerGram === "" || piece.labourRatePerGram == null
            ? data.settings.labourRatePerGram : P.num(piece.labourRatePerGram),
          marginPct: piece.marginPct === "" || piece.marginPct == null
            ? data.settings.marginPct : P.num(piece.marginPct),
          roundingStep: piece.roundingStep === "" || piece.roundingStep == null
            ? data.settings.roundingStep : P.num(piece.roundingStep)
        },
        goldRate: data.goldRate
      });
    });
    return { pieces: data.pieces, priced: priced };
  }

  function renderProducts() {
    var body = document.querySelector(".js-products");
    if (!body) return;
    var P = window.MiroPricing;
    var idx = pricingIndex();
    var calculated = 0;

    var rows = Miro.PRODUCTS.map(function (p, i) {
      var s = stockOf(p.id);
      var stored = idx.pieces[p.id];
      var calc = idx.priced[p.id];
      /* 18K is the house default read-out; the editor shows both karats. */
      var hasCalc = !!(calc && calc.listed.k18 > 0);
      if (hasCalc) calculated++;

      var serial = stored && stored.serial
        ? stored.serial
        : (P ? P.serialFrom(i + 1) : "—");
      var name = stored && stored.name ? stored.name : p.name;

      var priceCell = hasCalc
        ? '<span class="cell-strong">' + Miro.fmt(calc.listed.k18) + "</span>" +
          '<span class="pill pill--calc">calculated</span>'
        : '<span class="cell-strong">' + Miro.fmt(p.price) + "</span>" +
          (p.compareAt ? ' <s class="muted">' + Miro.fmt(p.compareAt) + "</s>" : "");

      return (
        "<tr>" +
          '<td data-label="Serial"><code class="serial">' + esc(serial) + "</code></td>" +
          '<td class="cell-main"><div class="prod-cell">' +
            '<img src="' + (stored && stored.photos && stored.photos.length ? stored.photos[0] : thumb(p, 96)) +
              '" alt="' + esc(name) + '" loading="lazy" width="48" height="48">' +
            '<div><span class="prod-cell__name">' + esc(name) + "</span>" +
            '<span class="prod-cell__sub">' + esc(p.stone.type) + "</span></div>" +
          "</div></td>" +
          '<td data-label="Category">' + Miro.CATEGORY_LABEL[(stored && stored.category) || p.category] + "</td>" +
          '<td data-label="Price" class="num">' + priceCell + "</td>" +
          '<td data-label="Stock" class="num">' + s + "</td>" +
          '<td data-label="Status">' + stockPill(s) + "</td>" +
          '<td class="cell-actions"><button type="button" class="gbtn js-edit-product" data-id="' + esc(p.id) + '">Edit</button></td>' +
        "</tr>"
      );
    });

    /* Pieces created in the back office that aren't in the static catalogue */
    Object.keys(idx.pieces).forEach(function (id) {
      var known = Miro.PRODUCTS.some(function (p) { return p.id === id; });
      if (known) return;
      var piece = idx.pieces[id];
      var calc = idx.priced[id];
      var hasCalc = !!(calc && calc.listed.k18 > 0);
      if (hasCalc) calculated++;
      rows.push(
        "<tr>" +
          '<td data-label="Serial"><code class="serial">' + esc(piece.serial) + "</code></td>" +
          '<td class="cell-main"><div class="prod-cell">' +
            (piece.photos && piece.photos.length
              ? '<img src="' + piece.photos[0] + '" alt="' + esc(piece.name) + '" width="48" height="48">'
              : '<span class="prod-cell__ph" aria-hidden="true"></span>') +
            '<div><span class="prod-cell__name">' + esc(piece.name) + "</span>" +
            '<span class="prod-cell__sub">Added in the back office</span></div>' +
          "</div></td>" +
          '<td data-label="Category">' + esc(Miro.CATEGORY_LABEL[piece.category] || piece.category || "—") + "</td>" +
          '<td data-label="Price" class="num">' +
            (hasCalc ? '<span class="cell-strong">' + Miro.fmt(calc.listed.k18) + '</span><span class="pill pill--calc">calculated</span>' : "—") +
          "</td>" +
          '<td data-label="Stock" class="num">' + (piece.stock === "" || piece.stock == null ? "—" : esc(piece.stock)) + "</td>" +
          '<td data-label="Status">' + stockPill(Number(piece.stock) || 0) + "</td>" +
          '<td class="cell-actions"><button type="button" class="gbtn js-edit-product" data-id="' + esc(id) + '">Edit</button></td>' +
        "</tr>"
      );
    });

    body.innerHTML = rows.join("");

    var count = document.querySelector(".js-product-count");
    if (count) {
      count.textContent = rows.length + " pieces across " + CATS.length +
        " categories · " + Miro.COLLECTIONS.length + " collections · " +
        calculated + " priced from the calculator";
    }
  }

  /* ---------- Categories ---------- */
  function renderCategories() {
    var grid = document.querySelector(".js-categories");
    if (grid) {
      grid.innerHTML = CATS.map(function (cat) {
        var inCat = Miro.PRODUCTS.filter(function (p) { return p.category === cat; });
        var minPrice = inCat.reduce(function (m, p) { return Math.min(m, p.price); }, Infinity);
        var rep = inCat[0];
        return (
          '<article class="catcard">' +
            '<img src="' + thumb(rep, 640) + '" alt="' + Miro.CATEGORY_LABEL[cat] + " — represented by the " + esc(rep.name) + '" loading="lazy" width="640" height="400">' +
            '<div class="catcard__body">' +
              "<h2>" + Miro.CATEGORY_LABEL[cat] + "</h2>" +
              '<p class="catcard__meta">' + inCat.length + " designs · from " + Miro.fmt(minPrice) + "</p>" +
              '<a class="btn--text" href="collections.html?category=' + cat + '">Open in storefront ' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" width="13" height="13" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
              "</a>" +
            "</div>" +
          "</article>"
        );
      }).join("");
    }

    var list = document.querySelector(".js-collections-admin");
    if (list) {
      list.innerHTML = Miro.COLLECTIONS.map(function (c) {
        var n = Miro.PRODUCTS.filter(function (p) { return p.collection === c.filter; }).length;
        return (
          '<li class="colrow">' +
            '<img src="' + Miro.img(c.image.id, 160) + '" alt="' + esc(c.name) + ' — cover artwork" loading="lazy" width="64" height="48">' +
            '<div class="colrow__body"><span class="colrow__name">' + esc(c.name) + "</span>" +
            '<span class="colrow__tag">' + esc(c.tagline) + "</span></div>" +
            '<span class="pill pill--plain">' + n + " pieces</span>" +
            '<a class="btn--text" href="collections.html?collection=' + c.id + '">View</a>' +
          "</li>"
        );
      }).join("");
    }
  }

  /* ---------- Banners ---------- */
  function renderBanners() {
    var list = document.querySelector(".js-banners");
    if (!list) return;
    var rows = [{
      name: "Homepage hero",
      image: Miro.EDITORIAL.hero,
      placement: "Home — full-bleed hero, above the fold",
      href: "index.html",
      label: "View live"
    }];
    Miro.COLLECTIONS.forEach(function (c, i) {
      rows.push({
        name: c.name + " tile",
        image: c.image,
        placement: "Home — featured collection " + (i + 1) + " of 3",
        href: "collections.html?collection=" + c.id,
        label: "View live"
      });
    });
    list.innerHTML = rows.map(function (b) {
      return (
        '<li class="banrow">' +
          '<img src="' + Miro.img(b.image.id, 240) + '" alt="' + esc(b.name) + ' — current artwork" loading="lazy" width="96" height="56">' +
          '<div class="banrow__body">' +
            '<span class="banrow__name">' + esc(b.name) + ' <span class="pill pill--ok">Active</span></span>' +
            '<p class="banrow__meta">' + esc(b.placement) + "</p>" +
          "</div>" +
          '<div class="banrow__actions">' +
            '<button type="button" class="gbtn js-demo" data-toast="Demo build — banner uploads are disabled.">Replace image</button>' +
            '<a class="btn--text" href="' + b.href + '">' + b.label + "</a>" +
          "</div>" +
        "</li>"
      );
    }).join("");
  }

  /* ---------- Inventory ---------- */
  function renderInventory() {
    var statsWrap = document.querySelector(".js-inv-stats");
    var groupsWrap = document.querySelector(".js-inventory");
    if (!statsWrap || !groupsWrap) return;

    var total = 0, lowCount = 0, outCount = 0;
    Miro.PRODUCTS.forEach(function (p) {
      var s = stockOf(p.id);
      total += s;
      if (s === 0) outCount++;
      else if (s <= 3) lowCount++;
    });
    statsWrap.innerHTML =
      '<div class="inv-stat"><strong>' + total + "</strong><span>pieces in the vault</span></div>" +
      '<div class="inv-stat"><strong>' + lowCount + "</strong><span>designs running low</span></div>" +
      '<div class="inv-stat"><strong>' + outCount + "</strong><span>designs out of stock</span></div>";

    groupsWrap.innerHTML = CATS.map(function (cat) {
      var inCat = Miro.PRODUCTS.filter(function (p) { return p.category === cat; });
      var units = inCat.reduce(function (n, p) { return n + stockOf(p.id); }, 0);
      var rows = inCat.map(function (p) {
        var s = stockOf(p.id);
        var pct = Math.round((s / STOCK_TARGET) * 100);
        var fillCls = s === 0 ? " meter__fill--out" : (s <= 3 ? " meter__fill--low" : "");
        var notify = s <= 3
          ? '<button type="button" class="gbtn js-demo" data-toast="Demo build — atelier notifications are switched off.">Notify atelier</button>'
          : "";
        return (
          '<div class="inv-row">' +
            '<div class="inv-row__name"><span>' + esc(p.name) + "</span><small>" + Miro.fmt(p.price) + " · " + esc(p.metalWeight) + "</small></div>" +
            stockPill(s) +
            '<div class="inv-row__meter"><div class="meter"><div class="meter__fill' + fillCls + '" style="width:' + pct + '%"></div></div>' +
            "<span>" + s + " of " + STOCK_TARGET + "</span></div>" +
            notify +
          "</div>"
        );
      }).join("");
      return (
        '<div class="panel">' +
          '<div class="panel__bar"><h2>' + Miro.CATEGORY_LABEL[cat] + "</h2>" +
          '<p class="panel__note">' + units + " finished pieces across " + inCat.length + " designs</p></div>" +
          rows +
        "</div>"
      );
    }).join("");
  }

  /* ---------- Orders ---------- */
  function renderOrders() {
    var body = document.querySelector(".js-orders");
    if (!body) return;
    body.innerHTML = ALL_ORDERS.map(function (o, i) {
      var detailId = "order-detail-" + i;
      var items = (o.items || []).map(function (it) {
        var p = Miro.findProduct(it.productId);
        var name = p ? p.name : "Storefront piece";
        var unit = p ? p.price : (Number(it.price) || 0);
        var qty = Number(it.qty) || 1;
        var img = p
          ? '<img src="' + thumb(p, 96) + '" alt="' + esc(name) + '" loading="lazy" width="44" height="44">'
          : "";
        return (
          "<li>" + img +
            '<div><span class="odetail__iname">' + esc(name) + (qty > 1 ? " × " + qty : "") + "</span>" +
            (it.note ? '<span class="odetail__imeta">' + esc(it.note) + "</span>" : "") + "</div>" +
            '<span class="odetail__iprice">' + Miro.fmt(unit * qty) + "</span>" +
          "</li>"
        );
      }).join("");
      var sub = orderSubtotal(o);
      var ship = sub ? Miro.shipping(sub) : 0;
      return (
        '<tr class="orow">' +
          '<td class="cell-main"><div><span class="prod-cell__name nowrap">' + esc(o.id) +
            (o.web ? ' <span class="pill pill--plain">Web</span>' : "") + "</span>" +
            '<span class="prod-cell__sub">' + fmtDate(o.placed) + " · " + esc(o.payment) + "</span></div></td>" +
          '<td data-label="Customer">' + esc(o.customer) + (o.city ? " · " + esc(o.city) : "") + "</td>" +
          '<td data-label="Total" class="num"><span class="cell-strong">' + Miro.fmt(orderTotal(o)) + "</span></td>" +
          '<td data-label="Status">' + statusPill(o.status) + "</td>" +
          '<td class="cell-actions"><button type="button" class="rowtoggle js-order-toggle" aria-expanded="false" ' +
            'aria-controls="' + detailId + '" aria-label="Show details for order ' + esc(o.id) + '">' + CHEVRON + "</button></td>" +
        "</tr>" +
        '<tr class="atable__detail" id="' + detailId + '" hidden><td colspan="5"><div class="odetail">' +
          "<div><h4>Pieces in this order</h4>" +
            '<ul class="odetail__items">' + (items || "<li>No line items recorded.</li>") + "</ul></div>" +
          '<div class="odetail__ship"><h4>Delivery</h4>' +
            "<p><strong>" + esc(o.customer) + "</strong><br>" + esc(o.address || "Address on file with the concierge team.") + "</p>" +
            '<p class="odetail__pay"><strong>Payment</strong><br>' + esc(o.payment) +
            (ship ? "<br>Includes " + Miro.fmt(ship) + " insured shipping" : "<br>Complimentary insured shipping") + "</p>" +
          "</div>" +
        "</div></td></tr>"
      );
    }).join("");

    var note = document.querySelector(".js-orders-note");
    if (note) {
      var webCount = ALL_ORDERS.filter(function (o) { return o.web; }).length;
      note.textContent = ALL_ORDERS.length + " orders on the book" +
        (webCount ? " · " + webCount + " placed from this browser" : " · demo ledger");
    }
  }

  /* ---------- Customers ---------- */
  function renderCustomers() {
    var body = document.querySelector(".js-customers");
    if (!body) return;
    body.innerHTML = CUSTOMERS.map(function (c) {
      var initials = c.name.split(" ").map(function (w) { return w.charAt(0); }).slice(0, 2).join("").toUpperCase();
      return (
        "<tr>" +
          '<td class="cell-main"><div class="prod-cell">' +
            '<span class="avatar" aria-hidden="true">' + esc(initials) + "</span>" +
            '<div><span class="prod-cell__name">' + esc(c.name) + "</span>" +
            '<span class="prod-cell__sub">' + esc(c.note) + "</span></div>" +
          "</div></td>" +
          '<td data-label="City">' + esc(c.city) + "</td>" +
          '<td data-label="Lifetime value" class="num"><span class="cell-strong">' + Miro.fmt(c.ltv) + "</span></td>" +
          '<td data-label="Pieces" class="num">' + c.pieces + "</td>" +
          '<td data-label="Last order">' + fmtDate(c.last) + "</td>" +
        "</tr>"
      );
    }).join("");
  }

  /* ---------- Appointments & inquiries ---------- */
  function renderAppointments() {
    var list = document.querySelector(".js-appointments");
    if (list) {
      list.innerHTML = APPTS.map(function (a) {
        var day = fmtDay(a.date);
        var d = parseDate(a.date);
        var when = d ? d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "Date to be confirmed";
        var pill = a.status === "Confirmed"
          ? '<span class="pill pill--ok">Confirmed</span>'
          : (a.web ? '<span class="pill pill--new">New request</span>' : '<span class="pill pill--new">To confirm</span>');
        var action = a.status === "Confirmed"
          ? '<button type="button" class="gbtn js-demo" data-toast="Demo build — fitting notes live in the production console.">Add note</button>'
          : '<button type="button" class="gbtn js-demo" data-toast="Demo build — confirmations go out via WhatsApp in production.">Confirm slot</button>';
        return (
          '<li class="appt">' +
            '<div class="appt__date" aria-hidden="true"><strong>' + esc(day.day) + "</strong><span>" + esc(day.mon) + "</span></div>" +
            '<div class="appt__body">' +
              '<p class="appt__name">' + esc(a.name) + " " + pill + "</p>" +
              '<p class="appt__purpose">' + esc(a.purpose) + "</p>" +
              '<p class="appt__meta"><span>' + esc(when) + "</span><span>" + esc(a.time) + "</span>" +
              (a.phone ? "<span>" + esc(a.phone) + "</span>" : "") +
              "<span>via " + esc(a.channel) + "</span></p>" +
            "</div>" +
            action +
          "</li>"
        );
      }).join("");
    }

    var note = document.querySelector(".js-appt-note");
    if (note) {
      var webCount = APPTS.filter(function (a) { return a.web; }).length;
      note.textContent = APPTS.length + " upcoming" +
        (webCount ? " · " + webCount + " new from the contact page" : " · none awaiting reply");
    }

    var badge = document.querySelector(".js-appt-count");
    if (badge) {
      badge.textContent = String(APPTS.length);
      badge.hidden = APPTS.length === 0;
    }

    var inqWrap = document.querySelector(".js-inquiries");
    if (inqWrap) {
      if (!INBOX.inquiries.length) {
        inqWrap.innerHTML =
          '<div class="empty"><span class="h-serif-italic">Quiet for now</span>' +
          "<p>Inquiries submitted through the contact page appear here.</p></div>";
      } else {
        inqWrap.innerHTML = INBOX.inquiries.map(function (q) {
          var contact = [q.email, q.phone].filter(function (x) { return x; }).join(" · ");
          return (
            '<article class="inqrow">' +
              '<div class="inqrow__top"><span class="inqrow__name">' + esc(q.name) + "</span>" +
                '<span class="pill pill--plain">' + esc(q.topic) + "</span>" +
                '<span class="inqrow__date">' + fmtDate(q.submitted) + "</span></div>" +
              (q.message ? '<p class="inqrow__msg">' + esc(q.message) + "</p>" : "") +
              (contact ? '<p class="inqrow__contact">' + esc(contact) + "</p>" : "") +
              '<button type="button" class="gbtn js-demo" data-toast="Demo build — replies are sent from the concierge inbox in production.">Reply</button>' +
            "</article>"
          );
        }).join("");
      }
    }
  }

  /* ============================================================
     Hash routing between panels
     ============================================================ */
  var PANEL_META = {
    dashboard: { t: "Dashboard", s: "The month at a glance — revenue, atelier workload and what needs your eye first." },
    products: { t: "Products", s: "Every live piece in the catalogue — pricing, stock and status at a glance." },
    categories: { t: "Categories", s: "The four rooms of the maison, and the three collections stitched across them." },
    banners: { t: "Banners", s: "The imagery currently fronting the storefront — swap artwork without touching code." },
    diamonds: { t: "Diamond Inventory", s: "The rate card every diamond is priced from — carat weight, clarity, shape and charni size." },
    journal: { t: "Journal", s: "The Instagram posts shown in “From the journal” on the homepage." },
    inventory: { t: "Inventory", s: "Finished-piece stock against the atelier target of fourteen per design." },
    orders: { t: "Orders", s: "Every order placed through the storefront, from first click to doorstep." },
    customers: { t: "Customers", s: "The client book — lifetime value, pieces owned and most recent visits." },
    appointments: { t: "Appointments", s: "Private viewings booked through the contact page, plus open inquiries." }
  };

  function currentPanel() {
    var h = (window.location.hash || "").replace("#", "");
    return PANEL_META.hasOwnProperty(h) ? h : "dashboard";
  }

  function activatePanel() {
    var name = currentPanel();
    var meta = PANEL_META[name];

    document.querySelectorAll(".js-panel").forEach(function (sec) {
      sec.hidden = sec.id !== name;
    });
    document.querySelectorAll(".js-admin-nav a").forEach(function (a) {
      if (a.getAttribute("data-nav") === name) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });

    var title = document.querySelector(".js-head-title");
    var sub = document.querySelector(".js-head-sub");
    if (title) title.textContent = meta.t;
    if (sub) sub.textContent = meta.s;
    document.title = meta.t + " · Back Office — Miró Fine Jewelry";

    var announce = document.querySelector(".js-panel-announce");
    if (announce) announce.textContent = "Now showing " + meta.t;

    setSidebar(false);
    try { window.scrollTo({ top: 0, left: 0, behavior: "instant" }); }
    catch (e) { window.scrollTo(0, 0); }
  }

  /* ---------- Mobile sidebar drawer ---------- */
  var sidebar = document.getElementById("admin-sidebar");
  var scrim = document.querySelector(".admin-scrim");
  var mobileMQ = window.matchMedia ? window.matchMedia("(max-width: 899px)") : null;
  function setSidebar(open) {
    if (!sidebar) return;
    var wasOpen = sidebar.classList.contains("is-open");
    if (open === wasOpen) return;
    sidebar.classList.toggle("is-open", open);
    /* On mobile the open sidebar behaves as a modal drawer (like the
       storefront's menu drawer); on desktop it stays a plain static aside. */
    if (open && (!mobileMQ || mobileMQ.matches)) {
      sidebar.setAttribute("role", "dialog");
      sidebar.setAttribute("aria-modal", "true");
      sidebar.setAttribute("aria-label", "Back-office menu");
    } else if (!open) {
      sidebar.removeAttribute("role");
      sidebar.removeAttribute("aria-modal");
      sidebar.removeAttribute("aria-label");
    }
    if (scrim) scrim.classList.toggle("is-open", open);
    document.body.classList.toggle("no-scroll", open);
    var burger = document.querySelector(".js-open-adminnav");
    if (burger) {
      burger.setAttribute("aria-expanded", String(open));
      if (!open && wasOpen) burger.focus();
    }
    if (open) {
      var first = sidebar.querySelector(".admin-nav a");
      if (first) setTimeout(function () { first.focus(); }, 120);
    }
  }

  /* ---------- Delegated interactions ---------- */
  document.addEventListener("click", function (e) {
    if (e.target.closest(".js-open-adminnav")) setSidebar(true);
    if (e.target.closest(".js-close-adminnav")) setSidebar(false);

    var demo = e.target.closest(".js-demo");
    if (demo) {
      window.MiroToast(demo.getAttribute("data-toast") || "Demo build — editing is disabled.");
    }

    var toggle = e.target.closest(".js-order-toggle");
    if (toggle) {
      var row = toggle.closest("tr");
      var detail = row ? row.nextElementSibling : null;
      if (detail && detail.classList.contains("atable__detail")) {
        var isOpen = !detail.hidden;
        detail.hidden = isOpen;
        row.classList.toggle("is-open", !isOpen);
        toggle.setAttribute("aria-expanded", String(!isOpen));
        toggle.setAttribute("aria-label",
          (isOpen ? "Show" : "Hide") + " details for order " + row.querySelector(".prod-cell__name").textContent.trim());
      }
    }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setSidebar(false);
  });
  if (mobileMQ && mobileMQ.addEventListener) {
    /* Crossing to desktop: drop the drawer state so the static sidebar
       is not left with modal-dialog semantics. */
    mobileMQ.addEventListener("change", function (e) {
      if (!e.matches) setSidebar(false);
    });
  }

  /* ---------- Boot ---------- */
  var today = document.querySelector(".js-today");
  if (today) {
    today.textContent = new Date().toLocaleDateString("en-IN", {
      weekday: "long", day: "numeric", month: "long", year: "numeric"
    });
  }

  renderDashboard();
  renderProducts();
  renderCategories();
  renderBanners();
  renderInventory();
  renderOrders();
  renderCustomers();
  renderAppointments();

  /* Let admin-pricing.js redraw the table after an edit */
  window.MiroAdmin = { refreshProducts: renderProducts };

  window.addEventListener("hashchange", activatePanel);
  activatePanel();
})();
