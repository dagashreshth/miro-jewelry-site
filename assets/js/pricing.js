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
      roundingStep: 5000
    },
    pieces: {}
  };

  var SHAPES = ["Round", "Pear", "Emerald", "Oval", "Baguette", "Cushion",
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
        if (typeof data.settings[k] === "number") out.settings[k] = data.settings[k];
      });
    }
    if (data.pieces && typeof data.pieces === "object") out.pieces = data.pieces;
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

  /* ---------- Core calculation ---------- */
  function stoneRow(row) {
    var perStoneCt = num(row && row.perStoneCt);
    var qty = num(row && row.qty);
    var perCaratPrice = num(row && row.perCaratPrice);
    var totalCt = perStoneCt * qty;
    return {
      totalCt: totalCt,
      value: totalCt * perCaratPrice
    };
  }

  function stoneTotals(stones) {
    var list = Array.isArray(stones) ? stones : [];
    return list.reduce(function (acc, row) {
      var r = stoneRow(row);
      acc.count += num(row && row.qty);
      acc.carats += r.totalCt;
      acc.value += r.value;
      return acc;
    }, { count: 0, carats: 0, value: 0 });
  }

  /* piece: { goldGrams, stones[] }
     opts:  { settings, goldRate } — both optional, read from the store. */
  function price(piece, opts) {
    opts = opts || {};
    var store = (opts.settings && opts.goldRate) ? null : read();
    var settings = opts.settings || store.settings;
    var rates = karatRates(opts.goldRate || store.goldRate);

    var stones = stoneTotals(piece && piece.stones);
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
    stoneRow: stoneRow,
    stoneTotals: stoneTotals,
    price: price,
    serialFrom: serialFrom,
    nextSerial: nextSerial
  };
})(window);
