/* ============================================================
   Miró — back office door

   A curtain, not a lock. Read this before trusting it.

   GitHub Pages serves static files; there is no server of ours to
   check a password against, so the check happens here, in a file
   anyone can open. The hash below is public. Someone who wants in
   can copy it and guess against it offline, unhurried.

   What it does buy: a stranger who stumbles on /admin.html sees a
   password box instead of the dashboard. That is the whole of it.

   So: do not reuse this password anywhere that matters, and replace
   this with a real server-side check before the shop holds anything
   worth stealing. Orders and customer details are that point.

   To set or change the password, open:
     https://mirofinejewelry.com/admin.html#set-password
   ============================================================ */
(function () {
  "use strict";

  /* SHA-256 of SALT + password. Empty means "not configured yet", which
     shows the setup screen instead of the password prompt. */
  var PASSWORD_HASH = "";

  var SALT = "miro-back-office-";
  var STORE_KEY = "miro_gate_until";
  var REMEMBER_DAYS = 30;

  var CSS =
    "html.gate-locked body > *:not(.gate){display:none!important}" +
    ".gate{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;" +
      "justify-content:center;background:#fff;padding:24px;" +
      "font-family:Mulish,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}" +
    ".gate__card{width:100%;max-width:380px;text-align:center}" +
    ".gate__mark{font-family:'Monsieur La Doulaise',cursive;font-size:52px;" +
      "line-height:1;color:#000;margin:0 0 4px}" +
    ".gate__tag{font-size:11px;letter-spacing:.18em;text-transform:uppercase;" +
      "color:#666;margin:0 0 28px}" +
    ".gate__label{display:block;text-align:left;font-size:12px;letter-spacing:.08em;" +
      "text-transform:uppercase;color:#333;margin:0 0 8px}" +
    ".gate__input{width:100%;padding:13px 14px;border:1px solid #dcdcdc;border-radius:2px;" +
      "font-size:15px;font-family:inherit;color:#000;background:#fff;box-sizing:border-box}" +
    ".gate__input:focus{outline:none;border-color:#000}" +
    ".gate__btn{width:100%;margin-top:14px;padding:13px;border:0;border-radius:2px;" +
      "background:#000;color:#fff;font-size:13px;letter-spacing:.1em;" +
      "text-transform:uppercase;font-family:inherit;cursor:pointer}" +
    ".gate__btn:hover{background:#262626}" +
    ".gate__msg{min-height:20px;margin:14px 0 0;font-size:13px;color:#8a1c1c}" +
    ".gate__note{margin:26px 0 0;font-size:12px;line-height:1.6;color:#666}" +
    ".gate__out{margin:16px 0 0;padding:12px;background:#f4f4f4;border-radius:2px;" +
      "font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;" +
      "word-break:break-all;text-align:left;color:#000;user-select:all}";

  function injectCSS() {
    var s = document.createElement("style");
    s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  function sha256(text) {
    if (!window.crypto || !crypto.subtle) {
      return Promise.reject(new Error("This browser can't check the password."));
    }
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))
      .then(function (buf) {
        return Array.prototype.map.call(new Uint8Array(buf), function (b) {
          return ("0" + b.toString(16)).slice(-2);
        }).join("");
      });
  }

  function remembered() {
    try {
      var until = parseInt(localStorage.getItem(STORE_KEY), 10);
      return !!until && Date.now() < until;
    } catch (e) { return false; }
  }

  function remember() {
    try {
      localStorage.setItem(STORE_KEY, String(Date.now() + REMEMBER_DAYS * 864e5));
    } catch (e) { /* private mode — she'll retype next visit */ }
  }

  function open() {
    document.documentElement.classList.remove("gate-locked");
    var el = document.querySelector(".gate");
    if (el) el.parentNode.removeChild(el);
  }

  function shell(inner) {
    var wrap = document.createElement("div");
    wrap.className = "gate";
    wrap.innerHTML =
      '<div class="gate__card">' +
        '<p class="gate__mark">Miró</p>' +
        '<p class="gate__tag">Back office</p>' + inner +
      "</div>";
    document.body.appendChild(wrap);
    return wrap;
  }

  /* ---------- Normal use: ask for the password ---------- */
  function askForPassword() {
    var wrap = shell(
      '<label class="gate__label" for="gate-pw">Password</label>' +
      '<input class="gate__input" id="gate-pw" type="password" autocomplete="current-password" autofocus>' +
      '<button class="gate__btn" type="button">Unlock</button>' +
      '<p class="gate__msg" role="alert"></p>'
    );

    var input = wrap.querySelector(".gate__input");
    var msg = wrap.querySelector(".gate__msg");

    function submit() {
      var value = input.value;
      if (!value) { msg.textContent = "Enter the password."; return; }
      sha256(SALT + value).then(function (hash) {
        if (hash === PASSWORD_HASH) { remember(); open(); return; }
        msg.textContent = "That password isn't right.";
        input.value = "";
        input.focus();
      }).catch(function (err) { msg.textContent = err.message; });
    }

    wrap.querySelector(".gate__btn").addEventListener("click", submit);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); submit(); }
    });
    input.focus();
  }

  /* ---------- Setup: turn a password into the line to paste ---------- */
  function setupScreen() {
    var wrap = shell(
      '<label class="gate__label" for="gate-new">Choose a password</label>' +
      '<input class="gate__input" id="gate-new" type="text" autocomplete="off" autofocus>' +
      '<button class="gate__btn" type="button">Generate</button>' +
      '<p class="gate__msg" role="alert"></p>' +
      '<div class="gate__out" hidden></div>' +
      '<p class="gate__note">Copy the line above into ' +
        "<code>assets/js/admin-gate.js</code>, replacing the empty " +
        "<code>PASSWORD_HASH</code>. The line is safe to send by message — " +
        "it ends up in a public file either way. The password itself is not: " +
        "keep that between you.</p>"
    );

    var input = wrap.querySelector(".gate__input");
    var msg = wrap.querySelector(".gate__msg");
    var out = wrap.querySelector(".gate__out");

    function generate() {
      var value = input.value;
      if (value.length < 8) {
        msg.textContent = "Use at least 8 characters — this hash will be public.";
        return;
      }
      msg.textContent = "";
      sha256(SALT + value).then(function (hash) {
        out.hidden = false;
        out.textContent = 'var PASSWORD_HASH = "' + hash + '";';
      }).catch(function (err) { msg.textContent = err.message; });
    }

    wrap.querySelector(".gate__btn").addEventListener("click", generate);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); generate(); }
    });
    input.focus();
  }

  /* ---------- Boot ---------- */
  document.documentElement.classList.add("gate-locked");

  function start() {
    injectCSS();
    if (location.hash === "#set-password") { setupScreen(); return; }
    if (!PASSWORD_HASH) { setupScreen(); return; }
    if (remembered()) { open(); return; }
    askForPassword();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
