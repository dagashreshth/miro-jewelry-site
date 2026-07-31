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
    /* Client feedback: solid, gapless grid of 5 editorial images.
       Each tile opens its own post when the back office has supplied a
       link; otherwise it falls back to the profile. */
    var posts = Miro.EDITORIAL.instagram.slice(0, 5);
    instaWrap.style.setProperty("--insta-cols", String(Math.max(1, posts.length)));
    instaWrap.innerHTML = posts.map(function (im, i) {
      var href = im.url || MiroLinks.instagram;
      var label = im.url
        ? "Open this Miró post on Instagram"
        : "Open Miró on Instagram — post " + (i + 1);
      return (
        '<a href="' + href + '" target="_blank" rel="noopener" aria-label="' + label + '">' +
          '<img src="' + Miro.img(im.id, 600, "&fit=crop&ar=1:1") + '" alt="Miró on Instagram — editorial jewelry photograph ' + (i + 1) + '" loading="lazy" width="600" height="600">' +
          '<span class="insta__veil">' + MiroIcons.instagram + "</span>" +
        "</a>"
      );
    }).join("");
  }

  /* Keep the "Follow Miró" button on the one handle the chrome uses */
  var followBtn = document.querySelector(".js-follow-ig");
  if (followBtn && window.MiroLinks) followBtn.href = MiroLinks.instagram;

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
