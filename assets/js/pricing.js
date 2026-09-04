/* ============================================================
   Miró — Pricing engine
   Implements the client's pricing sheet ("Miro pricing - Example"):

     stone row total ct = per-stone ct x qty
     stone row value    = total ct x per-carat price
     labour             = gold grams x labour rate per gram
     metal              = gold grams x karat rate per gram
     cost               = stones + labour + metal
     retail             = cost x (1 + margin%)
     listed             = retail rounded UP to the rounding step

   Pure functions + a localStorage-backed store. No DOM.
   Loaded by admin.html before admin.js.
   ============================================================ */
(function (global) {
  "use strict";

  var STORE_KEY = "miro_pricing";

  /* Purity ratios against 24K/995 fine gold. The client asked for the 24K
     rate to be converted down; per-karat overrides exist because a supplier
     rate can carry a premium the pure ratio doesn't capture. */
  var KARAT_RATIO = { k14: 14 / 24, k18: 18 / 24 };

  var DEFAULTS = {
    goldRate: {
      /* Rate for 1 gram of 995 / 24K gold, in rupees. */
      rate24k: 0,
      override14k: null,
      override18k: null,
      updatedAt: null,
      /* Rates hold for a 24-hour window so pricing doesn't drift intraday. */
      lockedUntil: null,
      lockHour: 13,
      source: "manual"
    },
    settings: {
      labourRatePerGram: 1300,
      marginPct: 30,
      roundingStep: 5000,
      /* Which figure from the daily feed the "use this rate" button applies.
         The client asked for 995 fine; retail pages quote 24K at 999. */
      feedBasis: "k24_995"
    },
    pieces: {},
    /* Diamond Inventory — the rate card a stone's ₹/carat is read from, so
       the price per carat is maintained in one place instead of per piece.
       Rows: { srNo, ctw, clarity, shape, charni, pricePerCtw } */
    diamonds: []
  };

  /* Client feedback 2026-09-04: Princess joins the list. */
  var SHAPES = ["Round", "Princess", "Pear", "Emerald", "Oval", "Baguette", "Cushion",
                "Heart", "Trillion", "Marquise", "Radiant"];
  var STONE_TYPES = ["Diamond", "Sapphire", "Ruby", "Tanzanite", "Emerald"];

  /* ---------- Store ---------- */
  function clone(v) { return JSON.parse(JSON.stringify(v)); }

  function read() {
    var data;
    try {
      var raw = localStorage.getItem(STORE_KEY);
      data = raw ? JSON.parse(raw) : null;
    } catch (e) { data = null; }
    if (!data || typeof data !== "object") data = {};

    var out = clone(DEFAULTS);
    if (data.goldRate && typeof data.goldRate === "object") {
      Object.keys(out.goldRate).forEach(function (k) {
        if (data.goldRate[k] !== undefined) out.goldRate[k] = data.goldRate[k];
      });
    }
    if (data.settings && typeof data.settings === "object") {
      Object.keys(out.settings).forEach(function (k) {
        /* Keep a stored value only when it is the same type as the default,
           so a malformed store can't swap a rate for a string. */
        if (typeof data.settings[k] === typeof out.settings[k]) out.settings[k] = data.settings[k];
      });
    }
    if (data.pieces && typeof data.pieces === "object") out.pieces = data.pieces;
    if (Array.isArray(data.diamonds)) out.diamonds = data.diamonds;
    return out;
  }

  function write(data) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      /* Quota is the realistic failure here — photos are stored as data URLs. */
      return false;
    }
  }

  /* ---------- Numbers ---------- */
  function num(v, fallback) {
    var n = typeof v === "number" ? v : parseFloat(String(v == null ? "" : v).replace(/[^0-9.\-]/g, ""));
    return isFinite(n) ? n : (fallback || 0);
  }

  function roundUpTo(value, step) {
    if (!(step > 0)) return Math.round(value);
    return Math.ceil(value / step) * step;
  }

  /* ---------- Gold rates ---------- */
  function karatRates(goldRate) {
    var g = goldRate || read().goldRate;
    var base = num(g.rate24k);
    var k14 = g.override14k != null && g.override14k !== "" ? num(g.override14k) : base * KARAT_RATIO.k14;
    var k18 = g.override18k != null && g.override18k !== "" ? num(g.override18k) : base * KARAT_RATIO.k18;
    return { k24: base, k14: k14, k18: k18 };
  }

  /* The next lock boundary: today at lockHour if that is still ahead,
     otherwise tomorrow at lockHour. */
  function nextLockBoundary(from, lockHour) {
    var d = new Date(from.getTime());
    var hour = typeof lockHour === "number" ? lockHour : 13;
    d.setHours(hour, 0, 0, 0);
    if (d.getTime() <= from.getTime()) d.setDate(d.getDate() + 1);
    return d;
  }

  function isLocked(goldRate, now) {
    var g = goldRate || read().goldRate;
    if (!g.lockedUntil) return false;
    var until = new Date(g.lockedUntil);
    if (isNaN(until)) return false;
    return (now || new Date()).getTime() < until.getTime();
  }

  /* ---------- Diamond Inventory lookup ----------
     A diamond's ₹/carat comes from the inventory rather than being typed on
     the piece. Every match starts from shape + clarity; what happens next
     depends on how the stone is sized (client feedback 2026-09-04):

       · Round melee is bought and priced by CHARNI (sieve) size, not carat
         weight. The piece names the charni, and both the per-stone carat
         and the rate are read from that rate-card row — so a card change
         reprices every piece, and nobody types 0.009 ct by hand.
       · Anything else — larger rounds, fancy shapes, rows whose charni is
         N/A — is matched by exact carat weight.

     The size must actually be on the rate card. Price per carat climbs
     steeply with stone size, so borrowing a 0.25 ct rate for a 2 ct stone
     would underprice it by a wide margin. An unlisted size is reported as
     unpriced so it can be added, rather than guessed at. */
  var CT_EPSILON = 0.005;   /* absorbs float noise, not a real size gap */
  function norm(v) { return String(v == null ? "" : v).trim().toLowerCase(); }

  function isBlankCharni(v) {
    var s = norm(v);
    return s === "" || s === "n/a" || s === "na" || s === "-" || s === "—";
  }
  /* "+2 – 2.5", "+2 - 2.5" and "+2-2.5" are the same sieve; compare them
     with dashes and spacing flattened so a stray space can't lose a match. */
  function normCharni(v) {
    if (isBlankCharni(v)) return "";
    return norm(v).replace(/[–—]/g, "-").replace(/\s*-\s*/g, "-").replace(/\s+/g, " ");
  }

  function candidatesFor(row, list) {
    var shape = norm(row && row.shape);
    var clarity = norm(row && row.quality);
    return list.filter(function (d) {
      if (!(num(d.pricePerCtw) > 0)) return false;
      if (shape && norm(d.shape) && norm(d.shape) !== shape) return false;
      if (clarity && norm(d.clarity) && norm(d.clarity) !== clarity) return false;
      return true;
    });
  }

  /* The charni sizes the rate card offers for this shape + clarity, in card
     order, each with its per-stone carat — what the editor lists to pick from. */
  function diamondCharnis(row, diamonds) {
    var list = Array.isArray(diamonds) ? diamonds : read().diamonds;
    var seen = {};
    var out = [];
    candidatesFor(row, list || []).forEach(function (d) {
      var key = normCharni(d.charni);
      if (!key || seen[key]) return;
      seen[key] = true;
      out.push({ charni: String(d.charni).trim(), ctw: num(d.ctw), rate: num(d.pricePerCtw) });
    });
    return out;
  }

  /* Resolve one diamond row against the card. Always returns an object:
       { mode: "charni" | "carat", found, rate, ctw, row, reason, available, wanted }
     reason when not found — "empty": no card at all; "none": nothing of
     this shape/clarity; "charni": that sieve isn't on the card; "size":
     that carat weight isn't on the card; "nosize": neither a charni nor a
     carat weight was given. */
  function diamondRate(row, diamonds) {
    var list = Array.isArray(diamonds) ? diamonds : read().diamonds;
    var charni = normCharni(row && row.charni);
    var want = num(row && row.perStoneCt);
    var out = {
      mode: charni ? "charni" : "carat",
      found: false, exact: false,
      rate: 0, ctw: charni ? 0 : want, row: null
    };

    if (!list || !list.length) { out.reason = "empty"; return out; }
    var candidates = candidatesFor(row, list);
    if (!candidates.length) { out.reason = "none"; return out; }

    if (charni) {
      var hit = null;
      candidates.forEach(function (d) { if (!hit && normCharni(d.charni) === charni) hit = d; });
      if (hit) {
        out.found = out.exact = true;
        out.rate = num(hit.pricePerCtw);
        out.ctw = num(hit.ctw);
        out.row = hit;
      } else {
        out.reason = "charni";
        out.available = diamondCharnis(row, list).map(function (c) { return c.charni; });
      }
      return out;
    }

    if (!(want > 0)) { out.reason = "nosize"; return out; }
    var match = null;
    candidates.forEach(function (d) {
      if (Math.abs(num(d.ctw) - want) <= CT_EPSILON) match = d;
    });
    if (match) {
      out.found = out.exact = true;
      out.rate = num(match.pricePerCtw);
      out.row = match;
      return out;
    }
    /* Right stone, wrong size — say which sizes do exist so the caller can
       ask for the missing one instead of quietly using the closest. */
    out.reason = "size";
    out.missingSize = true;
    out.wanted = want;
    out.available = candidates
      .map(function (d) { return num(d.ctw); })
      .filter(function (c) { return c > 0; })
      .sort(function (a, b) { return a - b; });
    return out;
  }

  /* ---------- Core calculation ---------- */
  /* A diamond row prices from the inventory — and, when sized by charni,
     takes its per-stone carat from there too. Any other stone keeps the
     figures entered on the piece. */
  function stoneRow(row, diamonds) {
    var qty = num(row && row.qty);
    var perStoneCt = num(row && row.perStoneCt);
    var rate = num(row && row.perCaratPrice);
    var mode = "manual";
    if (norm(row && row.type) === "diamond") {
      var hit = diamondRate(row, diamonds);
      mode = hit.mode;
      rate = hit.rate;
      if (hit.mode === "charni") perStoneCt = hit.ctw;
    }
    var totalCt = perStoneCt * qty;
    return {
      mode: mode,
      perStoneCt: perStoneCt,
      totalCt: totalCt,
      rate: rate,
      value: totalCt * rate
    };
  }

  function stoneTotals(stones, diamonds) {
    var list = Array.isArray(stones) ? stones : [];
    return list.reduce(function (acc, row) {
      var r = stoneRow(row, diamonds);
      var qty = num(row && row.qty);
      acc.count += qty;
      acc.carats += r.totalCt;
      acc.value += r.value;
      /* Surfaced so the editor can warn instead of quietly pricing at zero:
         a diamond row with stones on it but no rate, or no size, is unpriced. */
      if (norm(row && row.type) === "diamond" && qty > 0 && !(r.rate > 0 && r.perStoneCt > 0)) acc.unpriced++;
      return acc;
    }, { count: 0, carats: 0, value: 0, unpriced: 0 });
  }

  /* piece: { goldGrams, stones[] }
     opts:  { settings, goldRate } — both optional, read from the store. */
  function price(piece, opts) {
    opts = opts || {};
    var store = (opts.settings && opts.goldRate && opts.diamonds) ? null : read();
    var settings = opts.settings || store.settings;
    var rates = karatRates(opts.goldRate || store.goldRate);
    var diamonds = opts.diamonds || (store ? store.diamonds : read().diamonds);

    var stones = stoneTotals(piece && piece.stones, diamonds);
    var grams = num(piece && piece.goldGrams);

    var labour = grams * num(settings.labourRatePerGram);
    var metal14 = grams * rates.k14;
    var metal18 = grams * rates.k18;

    var cost14 = stones.value + labour + metal14;
    var cost18 = stones.value + labour + metal18;

    var factor = 1 + num(settings.marginPct) / 100;
    var retail14 = cost14 * factor;
    var retail18 = cost18 * factor;
    var step = num(settings.roundingStep);

    return {
      stones: stones,
      grams: grams,
      labour: labour,
      rates: rates,
      metal: { k14: metal14, k18: metal18 },
      cost: { k14: cost14, k18: cost18 },
      retail: { k14: retail14, k18: retail18 },
      listed: { k14: roundUpTo(retail14, step), k18: roundUpTo(retail18, step) }
    };
  }

  /* ---------- Serial numbers ---------- */
  function serialFrom(n) {
    var s = String(n);
    while (s.length < 4) s = "0" + s;
    return "MIR-" + s;
  }

  /* Highest serial already assigned, so the next one never collides.
     `floor` reserves a block for catalogue pieces that have never been
     opened in the editor — they display a serial derived from their
     catalogue position, so a new piece must start above that range. */
  function nextSerial(pieces, floor) {
    var max = num(floor);
    Object.keys(pieces || {}).forEach(function (id) {
      var m = /^MIR-(\d+)$/.exec(String((pieces[id] || {}).serial || ""));
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    return serialFrom(max + 1);
  }

  /* ---------- Public API ---------- */
  global.MiroPricing = {
    STORE_KEY: STORE_KEY,
    SHAPES: SHAPES,
    STONE_TYPES: STONE_TYPES,
    KARAT_RATIO: KARAT_RATIO,
    defaults: function () { return clone(DEFAULTS); },
    read: read,
    write: write,
    num: num,
    roundUpTo: roundUpTo,
    karatRates: karatRates,
    nextLockBoundary: nextLockBoundary,
    isLocked: isLocked,
    diamondRate: diamondRate,
    diamondCharnis: diamondCharnis,
    normCharni: normCharni,
    stoneRow: stoneRow,
    stoneTotals: stoneTotals,
    price: price,
    serialFrom: serialFrom,
    nextSerial: nextSerial
  };
})(window);
