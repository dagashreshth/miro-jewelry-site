/* ============================================================
   Miró — Home page: featured collections, bestsellers rail,
   Instagram gallery. Requires store.js + layout.js.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Featured collections (3, side by side) ---------- */
  var colWrap = document.querySelector(".js-collections");
  if (colWrap) {
    colWrap.innerHTML = Miro.COLLECTIONS.map(function (c, i) {
      var count = Miro.PRODUCTS.filter(function (p) { return p.collection === c.filter; }).length;
      return (
        '<a class="ccard reveal reveal--d' + (i + 1) + '" href="collections.html?collection=' + c.id + '">' +
          '<img src="' + Miro.img(c.image.id, 900) + '" alt="' + c.name + '" loading="lazy" width="900" height="1200">' +
          '<span class="ccard__veil" aria-hidden="true"></span>' +
          '<span class="ccard__body">' +
            '<span class="ccard__kicker">' + count + " pieces</span>" +
            '<span class="ccard__name">' + c.name + "</span>" +
            '<span class="ccard__tag">' + c.tagline + "</span>" +
            '<span class="ccard__cta">Explore ' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" width="14" height="14" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            "</span>" +
          "</span>" +
        "</a>"
      );
    }).join("");
  }

  /* ---------- Bestsellers rail ---------- */
  var railWrap = document.querySelector(".js-bestsellers");
  if (railWrap) {
    var picks = Miro.PRODUCTS.filter(function (p) { return p.badge === "Bestseller"; });
    Miro.PRODUCTS.forEach(function (p) {
      if (picks.length < 4 && p.badge === "New" && picks.indexOf(p) === -1) picks.push(p);
    });
    railWrap.innerHTML = picks.slice(0, 4).map(function (p) {
      return Miro.productCard(p, { width: 700 });
    }).join("");
  }

  /* ---------- Instagram gallery ---------- */
  var instaWrap = document.querySelector(".js-instagram");
  if (instaWrap) {
    instaWrap.innerHTML = Miro.EDITORIAL.instagram.map(function (im, i) {
      return (
        '<a href="' + MiroLinks.instagram + '" target="_blank" rel="noopener" aria-label="Open Miró on Instagram — post ' + (i + 1) + '">' +
          '<img src="' + Miro.img(im.id, 600, "&fit=crop&ar=1:1") + '" alt="Miró on Instagram — editorial jewellery photograph ' + (i + 1) + '" loading="lazy" width="600" height="600">' +
          '<span class="insta__veil">' + MiroIcons.instagram + "</span>" +
        "</a>"
      );
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
