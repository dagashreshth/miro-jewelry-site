# Miró — Fine Jewelry · Website

A premium jewellery e-commerce front-end for **Miró (Est. 2025)** — luxury,
artistic, modern, cool. Built as a fast, dependency-free static site: semantic
HTML, hand-written CSS on a token system, and vanilla JavaScript. Mobile-first
throughout, with the client's four priorities driving every screen: mobile
first, high-quality imagery, large buttons, and a one-page checkout.

## Run it

Any static server works. Two easy options:

```bash
# from this folder
python3 serve.py 4173          # → http://127.0.0.1:4173
# or
python3 -m http.server 4173
```

Then open `http://127.0.0.1:4173`. (Opening `index.html` directly from the
file system also works for browsing, but a server is recommended so page
navigation and query-string routes behave exactly as deployed.)

## Pages

| Route | What it is |
|---|---|
| `index.html` | Home — editorial hero, three featured collections, bestseller rail, about the house, service promises, Instagram gallery |
| `collections.html` | All jewellery — live search, price-range filter, category pills, sort; reads `?collection=` / `?category=` / `?q=` |
| `product.html?id=…` | Product detail — 3-image gallery with cursor zoom, stone & metal specs, ring sizer + size guide, engraving & gift wrap, pincode delivery estimate, related pieces |
| `cart.html` | Shopping bag — quantity steppers, free-shipping progress, gift note |
| `checkout.html` | One-page checkout — contact, address with live delivery estimate, optional GSTIN, Razorpay-style payment methods, GST-broken-down summary |
| `order-confirmation.html` | Thank-you + printable GST tax invoice (CGST/SGST @1.5% each, HSN 7113) |
| `faqs.html` | Client care — six groups, 20+ real answers, searchable |
| `contact.html` | Contact & appointment booking — inquiries persist locally and surface in the admin |
| `admin.html` | Back-office mockup (not linked from the storefront): dashboard, products, categories, banners, inventory, orders, customers, appointments |

## Architecture

```
assets/
  css/main.css      ← design tokens + shared components (header, footer, cards, forms…)
  css/<page>.css    ← one stylesheet per page
  js/store.js       ← catalog (23 pieces), cart (localStorage), INR/GST/shipping/delivery helpers
  js/layout.js      ← injected chrome: announcement bar, header, drawer, search overlay, footer, WhatsApp float
  js/<page>.js      ← one script per page
DESIGN-SPEC.md      ← the design contract every page follows
```

- **Brand tokens** (from the brand guidelines): raspberry `#bf2563` + cream
  `#e8ddcf` dominant; navy `#0c1f42` + teal `#19908d` secondary; copper/maroon
  as hints only. Titles in Miller (per the brief) with Playfair Display as the
  matched web fallback — `--font-title` leads with `"Miller Display", "Miller"`,
  so a licensed Miller install is honoured automatically and everyone else sees
  Playfair (from Google Fonts). Body in Avenir (first in the stack) with Mulish
  as the web fallback; logotype in Monsieur La Doulaise matching the script
  logo. To ship the exact brand faces, self-host licensed Miller/Avenir web
  fonts with `@font-face` — the stacks already prioritise them.
- **State** lives in `localStorage`: `miro_cart_v1`, `miro_gift_note`,
  `miro_last_order`, `miro_orders`, `miro_inquiries`.
- **Imagery** is hot-linked from the Unsplash CDN (every URL verified live).
  For production, re-shoot or license imagery and serve via the CDN of choice.

## Integration notes (for the production build)

| Brief item | Status in this build | Path to production |
|---|---|---|
| **Razorpay** | Checkout presents UPI/Card/Netbanking/EMI as "Secured by Razorpay" and simulates payment | Replace the simulated step in `assets/js/checkout.js` with Razorpay Standard Checkout (`checkout.js` script + order API on a small backend; webhook → order status) |
| **GST invoice** | 3% tax-inclusive pricing, CGST/SGST breakdown, GSTIN capture, printable invoice | Generate the invoice server-side at order time; number sequentially per FY |
| **WhatsApp** | Floating button + concierge links (`wa.me`) throughout | Swap in the business number; optionally WhatsApp Business API for order updates |
| **Instagram** | Gallery + profile links (demo handle) | Point at the live handle; optionally Basic Display API for a real feed |
| **Google Analytics** | GA4 wired on every page via `assets/js/analytics.js` — data layer, auto page_view, `cart_update` and `purchase` e-commerce events. Dormant (no external calls) until a real id is set | Set `MEASUREMENT_ID` in `assets/js/analytics.js` to your `G-XXXXXXXXXX` — nothing else to change |
| **Shipping API** | `Miro.deliveryEstimate()` estimates by pincode (metro vs non-metro) | Replace with the courier partner's serviceability + EDD API |
| **CDN** | Static-host ready; images already CDN-served | Put the whole site behind CloudFront/Cloudflare; assets are cache-friendly |
| **Admin** | `admin.html` mockup demonstrates all eight requirement areas | Real build wants a headless commerce backend or custom CMS with auth |

## Notes

- Prices are demo data in INR with Indian digit grouping (`₹1,32,000`).
- Cart, orders, gift notes and inquiries are browser-local by design — the
  site is fully explorable end-to-end (browse → PDP → bag → checkout →
  confirmation → admin) with no backend.
- `DESIGN-SPEC.md` documents the tokens, components and page contracts if you
  extend the site.
