/* ============================================================
   Miró — Order confirmation: reads localStorage miro_last_order,
   renders success header, timeline ETA, items recap and the GST
   tax invoice. Clears the cart once an order is shown.
   Requires store.js + layout.js.
   ============================================================ */
(function () {
  "use strict";

  var ORDER_KEY = "miro_last_order";

  /* ---------- Tiny helpers ---------- */
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  /* First argument that is not undefined / null / "" (0 passes through) */
  function first() {
    for (var i = 0; i < arguments.length; i++) {
      var v = arguments[i];
      if (v !== undefined && v !== null && v !== "") return v;
    }
    return null;
  }
  function setText(sel, text) {
    var el = document.querySelector(sel);
    if (el) el.textContent = text;
  }
  function setHTML(sel, html) {
    var el = document.querySelector(sel);
    if (el) el.innerHTML = html;
  }

  /* ---------- Load the order ---------- */
  var order = null;
  try {
    var raw = localStorage.getItem(ORDER_KEY);
    if (raw) order = JSON.parse(raw);
  } catch (e) { order = null; }

  var noOrderEl = document.querySelector(".js-no-order");
  var orderView = document.querySelector(".js-order-view");
  var hasOrder = !!(order && order.items && order.items.length);

  if (!hasOrder) {
    /* Friendly empty state; drop the order view so the page keeps a single h1 */
    if (orderView && orderView.parentNode) orderView.parentNode.removeChild(orderView);
    if (noOrderEl) noOrderEl.hidden = false;
    return;
  }

  /* Order exists — remove the empty state, show the confirmation, clear the
     bag and the gift note so the next order doesn't inherit this message */
  if (noOrderEl && noOrderEl.parentNode) noOrderEl.parentNode.removeChild(noOrderEl);
  orderView.hidden = false;
  Miro.cart.clear();
  try { localStorage.removeItem("miro_gift_note"); } catch (e) {}

  /* ---------- Normalise the order (tolerant of checkout field naming) ---------- */
  var customer = order.customer || order.contact || {};
  var addr = order.address || order.shippingAddress || {};
  if (typeof addr === "string") addr = { line1: addr };

  var fullName = String(first(
    addr.fullName,
    customer.name,
    ((customer.firstName || "") + " " + (customer.lastName || "")).replace(/\s+/g, " "),
    addr.name,
    order.name,
    "there"
  )).replace(/^\s+|\s+$/g, "");
  var firstName = fullName.split(/\s+/)[0] || "there";
  var email = first(customer.email, order.email, "your inbox");
  var phone = first(customer.phone, order.phone, addr.phone);

  /* GSTIN may be a plain string or checkout's { gstin, businessName } object */
  var gstinRaw = first(order.gstin, customer.gstin, addr.gstin);
  var gstin = null;
  var gstBusiness = null;
  if (gstinRaw && typeof gstinRaw === "object") {
    gstin = gstinRaw.gstin || null;
    gstBusiness = gstinRaw.businessName || null;
  } else if (gstinRaw) {
    gstin = gstinRaw;
  }

  var numSource = String(first(order.number, order.orderNumber, order.orderId, order.id,
    String(Date.now()).slice(-5)));
  var digits = numSource.replace(/^MIR[-\s]*/i, "");
  var orderNo = "MIR-" + digits;
  var invoiceNo = "MIR-INV-" + digits;

  var placedRaw = first(order.placedAt, order.date, order.createdAt, order.timestamp);
  var placed = placedRaw ? new Date(placedRaw) : new Date();
  if (isNaN(placed.getTime())) placed = new Date();
  var dateLong = placed.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  /* Lines: resolve each item against the catalog for image / name / price */
  var lines = [];
  var totalQty = 0;
  for (var i = 0; i < order.items.length; i++) {
    var it = order.items[i] || {};
    var pid = first(it.productId, it.id);
    var product = pid ? Miro.findProduct(pid) : null;
    var qty = parseInt(first(it.qty, it.quantity, 1), 10);
    if (isNaN(qty) || qty < 1) qty = 1;
    var unit = Number(first(it.price, it.unitPrice, product ? product.price : 0)) || 0;
    totalQty += qty;
    lines.push({
      product: product,
      name: first(it.name, product && product.name, "Miró piece"),
      qty: qty,
      unit: unit,
      metal: first(it.metal, null),
      size: first(it.size, null),
      engraving: first(it.engraving, null),
      giftWrap: !!(it.giftWrap || it.wrap)
    });
  }

  /* Money — trust stored amounts when present, recompute when not */
  var amounts = order.amounts || order.totals || {};
  var subtotal = first(amounts.subtotal, order.subtotal);
  if (subtotal === null) {
    subtotal = 0;
    for (var j = 0; j < lines.length; j++) subtotal += lines[j].unit * lines[j].qty;
  }
  subtotal = Number(subtotal) || 0;
  var shipStored = first(amounts.shipping, order.shipping, order.shippingFee);
  var ship = shipStored === null ? Miro.shipping(subtotal) : (Number(shipStored) || 0);
  var grandStored = first(amounts.total, order.total, order.grandTotal);
  var grand = grandStored === null ? subtotal + ship : (Number(grandStored) || subtotal + ship);

  /* Invoice GST breakdown — always derived from the jewelry value alone
     (grand − shipping). checkout.js stores GST computed over subtotal +
     shipping, so its stored taxable figure already contains the shipping fee
     and would double-count it against the separate shipping row below.
     Deriving the taxable value as goods − CGST − SGST also absorbs the ₹1
     drift from rounding the two tax halves independently, so the invoice
     rows always sum exactly to the grand total. */
  var goods = Math.max(0, grand - ship);
  var gstCalc = Miro.gst(goods);
  var gst = {
    cgst: gstCalc.cgst,
    sgst: gstCalc.sgst,
    taxable: goods - gstCalc.cgst - gstCalc.sgst
  };

  /* ---------- Success header ---------- */
  setText(".js-first-name", firstName);
  setText(".js-order-meta", "Order " + orderNo + " · placed " + dateLong);
  setText(".js-confirm-sub", "A confirmation is on its way to " + email + " and WhatsApp.");
  document.title = "Order " + orderNo + " Confirmed — Miró Fine Jewelry";

  /* ---------- Timeline ETA ---------- */
  var etaLabel = null;
  var deliv = first(order.deliveryEstimate, order.delivery, order.estimate);
  if (deliv && typeof deliv === "object" && deliv.label) etaLabel = deliv.label;
  else if (typeof deliv === "string") etaLabel = deliv;
  if (!etaLabel) {
    var pin = first(addr.pincode, addr.pin, addr.postalCode);
    if (pin) {
      var est = Miro.deliveryEstimate(pin);
      if (est.ok) etaLabel = est.label;
    }
  }
  if (!etaLabel) etaLabel = "Most pieces arrive within 5–8 days; made-to-order pieces take a little longer — we'll keep you posted on WhatsApp.";
  setHTML(".js-eta", "<strong>Estimated delivery:</strong> " + esc(etaLabel));

  /* ---------- Items recap ---------- */
  setText(".js-recap-count", totalQty + (totalQty === 1 ? " piece" : " pieces"));
  var itemsHTML = lines.map(function (l) {
    var opts = [];
    if (l.metal) opts.push(esc(l.metal));
    if (l.size) opts.push("Size " + esc(l.size));
    if (l.engraving) opts.push("Engraved “" + esc(l.engraving) + "”");
    if (l.giftWrap) opts.push("Gift wrapped");

    var thumb;
    if (l.product) {
      var im = l.product.images[0];
      thumb = '<img src="' + Miro.img(im.id, 240, im.p) + '" alt="' + esc(l.name) + '" loading="lazy" width="240" height="320">';
    } else {
      thumb = '<span class="recap__noimg" aria-hidden="true">M</span>';
    }
    var name = l.product
      ? '<a href="product.html?id=' + esc(l.product.id) + '">' + esc(l.name) + "</a>"
      : esc(l.name);

    return (
      '<li class="recap__item">' +
        '<div class="recap__thumb">' + thumb + "</div>" +
        '<div class="recap__info">' +
          '<p class="recap__name">' + name + "</p>" +
          (opts.length ? '<p class="recap__opts">' + opts.join(" · ") + "</p>" : "") +
          '<p class="recap__qty">Qty ' + l.qty + " · " + Miro.fmt(l.unit) + " each</p>" +
        "</div>" +
        '<p class="recap__price">' + Miro.fmt(l.unit * l.qty) + "</p>" +
      "</li>"
    );
  }).join("");
  setHTML(".js-items", itemsHTML);

  /* Gift note, when one was left at checkout */
  var giftNote = first(order.giftNote, order.giftMessage);
  var giftEl = document.querySelector(".js-gift-note");
  if (giftEl && giftNote && typeof giftNote === "string") {
    giftEl.innerHTML = "<strong>Your gift note</strong> — “" + esc(giftNote) + "” · hand-written on Miró paper and tucked inside the box.";
    giftEl.hidden = false;
  }

  /* ---------- Tax invoice ---------- */
  setText(".js-invoice-number", invoiceNo);

  var buyerBits = [esc(fullName)];
  if (gstBusiness) buyerBits.push(esc(gstBusiness));
  var l1 = first(addr.line1, addr.address1, addr.street, addr.address);
  var l2 = first(addr.line2, addr.address2, addr.landmark);
  var cityLine = [first(addr.city, ""), first(addr.pincode, addr.pin, addr.postalCode, "")]
    .join(" ").replace(/^\s+|\s+$/g, "");
  if (l1) buyerBits.push(esc(l1));
  if (l2) buyerBits.push(esc(l2));
  if (cityLine) buyerBits.push(esc(cityLine));
  if (addr.state) buyerBits.push(esc(addr.state));
  if (phone) buyerBits.push(esc(phone));
  if (email !== "your inbox") buyerBits.push(esc(email));
  if (gstin) buyerBits.push("GSTIN " + esc(gstin));
  setHTML(".js-buyer", buyerBits.join("<br>"));

  var metaBits = [
    "Invoice no. " + esc(invoiceNo),
    "Order " + esc(orderNo),
    "Dated " + esc(dateLong),
    totalQty + (totalQty === 1 ? " piece" : " pieces") + " · HSN 7113"
  ];
  var payMethod = first(
    order.payment && order.payment.label,
    order.payment && order.payment.method,
    order.paymentMethod,
    typeof order.payment === "string" ? order.payment : null
  );
  if (payMethod && typeof payMethod === "string") {
    metaBits.push("Paid via " + esc(payMethod) + " · Razorpay");
  }
  setHTML(".js-invoice-meta", metaBits.join("<br>"));

  var rows = [
    ["Taxable value — jewelry (HSN 7113)", Miro.fmt(gst.taxable)],
    ["CGST @ 1.5%", Miro.fmt(gst.cgst)],
    ["SGST @ 1.5%", Miro.fmt(gst.sgst)],
    [ship === 0 ? "Insured shipping — complimentary" : "Insured shipping & handling", Miro.fmt(ship)]
  ];
  setHTML(".js-invoice-rows", rows.map(function (r) {
    return '<tr><th scope="row">' + r[0] + '</th><td class="num">' + r[1] + "</td></tr>";
  }).join(""));
  setText(".js-grand", Miro.fmt(grand));

  /* Download invoice (PDF) — print stylesheet isolates the invoice card */
  var printBtn = document.querySelector(".js-print");
  if (printBtn) {
    printBtn.addEventListener("click", function () { window.print(); });
  }

  /* ---------- Help row ---------- */
  var waCta = document.querySelector(".js-wa-cta");
  if (waCta && window.MiroLinks) waCta.setAttribute("href", MiroLinks.whatsapp);
})();
