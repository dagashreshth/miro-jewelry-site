# Miró — Fine Jewelry · Design & Build Specification

This is the single source of truth for building any page of the Miró website.
Read this fully before writing code. `index.html` is the exemplar page — match its
patterns, head block, and quality bar exactly.

## 1. Brand

- **Name:** Miró — Fine Jewelry · Est. 2025 (script logotype, rendered via the
  `logo-script` class — never as an image).
- **Personality:** Luxury, Artistic, Modern, Cool. Editorial and clean like
  Rainbow K Paris; simple and young like Mejuri.
- **Audience:** Women 25–45, luxury shoppers, gift shoppers. Indian market —
  prices in INR (₹), Razorpay payments, GST invoicing, WhatsApp support.
- **Priorities (from client):** 1) Mobile first 2) High-quality images
  3) Large buttons 4) One-page checkout.

## 2. Design tokens (already defined in `assets/css/main.css` — use them, never hardcode)

```css
--raspberry: #bf2563;   /* primary CTA / accent — dominant brand color */
--cream:     #e8ddcf;   /* primary surface — section panels, tints */
--navy:      #0c1f42;   /* secondary — headings, footer bg, body text */
--teal:      #19908d;   /* secondary — badges, success, small accents */
--copper:    #b54e26;   /* tertiary — tiny hints only (tags, hovers) */
--maroon:    #6d1313;   /* tertiary — tiny hints only (sale, alerts) */
--paper:     #faf7f1;   /* page background (light tint of cream) */
--ink:       #1a2438;   /* body text (softened navy) */
--line:      #ddd2c2;   /* hairline borders */
--white:     #ffffff;
```

Usage ratio per brand guide: raspberry + cream dominate (~40%), navy + teal
~20%, copper/maroon only hints. Backgrounds are paper/cream/white; footer and
dark panels are navy; CTAs are raspberry.

## 3. Typography

- **Titles:** `--font-title`: "Playfair Display", Georgia, serif (stand-in for
  Miller). Weights 400–600. Use class `h-serif`.
- **Subtitles / editorial accents:** Playfair Display *Italic* (stand-in for
  Miller Italic). Use class `h-serif-italic`.
- **Body/UI:** `--font-body`: "Avenir Next", Avenir, "Mulish", sans-serif.
- **Logotype:** `--font-script`: "Monsieur La Doulaise", cursive — class
  `logo-script`.
- Eyebrow labels: 11–12px, uppercase, `letter-spacing: .18em`, class `eyebrow`
  (navy or raspberry).
- Nav links: 12px uppercase, `letter-spacing: .14em` (Rainbow K style).
- Fluid heading sizes are pre-defined: `.display` (clamp 40→72px), `h1`≈clamp
  34→56, `h2`≈clamp 28→40, `h3`≈22px. Body 16px/1.65.

Fonts are loaded in the shared `<head>` snippet (see §7) from Google Fonts:
Playfair Display (400,500,600 + italics), Mulish (300–700), Monsieur La Doulaise.

## 4. Components already provided (in `main.css` + `layout.js` — do NOT rebuild)

- **Announcement bar** (navy): free-shipping + appointments message.
- **Header** (sticky, paper bg, hairline border): logotype center on mobile /
  left on desktop, uppercase nav (Home, Collections, Our World→about section,
  FAQs, Contact), icons: search, WhatsApp, cart (with count badge). Mobile
  hamburger opens a full-screen drawer. Cart badge auto-updates via
  `Miro.cart.count()`.
- **Search overlay** (full screen, cream): live-searches the catalog by
  name/category/stone; shows product cards; opened by `.js-open-search`.
- **Footer** (navy): brand column with logotype + blurb, Shop / Care / Contact
  link columns (FAQs + contact prominently linked per brief), payment note
  (Razorpay · UPI · Cards · EMI), Instagram + WhatsApp links, GST/legal line.
- **WhatsApp floating button** (fixed bottom-right, teal→green circle).
- **Buttons:** `.btn` (raspberry filled, 54px min-height, uppercase, tracked),
  `.btn--outline` (navy outline), `.btn--light` (white on dark), `.btn--text`
  (underlined text link with arrow). All are large-tap-target by design.
- **Product card:** `.pcard` — image (3:4, zoom-on-hover), category eyebrow,
  serif name, price. Build via `Miro.productCard(product)` which returns HTML.
- **Form controls:** `.field` wrapper, `.input`, `.select`, `.textarea` — 52px
  tall, cream-tinted, focus ring raspberry.
- **Badges:** `.badge` (teal), `.badge--new` (raspberry), `.badge--bestseller`.
- Helpers: `.container` (max 1280px), `.container--narrow` (860px), `.section`
  (fluid padding), `.grid` + `.grid--2/3/4`, `.hairline`, `.sr-only`, `.reveal`
  (scroll-in animation, auto-initialised by layout.js).

## 5. Data layer — `assets/js/store.js` (do NOT rebuild; consume it)

Global `Miro` object:

- `Miro.PRODUCTS` — 23 products. Shape:
  `{ id, name, category (rings|earrings|necklaces|bracelets), collection
    (solitaire|everyday|heirloom), price (INR int), compareAt (int|null),
    stone: {type, ctw}, metals: [{label, karat}], metalWeight, sizes: [..]|null,
    description, details: [..], images: [{id, p?}, ...] (3 each),
    badge: "New"|"Bestseller"|null, instock: bool }`
- **Images:** each image is `{id, p}` — render with
  `Miro.img(im.id, width, im.p)` (`p` is an optional imgix crop suffix; image 2
  of each product is a zoomed detail crop of image 1, image 3 is a lifestyle
  shot). Product cards: just call `Miro.productCard(p)`.
- `Miro.EDITORIAL` — `{ hero, heroAlt, about, contact, instagram: [6 × {id}] }`.
- `Miro.COLLECTIONS` — 3 featured collections `{ id, name, tagline, image: {id}, filter }`.
- `Miro.CATEGORY_LABEL` — map category key → display label.
- `Miro.fmt(n)` → `"₹86,500"` (Indian digit grouping).
- `Miro.img(id, w, extra)` → Unsplash CDN URL at width w.
- `window.MiroToast(html, ms?)` (from layout.js) — toast notification.
- `window.MiroIcons` / `window.MiroLinks` (from layout.js) — shared inline SVG
  icons (search, bag, close, whatsapp, instagram, pin, arrow) and canonical
  WhatsApp/Instagram URLs.
- `Miro.cart` — `items()`, `add(productId, {metal, size, qty, engraving})`,
  `update(lineId, qty)`, `remove(lineId)`, `clear()`, `count()`, `subtotal()`.
  Persists to localStorage key `miro_cart_v1`. Fires `miro:cartchange` event on
  window (layout.js listens and updates the badge).
- `Miro.gst(subtotal)` → `{ taxable, cgst, sgst, total }` — jewellery GST is 3%
  (1.5% CGST + 1.5% SGST), prices are tax-inclusive: taxable = total/1.03.
- `Miro.shipping(subtotal)` → 0 if ≥ ₹50,000 else 250.
- `Miro.deliveryEstimate(pincode)` → `{ ok, min, max, label }` — 3–5 days for
  metro prefixes (11,20,40,41,56,60,70), 5–8 otherwise; validates 6 digits.
- `Miro.getParam(name)` — URL query helper.
- `Miro.related(product, n)` — same category first, then collection.

## 6. Pages & routes (each page = one HTML file at repo root)

| File | Purpose |
|---|---|
| `index.html` | Home — hero, 3 featured collections side-by-side, bestsellers rail, about (text+photo), Instagram gallery, footer. **Built — exemplar.** |
| `collections.html` | All products. Sticky filter bar: live search box, price range filter (brief feature #2), category pills, sort (price asc/desc, newest). Reads `?collection=` and `?category=` params. Result count. Empty state. |
| `product.html` | PDP, driven by `?id=`. Gallery 2–3 images with thumbnails + **cursor zoom on hover** (magnify pane or lens). Title, price, stone info (type + ctw), metal options (14K/18K etc. as selectable chips), ring size selector (only when `sizes` present) + size-guide popover, customisation (engraving text input ≤ 15 chars, gift wrap checkbox), delivery estimate by pincode, Add to cart + Book an appointment secondary CTA, accordion details (description, details list, care, shipping/returns), related products (4). |
| `cart.html` | Line items (image, name, metal/size/engraving, qty stepper, remove), order summary (subtotal, shipping, GST-included note), free-shipping progress bar, empty state with CTA, checkout button. |
| `checkout.html` | **One page.** Left: contact, shipping address (Indian states select, 6-digit pincode w/ delivery estimate), GSTIN optional field for business invoice, payment method radio cards (UPI / Card / Netbanking / EMI — presented as "Secured by Razorpay"), pay button. Right: sticky order summary with GST breakdown from `Miro.gst`. Validates, then simulates payment → saves order to localStorage `miro_last_order` → redirects to `order-confirmation.html`. |
| `order-confirmation.html` | Reads `miro_last_order`. Thank-you, order number MIR-XXXXX, line items, GST tax invoice breakdown (CGST/SGST), delivery window, WhatsApp support CTA. Clears cart. If no order → friendly redirect home. |
| `faqs.html` | Accordion FAQ, grouped: Orders & Shipping, Returns & Exchanges, Product & Care, Payments & GST, Appointments. ≥ 18 real questions with substantive answers (BIS hallmark, 15-day returns, lifetime plating touch-ups, GST invoice, international shipping, ring sizing, engraving etc.). Search-within-FAQs input. Contact strip at bottom. |
| `contact.html` | Split layout: form (name, email, phone, topic select incl. "Book an appointment", preferred date for appointments, message) with success state; right column: boutique address (Mumbai), hours, phone, email, WhatsApp deep link, Instagram, map placeholder (styled cream block with pin icon). |
| `admin.html` | Bonus back-office mockup (not linked in nav): sidebar (Dashboard, Products, Categories, Banners, Inventory, Orders, Customers, Appointments), KPI cards, orders table, low-stock list — static demo data, same design language but utilitarian. |

## 7. Page skeleton (copy exactly; swap title/description + per-page css/js)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PAGE TITLE — Miró Fine Jewelry</title>
  <meta name="description" content="...">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Mulish:wght@300;400;500;600;700&family=Monsieur+La+Doulaise&display=swap" rel="stylesheet">
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='48' fill='%23bf2563'/%3E%3Ctext x='50' y='68' font-size='58' text-anchor='middle' fill='%23e8ddcf' font-family='Georgia,serif' font-style='italic'%3EM%3C/text%3E%3C/svg%3E">
  <link rel="stylesheet" href="assets/css/main.css">
  <link rel="stylesheet" href="assets/css/PAGE.css">
</head>
<body data-page="PAGE">
  <a class="skip-link" href="#main">Skip to content</a>
  <div id="site-chrome-top"></div>   <!-- layout.js injects announcement+header+search+drawer -->
  <main id="main">
    ... page content ...
  </main>
  <div id="site-chrome-bottom"></div> <!-- layout.js injects footer + whatsapp float -->
  <script src="assets/js/store.js"></script>
  <script src="assets/js/layout.js"></script>
  <script src="assets/js/PAGE.js"></script>
</body>
</html>
```

Each page owns exactly two extra files: `assets/css/PAGE.css` and
`assets/js/PAGE.js` (even if small). **Never edit shared files**
(`main.css`, `store.js`, `layout.js`, other pages' files).

## 8. Interaction & quality bar

- Mobile-first: write base styles for ~375px, enhance at `@media (min-width:
  600px)`, `900px`, `1200px`. Test mentally at 375 and 1280.
- Tap targets ≥ 48px. Buttons use `.btn` (54px).
- Images: always `loading="lazy"` except above-the-fold hero; always `alt`;
  request Unsplash at sensible widths (`Miro.img(id, 800)` for cards, 1600 for
  heroes) and add `aspect-ratio` boxes to prevent layout shift; every `<img>`
  sits on a cream placeholder background.
- Subtle luxury motion only: 250–400ms ease transitions, `.reveal` for
  scroll-ins, image scale 1→1.04 on card hover. No bouncy/springy effects.
- Accessibility: semantic landmarks, one `<h1>` per page, focus-visible ring
  (defined globally), `aria-expanded` on accordions/drawers, labels on all
  inputs, `aria-live` for cart/status updates.
- Currency: always `Miro.fmt()` — Indian grouping (₹1,32,000).
- Copy: elevated but warm; sentence case for prose, uppercase only for
  eyebrows/nav/buttons. British-neutral English ("jewellery" in prose is fine,
  brand tagline uses "Fine Jewelry" as on the logo). No lorem ipsum anywhere —
  write real, considered copy. Nothing should feel short or placeholder.
- Every page must be complete: no dead links (link to existing pages only),
  no console errors, works when opened over a local static server.

## 9. Integration notes (represent honestly as demo)

- **Razorpay:** checkout shows "Secured by Razorpay" with method cards; the pay
  button simulates success after a brief processing state (this is a front-end
  demo — real key integration documented in README).
- **WhatsApp:** all WhatsApp CTAs → `https://wa.me/919820012345?text=...`.
- **Instagram:** gallery tiles + footer icon → `https://instagram.com/miro.finejewelry` (demo handle).
- **Google Analytics / Shipping API / CDN:** stubs + README notes, not fake UI.
