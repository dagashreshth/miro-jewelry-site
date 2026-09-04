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
        '<td data-label="Charni size"><input class="input js-d-charni" type="text" value="' + esc(row.charni) + '" placeholder="+2 - 2.5 or N/A"></td>' +
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
      ? n + " rate" + (n === 1 ? "" : "s") + " on file · round melee is matched by charni size, everything else by exact carat weight — never a neighbouring size."
      : "No rates yet — diamonds on a piece will show as unpriced until a row exists here.";
  }

  function saveDiamonds() {
    var data = P.read();
    data.diamonds = readDiamondsFromDOM();
    if (!P.write(data)) { toast("Couldn't save — browser storage is full."); return; }
    renderDiamonds();
    if (window.MiroAdmin && window.MiroAdmin.refreshProducts) window.MiroAdmin.refreshProducts();
    toast(data.diamonds.length + " diamond rate" + (data.diamonds.length === 1 ? "" : "s") + " saved — pieces repriced.");
    autoPublish();
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
    toast(posts.length + " journal post" + (posts.length === 1 ? "" : "s") + " saved.");
    autoPublish();
  }

  /* ============================================================
     Publish to the live site

     Writes assets/data/catalog.js — and any newly uploaded photograph —
     through the GitHub contents API, using a fine-grained token that lives
     only in this browser. Connecting is a one-time step; after that the
     dashboard publishes on its own whenever something is saved.
     ============================================================ */
  var PHOTO_DIR = "assets/img/products";
  var JOURNAL_DIR = "assets/img/journal";
  var LAST_PUBLISHED_KEY = "miro_published_at";

  function token() {
    try { return localStorage.getItem(TOKEN_KEY) || ""; } catch (e) { return ""; }
  }
  function isConnected() { return !!token(); }

  function lastPublished() {
    try { return localStorage.getItem(LAST_PUBLISHED_KEY) || ""; } catch (e) { return ""; }
  }
  function markPublished() {
    try { localStorage.setItem(LAST_PUBLISHED_KEY, new Date().toISOString()); } catch (e) { /* ignore */ }
    renderPublishState();
  }

  function api(path, opts) {
    opts = opts || {};
    return fetch("https://api.github.com/repos/" + REPO + "/contents/" + path, {
      method: opts.method || "GET",
      headers: {
        Authorization: "Bearer " + token(),
        Accept: "application/vnd.github+json"
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined
    });
  }

  function shaOf(path) {
    return api(path).then(function (r) {
      return r.ok ? r.json().then(function (j) { return j.sha; }) : null;
    }).catch(function () { return null; });
  }

  /* Writes one file, replacing it when it already exists. */
  function putFile(path, base64Content, message) {
    return shaOf(path).then(function (sha) {
      var body = { message: message, content: base64Content };
      if (sha) body.sha = sha;
      return api(path, { method: "PUT", body: body }).then(function (r) {
        if (r.ok) return true;
        return r.json().then(function (j) {
          throw new Error((j && j.message) || ("HTTP " + r.status));
        });
      });
    });
  }

  /* apply() passes the array as arguments, and engines cap how many a call
     may take — a catalogue of any size overruns it and throws "Maximum call
     stack size exceeded". Convert in chunks that stay well under the cap. */
  function utf8ToBase64(text) {
    var bytes = new TextEncoder().encode(text);
    var CHUNK = 0x8000;
    var binary = "";
    for (var i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
    }
    return btoa(binary);
  }

  /* A photograph arrives from the picker as a data URL. Committing those
     inline would push catalog.js into the megabytes and slow every page, so
     each one is written out as a real image file and referenced by path. */
  function isDataUrl(src) { return /^data:/.test(String(src || "")); }

  function photoPath(pieceId, index) {
    var safe = String(pieceId).replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
    return PHOTO_DIR + "/" + safe + "-" + (index + 1) + ".jpg";
  }

  function journalPath(index) {
    return JOURNAL_DIR + "/post-" + (index + 1) + ".jpg";
  }

  /* Every image the payload still carries as a data URL, wherever it sits.
     Journal images upload through the same picker as product photographs
     and have to travel the same route out — miss them and whole photographs
     end up inside catalog.js as text. */
  function imageJobs(payload) {
    var jobs = [];

    Object.keys(payload.pieces).forEach(function (id) {
      var photos = payload.pieces[id].photos || [];
      photos.forEach(function (src, i) {
        if (!isDataUrl(src)) return;
        jobs.push({
          src: src,
          path: photoPath(id, i),
          label: id,
          keep: function (path) { photos[i] = path; }
        });
      });
    });

    (payload.instagram || []).forEach(function (post, i) {
      if (!isDataUrl(post.image)) return;
      jobs.push({
        src: post.image,
        path: journalPath(i),
        label: "journal post " + (i + 1),
        keep: function (path) { post.image = path; }
      });
    });

    return jobs;
  }

  function uploadImages(payload, onProgress) {
    var jobs = imageJobs(payload);
    if (!jobs.length) return Promise.resolve(payload);

    var done = 0;
    return jobs.reduce(function (chain, job) {
      return chain.then(function () {
        var base64 = String(job.src).split(",")[1] || "";
        return putFile(job.path, base64, "Catalogue: photograph for " + job.label).then(function () {
          job.keep(job.path);
          done++;
          if (onProgress) onProgress(done, jobs.length);
        });
      });
    }, Promise.resolve()).then(function () { return payload; });
  }

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

  function catalogFileContents(payload) {
    return (
      "/* ============================================================\n" +
      "   Miró — Published catalogue overrides\n" +
      "   Written by the back office (\"Publish to live site\").\n" +
      "   Generated file — edit through the dashboard, not by hand.\n" +
      "   ============================================================ */\n" +
      "window.MiroCatalog = " + JSON.stringify(payload, null, 2) + ";\n"
    );
  }

  /* The whole publish, start to finish. */
  function publish(onStatus) {
    var say = onStatus || function () {};
    if (!isConnected()) return Promise.reject(new Error("Not connected to GitHub yet."));

    var payload = catalogPayload();
    say("Uploading photographs…");
    return uploadImages(payload, function (n, total) {
      say("Uploading photographs… " + n + " of " + total);
    }).then(function () {
      say("Writing the catalogue…");
      return putFile(CATALOG_PATH, utf8ToBase64(catalogFileContents(payload)),
        "Catalogue: publish changes from the back office");
    }).then(function () {
      markPublished();
      return payload;
    });
  }

  /* ---------- Publish state on the Products page ---------- */
  function renderPublishState() {
    var host = document.querySelector(".js-publish-state");
    if (!host) return;
    var when = lastPublished();
    if (!isConnected()) {
      host.innerHTML = '<span class="pubstate pubstate--off">Not connected — changes stay in this browser</span>';
      return;
    }
    host.innerHTML = when
      ? '<span class="pubstate pubstate--ok">Live site updated ' + esc(new Date(when).toLocaleString("en-IN", {
          day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true
        })) + "</span>"
      : '<span class="pubstate">Connected — nothing published yet</span>';
  }

  /* Publish quietly after a save, so an edit reaches the site without
     anyone having to remember a second button. */
  function autoPublish() {
    if (!isConnected()) return;
    var host = document.querySelector(".js-publish-state");
    if (host) host.innerHTML = '<span class="pubstate">Publishing…</span>';
    publish().then(function () {
      toast("Published — the live site updates in about a minute.");
    }).catch(function (err) {
      renderPublishState();
      toast("Publish failed: " + esc(err.message));
    });
  }

  function openPublish() {
    var payload = catalogPayload();
    var count = Object.keys(payload.pieces).length;
    var photos = imageJobs(payload).length;

    var connected = isConnected();
    /* A classic token, not fine-grained: fine-grained tokens can only be
       scoped to repositories the signed-in account owns, so a collaborator
       on someone else's repository cannot create one. Classic works for
       owner and collaborator alike. */
    var tokenUrl = "https://github.com/settings/tokens/new?description=Miro%20back%20office&scopes=repo";

    var setup =
      '<ol class="setup">' +
        "<li>You need a free GitHub account, and access to <code>" + esc(REPO) + "</code>. " +
          "If you were sent an invitation by email, accept it first.</li>" +
        "<li>Open <a href=\"" + tokenUrl + "\" target=\"_blank\" rel=\"noopener\">this GitHub page</a> " +
          "while signed in to your own account.</li>" +
        "<li><strong>Note:</strong> “Miró back office”. <strong>Expiration:</strong> " +
          "choose <em>No expiration</em>, or a year if you'd rather renew it.</li>" +
        "<li>Tick the box marked <strong>repo</strong> — the first one in the list. " +
          "Nothing else needs ticking.</li>" +
        "<li>Scroll down, click <strong>Generate token</strong>, copy the line it shows you " +
          "(it is only shown once), and paste it below.</li>" +
      "</ol>";

    var body =
      '<div class="pform">' +
        (connected
          ? '<p class="pform__note pform__note--ok">Connected to <code>' + esc(REPO) + "</code>. " +
            "Publishing sends <strong>" + count + " piece" + (count === 1 ? "" : "s") + "</strong>" +
            (photos ? " and <strong>" + photos + " new photograph" + (photos === 1 ? "" : "s") + "</strong>" : "") +
            " and <strong>" + payload.instagram.length + " journal post" +
            (payload.instagram.length === 1 ? "" : "s") + "</strong> to the live site.</p>"
          : '<p class="pform__note">The dashboard needs permission to write to the website once. ' +
            "This takes about a minute and never has to be done again on this computer.</p>" + setup) +

        '<label class="pfield"><span>GitHub token</span>' +
          '<input class="input js-pub-token" type="password" autocomplete="off" value="' + esc(token()) + '" placeholder="github_pat_…">' +
          "<small>Stored only in this browser. It is never added to the website.</small></label>" +

        '<div class="pubcheck"><button type="button" class="gbtn js-pub-test">Check connection</button>' +
          '<span class="js-pub-result"></span></div>' +

        '<p class="pform__note">Prefer not to use a token? <strong>Download file</strong> saves the catalogue ' +
          "so a developer can drop it into <code>" + CATALOG_PATH + "</code>. Photographs are not included that way.</p>" +
      "</div>";

    window.MiroModal({
      title: connected ? "Publish to live site" : "Connect the dashboard to the website",
      body: body,
      saveLabel: connected ? "Publish now" : "Save & publish",
      extraFoot: '<button type="button" class="gbtn js-pub-download">Download file</button>',
      onSave: function (root) {
        var value = root.querySelector(".js-pub-token").value.trim();
        if (!value) { setResult(root, "Paste a token first, or use Download file.", false); return false; }
        try { localStorage.setItem(TOKEN_KEY, value); } catch (e) { /* private mode */ }

        var btn = root.querySelector(".js-pm-save");
        btn.disabled = true;
        publish(function (status) { btn.textContent = status; }).then(function () {
          btn.disabled = false;
          btn.textContent = "Publish now";
          toast("Published — the live site updates in about a minute.");
          window.MiroModalClose();
        }).catch(function (err) {
          btn.disabled = false;
          btn.textContent = "Publish now";
          setResult(root, "Publish failed: " + err.message, false);
        });
        return false;
      }
    });
  }

  function setResult(root, message, ok) {
    var slot = root.querySelector(".js-pub-result");
    if (!slot) return;
    slot.textContent = message;
    slot.className = "js-pub-result " + (ok ? "pub-ok" : "pub-bad");
  }

  function testConnection(root) {
    var value = root.querySelector(".js-pub-token").value.trim();
    if (!value) { setResult(root, "Paste a token first.", false); return; }
    setResult(root, "Checking…", true);
    fetch("https://api.github.com/repos/" + REPO, {
      headers: { Authorization: "Bearer " + value, Accept: "application/vnd.github+json" }
    }).then(function (r) {
      if (!r.ok) {
        setResult(root, r.status === 401
          ? "That token wasn't accepted — check it was copied in full."
          : r.status === 404
            ? "Token works, but it can't see " + REPO + " — re-check the repository it was granted."
            : "GitHub said HTTP " + r.status + ".", false);
        return;
      }
      return r.json().then(function (repo) {
        var perms = repo.permissions || {};
        if (!perms.push) {
          setResult(root, "Token can read the website but not write to it — set Contents to Read and write.", false);
          return;
        }
        try { localStorage.setItem(TOKEN_KEY, value); } catch (e) { /* ignore */ }
        setResult(root, "Connected. You can publish.", true);
        renderPublishState();
      });
    }).catch(function (err) {
      setResult(root, "Couldn't reach GitHub: " + err.message, false);
    });
  }

  /* ---------- Wiring ---------- */
  document.addEventListener("click", function (e) {
    if (e.target.closest(".js-dia-add")) {
      var body = document.querySelector(".js-dia-rows");
      body.insertAdjacentHTML("beforeend", diaRowHTML(blankDiamond(body.children.length + 1), body.children.length));
      /* The button now sits under the table (client feedback 2026-09-04), so
         land the cursor in the new row rather than leaving it to be found. */
      var fresh = body.lastElementChild;
      var firstField = fresh && fresh.querySelector(".js-d-ctw");
      if (firstField) {
        try { firstField.focus({ preventScroll: true }); } catch (err) { firstField.focus(); }
        try { fresh.scrollIntoView({ block: "nearest", behavior: "smooth" }); } catch (err) { /* older browsers */ }
      }
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

    var test = e.target.closest(".js-pub-test");
    if (test) { testConnection(test.closest(".pmodal")); return; }

    if (e.target.closest(".js-pub-download")) {
      download("catalog.js", catalogFileContents(catalogPayload()));
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
    catalogPayload: catalogPayload,
    catalogFileContents: catalogFileContents,
    publish: publish,
    autoPublish: autoPublish,
    isConnected: isConnected,
    renderPublishState: renderPublishState
  };

  renderDiamonds();
  renderJournal();
  renderPublishState();
})();
