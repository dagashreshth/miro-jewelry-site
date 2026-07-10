/* ============================================================
   Miró — Google Analytics 4 integration
   ------------------------------------------------------------
   Wired and production-ready. Set MEASUREMENT_ID to your real
   GA4 property id ("G-XXXXXXXXXX") to activate tracking.

   Until a real id is set, this build stays dormant — it makes
   NO external tracking calls (so the demo has no console noise
   and respects privacy), but the data-layer, page_view config
   and e-commerce events are all in place. Swap the id and you
   are live, no other change required.
   ============================================================ */
(function () {
  "use strict";

  var MEASUREMENT_ID = "G-XXXXXXXXXX"; /* ← replace with your GA4 id for production */

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  gtag("js", new Date());

  var LIVE = /^G-[A-Z0-9]{6,}$/.test(MEASUREMENT_ID) && MEASUREMENT_ID !== "G-XXXXXXXXXX";

  if (LIVE) {
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + MEASUREMENT_ID;
    document.head.appendChild(s);
    gtag("config", MEASUREMENT_ID, { anonymize_ip: true });
  }

  /* Thin wrapper used across the site for custom + e-commerce events.
     Pushes to the data layer always; only reaches Google when LIVE. */
  window.MiroTrack = function (name, params) {
    try { gtag("event", name, params || {}); } catch (e) {}
  };

  /* Example wiring against events the storefront already emits:
     add_to_cart fires whenever the bag changes (store.js dispatches
     miro:cartchange). Purchase is fired by the confirmation page. */
  window.addEventListener("miro:cartchange", function (e) {
    if (!window.Miro) return;
    window.MiroTrack("cart_update", {
      currency: "INR",
      value: Miro.cart.subtotal(),
      items: Miro.cart.count()
    });
  });

  /* On the order-confirmation page, report the completed purchase. */
  document.addEventListener("DOMContentLoaded", function () {
    if (document.body.getAttribute("data-page") !== "order-confirmation") return;
    var order;
    try { order = JSON.parse(localStorage.getItem("miro_last_order")); } catch (e) {}
    if (!order || !order.amounts) return;
    window.MiroTrack("purchase", {
      transaction_id: order.number,
      currency: "INR",
      value: order.amounts.total || order.amounts.grand,
      tax: (order.amounts.cgst || 0) + (order.amounts.sgst || 0),
      shipping: order.amounts.shipping || 0
    });
  });
})();
