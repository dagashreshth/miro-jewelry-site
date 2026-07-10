/* ============================================================
   Miró — Product detail page: gallery + cursor zoom, options,
   size guide, engraving, delivery estimate, add to cart,
   accordion, related pieces. Requires store.js + layout.js.
   ============================================================ */
(function () {
  "use strict";

  var DEFAULT_ID = "aurelia-halo";
  var ENGRAVE_MAX = 15;
  var SIZE_GUIDE = [[6, "15.3"], [8, "15.9"], [10, "16.5"], [12, "17.2"], [14, "17.8"], [16, "18.5"], [18, "19.2"]];
  var ALT_SUFFIX = [" — full view", " — close detail of the setting", " — worn, styled in daylight"];
  var PREVIEW_PLACEHOLDER = "Your words, in our hand";

  var pdpWrap = document.querySelector(".js-pdp");
  var crumbsWrap = document.querySelector(".js-crumbs");
  var relatedSection = document.querySelector(".js-related-section");
  var relatedWrap = document.querySelector(".js-related");
  if (!pdpWrap || !window.Miro) return;

  var requestedId = Miro.getParam("id") || DEFAULT_ID;
  var product = Miro.findProduct(requestedId);

  /* ============================================================
     Not-found state
     ============================================================ */
  if (!product) {
    document.title = "Piece Not Found — Miró Fine Jewelry";
    if (crumbsWrap) {
      crumbsWrap.innerHTML =
        '<a href="index.html">Home</a><span aria-hidden="true">/</span>' +
        '<a href="collections.html">Collections</a><span aria-hidden="true">/</span>' +
        '<span class="current" aria-current="page">Not found</span>';
    }
    pdpWrap.innerHTML =
      '<div class="pdp-notfound">' +
        '<p class="eyebrow">A small detour</p>' +
        "<h1>We couldn't find that piece</h1>" +
        "<p>The link you followed may be an old one, or the piece may have already found its forever home. " +
        "The full collection is only a step away — and if you remember a piece you saw here once, our concierge " +
        "can usually trace it by name or stone.</p>" +
        '<div class="pdp-notfound__ctas">' +
          '<a class="btn btn--lg" href="collections.html">Browse all jewellery</a>' +
          '<a class="btn btn--lg btn--outline" href="contact.html">Ask the concierge</a>' +
        "</div>" +
      "</div>";
    return;
  }

  /* ============================================================
     State
     ============================================================ */
  var catLabel = Miro.CATEGORY_LABEL[product.category];
  var collection = null;
  Miro.COLLECTIONS.forEach(function (c) { if (c.id === product.collection) collection = c; });

  var state = {
    imageIndex: 0,
    metal: product.metals[0].label,
    karat: product.metals[0].karat,
    size: null,
    qty: 1
  };

  /* ============================================================
     Head: title + JSON-LD
     ============================================================ */
  document.title = product.name + " — Miró Fine Jewelry";
  var ldEl = document.getElementById("product-jsonld");
  if (ldEl) {
    ldEl.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Product",
      "name": product.name,
      "description": product.description,
      "sku": product.id,
      "image": product.images.map(function (im) { return Miro.img(im.id, 1200, im.p); }),
      "brand": { "@type": "Brand", "name": "Miró Fine Jewelry" },
      "offers": {
        "@type": "Offer",
        "url": "product.html?id=" + product.id,
        "priceCurrency": "INR",
        "price": product.price,
        "availability": product.instock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
      }
    });
  }

  /* ============================================================
     Breadcrumbs
     ============================================================ */
  if (crumbsWrap) {
    crumbsWrap.innerHTML =
      '<a href="index.html">Home</a><span aria-hidden="true">/</span>' +
      '<a href="collections.html">Collections</a><span aria-hidden="true">/</span>' +
      '<a href="collections.html?category=' + product.category + '">' + catLabel + '</a>' +
      '<span aria-hidden="true">/</span>' +
      '<span class="current" aria-current="page">' + product.name + "</span>";
  }

  /* ============================================================
     Markup builders
     ============================================================ */
  function galleryHTML() {
    var im0 = product.images[0];
    var thumbs = product.images.map(function (im, i) {
      return (
        '<button class="pdp-thumb js-thumb" type="button" data-index="' + i + '"' +
          ' aria-pressed="' + (i === 0 ? "true" : "false") + '"' +
          ' aria-controls="pdp-stage" aria-label="View image ' + (i + 1) + " of " + product.images.length + '">' +
          '<img src="' + Miro.img(im.id, 240, im.p) + '" alt="" width="240" height="320" loading="lazy">' +
        "</button>"
      );
    }).join("");
    return (
      '<div class="pdp-gallery">' +
        '<figure class="pdp-stage js-stage" id="pdp-stage" aria-label="Selected product image">' +
          '<img class="js-main-img" src="' + Miro.img(im0.id, 1200, im0.p) + '"' +
            ' alt="' + product.name + ALT_SUFFIX[0] + '" width="1200" height="1600" fetchpriority="high">' +
          '<div class="pdp-zoom js-zoom" aria-hidden="true"></div>' +
        "</figure>" +
        '<div class="pdp-thumbs" role="group" aria-label="Choose a view">' + thumbs + "</div>" +
        '<p class="pdp-zoom-hint js-zoom-hint"></p>' +
      "</div>"
    );
  }

  function priceHTML() {
    return (
      '<div class="pdp-price">' +
        '<span class="pdp-price__now">' + Miro.fmt(product.price) + "</span>" +
        (product.compareAt
          ? '<s class="pdp-price__was">' + Miro.fmt(product.compareAt) + "</s>" +
            '<span class="badge badge--sale">Sale</span>'
          : "") +
      "</div>" +
      '<p class="pdp-price__note">Inclusive of 3% GST · Complimentary insured shipping over ' +
        Miro.fmt(Miro.FREE_SHIP_THRESHOLD) + "</p>"
    );
  }

  function specsHTML() {
    return (
      '<dl class="pdp-specs">' +
        '<div class="pdp-specs__row"><dt>Stone</dt><dd>' + product.stone.type + "</dd></div>" +
        '<div class="pdp-specs__row"><dt>Carat weight</dt><dd>' + product.stone.ctw + "</dd></div>" +
        '<div class="pdp-specs__row"><dt>Metal weight</dt><dd><span class="js-karat">' + state.karat +
          " gold</span> · " + product.metalWeight + "</dd></div>" +
      "</dl>"
    );
  }

  function metalHTML() {
    var chips = product.metals.map(function (m, i) {
      return (
        '<button class="chip js-metal-chip" type="button" data-metal="' + m.label + '" data-karat="' + m.karat + '"' +
          ' aria-pressed="' + (i === 0 ? "true" : "false") + '">' + m.label + "</button>"
      );
    }).join("");
    return (
      '<div class="pdp-opt" role="group" aria-labelledby="metal-label">' +
        '<p class="pdp-opt__label" id="metal-label">Metal · <span class="js-metal-name">' + state.metal + "</span></p>" +
        '<div class="chips">' + chips + "</div>" +
      "</div>"
    );
  }

  function sizeHTML() {
    if (!product.sizes) return "";
    var chips = product.sizes.map(function (s) {
      return (
        '<button class="chip js-size-chip" type="button" data-size="' + s + '" aria-pressed="false"' +
          ' aria-label="Ring size ' + s + '">' + s + "</button>"
      );
    }).join("");
    var rows = SIZE_GUIDE.map(function (r) {
      return "<tr><td>" + r[0] + "</td><td>" + r[1] + " mm</td></tr>";
    }).join("");
    return (
      '<div class="pdp-opt" role="group" aria-labelledby="size-label">' +
        '<div class="pdp-opt__head">' +
          '<p class="pdp-opt__label" id="size-label">Ring size · <span class="js-size-name">select a size</span></p>' +
          '<button class="pdp-opt__guide js-open-guide" type="button" aria-expanded="false" aria-controls="size-guide">Size guide</button>' +
        "</div>" +
        '<div class="chips">' + chips + "</div>" +
        '<p class="pdp-opt__error js-size-error" role="alert" hidden>Please choose your ring size — the size guide below can help.</p>' +
        '<div class="sizeguide js-guide" id="size-guide" role="dialog" aria-label="Indian ring size guide" hidden>' +
          '<div class="sizeguide__head">' +
            '<p class="sizeguide__title">Indian ring sizes</p>' +
            '<button class="icon-btn js-close-guide" type="button" aria-label="Close size guide">' + MiroIcons.close + "</button>" +
          "</div>" +
          "<table>" +
            '<caption class="sr-only">Indian ring size to inner diameter in millimetres</caption>' +
            '<thead><tr><th scope="col">Indian size</th><th scope="col">Inner diameter</th></tr></thead>' +
            "<tbody>" + rows + "</tbody>" +
          "</table>" +
          '<p class="sizeguide__tip">Tip: wrap a thin strip of paper snugly around your finger, mark where it overlaps, ' +
            "measure the length in millimetres and divide by 3.14 for your diameter.</p>" +
        "</div>" +
      "</div>"
    );
  }

  function customHTML() {
    return (
      '<div class="pdp-custom">' +
        '<div class="field">' +
          '<label for="engrave-input">Engraving <em>· optional, complimentary</em></label>' +
          '<input class="input" id="engrave-input" type="text" maxlength="' + ENGRAVE_MAX + '"' +
            ' autocomplete="off" spellcheck="false" placeholder="Initials, a date, a word">' +
          '<p class="hint js-engrave-count" aria-live="polite">' + ENGRAVE_MAX + " characters remaining</p>" +
        "</div>" +
        '<p class="pdp-engrave-preview" aria-hidden="true"><span class="js-engrave-preview">' + PREVIEW_PLACEHOLDER + "</span></p>" +
        '<label class="checkbox-row">' +
          '<input type="checkbox" class="js-giftwrap">' +
          "<span>Signature Miró gift box + handwritten note — complimentary</span>" +
        "</label>" +
      "</div>"
    );
  }

  function deliveryHTML() {
    return (
      '<div class="pdp-delivery">' +
        '<label class="pdp-opt__label" for="pin-input">Delivery estimate</label>' +
        '<div class="pdp-delivery__row">' +
          '<input class="input" id="pin-input" type="text" inputmode="numeric" maxlength="6"' +
            ' autocomplete="postal-code" placeholder="6-digit pincode">' +
          '<button class="btn btn--outline pdp-delivery__check js-check-pin" type="button">Check</button>' +
        "</div>" +
        '<p class="pdp-delivery__result js-pin-result" aria-live="polite"></p>' +
        '<ul class="pdp-assure" role="list">' +
          "<li>Insured shipping</li>" +
          "<li>BIS hallmark</li>" +
          "<li>15-day returns</li>" +
        "</ul>" +
      "</div>"
    );
  }

  function ctaHTML() {
    return (
      '<div class="pdp-cta">' +
        '<div class="qty">' +
          '<button type="button" class="js-qty-minus" aria-label="Decrease quantity">−</button>' +
          '<input class="js-qty-input" type="number" value="1" min="1" max="5" readonly aria-label="Quantity">' +
          '<button type="button" class="js-qty-plus" aria-label="Increase quantity">+</button>' +
        "</div>" +
        '<button type="button" class="btn btn--lg btn--block js-add">Add to cart</button>' +
      "</div>" +
      '<a class="btn btn--outline btn--block pdp-book" href="contact.html">Book an appointment</a>'
    );
  }

  function accordionItem(id, title, contentHTML, open) {
    return (
      '<div class="accordion__item">' +
        "<h3>" +
          '<button class="accordion__trigger js-acc-trigger" type="button" id="acc-t-' + id + '"' +
            ' aria-expanded="' + (open ? "true" : "false") + '" aria-controls="acc-p-' + id + '">' +
            title + '<span class="accordion__icon" aria-hidden="true"></span>' +
          "</button>" +
        "</h3>" +
        '<div class="accordion__panel js-acc-panel" id="acc-p-' + id + '" role="region" aria-labelledby="acc-t-' + id + '">' +
          '<div class="accordion__content">' + contentHTML + "</div>" +
        "</div>" +
      "</div>"
    );
  }

  function accordionHTML() {
    var detailsList =
      '<ul class="pdp-details-list">' +
      product.details.map(function (d) { return "<li>" + d + "</li>"; }).join("") +
      "</ul>";
    var care =
      "<p>Solid gold asks very little of you. Let your piece be the last thing you put on and the first you take " +
      "off — perfume, hairspray and chlorinated water dull stones and finish faster than years of wear ever will. " +
      "Between wears, rest it in its Miró pouch or box, apart from other jewellery, so settings and polish never quarrel.</p>" +
      "<p>To clean at home, soak it for a few minutes in lukewarm water with a drop of mild soap, work gently with a " +
      "soft brush, rinse and pat dry with a lint-free cloth. Once a year, bring it back to us — cleaning, polishing " +
      "and plating touch-ups are complimentary for the life of the piece.</p>";
    var shippingReturns =
      "<p>Every order travels fully insured with signature-on-delivery — within 3–5 working days to metro pincodes " +
      "and 5–8 days elsewhere in India. Made-to-order pieces list their crafting window under “The details” above.</p>" +
      "<p>Unworn pieces may be returned or resized within 15 days of delivery, no questions asked. And our lifetime " +
      "care promise travels with the piece, not the invoice — whoever inherits it, inherits us too.</p>";
    return (
      '<div class="accordion pdp-accordion js-accordion">' +
        accordionItem("details", "The details", detailsList, true) +
        accordionItem("care", "Materials & care", care, false) +
        accordionItem("shipping", "Shipping & returns", shippingReturns, false) +
      "</div>"
    );
  }

  /* ============================================================
     Render
     ============================================================ */
  pdpWrap.innerHTML =
    galleryHTML() +
    '<div class="pdp-buy">' +
      '<p class="eyebrow">' + catLabel + (collection ? " · " + collection.name : "") + "</p>" +
      '<h1 class="pdp-title">' + product.name + "</h1>" +
      priceHTML() +
      '<p class="pdp-desc">' + product.description + "</p>" +
      specsHTML() +
      metalHTML() +
      sizeHTML() +
      customHTML() +
      deliveryHTML() +
      ctaHTML() +
      accordionHTML() +
    "</div>";

  /* ============================================================
     Gallery: thumbnails + fade swap
     ============================================================ */
  var stage = pdpWrap.querySelector(".js-stage");
  var mainImg = pdpWrap.querySelector(".js-main-img");
  var zoomPane = pdpWrap.querySelector(".js-zoom");
  var zoomHint = pdpWrap.querySelector(".js-zoom-hint");
  var thumbBtns = pdpWrap.querySelectorAll(".js-thumb");

  function largeUrl() {
    var im = product.images[state.imageIndex];
    return Miro.img(im.id, 1600, im.p);
  }

  function selectImage(i) {
    if (i === state.imageIndex) return;
    state.imageIndex = i;
    thumbBtns.forEach(function (b) {
      b.setAttribute("aria-pressed", String(Number(b.getAttribute("data-index")) === i));
    });
    stage.classList.remove("is-touch-zoom");
    mainImg.classList.add("is-fading");
    setTimeout(function () {
      var im = product.images[i];
      mainImg.onload = function () { mainImg.classList.remove("is-fading"); };
      mainImg.src = Miro.img(im.id, 1200, im.p);
      mainImg.alt = product.name + ALT_SUFFIX[i];
      if (zoomPane.classList.contains("is-active")) {
        zoomPane.style.backgroundImage = 'url("' + largeUrl() + '")';
      }
    }, 200);
  }

  thumbBtns.forEach(function (b) {
    b.addEventListener("click", function () {
      selectImage(Number(b.getAttribute("data-index")));
    });
  });

  /* ============================================================
     Zoom — desktop cursor pane, touch tap-to-zoom with pan
     ============================================================ */
  var desktopZoom = window.matchMedia("(min-width: 900px) and (hover: hover) and (pointer: fine)");

  function setHint() {
    zoomHint.textContent = desktopZoom.matches
      ? "Hover over the image to magnify"
      : "Tap the image to zoom · drag to pan";
  }
  setHint();
  function onZoomModeChange() {
    setHint();
    stage.classList.remove("is-touch-zoom");
    zoomPane.classList.remove("is-active");
  }
  if (desktopZoom.addEventListener) desktopZoom.addEventListener("change", onZoomModeChange);
  else if (desktopZoom.addListener) desktopZoom.addListener(onZoomModeChange);

  function positionZoom(clientX, clientY) {
    var r = stage.getBoundingClientRect();
    var x = Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100));
    var y = Math.max(0, Math.min(100, ((clientY - r.top) / r.height) * 100));
    zoomPane.style.backgroundPosition = x + "% " + y + "%";
  }

  stage.addEventListener("mouseenter", function () {
    if (!desktopZoom.matches) return;
    zoomPane.style.backgroundImage = 'url("' + largeUrl() + '")';
    zoomPane.classList.add("is-active");
  });
  stage.addEventListener("mousemove", function (e) {
    if (!desktopZoom.matches) return;
    positionZoom(e.clientX, e.clientY);
  });
  stage.addEventListener("mouseleave", function () {
    zoomPane.classList.remove("is-active");
  });

  /* Touch / small screens: tap toggles a 2× zoom, drag pans (transform only) */
  function panTo(clientX, clientY) {
    var r = stage.getBoundingClientRect();
    var x = Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100));
    var y = Math.max(0, Math.min(100, ((clientY - r.top) / r.height) * 100));
    mainImg.style.transformOrigin = x + "% " + y + "%";
  }
  stage.addEventListener("click", function (e) {
    if (desktopZoom.matches) return;
    var zoomed = stage.classList.toggle("is-touch-zoom");
    if (zoomed) panTo(e.clientX, e.clientY);
    else mainImg.style.transformOrigin = "";
  });
  stage.addEventListener("touchmove", function (e) {
    if (!stage.classList.contains("is-touch-zoom")) return;
    e.preventDefault();
    panTo(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: false });

  /* ============================================================
     Metal selection
     ============================================================ */
  var metalName = pdpWrap.querySelector(".js-metal-name");
  var karatEl = pdpWrap.querySelector(".js-karat");
  pdpWrap.querySelectorAll(".js-metal-chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      pdpWrap.querySelectorAll(".js-metal-chip").forEach(function (c) {
        c.setAttribute("aria-pressed", "false");
      });
      chip.setAttribute("aria-pressed", "true");
      state.metal = chip.getAttribute("data-metal");
      state.karat = chip.getAttribute("data-karat");
      metalName.textContent = state.metal;
      karatEl.textContent = state.karat + " gold";
    });
  });

  /* ============================================================
     Ring size selection + size guide
     ============================================================ */
  var sizeName = pdpWrap.querySelector(".js-size-name");
  var sizeError = pdpWrap.querySelector(".js-size-error");
  pdpWrap.querySelectorAll(".js-size-chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      pdpWrap.querySelectorAll(".js-size-chip").forEach(function (c) {
        c.setAttribute("aria-pressed", "false");
      });
      chip.setAttribute("aria-pressed", "true");
      state.size = Number(chip.getAttribute("data-size"));
      if (sizeName) sizeName.textContent = "size " + state.size;
      if (sizeError) sizeError.hidden = true;
    });
  });

  var guideBtn = pdpWrap.querySelector(".js-open-guide");
  var guide = pdpWrap.querySelector(".js-guide");
  function setGuide(open) {
    if (!guide || !guideBtn) return;
    guide.hidden = !open;
    guideBtn.setAttribute("aria-expanded", String(open));
  }
  if (guideBtn) {
    guideBtn.addEventListener("click", function () {
      setGuide(guide.hidden);
    });
    pdpWrap.querySelector(".js-close-guide").addEventListener("click", function () {
      setGuide(false);
      guideBtn.focus();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !guide.hidden) { setGuide(false); guideBtn.focus(); }
    });
    document.addEventListener("click", function (e) {
      if (guide.hidden) return;
      if (!e.target.closest(".js-guide") && !e.target.closest(".js-open-guide")) setGuide(false);
    });
  }

  /* ============================================================
     Engraving + gift wrap
     ============================================================ */
  var engraveInput = pdpWrap.querySelector("#engrave-input");
  var engraveCount = pdpWrap.querySelector(".js-engrave-count");
  var engravePreview = pdpWrap.querySelector(".js-engrave-preview");
  var giftWrapBox = pdpWrap.querySelector(".js-giftwrap");

  engraveInput.addEventListener("input", function () {
    var val = engraveInput.value.slice(0, ENGRAVE_MAX);
    var left = ENGRAVE_MAX - val.length;
    engraveCount.textContent = left + (left === 1 ? " character" : " characters") + " remaining";
    engravePreview.textContent = val || PREVIEW_PLACEHOLDER;
    engravePreview.parentNode.classList.toggle("is-live", val.length > 0);
  });

  /* ============================================================
     Delivery estimate
     ============================================================ */
  var pinInput = pdpWrap.querySelector("#pin-input");
  var pinResult = pdpWrap.querySelector(".js-pin-result");

  function checkPin() {
    var res = Miro.deliveryEstimate(pinInput.value);
    pinResult.textContent = res.label;
    pinResult.classList.toggle("is-ok", res.ok);
    pinResult.classList.toggle("is-err", !res.ok);
  }
  pinInput.addEventListener("input", function () {
    pinInput.value = pinInput.value.replace(/\D/g, "").slice(0, 6);
  });
  pinInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); checkPin(); }
  });
  pdpWrap.querySelector(".js-check-pin").addEventListener("click", checkPin);

  /* ============================================================
     Quantity + add to cart
     ============================================================ */
  var qtyInput = pdpWrap.querySelector(".js-qty-input");
  pdpWrap.querySelector(".js-qty-minus").addEventListener("click", function () {
    state.qty = Math.max(1, state.qty - 1);
    qtyInput.value = state.qty;
  });
  pdpWrap.querySelector(".js-qty-plus").addEventListener("click", function () {
    state.qty = Math.min(5, state.qty + 1);
    qtyInput.value = state.qty;
  });

  var addBtn = pdpWrap.querySelector(".js-add");
  var addTimer = null;
  addBtn.addEventListener("click", function () {
    if (product.sizes && !state.size) {
      sizeError.hidden = false;
      sizeError.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    Miro.cart.add(product.id, {
      metal: state.metal,
      size: state.size,
      qty: state.qty,
      engraving: engraveInput.value.trim() || null,
      giftWrap: giftWrapBox.checked
    });
    MiroToast(product.name + " added to your bag · " + '<a href="cart.html">View bag</a>');
    addBtn.textContent = "Added ✓";
    addBtn.setAttribute("disabled", "");
    clearTimeout(addTimer);
    addTimer = setTimeout(function () {
      addBtn.textContent = "Add to cart";
      addBtn.removeAttribute("disabled");
    }, 1600);
  });

  /* ============================================================
     Accordion — max-height driven for smooth open/close
     ============================================================ */
  var accTriggers = pdpWrap.querySelectorAll(".js-acc-trigger");
  function panelFor(trigger) {
    return document.getElementById(trigger.getAttribute("aria-controls"));
  }
  accTriggers.forEach(function (trigger) {
    var panel = panelFor(trigger);
    if (trigger.getAttribute("aria-expanded") === "true") {
      panel.style.maxHeight = panel.scrollHeight + "px";
    }
    trigger.addEventListener("click", function () {
      var open = trigger.getAttribute("aria-expanded") !== "true";
      trigger.setAttribute("aria-expanded", String(open));
      panel.style.maxHeight = open ? panel.scrollHeight + "px" : "0px";
    });
  });
  window.addEventListener("resize", function () {
    accTriggers.forEach(function (trigger) {
      if (trigger.getAttribute("aria-expanded") === "true") {
        var panel = panelFor(trigger);
        panel.style.maxHeight = panel.scrollHeight + "px";
      }
    });
  });

  /* ============================================================
     Related products
     ============================================================ */
  if (relatedSection && relatedWrap) {
    relatedSection.hidden = false;
    relatedWrap.innerHTML = Miro.related(product, 4).map(function (p) {
      return Miro.productCard(p, { width: 700 });
    }).join("");
  }

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
