/* ============================================================
   Miró — One-page checkout: empty-bag guard, order summary
   (sticky desktop + collapsible mobile), inline validation,
   live delivery estimate, GST invoice toggle, payment method
   cards and simulated Razorpay processing.
   Requires store.js + layout.js.
   ============================================================ */
(function () {
  "use strict";

  var form = document.getElementById("checkout-form");
  var emptyPanel = document.querySelector(".js-empty");
  var checkoutWrap = document.querySelector(".js-checkout");
  if (!form || !checkoutWrap) return;

  /* ---------- Empty-bag guard ---------- */
  var items = Miro.cart.items();
  if (!items.length) {
    checkoutWrap.hidden = true;
    if (emptyPanel) emptyPanel.hidden = false;
    return;
  }

  /* ---------- Helpers ---------- */
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function totals() {
    var sub = Miro.cart.subtotal();
    var ship = Miro.shipping(sub);
    /* GST is broken out of the jewellery value only (shipping shown separately);
       taxable derived by subtraction so the rows always sum exactly — must stay
       in step with the invoice math in order-confirmation.js */
    var g = Miro.gst(sub);
    g.taxable = sub - g.cgst - g.sgst;
    return { subtotal: sub, shipping: ship, gst: g, total: sub + ship };
  }

  /* ---------- Order summary (rendered into desktop + mobile) ---------- */
  function optsLine(it, product) {
    var bits = [];
    if (it.metal) bits.push(it.metal);
    if (it.size) bits.push("Size " + it.size);
    if (it.engraving) bits.push("Engraved “" + esc(it.engraving) + "”");
    if (it.giftWrap) bits.push("Gift wrapped");
    if (!bits.length && product.metals && product.metals.length) bits.push(product.metals[0].label);
    return bits.join(" · ");
  }

  function summaryHTML() {
    var t = totals();
    var html = '<ul class="sum-items" role="list">';
    items.forEach(function (it) {
      var p = Miro.findProduct(it.productId);
      if (!p) return;
      var im = p.images[0];
      html +=
        '<li class="sum-item">' +
          '<div class="sum-item__thumb">' +
            '<img src="' + Miro.img(im.id, 200, im.p) + '" alt="' + esc(p.name) + '" loading="lazy" width="64" height="80">' +
            '<span class="sum-item__qty" aria-label="Quantity ' + it.qty + '">' + it.qty + "</span>" +
          "</div>" +
          '<div class="sum-item__info">' +
            '<p class="sum-item__name">' + esc(p.name) + "</p>" +
            '<p class="sum-item__opts">' + optsLine(it, p) + "</p>" +
          "</div>" +
          '<p class="sum-item__price">' + Miro.fmt(p.price * it.qty) + "</p>" +
        "</li>";
    });
    html += "</ul>";

    html +=
      '<dl class="sum-lines">' +
        "<div><dt>Subtotal</dt><dd>" + Miro.fmt(t.subtotal) + "</dd></div>" +
        "<div><dt>Insured shipping</dt><dd" + (t.shipping === 0 ? ' class="sum-free">Complimentary' : ">" + Miro.fmt(t.shipping)) + "</dd></div>" +
        '<div class="sum-line--sub"><dt>Taxable value</dt><dd>' + Miro.fmt(t.gst.taxable) + "</dd></div>" +
        '<div class="sum-line--sub"><dt>CGST 1.5%</dt><dd>' + Miro.fmt(t.gst.cgst) + "</dd></div>" +
        '<div class="sum-line--sub"><dt>SGST 1.5%</dt><dd>' + Miro.fmt(t.gst.sgst) + "</dd></div>" +
        '<div class="sum-line--total"><dt>Total</dt><dd>' + Miro.fmt(t.total) + "</dd></div>" +
      "</dl>" +
      '<p class="sum-tax-note">All prices include 3% GST — nothing is added at the door.</p>';

    var giftNote = null;
    try { giftNote = localStorage.getItem("miro_gift_note"); } catch (e) {}
    if (giftNote && giftNote.trim()) {
      html +=
        '<div class="sum-gift">' +
          '<p class="sum-gift__label">Your gift note</p>' +
          '<p class="sum-gift__text">“' + esc(giftNote.trim()) + "”</p>" +
        "</div>";
    }
    return html;
  }

  function renderSummary() {
    var t = totals();
    var html = summaryHTML();
    var desktop = document.querySelector(".js-summary-desktop");
    var mobile = document.querySelector(".js-summary-mobile");
    if (desktop) desktop.innerHTML = html;
    if (mobile) mobile.innerHTML = html;
    var mini = document.querySelector(".js-sum-mini");
    if (mini) mini.textContent = Miro.fmt(t.total);
    var payAmount = document.querySelector(".js-pay-amount");
    if (payAmount) payAmount.textContent = Miro.fmt(t.total);
  }
  renderSummary();

  /* ---------- Field validation helpers ---------- */
  function fieldOf(input) { return input.closest(".field"); }
  function setError(input, on) {
    var f = fieldOf(input);
    if (f) f.classList.toggle("has-error", on);
    if (on) input.setAttribute("aria-invalid", "true");
    else input.removeAttribute("aria-invalid");
    var err = f && f.querySelector(".error-msg");
    if (err && err.id) {
      if (on) input.setAttribute("aria-describedby", err.id);
    }
  }

  var elEmail = document.getElementById("co-email");
  var elPhone = document.getElementById("co-phone");
  var elWhatsapp = document.getElementById("co-whatsapp");
  var elName = document.getElementById("sh-name");
  var elAddr1 = document.getElementById("sh-addr1");
  var elAddr2 = document.getElementById("sh-addr2");
  var elCity = document.getElementById("sh-city");
  var elState = document.getElementById("sh-state");
  var elPincode = document.getElementById("sh-pincode");
  var elGstCheck = document.getElementById("gst-check");
  var elGstin = document.getElementById("gst-in");
  var elGstName = document.getElementById("gst-name");

  var RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var RE_PHONE = /^[6-9]\d{9}$/;
  var RE_GSTIN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

  var validators = [
    { el: elEmail, test: function () { return RE_EMAIL.test(elEmail.value.trim()); } },
    { el: elPhone, test: function () { return RE_PHONE.test(elPhone.value.replace(/\s/g, "")); } },
    { el: elName, test: function () { return elName.value.trim().length >= 2; } },
    { el: elAddr1, test: function () { return elAddr1.value.trim().length >= 4; } },
    { el: elCity, test: function () { return elCity.value.trim().length >= 2; } },
    { el: elState, test: function () { return elState.value !== ""; } },
    { el: elPincode, test: function () { return Miro.deliveryEstimate(elPincode.value.trim()).ok; } },
    { el: elGstin, when: function () { return elGstCheck.checked; },
      test: function () { return RE_GSTIN.test(elGstin.value.trim().toUpperCase()); } },
    { el: elGstName, when: function () { return elGstCheck.checked; },
      test: function () { return elGstName.value.trim().length >= 2; } }
  ];

  /* Clear a field's error as soon as it is edited */
  validators.forEach(function (v) {
    var evt = v.el.tagName === "SELECT" ? "change" : "input";
    v.el.addEventListener(evt, function () {
      if (v.when && !v.when()) { setError(v.el, false); return; }
      if (v.test()) setError(v.el, false);
    });
  });

  /* Digits only in phone + pincode */
  [elPhone, elPincode].forEach(function (el) {
    el.addEventListener("input", function () {
      var clean = el.value.replace(/\D/g, "");
      if (clean !== el.value) el.value = clean;
    });
  });

  /* ---------- Live delivery estimate under pincode ---------- */
  var deliveryNote = document.querySelector(".js-delivery");
  var lastEstimate = null;
  function updateEstimate() {
    var v = elPincode.value.trim();
    if (!deliveryNote) return;
    if (v.length < 6) {
      deliveryNote.className = "delivery-note js-delivery";
      deliveryNote.textContent = "";
      lastEstimate = null;
      return;
    }
    var est = Miro.deliveryEstimate(v);
    lastEstimate = est.ok ? est : null;
    deliveryNote.className = "delivery-note js-delivery " + (est.ok ? "is-ok" : "is-err");
    deliveryNote.textContent = est.label;
  }
  elPincode.addEventListener("input", updateEstimate);

  /* ---------- GST invoice toggle ---------- */
  var gstFields = document.getElementById("gst-fields");
  elGstCheck.addEventListener("change", function () {
    var on = elGstCheck.checked;
    gstFields.hidden = !on;
    elGstCheck.setAttribute("aria-expanded", String(on));
    if (!on) { setError(elGstin, false); setError(elGstName, false); }
  });
  elGstin.addEventListener("input", function () {
    elGstin.value = elGstin.value.toUpperCase().replace(/\s/g, "");
  });

  /* ---------- Payment method cards ---------- */
  var PAY_LABEL = {
    upi: "UPI",
    card: "Credit / debit card",
    netbanking: "Netbanking",
    emi: "EMI (3–12 months)"
  };
  var cardDemo = document.querySelector(".js-card-demo");
  var paycards = document.querySelectorAll(".js-paycard");
  function selectedPayment() {
    var checked = form.querySelector('input[name="payment"]:checked');
    return checked ? checked.value : "upi";
  }
  function refreshPaycards() {
    var val = selectedPayment();
    paycards.forEach(function (card) {
      var input = card.querySelector('input[name="payment"]');
      card.classList.toggle("is-selected", input.checked);
    });
    if (cardDemo) cardDemo.hidden = val !== "card";
  }
  paycards.forEach(function (card) {
    card.querySelector('input[name="payment"]').addEventListener("change", refreshPaycards);
  });
  refreshPaycards();

  /* ---------- Submit: validate → simulate Razorpay → save order ---------- */
  var overlay = document.querySelector(".js-pay-overlay");
  var placing = false;

  function buildOrder() {
    var t = totals();
    var seq = 0;
    try { seq = parseInt(localStorage.getItem("miro_order_seq") || "0", 10) || 0; } catch (e) {}
    seq += 1;
    try { localStorage.setItem("miro_order_seq", String(seq)); } catch (e) {}
    var number = "MIR-" + ("00000" + seq).slice(-5);

    var orderItems = items.map(function (it) {
      var p = Miro.findProduct(it.productId);
      return {
        productId: it.productId,
        name: p.name,
        category: p.category,
        price: p.price,
        qty: it.qty,
        metal: it.metal || (p.metals && p.metals.length ? p.metals[0].label : null),
        size: it.size || null,
        engraving: it.engraving || null,
        giftWrap: !!it.giftWrap,
        image: { id: p.images[0].id, p: p.images[0].p || "" }
      };
    });

    var est = lastEstimate || Miro.deliveryEstimate(elPincode.value.trim());

    var order = {
      number: number,
      placedAt: new Date().toISOString(),
      items: orderItems,
      contact: {
        email: elEmail.value.trim(),
        phone: "+91 " + elPhone.value.trim(),
        whatsappUpdates: elWhatsapp.checked
      },
      address: {
        fullName: elName.value.trim(),
        line1: elAddr1.value.trim(),
        line2: elAddr2.value.trim() || null,
        city: elCity.value.trim(),
        state: elState.value,
        pincode: elPincode.value.trim(),
        country: "India"
      },
      gstin: elGstCheck.checked ? {
        gstin: elGstin.value.trim().toUpperCase(),
        businessName: elGstName.value.trim()
      } : null,
      payment: { method: selectedPayment(), label: PAY_LABEL[selectedPayment()] },
      amounts: {
        subtotal: t.subtotal,
        shipping: t.shipping,
        taxable: t.gst.taxable,
        cgst: t.gst.cgst,
        sgst: t.gst.sgst,
        total: t.total
      },
      deliveryEstimate: est.ok ? est.label : null
    };

    var giftNote = null;
    try { giftNote = localStorage.getItem("miro_gift_note"); } catch (e) {}
    if (giftNote && giftNote.trim()) order.giftNote = giftNote.trim();
    return order;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (placing) return;

    var firstBad = null;
    validators.forEach(function (v) {
      if (v.when && !v.when()) { setError(v.el, false); return; }
      var ok = v.test();
      setError(v.el, !ok);
      if (!ok && !firstBad) firstBad = v.el;
    });

    if (firstBad) {
      var f = fieldOf(firstBad) || firstBad;
      f.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(function () {
        try { firstBad.focus({ preventScroll: true }); } catch (err) { firstBad.focus(); }
      }, 350);
      return;
    }

    placing = true;
    if (overlay) overlay.hidden = false;
    document.body.classList.add("no-scroll");

    setTimeout(function () {
      var order = buildOrder();
      try {
        localStorage.setItem("miro_last_order", JSON.stringify(order));
        var history = [];
        try { history = JSON.parse(localStorage.getItem("miro_orders") || "[]"); } catch (err) {}
        if (!Array.isArray(history)) history = [];
        history.push(order);
        localStorage.setItem("miro_orders", JSON.stringify(history));
      } catch (err) {}
      /* Cart is intentionally NOT cleared here — the confirmation page does it. */
      window.location.href = "order-confirmation.html";
    }, 1800);
  });
})();
