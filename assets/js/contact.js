/* ============================================================
   Miró — Contact page: inquiry + appointment form with inline
   validation, localStorage persistence (miro_inquiries),
   success panel, and atelier card wiring.
   Requires store.js + layout.js.
   ============================================================ */
(function () {
  "use strict";

  var STORE_KEY = "miro_inquiries";

  /* ---------- Atelier card: editorial photo + shared icons/links ---------- */
  var photo = document.querySelector(".js-atelier-photo");
  if (photo && window.Miro && Miro.EDITORIAL && Miro.EDITORIAL.contact) {
    photo.src = Miro.img(Miro.EDITORIAL.contact.id, 900, "&fit=crop&ar=4:3");
  }
  var waLink = document.querySelector(".js-wa-link");
  if (waLink && window.MiroLinks) waLink.href = MiroLinks.whatsapp;
  var waIcon = document.querySelector(".js-wa-icon");
  if (waIcon && window.MiroIcons) waIcon.innerHTML = MiroIcons.whatsapp;
  var mapPin = document.querySelector(".js-map-pin");
  if (mapPin && window.MiroIcons) mapPin.innerHTML = MiroIcons.pin;

  /* ---------- Elements ---------- */
  var form = document.querySelector(".js-contact-form");
  if (!form) return;
  var formWrap = document.querySelector(".js-form-wrap");
  var success = document.querySelector(".js-success");
  var appt = document.querySelector(".js-appt");
  var nameIn = document.getElementById("cf-name");
  var emailIn = document.getElementById("cf-email");
  var phoneIn = document.getElementById("cf-phone");
  var topicIn = document.getElementById("cf-topic");
  var dateIn = document.getElementById("cf-date");
  var timeIn = document.getElementById("cf-time");
  var msgIn = document.getElementById("cf-message");

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

  /* ---------- Conditional appointment fields ---------- */
  function apptOn() { return topicIn.value === "appointment"; }
  function syncAppt() {
    if (!appt) return;
    appt.hidden = !apptOn();
    if (!apptOn()) { clearError(dateIn); clearError(timeIn); }
  }
  topicIn.addEventListener("change", function () { clearError(topicIn); syncAppt(); });

  /* Deep links like contact.html?topic=appointment preselect the topic */
  var preTopic = window.Miro && Miro.getParam ? Miro.getParam("topic") : null;
  if (preTopic) {
    for (var oi = 0; oi < topicIn.options.length; oi++) {
      if (topicIn.options[oi].value === preTopic) { topicIn.value = preTopic; break; }
    }
  }
  syncAppt();

  /* ---------- Field checks ---------- */
  var checks = [
    { el: nameIn, ok: function () { return nameIn.value.trim().length >= 2; } },
    { el: emailIn, ok: function () { return EMAIL_RE.test(emailIn.value.trim()); } },
    { el: phoneIn, ok: function () { return /^[6-9]\d{9}$/.test(cleanPhone(phoneIn.value)); } },
    { el: topicIn, ok: function () { return topicIn.value !== ""; } },
    {
      el: dateIn,
      when: apptOn,
      ok: function () { return dateIn.value !== "" && dateIn.value >= todayISO; },
      msg: function () {
        return dateIn.value === ""
          ? "Please choose a preferred date."
          : "Please pick a date from today onwards.";
      }
    },
    { el: timeIn, when: apptOn, ok: function () { return timeIn.value !== ""; } },
    { el: msgIn, ok: function () { return msgIn.value.trim().length > 0; } }
  ];

  function runCheck(c) {
    if (c.when && !c.when()) { clearError(c.el); return true; }
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

    var booking = apptOn();
    var rec = {
      id: "INQ-" + Date.now(),
      name: nameIn.value.trim(),
      email: emailIn.value.trim(),
      phone: cleanPhone(phoneIn.value),
      topic: topicIn.value
    };
    if (booking) {
      rec.date = dateIn.value;
      rec.time = timeIn.value;
    }
    rec.message = msgIn.value.trim();
    rec.ts = new Date().toISOString();
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
      MiroToast(
        booking
          ? "Appointment request received — we'll confirm on WhatsApp. Ref " + rec.id
          : "Received — the atelier replies within 4 working hours. Ref " + rec.id
      );
    }
  });

  /* ---------- "Ask another question" resets the form ---------- */
  var resetBtn = document.querySelector(".js-reset");
  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      form.reset();
      checks.forEach(function (c) { clearError(c.el); });
      syncAppt();
      if (success) success.hidden = true;
      if (formWrap) formWrap.hidden = false;
      nameIn.focus();
    });
  }
})();
