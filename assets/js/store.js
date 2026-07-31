/* ============================================================
   Miró — Fine Jewelry · Data layer
   Catalog, cart (localStorage), money/GST/shipping helpers.
   Exposes a single global: window.Miro
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Image helper (Unsplash CDN, imgix params) ----------
     img(id, w)            -> product-quality crop at width w
     img(id, w, extra)     -> extra imgix params, e.g. detail zoom crops

     A photograph uploaded through the back office arrives as a data URL or
     an ordinary link rather than an Unsplash id — pass those straight
     through so every call site keeps working unchanged. */
  function img(id, w, extra) {
    var value = String(id == null ? "" : id);
    if (/^(data:|blob:|https?:\/\/|\/|\.\/|\.\.\/)/.test(value)) return value;
    return (
      "https://images.unsplash.com/photo-" + value +
      "?w=" + (w || 1000) + "&q=80&auto=format" + (extra || "")
    );
  }
  /* A tight focal-point zoom of the same shot — used as "detail view" */
  var DETAIL = "&fit=crop&crop=focalpoint&fp-x=0.5&fp-y=0.45&fp-z=1.75";
  var DETAIL_LOW = "&fit=crop&crop=focalpoint&fp-x=0.5&fp-y=0.6&fp-z=1.5";

  /* Lifestyle/editorial shot ids reused as third gallery frames */
  var LIFE = {
    hands: "1596944924616-7b38e7cfac36",
    neckWhite: "1611652022419-a9419f74343d",
    neckSoft: "1601821765780-754fa98637c1",
    neckLayers: "1610694955371-d4a3e0ce4b52",
    pendantBlack: "1620656798579-1984d9e87df7",
    dress: "1600721391689-2564bb8055de",
    layering: "1633934542430-0905ccb5f050",
    portrait: "1524504388940-b1c1722653e1",
    moodyChains: "1506630448388-4e683c67ddb0",
    redOnPearls: "1617117811969-97f441511dee",
    flatlay: "1535556116002-6281ff3e9f36"
  };

  /* ---------- Catalog ---------- */
  var PRODUCTS = [
    /* ============ RINGS ============ */
    {
      id: "aurelia-halo",
      name: "Aurelia Halo Ring",
      category: "rings",
      collection: "solitaire",
      price: 86500,
      compareAt: null,
      badge: "Bestseller",
      instock: true,
      stone: { type: "Lab-grown diamond, round brilliant", ctw: "0.82 ctw (centre 0.50 ct, F–G / VS)" },
      metals: [
        { label: "18K White Gold", karat: "18K" },
        { label: "18K Yellow Gold", karat: "18K" },
        { label: "14K Rose Gold", karat: "14K" }
      ],
      metalWeight: "3.6 g approx.",
      sizes: [6, 8, 10, 12, 14, 16, 18],
      description:
        "A round brilliant held inside a halo of micro-pavé, set low enough to live with you every day. The Aurelia is our signature engagement silhouette — architectural from the side, pure light from above.",
      details: [
        "Centre stone: 0.50 ct lab-grown diamond, F–G colour, VS clarity",
        "Halo and shoulders: 32 micro-pavé diamonds, 0.32 ctw",
        "BIS-hallmarked 18K gold · IGI certificate included",
        "Made to order in 14–18 days"
      ],
      images: [
        { id: "1605100804763-247f67b3557e" },
        { id: "1605100804763-247f67b3557e", p: DETAIL },
        { id: LIFE.hands }
      ]
    },
    {
      id: "rosette-sapphire",
      name: "Rosette Pink Sapphire Ring",
      category: "rings",
      collection: "solitaire",
      price: 64900,
      compareAt: null,
      badge: "New",
      instock: true,
      stone: { type: "Pink sapphire, cushion cut", ctw: "1.20 ct centre + 0.28 ctw diamond halo" },
      metals: [{ label: "14K Rose Gold", karat: "14K" }],
      metalWeight: "3.1 g approx.",
      sizes: [6, 8, 10, 12, 14, 16, 18],
      description:
        "A blush cushion-cut sapphire wrapped in a fine diamond frame. Rosette is for the ones who want colour with their ceremony — soft, romantic, and entirely unignorable.",
      details: [
        "Centre stone: 1.20 ct natural pink sapphire, heat-only",
        "Halo: 24 round diamonds, 0.28 ctw, G / VS",
        "BIS-hallmarked 14K rose gold",
        "Made to order in 14–18 days"
      ],
      images: [
        { id: "1603561591411-07134e71a2a9" },
        { id: "1603561591411-07134e71a2a9", p: DETAIL },
        { id: LIFE.hands }
      ]
    },
    {
      id: "celeste-pave",
      name: "Céleste Cushion Pavé Ring",
      category: "rings",
      collection: "solitaire",
      price: 72400,
      compareAt: null,
      badge: null,
      instock: true,
      stone: { type: "Diamond, baguette + round pavé", ctw: "0.96 ctw" },
      metals: [{ label: "18K White Gold", karat: "18K" }, { label: "18K Yellow Gold", karat: "18K" }],
      metalWeight: "4.2 g approx.",
      sizes: [6, 8, 10, 12, 14, 16, 18],
      description:
        "A cushion mosaic of baguettes and rounds that reads as one impossible stone. Céleste is an illusion setting in the old Bombay tradition, cut for modern light.",
      details: [
        "Illusion-set cluster: baguette and round diamonds, 0.96 ctw",
        "G–H colour, VS–SI clarity",
        "BIS-hallmarked 18K gold",
        "Ships in 5–7 days or made to size in 14"
      ],
      images: [
        { id: "1586104195538-050b9f74f58e" },
        { id: "1586104195538-050b9f74f58e", p: DETAIL },
        { id: LIFE.hands }
      ]
    },
    {
      id: "entwine-band",
      name: "Entwine Crossover Band",
      category: "rings",
      collection: "everyday",
      price: 48200,
      compareAt: null,
      badge: null,
      instock: true,
      stone: { type: "Diamond, round pavé", ctw: "0.42 ctw" },
      metals: [{ label: "14K White Gold", karat: "14K" }, { label: "14K Yellow Gold", karat: "14K" }],
      metalWeight: "2.9 g approx.",
      sizes: [6, 8, 10, 12, 14, 16, 18],
      description:
        "Two pavé ribbons crossing once and carrying on — our quiet nod to lives that intertwine. Sits flush against other bands, stacks beautifully with the Amoretto set.",
      details: [
        "68 micro-pavé diamonds, 0.42 ctw, G / VS",
        "Comfort-fit interior",
        "BIS-hallmarked 14K gold",
        "Ships in 5–7 days"
      ],
      images: [
        { id: "1589674781759-c21c37956a44" },
        { id: "1589674781759-c21c37956a44", p: DETAIL },
        { id: LIFE.hands }
      ]
    },
    {
      id: "soleil-cluster",
      name: "Soleil Morganite Cluster Ring",
      category: "rings",
      collection: "heirloom",
      price: 56700,
      compareAt: null,
      badge: null,
      instock: true,
      stone: { type: "Morganite, mixed oval cluster", ctw: "2.40 ctw" },
      metals: [{ label: "14K Yellow Gold", karat: "14K" }],
      metalWeight: "4.8 g approx.",
      sizes: [8, 10, 12, 14, 16, 18],
      description:
        "Champagne-pink morganites gathered like a bouquet in warm gold filigree. Soleil is cut in the spirit of the cocktail rings our grandmothers never took off.",
      details: [
        "Nine natural morganites, 2.40 ctw total",
        "Hand-finished filigree gallery",
        "BIS-hallmarked 14K yellow gold",
        "Ships in 5–7 days"
      ],
      images: [
        { id: "1611955167811-4711904bb9f8" },
        { id: "1611955167811-4711904bb9f8", p: DETAIL },
        { id: LIFE.redOnPearls }
      ]
    },
    {
      id: "trio-heritage-stack",
      name: "Trio Heritage Stack",
      category: "rings",
      collection: "heirloom",
      price: 94500,
      compareAt: null,
      badge: "Bestseller",
      instock: true,
      stone: { type: "Diamond, round + heart cluster", ctw: "1.10 ctw across three bands" },
      metals: [{ label: "18K Yellow Gold", karat: "18K" }],
      metalWeight: "9.4 g approx. (set of three)",
      sizes: [6, 8, 10, 12, 14, 16, 18],
      description:
        "Three woven-texture bands — one crowned round, one heart, one plain — designed to be worn together today and divided among daughters someday. Sold as a set.",
      details: [
        "Set of three stackable bands",
        "Diamond crowns: 1.10 ctw total, G / VS",
        "Signature woven-gold texture",
        "BIS-hallmarked 18K yellow gold · made to order in 14–18 days"
      ],
      images: [
        { id: "1543294001-f7cd5d7fb516" },
        { id: "1543294001-f7cd5d7fb516", p: DETAIL },
        { id: LIFE.hands }
      ]
    },
    {
      id: "amoretto-stacking",
      name: "Amoretto Stacking Rings",
      category: "rings",
      collection: "everyday",
      price: 38900,
      compareAt: null,
      badge: "New",
      instock: true,
      stone: { type: "Diamond accents", ctw: "0.18 ctw across the set" },
      metals: [{ label: "14K Rose Gold", karat: "14K" }],
      metalWeight: "3.2 g approx. (set of three)",
      sizes: [6, 8, 10, 12, 14, 16],
      description:
        "A heart, a star and a marquise — three slim signals meant for mixing, stacking and gifting. The set that starts most people's Miró drawer.",
      details: [
        "Set of three fine stacking rings",
        "Diamond accents, 0.18 ctw, G / VS",
        "BIS-hallmarked 14K rose gold",
        "Ships in 3–5 days · signature gift box"
      ],
      images: [
        { id: "1631982690223-8aa4be0a2497" },
        { id: "1631982690223-8aa4be0a2497", p: DETAIL_LOW },
        { id: LIFE.layering }
      ]
    },
    {
      id: "grenat-vintage",
      name: "Grenat Vintage Ring",
      category: "rings",
      collection: "heirloom",
      price: 44300,
      compareAt: 49900,
      badge: null,
      instock: true,
      stone: { type: "Garnet, oval cut", ctw: "1.60 ct" },
      metals: [{ label: "14K Yellow Gold", karat: "14K" }],
      metalWeight: "3.8 g approx.",
      sizes: [8, 10, 12, 14, 16],
      description:
        "A pomegranate-red garnet in a crown setting, drawn from a 1920s pattern in our archive. Grenat wears like something inherited — which is rather the point.",
      details: [
        "Natural garnet, 1.60 ct, deep raspberry hue",
        "Archive crown setting with milgrain edge",
        "BIS-hallmarked 14K yellow gold",
        "Ships in 5–7 days"
      ],
      images: [
        { id: "1617117811969-97f441511dee" },
        { id: "1617117811969-97f441511dee", p: DETAIL },
        { id: LIFE.moodyChains }
      ]
    },
    {
      id: "bonbon-gem",
      name: "Bonbon Gemstone Ring",
      category: "rings",
      collection: "everyday",
      price: 36800,
      compareAt: null,
      badge: null,
      instock: true,
      stone: { type: "Amazonite & carnelian cabochons", ctw: "3.10 ctw" },
      metals: [{ label: "14K Yellow Gold", karat: "14K" }],
      metalWeight: "4.1 g approx.",
      sizes: [8, 10, 12, 14, 16],
      description:
        "Candy-smooth cabochons in mint and burnt caramel, bezel-set in high-polish gold. Bonbon is the artistic one — colour worn purely for the joy of it.",
      details: [
        "Amazonite and carnelian cabochons, 3.10 ctw",
        "Full bezel settings, high-polish finish",
        "BIS-hallmarked 14K yellow gold",
        "Ships in 3–5 days"
      ],
      images: [
        { id: "1608042314453-ae338d80c427" },
        { id: "1608042314453-ae338d80c427", p: DETAIL_LOW },
        { id: LIFE.layering }
      ]
    },

    /* ============ EARRINGS ============ */
    {
      id: "croissant-hoops",
      name: "Croissant Twist Hoops",
      category: "earrings",
      collection: "everyday",
      price: 28500,
      compareAt: null,
      badge: "Bestseller",
      instock: true,
      stone: { type: "No stones — sculpted gold", ctw: "—" },
      metals: [{ label: "14K Yellow Gold", karat: "14K" }],
      metalWeight: "4.6 g approx. (pair)",
      sizes: null,
      description:
        "Our most-worn earring: a twisted dome hoop with the weight of something serious and the comfort of something you forget you're wearing. Hinged closure, everyday scale.",
      details: [
        "14 mm dome hoops with croissant twist",
        "Hinged snap closure",
        "BIS-hallmarked 14K yellow gold",
        "Ships in 3–5 days"
      ],
      images: [
        { id: "1617038220319-276d3cfab638" },
        { id: "1617038220319-276d3cfab638", p: DETAIL },
        { id: LIFE.portrait }
      ]
    },
    {
      id: "eclat-studs",
      name: "Éclat Diamond Studs",
      category: "earrings",
      collection: "solitaire",
      price: 52300,
      compareAt: null,
      badge: null,
      instock: true,
      stone: { type: "Lab-grown diamond, round brilliant", ctw: "0.64 ctw (0.25 ct each + halo)" },
      metals: [{ label: "18K White Gold", karat: "18K" }, { label: "18K Yellow Gold", karat: "18K" }],
      metalWeight: "2.2 g approx. (pair)",
      sizes: null,
      description:
        "Round brilliants inside whisper-fine halos — the studs that answer every occasion. Secured with screw backs, sized to catch light without asking for it.",
      details: [
        "Centre stones: 0.25 ct each, F–G / VS lab-grown",
        "Micro-pavé halos, 0.14 ctw total",
        "Screw-back posts · BIS-hallmarked 18K gold",
        "Ships in 5–7 days"
      ],
      images: [
        { id: "1588444650733-d0767b753fc8" },
        { id: "1588444650733-d0767b753fc8", p: DETAIL },
        { id: LIFE.pendantBlack }
      ]
    },
    {
      id: "cascade-drops",
      name: "Cascade Link Drops",
      category: "earrings",
      collection: "everyday",
      price: 31200,
      compareAt: null,
      badge: null,
      instock: true,
      stone: { type: "No stones — sculpted gold", ctw: "—" },
      metals: [{ label: "14K Yellow Gold", karat: "14K" }],
      metalWeight: "3.4 g approx. (pair)",
      sizes: null,
      description:
        "Three hand-forged ovals falling in diminishing rhythm. Cascade moves when you do — an editorial line for evenings and airports alike.",
      details: [
        "Graduated hand-forged links, 42 mm drop",
        "French hook fittings",
        "BIS-hallmarked 14K yellow gold",
        "Ships in 3–5 days"
      ],
      images: [
        { id: "1535556116002-6281ff3e9f36" },
        { id: "1535556116002-6281ff3e9f36", p: DETAIL_LOW },
        { id: LIFE.portrait }
      ]
    },
    {
      id: "azure-heart-drops",
      name: "Azure Heart Drops",
      category: "earrings",
      collection: "everyday",
      price: 24800,
      compareAt: 27900,
      badge: "New",
      instock: true,
      stone: { type: "Swiss blue topaz, heart cut", ctw: "2.20 ctw" },
      metals: [{ label: "14K Yellow Gold", karat: "14K" }],
      metalWeight: "2.6 g approx. (pair)",
      sizes: null,
      description:
        "Two hearts of Swiss-blue topaz swinging from fine gold hooks. A little cool, a little sentimental — exactly the balance we like.",
      details: [
        "Heart-cut Swiss blue topaz, 1.10 ct each",
        "French hook fittings",
        "BIS-hallmarked 14K yellow gold",
        "Ships in 3–5 days"
      ],
      images: [
        { id: "1630019852942-f89202989a59" },
        { id: "1630019852942-f89202989a59", p: DETAIL },
        { id: LIFE.flatlay }
      ]
    },
    {
      id: "minuit-chandeliers",
      name: "Minuit Sapphire Chandeliers",
      category: "earrings",
      collection: "heirloom",
      price: 118000,
      compareAt: null,
      badge: null,
      instock: true,
      stone: { type: "Blue sapphire + diamond", ctw: "3.20 ctw sapphire · 1.40 ctw diamond" },
      metals: [{ label: "18K White Gold", karat: "18K" }],
      metalWeight: "8.8 g approx. (pair)",
      sizes: null,
      description:
        "Midnight-blue sapphires framed by baguettes and marquise diamonds — chandeliers built for weddings, galas and the family vault after. Each pair is assembled by a single master setter.",
      details: [
        "Pear-cut blue sapphires, 1.60 ct each",
        "Baguette and marquise diamond frames, 1.40 ctw",
        "Omega-clip backs for weight balance",
        "BIS-hallmarked 18K white gold · made to order in 21 days"
      ],
      images: [
        { id: "1535632066927-ab7c9ab60908" },
        { id: "1535632066927-ab7c9ab60908", p: DETAIL },
        { id: LIFE.portrait }
      ]
    },

    /* ============ NECKLACES ============ */
    {
      id: "talisman-layering",
      name: "Talisman Layering Set",
      category: "necklaces",
      collection: "everyday",
      price: 42600,
      compareAt: null,
      badge: null,
      instock: true,
      stone: { type: "London blue topaz talisman", ctw: "1.80 ct" },
      metals: [{ label: "14K Yellow Gold", karat: "14K" }],
      metalWeight: "6.2 g approx. (both chains)",
      sizes: null,
      description:
        "A cable chain with a deep-blue talisman and a longer disc pendant, sold as a pair and pre-styled to layer. The set that photographs like a habit, not an outfit.",
      details: [
        "Two chains: 41 cm choker + 56 cm pendant",
        "London blue topaz, 1.80 ct, bezel-set",
        "Engravable 12 mm disc pendant",
        "BIS-hallmarked 14K yellow gold · ships in 3–5 days"
      ],
      images: [
        { id: "1599643478518-a784e5dc4c8f" },
        { id: "1599643478518-a784e5dc4c8f", p: DETAIL },
        { id: LIFE.neckWhite }
      ]
    },
    {
      id: "sovereign-coin",
      name: "Sovereign Coin Necklace",
      category: "necklaces",
      collection: "everyday",
      price: 39400,
      compareAt: null,
      badge: "Bestseller",
      instock: true,
      stone: { type: "No stones — engraved coin", ctw: "—" },
      metals: [{ label: "14K Yellow Gold", karat: "14K" }],
      metalWeight: "7.1 g approx.",
      sizes: null,
      description:
        "A hand-engraved sunburst coin on a satellite chain, made to sit exactly at the collarbone. Wear it alone or under everything else you own.",
      details: [
        "16 mm hand-engraved coin pendant",
        "46 cm satellite chain with 3 cm extender",
        "BIS-hallmarked 14K yellow gold",
        "Ships in 3–5 days"
      ],
      images: [
        { id: "1635767798638-3e25273a8236" },
        { id: "1635767798638-3e25273a8236", p: DETAIL },
        { id: LIFE.neckSoft }
      ]
    },
    {
      id: "lumiere-pendant",
      name: "Lumière Diamond Pendant",
      category: "necklaces",
      collection: "solitaire",
      price: 68900,
      compareAt: null,
      badge: null,
      instock: true,
      stone: { type: "Lab-grown diamond, round brilliant", ctw: "0.52 ct + 0.18 ctw halo" },
      metals: [{ label: "18K White Gold", karat: "18K" }, { label: "18K Yellow Gold", karat: "18K" }],
      metalWeight: "3.4 g approx.",
      sizes: null,
      description:
        "A half-carat solitaire in a cushion halo, hung from a box chain fine enough to disappear. Lumière is the first serious diamond most of our clients buy themselves.",
      details: [
        "Centre stone: 0.52 ct lab-grown, F / VS1, IGI certified",
        "Cushion halo, 0.18 ctw",
        "45 cm box chain, lobster clasp",
        "BIS-hallmarked 18K gold · ships in 5–7 days"
      ],
      images: [
        { id: "1598560917505-59a3ad559071" },
        { id: "1598560917505-59a3ad559071", p: DETAIL },
        { id: LIFE.neckWhite }
      ]
    },
    {
      id: "mer-pearl-strand",
      name: "Mer Akoya Pearl Strand",
      category: "necklaces",
      collection: "heirloom",
      price: 57800,
      compareAt: null,
      badge: null,
      instock: true,
      stone: { type: "Akoya cultured pearls", ctw: "6.5–7 mm, 52 pearls" },
      metals: [{ label: "18K White Gold clasp", karat: "18K" }],
      metalWeight: "1.8 g approx. (clasp)",
      sizes: null,
      description:
        "Fifty-two hand-knotted Akoya pearls with mirror lustre, closed by a diamond-set clasp. The strand every wardrobe eventually asks for — ours simply answers early.",
      details: [
        "Akoya cultured pearls, 6.5–7 mm, AAA lustre",
        "Hand-knotted on silk, 45 cm",
        "Diamond-set 18K clasp, 0.06 ctw",
        "Ships in 5–7 days · presented in the Miró pearl folio"
      ],
      images: [
        { id: "1515562141207-7a88fb7ce338" },
        { id: "1515562141207-7a88fb7ce338", p: DETAIL },
        { id: LIFE.dress }
      ]
    },
    {
      id: "empress-collar",
      name: "Empress Diamond Collar",
      category: "necklaces",
      collection: "heirloom",
      price: 245000,
      compareAt: null,
      badge: null,
      instock: true,
      stone: { type: "Diamond, mixed cuts", ctw: "6.80 ctw" },
      metals: [{ label: "18K White Gold", karat: "18K" }],
      metalWeight: "24.6 g approx.",
      sizes: null,
      description:
        "Scrolled garlands of mixed-cut diamonds with a detachable pear drop — a bridal collar composed like couture. The Empress is made against order only, with a fitting included.",
      details: [
        "312 diamonds, 6.80 ctw, F–G / VS",
        "Detachable pear-drop centre",
        "Articulated garland links for drape",
        "BIS-hallmarked 18K white gold · made to order in 28 days · fitting included"
      ],
      images: [
        { id: "1618403088890-3d9ff6f4c8b1" },
        { id: "1618403088890-3d9ff6f4c8b1", p: DETAIL },
        { id: LIFE.portrait }
      ]
    },
    {
      id: "rajkumari-temple",
      name: "Rajkumari Temple Necklace",
      category: "necklaces",
      collection: "heirloom",
      price: 186000,
      compareAt: null,
      badge: null,
      instock: true,
      stone: { type: "Ruby cabochons + polki", ctw: "8.40 ctw" },
      metals: [{ label: "22K Yellow Gold", karat: "22K" }],
      metalWeight: "38.2 g approx.",
      sizes: null,
      description:
        "Hand-chased temple goldwork strung with ruby cabochons, after a South Indian pattern from our founder's family. Rajkumari is worn at weddings and kept for centuries.",
      details: [
        "Hand-chased temple motifs in 22K gold",
        "Ruby cabochons and polki, 8.40 ctw",
        "Adjustable silk dori closure",
        "BIS-hallmarked 22K gold · made to order in 28 days"
      ],
      images: [
        { id: "1601121141461-9d6647bca1ed" },
        { id: "1601121141461-9d6647bca1ed", p: DETAIL },
        { id: LIFE.moodyChains }
      ]
    },

    /* ============ BRACELETS ============ */
    {
      id: "blossom-pave",
      name: "Blossom Pavé Bracelet",
      category: "bracelets",
      collection: "heirloom",
      price: 96500,
      compareAt: null,
      badge: "Bestseller",
      instock: true,
      stone: { type: "Diamond, round pavé petals", ctw: "1.40 ctw" },
      metals: [
        { label: "14K Yellow Gold", karat: "14K" },
        { label: "14K Rose Gold", karat: "14K" },
        { label: "14K White Gold", karat: "14K" }
      ],
      metalWeight: "16.8 g approx.",
      sizes: null,
      description:
        "Petal links articulated to move like water, alternating brushed gold with pavé blooms. Our namesake bracelet — artistic, substantial, and the most requested piece in the atelier.",
      details: [
        "Articulated petal links, brushed + polished finish",
        "Pavé blooms: 1.40 ctw, G / VS",
        "Concealed box clasp with double safety",
        "BIS-hallmarked 14K gold · sizes 15–17 cm on request"
      ],
      images: [
        { id: "1611591437281-460bfbe1220a" },
        { id: "1611591437281-460bfbe1220a", p: DETAIL },
        { id: LIFE.hands }
      ]
    },
    {
      id: "maglia-chain",
      name: "Maglia Chain Bracelet",
      category: "bracelets",
      collection: "everyday",
      price: 34700,
      compareAt: null,
      badge: null,
      instock: true,
      stone: { type: "No stones — sculpted gold", ctw: "—" },
      metals: [{ label: "14K Yellow Gold", karat: "14K" }],
      metalWeight: "8.9 g approx.",
      sizes: null,
      description:
        "A bold curb chain with softened edges and a satisfying weight — the bracelet you stop noticing and never take off. Reads vintage in daylight, modern at night.",
      details: [
        "Curb links, 7 mm, softened profile",
        "18 cm with lobster clasp",
        "BIS-hallmarked 14K yellow gold",
        "Ships in 3–5 days"
      ],
      images: [
        { id: "1602173574767-37ac01994b2a" },
        { id: "1602173574767-37ac01994b2a", p: DETAIL },
        { id: LIFE.hands }
      ]
    },
    {
      id: "constellation-link",
      name: "Constellation Link Bracelet",
      category: "bracelets",
      collection: "heirloom",
      price: 132000,
      compareAt: null,
      badge: null,
      instock: true,
      stone: { type: "Diamond, round brilliant links", ctw: "2.60 ctw" },
      metals: [{ label: "18K White Gold", karat: "18K" }],
      metalWeight: "14.2 g approx.",
      sizes: null,
      description:
        "Alternating pavé ovals and diamond stations — a line bracelet with the presence of a constellation and the flexibility of silk. Built to be the one photographed at every family table.",
      details: [
        "Alternating pavé ovals and bezel stations",
        "2.60 ctw, F–G / VS diamonds",
        "Concealed clasp with safety eight",
        "BIS-hallmarked 18K white gold · made to order in 21 days"
      ],
      images: [
        { id: "1573408301185-9146fe634ad0" },
        { id: "1573408301185-9146fe634ad0", p: DETAIL },
        { id: LIFE.hands }
      ]
    }
  ];

  /* ---------- Featured collections (homepage trio + collection pages) ---------- */
  var COLLECTIONS = [
    {
      id: "solitaire",
      name: "The Solitaire Edit",
      tagline: "Certified diamonds, engagement silhouettes and first serious stones.",
      image: { id: "1605100804763-247f67b3557e" },
      filter: "solitaire"
    },
    {
      id: "everyday",
      name: "Everyday Gold",
      tagline: "Light pieces for heavy rotation — hoops, chains and stacking rings.",
      image: { id: "1602173574767-37ac01994b2a" },
      filter: "everyday"
    },
    {
      id: "heirloom",
      name: "The Heirloom Room",
      tagline: "Statement and ceremonial pieces made to outlive every trend.",
      image: { id: "1618403088890-3d9ff6f4c8b1" },
      filter: "heirloom"
    }
  ];

  /* Editorial imagery used across pages */
  var EDITORIAL = {
    hero: { id: LIFE.neckWhite },
    heroAlt: { id: LIFE.pendantBlack },
    about: { id: LIFE.layering },
    contact: { id: LIFE.portrait },
    instagram: [
      { id: "1531995811006-35cb42e1a022" },
      { id: LIFE.neckSoft },
      { id: LIFE.pendantBlack },
      { id: LIFE.redOnPearls },
      { id: LIFE.hands },
      { id: LIFE.neckLayers }
    ]
  };

  /* ============================================================
     Published overrides (assets/data/catalog.js)

     The back office writes window.MiroCatalog and publishes it to the repo,
     which is how an edit made in the dashboard reaches the live storefront.
     It is layered over the static catalogue rather than replacing it, so a
     partial or missing file simply leaves the built-in data in place.
     ============================================================ */
  var CATALOG = window.MiroCatalog && typeof window.MiroCatalog === "object" ? window.MiroCatalog : null;

  function applyCatalog() {
    if (!CATALOG) return;

    var pieces = CATALOG.pieces && typeof CATALOG.pieces === "object" ? CATALOG.pieces : {};
    Object.keys(pieces).forEach(function (id) {
      var patch = pieces[id] || {};
      var existing = null;
      for (var i = 0; i < PRODUCTS.length; i++) {
        if (PRODUCTS[i].id === id) { existing = PRODUCTS[i]; break; }
      }

      var photos = Array.isArray(patch.photos) ? patch.photos.filter(Boolean) : null;
      var images = photos && photos.length ? photos.map(function (src) { return { id: src }; }) : null;

      if (existing) {
        if (patch.name) existing.name = patch.name;
        if (patch.category) existing.category = patch.category;
        if (patch.collection !== undefined) existing.collection = patch.collection;
        if (patch.description) existing.description = patch.description;
        if (typeof patch.price === "number" && patch.price > 0) existing.price = patch.price;
        if (typeof patch.instock === "boolean") existing.instock = patch.instock;
        if (images) existing.images = images;
        if (patch.serial) existing.serial = patch.serial;
        return;
      }

      /* A piece created in the back office — only publish it once it has
         enough to render a listing card without breaking the storefront. */
      if (!patch.name || !images) return;
      PRODUCTS.push({
        id: id,
        name: patch.name,
        category: patch.category || "rings",
        collection: patch.collection || "",
        price: typeof patch.price === "number" ? patch.price : 0,
        compareAt: null,
        badge: null,
        instock: patch.instock !== false,
        serial: patch.serial || "",
        stone: { type: patch.stoneType || "", ctw: patch.stoneCtw || "" },
        metals: [],
        metalWeight: "",
        sizes: [],
        description: patch.description || "",
        details: [],
        images: images
      });
    });

    if (Array.isArray(CATALOG.instagram) && CATALOG.instagram.length) {
      EDITORIAL.instagram = CATALOG.instagram
        .filter(function (post) { return post && (post.image || post.id); })
        .map(function (post) {
          return { id: post.image || post.id, url: post.url || "" };
        });
    }
  }
  applyCatalog();

  /* ---------- Money ---------- */
  function fmt(n) {
    n = Math.round(n);
    var s = String(Math.abs(n));
    var last3 = s.slice(-3);
    var rest = s.slice(0, -3);
    var grouped = rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3 : last3;
    return (n < 0 ? "−₹" : "₹") + grouped;
  }

  /* GST on jewelry: 3% (1.5% CGST + 1.5% SGST), prices tax-inclusive */
  function gst(totalInclusive) {
    var taxable = totalInclusive / 1.03;
    var tax = totalInclusive - taxable;
    return {
      taxable: Math.round(taxable),
      cgst: Math.round(tax / 2),
      sgst: Math.round(tax / 2),
      total: Math.round(totalInclusive)
    };
  }

  var FREE_SHIP_THRESHOLD = 50000;
  function shipping(subtotal) {
    return subtotal >= FREE_SHIP_THRESHOLD || subtotal === 0 ? 0 : 250;
  }

  /* ---------- Delivery estimate ---------- */
  var METRO_PREFIXES = ["11", "20", "40", "41", "56", "60", "70", "50"];
  function deliveryEstimate(pincode) {
    pincode = String(pincode || "").trim();
    if (!/^[1-9]\d{5}$/.test(pincode)) {
      return { ok: false, label: "Please enter a valid 6-digit pincode." };
    }
    var metro = METRO_PREFIXES.indexOf(pincode.slice(0, 2)) !== -1;
    var min = metro ? 3 : 5;
    var max = metro ? 5 : 8;
    var from = new Date();
    from.setDate(from.getDate() + min);
    var to = new Date();
    to.setDate(to.getDate() + max);
    var opts = { day: "numeric", month: "short" };
    return {
      ok: true,
      min: min,
      max: max,
      label:
        "Delivery to " + pincode + " by " +
        from.toLocaleDateString("en-IN", opts) + " – " +
        to.toLocaleDateString("en-IN", opts) + " · Fully insured & hallmarked"
    };
  }

  /* ---------- Cart (localStorage) ---------- */
  var CART_KEY = "miro_cart_v1";

  function readCart() {
    try {
      var raw = localStorage.getItem(CART_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }
  function writeCart(items) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch (e) {}
    try { window.dispatchEvent(new CustomEvent("miro:cartchange", { detail: { count: cartCount() } })); } catch (e) {}
  }
  function lineId(productId, opts) {
    return [productId, (opts && opts.metal) || "", (opts && opts.size) || "", (opts && opts.engraving) || ""].join("|");
  }
  function cartItems() {
    return readCart().filter(function (it) { return findProduct(it.productId); });
  }
  function cartAdd(productId, opts) {
    opts = opts || {};
    var items = readCart();
    var id = lineId(productId, opts);
    var existing = null;
    for (var i = 0; i < items.length; i++) if (items[i].lineId === id) existing = items[i];
    if (existing) {
      existing.qty = Math.min(existing.qty + (opts.qty || 1), 5);
    } else {
      items.push({
        lineId: id,
        productId: productId,
        metal: opts.metal || null,
        size: opts.size || null,
        engraving: opts.engraving || null,
        giftWrap: !!opts.giftWrap,
        qty: Math.min(opts.qty || 1, 5)
      });
    }
    writeCart(items);
    return id;
  }
  function cartUpdate(id, qty) {
    var items = readCart();
    var next = [];
    for (var i = 0; i < items.length; i++) {
      if (items[i].lineId === id) {
        if (qty > 0) { items[i].qty = Math.min(qty, 5); next.push(items[i]); }
      } else next.push(items[i]);
    }
    writeCart(next);
  }
  function cartRemove(id) { cartUpdate(id, 0); }
  function cartClear() { writeCart([]); }
  function cartCount() {
    return readCart().reduce(function (n, it) { return n + (it.qty || 0); }, 0);
  }
  function cartSubtotal() {
    return cartItems().reduce(function (n, it) {
      var p = findProduct(it.productId);
      return n + (p ? p.price * it.qty : 0);
    }, 0);
  }

  /* ---------- Lookup helpers ---------- */
  function findProduct(id) {
    for (var i = 0; i < PRODUCTS.length; i++) if (PRODUCTS[i].id === id) return PRODUCTS[i];
    return null;
  }
  function related(product, n) {
    n = n || 4;
    var out = [];
    var i;
    for (i = 0; i < PRODUCTS.length; i++) {
      var p = PRODUCTS[i];
      if (p.id !== product.id && p.category === product.category) out.push(p);
    }
    for (i = 0; i < PRODUCTS.length; i++) {
      var q = PRODUCTS[i];
      if (out.length >= n) break;
      if (q.id !== product.id && q.collection === product.collection && out.indexOf(q) === -1) out.push(q);
    }
    for (i = 0; i < PRODUCTS.length && out.length < n; i++) {
      if (PRODUCTS[i].id !== product.id && out.indexOf(PRODUCTS[i]) === -1) out.push(PRODUCTS[i]);
    }
    return out.slice(0, n);
  }
  function getParam(name) {
    try { return new URLSearchParams(window.location.search).get(name); } catch (e) { return null; }
  }

  /* ---------- Product card renderer ---------- */
  var CATEGORY_LABEL = { rings: "Rings", earrings: "Earrings", necklaces: "Necklaces", bracelets: "Bracelets" };
  function productCard(p, opts) {
    opts = opts || {};
    var w = opts.width || 700;
    var im = p.images[0];

    /* Minimal listing card (client feedback): image only — the name and a
       secondary photo are revealed on hover; no badge, price or category. */
    if (opts.minimal) {
      var im2 = p.images[1];
      return (
        '<article class="pcard pcard--minimal' + (opts.className ? " " + opts.className : "") + '">' +
          '<div class="pcard__media">' +
            '<img src="' + img(im.id, w, im.p) + '" alt="' + p.name + " — " + CATEGORY_LABEL[p.category] + '" loading="lazy" width="900" height="1200">' +
            (im2
              ? '<img class="pcard__alt" src="' + img(im2.id, w, im2.p) + '" alt="" aria-hidden="true" loading="lazy" width="900" height="1200">'
              : "") +
            '<span class="pcard__hovername">' + p.name + "</span>" +
          "</div>" +
          '<a class="pcard__link" href="product.html?id=' + p.id + '" aria-label="View ' + p.name + '"></a>' +
        "</article>"
      );
    }

    var badge = "";
    if (p.badge === "New") badge = '<span class="badge badge--new pcard__badge">New</span>';
    else if (p.badge === "Bestseller") badge = '<span class="badge badge--bestseller pcard__badge">Bestseller</span>';
    else if (p.compareAt) badge = '<span class="badge badge--sale pcard__badge">Sale</span>';
    var price = '<span class="pcard__price">' + fmt(p.price) +
      (p.compareAt ? " <s>" + fmt(p.compareAt) + "</s>" : "") + "</span>";
    return (
      '<article class="pcard' + (opts.className ? " " + opts.className : "") + '">' +
        '<div class="pcard__media">' + badge +
          '<img src="' + img(im.id, w, im.p) + '" alt="' + p.name + ' — ' + CATEGORY_LABEL[p.category] + '" loading="lazy" width="700" height="933">' +
        "</div>" +
        '<div class="pcard__body">' +
          '<span class="pcard__cat">' + CATEGORY_LABEL[p.category] + "</span>" +
          '<h3 class="pcard__name">' + p.name + "</h3>" +
          price +
        "</div>" +
        '<a class="pcard__link" href="product.html?id=' + p.id + '" aria-label="View ' + p.name + '"></a>' +
      "</article>"
    );
  }

  /* ---------- Public API ---------- */
  window.Miro = {
    PRODUCTS: PRODUCTS,
    COLLECTIONS: COLLECTIONS,
    EDITORIAL: EDITORIAL,
    CATEGORY_LABEL: CATEGORY_LABEL,
    FREE_SHIP_THRESHOLD: FREE_SHIP_THRESHOLD,
    img: img,
    fmt: fmt,
    gst: gst,
    shipping: shipping,
    deliveryEstimate: deliveryEstimate,
    findProduct: findProduct,
    related: related,
    getParam: getParam,
    productCard: productCard,
    cart: {
      items: cartItems,
      add: cartAdd,
      update: cartUpdate,
      remove: cartRemove,
      clear: cartClear,
      count: cartCount,
      subtotal: cartSubtotal
    }
  };
})();
