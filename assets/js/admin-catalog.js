/* ============================================================
   Miró — Back office: Diamond Inventory, Journal, Publish
   Client requests 2026-07-31:
     · a diamond rate card that every piece prices from
     · Instagram links for the homepage journal
     · a way to push dashboard changes to the live storefront
   Requires pricing.js + admin.js. Loaded after admin-pricing.js.
   ============================================================ */
(function () {
  "use strict";

  var P = window.MiroPricing;
  if (!P || !window.Miro) return;

  var TOKEN_KEY = "miro_publish_token";
  var REPO = "dagashreshth/miro-jewelry-site";
  var CATALOG_PATH = "assets/data/catalog.js";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function toast(m) { if (window.MiroToast) window.MiroToast(m); }

  /* ============================================================
     Diamond Inventory
     ============================================================ */
  function blankDiamond(n) {
    return { srNo: n, ctw: "", clarity: "GH/VS", shape: "Round", charni: "", pricePerCtw: "" };
  }

  function diaRowHTML(row, i) {
    var shapes = P.SHAPES.map(function (s) {
      return '<option value="' + esc(s) + '"' + (s === row.shape ? " selected" : "") + ">" + esc(s) + "</option>";
    }).join("");
    return (
      '<tr class="dia-row" data-i="' + i + '">' +
        '<td data-label="Sr. no"><input class="input num js-d-sr" type="number" min="1" step="1" value="' + esc(row.srNo || i + 1) + '"></td>' +
        '<td data-label="Diamond CTW" class="num"><input class="input num js-d-ctw" type="number" min="0" step="0.001" value="' + esc(row.ctw) + '" placeholder="0.25"></td>' +
        '<td data-label="Clarity"><input class="input js-d-clarity" type="text" value="' + esc(row.clarity) + '" placeholder="GH/VS"></td>' +
        '<td data-label="Shape"><select class="select js-d-shape">' + shapes + "</select></td>" +
        '<td data-label="Charni size"><input class="input js-d-charni" type="text" value="' + esc(row.charni) + '" placeholder="+2 or N/A"></td>' +
        '<td data-label="Price per CTW" class="num"><input class="input num js-d-rate" type="number" min="0" step="1" value="' + esc(row.pricePerCtw) + '" placeholder="50000"></td>' +
        '<td class="cell-actions"><button type="button" class="gbtn js-d-remove" aria-label="Remove this rate row">Remove</button></td>' +
      "</tr>"
    );
  }

  function renderDiamonds() {
    var body = document.querySelector(".js-dia-rows");
    if (!body) return;
    var rows = P.read().diamonds;
    if (!rows.length) rows = [blankDiamond(1)];
    body.innerHTML = rows.map(diaRowHTML).join("");
    updateDiaNote();
  }

  function readDiamondsFromDOM() {
    return [].slice.call(document.querySelectorAll(".dia-row")).map(function (tr, i) {
      return {
        srNo: P.num(tr.querySelector(".js-d-sr").value, i + 1),
        ctw: tr.querySelector(".js-d-ctw").value,
        clarity: tr.querySelector(".js-d-clarity").value.trim(),
        shape: tr.querySelector(".js-d-shape").value,
        charni: tr.querySelector(".js-d-charni").value.trim(),
        pricePerCtw: tr.querySelector(".js-d-rate").value
      };
    }).filter(function (r) { return P.num(r.ctw) > 0 || P.num(r.pricePerCtw) > 0; });
  }

  function updateDiaNote() {
    var note = document.querySelector(".js-dia-note");
    if (!note) return;
    var n = P.read().diamonds.length;
    note.textContent = n
      ? n + " rate" + (n === 1 ? "" : "s") + " on file · a piece takes the row matching its shape, clarity and charni, nearest by carat weight."
      : "No rates yet — diamonds on a piece will show as unpriced until a row exists here.";
  }

  function saveDiamonds() {
    var data = P.read();
    data.diamonds = readDiamondsFromDOM();
    if (!P.write(data)) { toast("Couldn't save — browser storage is full."); return; }
    renderDiamonds();
    if (window.MiroAdmin && window.MiroAdmin.refreshProducts) window.MiroAdmin.refreshProducts();
    toast(data.diamonds.length + " diamond rate" + (data.diamonds.length === 1 ? "" : "s") + " saved — pieces repriced.");
  }

  /* ============================================================
     Journal (Instagram)
     ============================================================ */
  var journal = null;   /* [{ url, image }] */

  function readJournal() {
    if (journal) return journal;
    var stored = null;
    try {
      var raw = localStorage.getItem("miro_journal");
      stored = raw ? JSON.parse(raw) : null;
    } catch (e) { stored = null; }
    if (Array.isArray(stored)) { journal = stored; return journal; }

    /* Seed from whatever the storefront is showing today */
    journal = (window.Miro.EDITORIAL.instagram || []).slice(0, 5).map(function (im) {
      return { url: im.url || "", image: im.id || "" };
    });
    return journal;
  }

  function igRowHTML(post, i) {
    var preview = post.image ? window.Miro.img(post.image, 200, "&fit=crop&ar=1:1") : "";
    return (
      '<div class="igrow" data-i="' + i + '">' +
        '<div class="igrow__thumb">' +
          (preview ? '<img src="' + esc(preview) + '" alt="" loading="lazy">' : '<span aria-hidden="true"></span>') +
        "</div>" +
        '<div class="igrow__fields">' +
          '<label class="pfield"><span>Post link</span>' +
            '<input class="input js-ig-url" type="url" value="' + esc(post.url) + '" placeholder="https://www.instagram.com/p/…"></label>' +
          '<label class="pfield"><span>Image</span>' +
            '<input class="input js-ig-img" type="text" value="' + esc(post.image) + '" placeholder="Paste an image link, or upload below">' +
            '<input class="js-ig-file" type="file" accept="image/*"></label>' +
        "</div>" +
        '<div class="igrow__actions">' +
          '<button type="button" class="gbtn js-ig-up" aria-label="Move earlier">↑</button>' +
          '<button type="button" class="gbtn js-ig-down" aria-label="Move later">↓</button>' +
          '<button type="button" class="gbtn js-ig-remove" aria-label="Remove this post">Remove</button>' +
        "</div>" +
      "</div>"
    );
  }

  function renderJournal() {
    var host = document.querySelector(".js-ig-rows");
    if (!host) return;
    var posts = readJournal();
    host.innerHTML = posts.length
      ? posts.map(igRowHTML).join("")
      : '<p class="panel__foot">No posts yet — add up to five.</p>';
  }

  function syncJournalFromDOM() {
    var rows = [].slice.call(document.querySelectorAll(".igrow"));
    journal = rows.map(function (r, i) {
      return {
        url: r.querySelector(".js-ig-url").value.trim(),
        image: r.querySelector(".js-ig-img").value.trim() || readJournal()[i] && readJournal()[i].image || ""
      };
    });
    return journal;
  }

  function saveJournal() {
    var posts = syncJournalFromDOM().filter(function (p) { return p.url || p.image; });
    journal = posts;
    try { localStorage.setItem("miro_journal", JSON.stringify(posts)); }
    catch (e) { toast("Couldn't save — browser storage is full."); return; }
    renderJournal();
    toast(posts.length + " journal post" + (posts.length === 1 ? "" : "s") + " saved. Publish to push them live.");
  }

  /* ============================================================
     Publish to the live site
     Writes assets/data/catalog.js through the GitHub contents API. The
     token is the client's own fine-grained token, kept in her browser and
     never committed — it is not part of the site.
     ============================================================ */
  function catalogPayload() {
    var data = P.read();
    var pieces = {};

    Object.keys(data.pieces).forEach(function (id) {
      var piece = data.pieces[id];
      var calc = P.price(piece, {
        settings: {
          labourRatePerGram: piece.labourRatePerGram === "" || piece.labourRatePerGram == null
            ? data.settings.labourRatePerGram : P.num(piece.labourRatePerGram),
          marginPct: piece.marginPct === "" || piece.marginPct == null
            ? data.settings.marginPct : P.num(piece.marginPct),
          roundingStep: piece.roundingStep === "" || piece.roundingStep == null
            ? data.settings.roundingStep : P.num(piece.roundingStep)
        },
        goldRate: data.goldRate,
        diamonds: data.diamonds
      });
      var entry = {
        serial: piece.serial || "",
        name: piece.name || "",
        category: piece.category || "rings",
        collection: piece.collection || "",
        description: piece.description || ""
      };
      if (calc.listed.k18 > 0) entry.price = calc.listed.k18;
      if (piece.stock !== "" && piece.stock != null) entry.instock = P.num(piece.stock) > 0;
      if (piece.photos && piece.photos.length) entry.photos = piece.photos.slice();
      pieces[id] = entry;
    });

    return {
      updatedAt: new Date().toISOString(),
      pieces: pieces,
      instagram: readJournal().filter(function (p) { return p.url || p.image; })
    };
  }

  function catalogFileContents() {
    return (
      "/* ============================================================\n" +
      "   Miró — Published catalogue overrides\n" +
      "   Written by the back office (\"Publish to live site\").\n" +
      "   Generated file — edit through the dashboard, not by hand.\n" +
      "   ============================================================ */\n" +
      "window.MiroCatalog = " + JSON.stringify(catalogPayload(), null, 2) + ";\n"
    );
  }

  function download(name, text) {
    var blob = new Blob([text], { type: "text/javascript" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }

  function b64(text) {
    /* btoa is latin-1 only; encode UTF-8 first so accents survive */
    return btoa(String.fromCharCode.apply(null, new TextEncoder().encode(text)));
  }

  function publishViaGitHub(token, contents, done) {
    var base = "https://api.github.com/repos/" + REPO + "/contents/" + CATALOG_PATH;
    var headers = {
      Authorization: "Bearer " + token,
      Accept: "application/vnd.github+json"
    };
    fetch(base, { headers: headers })
      .then(function (r) { return r.ok ? r.json() : { sha: undefined }; })
      .then(function (meta) {
        return fetch(base, {
          method: "PUT",
          headers: headers,
          body: JSON.stringify({
            message: "Catalogue: publish product changes from the back office",
            content: b64(contents),
            sha: meta && meta.sha
          })
        });
      })
      .then(function (r) {
        if (r.ok) { done(null); return; }
        return r.json().then(function (j) { done(new Error(j.message || ("HTTP " + r.status))); });
      })
      .catch(function (err) { done(err); });
  }

  function openPublish() {
    var payload = catalogPayload();
    var count = Object.keys(payload.pieces).length;
    var token = "";
    try { token = localStorage.getItem(TOKEN_KEY) || ""; } catch (e) { token = ""; }

    var body =
      '<div class="pform">' +
        "<p class=\"pform__note\">This pushes <strong>" + count + " piece" + (count === 1 ? "" : "s") +
          "</strong> and <strong>" + payload.instagram.length + " journal post" +
          (payload.instagram.length === 1 ? "" : "s") + "</strong> to the live storefront by writing " +
          "<code>" + CATALOG_PATH + "</code>. The site rebuilds in about a minute.</p>" +

        '<label class="pfield"><span>GitHub token</span>' +
          '<input class="input js-pub-token" type="password" autocomplete="off" value="' + esc(token) + '" placeholder="github_pat_…">' +
          "<small>A fine-grained token with <strong>Contents: read and write</strong> on this repository. " +
          "It is stored only in this browser and is never added to the site.</small></label>" +

        '<label class="checkbox-row"><input type="checkbox" class="js-pub-remember"' + (token ? " checked" : "") + ">" +
          "<span>Remember this token in this browser</span></label>" +

        '<p class="pform__note">No token? Use <strong>Download file</strong> and send it over — it drops straight into ' +
          "<code>" + CATALOG_PATH + "</code>.</p>" +
      "</div>";

    window.MiroModal({
      title: "Publish to live site",
      body: body,
      saveLabel: "Publish",
      extraFoot: '<button type="button" class="gbtn js-pub-download">Download file</button>',
      onSave: function (root) {
        var value = root.querySelector(".js-pub-token").value.trim();
        if (!value) { toast("Paste a token, or use Download file."); return false; }
        var remember = root.querySelector(".js-pub-remember").checked;
        try {
          if (remember) localStorage.setItem(TOKEN_KEY, value);
          else localStorage.removeItem(TOKEN_KEY);
        } catch (e) { /* private mode — publishing still works this once */ }

        var btn = root.querySelector(".js-pm-save");
        btn.disabled = true;
        btn.textContent = "Publishing…";
        publishViaGitHub(value, catalogFileContents(), function (err) {
          btn.disabled = false;
          btn.textContent = "Publish";
          if (err) { toast("Publish failed: " + esc(err.message)); return; }
          toast("Published — the live site rebuilds in about a minute.");
          window.MiroModalClose();
        });
        return false;   /* the callback closes it once GitHub answers */
      }
    });
  }

  /* ---------- Wiring ---------- */
  document.addEventListener("click", function (e) {
    if (e.target.closest(".js-dia-add")) {
      var body = document.querySelector(".js-dia-rows");
      body.insertAdjacentHTML("beforeend", diaRowHTML(blankDiamond(body.children.length + 1), body.children.length));
      return;
    }
    var rm = e.target.closest(".js-d-remove");
    if (rm) {
      var tr = rm.closest(".dia-row");
      var tb = tr.parentNode;
      tr.remove();
      if (!tb.children.length) tb.insertAdjacentHTML("beforeend", diaRowHTML(blankDiamond(1), 0));
      return;
    }
    if (e.target.closest(".js-dia-save")) { saveDiamonds(); return; }

    if (e.target.closest(".js-ig-add")) {
      syncJournalFromDOM();
      if (journal.length >= 5) { toast("The journal shows five tiles."); return; }
      journal.push({ url: "", image: "" });
      renderJournal();
      return;
    }
    var igRm = e.target.closest(".js-ig-remove");
    if (igRm) {
      syncJournalFromDOM();
      journal.splice(parseInt(igRm.closest(".igrow").getAttribute("data-i"), 10), 1);
      renderJournal();
      return;
    }
    var up = e.target.closest(".js-ig-up"), down = e.target.closest(".js-ig-down");
    if (up || down) {
      syncJournalFromDOM();
      var i = parseInt((up || down).closest(".igrow").getAttribute("data-i"), 10);
      var j = up ? i - 1 : i + 1;
      if (j >= 0 && j < journal.length) {
        var tmp = journal[i]; journal[i] = journal[j]; journal[j] = tmp;
        renderJournal();
      }
      return;
    }
    if (e.target.closest(".js-ig-save")) { saveJournal(); return; }

    if (e.target.closest(".js-publish")) { openPublish(); return; }
    if (e.target.closest(".js-pub-download")) {
      download("catalog.js", catalogFileContents());
      toast("Downloaded — drop it into " + CATALOG_PATH + " and commit.");
    }
  });

  document.addEventListener("change", function (e) {
    var file = e.target.closest(".js-ig-file");
    if (!file || !file.files || !file.files.length) return;
    var row = file.closest(".igrow");
    var reader = new FileReader();
    reader.onload = function () {
      var image = new Image();
      image.onload = function () {
        var side = Math.min(image.naturalWidth, image.naturalHeight, 900);
        var canvas = document.createElement("canvas");
        canvas.width = side; canvas.height = side;
        var sx = (image.naturalWidth - Math.min(image.naturalWidth, image.naturalHeight)) / 2;
        var sy = (image.naturalHeight - Math.min(image.naturalWidth, image.naturalHeight)) / 2;
        var crop = Math.min(image.naturalWidth, image.naturalHeight);
        canvas.getContext("2d").drawImage(image, sx, sy, crop, crop, 0, 0, side, side);
        row.querySelector(".js-ig-img").value = canvas.toDataURL("image/jpeg", 0.82);
        syncJournalFromDOM();
        renderJournal();
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file.files[0]);
    file.value = "";
  });

  window.MiroAdminCatalog = {
    renderDiamonds: renderDiamonds,
    renderJournal: renderJournal,
    catalogFileContents: catalogFileContents
  };

  renderDiamonds();
  renderJournal();
})();
