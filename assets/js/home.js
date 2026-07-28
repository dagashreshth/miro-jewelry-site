/* ============================================================
   Miró — Home page: featured collections + Instagram gallery.
   Requires store.js + layout.js.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Featured collections (3, side by side) ---------- */
  var colWrap = document.querySelector(".js-collections");
  if (colWrap) {
    /* Client feedback: collection name sits below the image, nothing overlaid */
    colWrap.innerHTML = Miro.COLLECTIONS.map(function (c, i) {
      return (
        '<a class="ccard reveal reveal--d' + (i + 1) + '" href="collections.html?collection=' + c.id + '">' +
          '<span class="ccard__media">' +
            '<img src="' + Miro.img(c.image.id, 900) + '" alt="' + c.name + '" loading="lazy" width="900" height="1200">' +
          "</span>" +
          '<span class="ccard__name">' + c.name + "</span>" +
        "</a>"
      );
    }).join("");
  }

  /* The "The icons" bestsellers rail was removed at client request (2026-07-28) */

  /* ---------- Instagram gallery ---------- */
  var instaWrap = document.querySelector(".js-instagram");
  if (instaWrap) {
    /* Client feedback: solid, gapless grid of 5 editorial images */
    instaWrap.innerHTML = Miro.EDITORIAL.instagram.slice(0, 5).map(function (im, i) {
      return (
        '<a href="' + MiroLinks.instagram + '" target="_blank" rel="noopener" aria-label="Open Miró on Instagram — post ' + (i + 1) + '">' +
          '<img src="' + Miro.img(im.id, 600, "&fit=crop&ar=1:1") + '" alt="Miró on Instagram — editorial jewelry photograph ' + (i + 1) + '" loading="lazy" width="600" height="600">' +
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
