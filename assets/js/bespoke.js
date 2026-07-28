/* ============================================================
   Miró — Bespoke Orders page: commission request form with
   inline validation, localStorage persistence (miro_inquiries,
   shared with the back office) and a success panel.
   Requires store.js + layout.js.
   ============================================================ */
(function () {
  "use strict";

  var STORE_KEY = "miro_inquiries";
  var TOPIC = "Bespoke order";

  var form = document.querySelector(".js-bespoke-form");
  if (!form) return;
  var formWrap = document.querySelector(".js-form-wrap");
  var success = document.querySelector(".js-success");

  var pieceIn = document.getElementById("bf-piece");
  var budgetIn = document.getElementById("bf-budget");
  var dateIn = document.getElementById("bf-date");
  var msgIn = document.getElementById("bf-message");
  var nameIn = document.getElementById("bf-name");
  var emailIn = document.getElementById("bf-email");
  var phoneIn = document.getElementById("bf-phone");

  /* ---------- Date floor: today ---------- */
  function pad2(n) { return n < 10 ? "0" + n : String(n); }
  var now = new Date();
  var todayISO = now.getFullYear() + "-" + pad2(now.getMonth() + 1) + "-" + pad2(now.getDate());
  if (dateIn) dateIn.min = todayISO;

  /* ---------- Inline validation helpers ---------- */
  function fieldOf(input) { return input ? input.closest(".field") : null; }
  function setError(input, msg) {
    var f = fieldOf(input);
    if (!f) return;
    f.classList.add("has-error");
    if (msg) {
      var el = f.querySelector(".error-msg");
      if (el) el.textContent = msg;
    }
    input.setAttribute("aria-invalid", "true");
  }
  function clearError(input) {
    var f = fieldOf(input);
    if (!f) return;
    f.classList.remove("has-error");
    input.removeAttribute("aria-invalid");
  }

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  function cleanPhone(v) {
    var d = String(v || "").replace(/\D/g, "");
    if (d.length === 12 && d.indexOf("91") === 0) d = d.slice(2);
    if (d.length === 11 && d.charAt(0) === "0") d = d.slice(1);
    return d;
  }

  /* Deep links like bespoke.html?piece=Engagement%20ring preselect the piece */
  var prePiece = window.Miro && Miro.getParam ? Miro.getParam("piece") : null;
  if (prePiece) {
    for (var oi = 0; oi < pieceIn.options.length; oi++) {
      if (pieceIn.options[oi].value === prePiece) { pieceIn.value = prePiece; break; }
    }
  }

  /* ---------- Field checks ---------- */
  var checks = [
    { el: pieceIn, ok: function () { return pieceIn.value !== ""; } },
    { el: budgetIn, ok: function () { return budgetIn.value !== ""; } },
    {
      /* "Needed by" is optional — only validated once a date is entered */
      el: dateIn,
      ok: function () { return dateIn.value === "" || dateIn.value >= todayISO; }
    },
    { el: nameIn, ok: function () { return nameIn.value.trim().length >= 2; } },
    { el: emailIn, ok: function () { return EMAIL_RE.test(emailIn.value.trim()); } },
    { el: phoneIn, ok: function () { return /^[6-9]\d{9}$/.test(cleanPhone(phoneIn.value)); } },
    { el: msgIn, ok: function () { return msgIn.value.trim().length > 0; } }
  ];

  function runCheck(c) {
    if (c.ok()) { clearError(c.el); return true; }
    setError(c.el, c.msg ? c.msg() : null);
    return false;
  }

  checks.forEach(function (c) {
    /* Gentle: only flag on blur once something was typed; clear live as it's fixed */
    c.el.addEventListener("blur", function () {
      if (c.el.value !== "") runCheck(c);
    });
    ["input", "change"].forEach(function (evt) {
      c.el.addEventListener(evt, function () {
        var f = fieldOf(c.el);
        if (f && f.classList.contains("has-error")) runCheck(c);
      });
    });
  });

  /* ---------- Persistence ---------- */
  function saveInquiry(rec) {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(arr)) arr = [];
      arr.push(rec);
      localStorage.setItem(STORE_KEY, JSON.stringify(arr));
    } catch (e) { /* storage unavailable — the demo continues gracefully */ }
  }

  /* ---------- Submit ---------- */
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var firstBad = null;
    checks.forEach(function (c) {
      if (!runCheck(c) && !firstBad) firstBad = c.el;
    });
    if (firstBad) { firstBad.focus(); return; }

    /* The back office reads a flat message, so the brief is folded into it */
    var brief = [
      "Piece: " + pieceIn.value,
      "Budget: " + budgetIn.value,
      dateIn.value ? "Needed by: " + dateIn.value : null,
      "",
      msgIn.value.trim()
    ].filter(function (line) { return line !== null; }).join("\n");

    var rec = {
      id: "BSP-" + Date.now(),
      name: nameIn.value.trim(),
      email: emailIn.value.trim(),
      phone: cleanPhone(phoneIn.value),
      topic: TOPIC,
      piece: pieceIn.value,
      budget: budgetIn.value,
      message: brief,
      ts: new Date().toISOString()
    };
    if (dateIn.value) rec.wearDate = dateIn.value;
    saveInquiry(rec);

    var nameSlot = document.querySelector(".js-success-name");
    if (nameSlot) nameSlot.textContent = rec.name.split(" ")[0];
    var refSlot = document.querySelector(".js-success-ref");
    if (refSlot) refSlot.textContent = rec.id;

    if (formWrap) formWrap.hidden = true;
    if (success) {
      success.hidden = false;
      success.focus();
    }
    if (window.MiroToast) {
      MiroToast("Commission received — our designer replies within 4 working hours. Ref " + rec.id);
    }
  });

  /* ---------- "Start another request" resets the form ---------- */
  var resetBtn = document.querySelector(".js-reset");
  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      form.reset();
      checks.forEach(function (c) { clearError(c.el); });
      if (success) success.hidden = true;
      if (formWrap) formWrap.hidden = false;
      pieceIn.focus();
    });
  }
})();
