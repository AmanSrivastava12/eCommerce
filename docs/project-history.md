# Shopwave — Project History & Current State

A record of what was built with Claude Code between 2026-08-17 and 2026-09-25, so a new
session (or a new person) can pick up where things left off. Written 2026-09-25, when the
local repo was replaced by a fresh clone of the GitHub repo. **Start here** before changing anything.

## What the project is

A Flipkart/Amazon-style eCommerce platform called **Shopwave**, in four folders:

| Folder | What | Stack |
| --- | --- | --- |
| `api/` | Backend for everything | NestJS 11, MongoDB (catalog, users, reviews…), PostgreSQL (orders, inventory, payments), Redis + BullMQ |
| `website/` | Customer storefront | Next.js 16 (App Router, Turbopack) |
| `application/` | **Shopwave Seller Hub**: seller + admin app, role-based routing | React Native / Expo SDK 57 |
| `customer-app/` | **Shopwave** customer app, mirrors the website feature for feature | React Native / Expo SDK 57 |

The original plans are in `docs/implementation-plan.md` (backend and schema),
`docs/website-implementation-plan.md` and `docs/application-implementation-plan.md`. The code has
moved well beyond them; this file records the differences.

## Conventions

- **UI theme:** brown, cream and an off-white page background. Minimal, with hover-lift
  animations and no icons on categories. Custom modals and toasts, never `window.alert`.
- **Currency:** USD everywhere (website and both apps).
- **Customer features belong in two places.** A change to the storefront usually needs to be made
  in both `website/` and `customer-app/`; subcategory-style changes can also reach `application/`.
- **Expo:** always `npx expo install <pkg>` (never plain `npm install` for Expo/RN packages), run
  `npx expo-doctor` before adding dependencies, stay on the managed workflow, and bump the SDK one
  version at a time. Don't run `npm audit fix --force` in the apps.
- **Node:** 22.12 or newer (`engines` in `api/package.json`, `NODE_VERSION` in `render.yaml`).
- **Seed data:** `npm run seed` / `npm run unseed` in `api/` (scripts in `api/seed/`).
- **Git:** the owner runs all git commands (commit, push, pull) personally. Don't run them.

## Files kept out of git

These exist only on the local machine, so back them up. A fresh clone won't have them.

| File(s) | Why local | Where the values live otherwise |
| --- | --- | --- |
| `api/.env`, `website/.env.local`, `application/.env`, `customer-app/.env` | Secrets and local URLs | Render / Vercel dashboards; each folder has a `.env.example` |
| `reference` (repo root) | Demo login passwords | The seed scripts in `api/seed/` |
| `application/` and `customer-app/`: `app.json`, `eas.json`, `.easignore` | Kept local by choice | EAS project (`projectId` is in `app.json`) |
| `CLAUDE.md` (any folder) | Ignored by the root `.gitignore` | This file replaces it |

**Without `app.json` / `eas.json` an app can't run or build**: they hold the app name, icons,
Android package ID, EAS `projectId`, the APK build profile and the build-time API URL. On a new
machine, copy them from a backup before `npx expo start` or `npm run build:apk`.

## Timeline

### 2026-08-17 — Planning
- Chose Next.js for the website and React Native + Expo for the app, over Ionic + Angular.
- Expo upgrade pain from an earlier project → conventions: always `npx expo install`, run
  `npx expo-doctor` before adding deps, managed workflow only, bump the SDK one version at a time.
- Separate root folders per project. Addresses carry their own phone numbers. Product descriptions
  are rich, Flipkart-style: highlights, specs, FAQs.

### 2026-09-16 — Initial implementation
- Only customers who ordered a product/variant can review it (and must be logged in).
- Product filter/sort. Modern UI direction.
- Built api/, website/ and application/ from the plans. Added dummy seed data.

### 2026-09-18 → 09-21 — Website overhaul
- Full storefront redesign modelled on Flipkart/Amazon: categories, add-to-cart on every product
  card, wishlist, debounced search dropdown, Flipkart-style filter and sort.
- Colour scheme: **brown, cream and an off-white base** (off-white is the page background).
  Minimal UI, **no icons on categories**, hover-lift animations.
- Orders: filter in My Orders, empty states ("no orders match the criteria") on every list page,
  full order detail page (items, price breakup, status and return status, address, links to products).
- Wishlist **collections**; cart items shown with detail; cart has move-to-wishlist and a −/1/+
  stepper capped at available stock. The cart badge counts **distinct items**, not total quantity.
- Addresses page with a map to pin the current location.
- Static pages (About, Contact, Careers, Payments, Shipping…) with relevant filler text.
- Custom Shopwave logo (a bag with a wavy "S"), used as the favicon and in place of the Next.js
  dev badge.
- A custom modal component replaces every `window.alert`/`confirm`; floating toast alerts on
  important actions. Sign-out asks for confirmation (from both the header dropdown and the account page).
- Account page: profile view with an Edit mode (name, photo, email, phone, DOB, gender, permanent address).
- Full forgot-password / reset-password flow; eye icons on password fields.
- Product page: key features (warranty, returns…) under the image, then specs. Pincode check in
  one line: text, input, button.
- Fixed a hydration error and LCP image warnings.

### 2026-09-22 — Running the app on a phone
- Walked through Expo Go, LAN vs tunnel mode, and starting the API/DB before the app.

### 2026-09-23 — Security, seller app UI, customer app, seed data, payments
- **Security:** `GET /me` no longer returns `passwordHash` (`select: false` on the schema).
- Seller app restyled to match the website theme: icons on the tab items, tighter spacing,
  dark-brown bold headings. Renamed to **Shopwave Seller Hub**.
- Password-strength meter on register and change-password.
- **Subcategories** added end to end: DB, API, website, customer app, seller app.
- **Seed data rewritten:** `npm run seed` / `npm run unseed` in `api/` (scripts in `api/seed/`).
  Diverse users (admin, sellers, customers), products in every category/subcategory, orders and
  reviews. `unseed` removes only what `seed` added. Demo logins are in the local, gitignored
  `reference` file (e.g. `customer1@shopwave.test`, `seller1@shopwave.test`).
- **Customer app** (`customer-app/`) created, mirroring the website. Categories tab replaces the
  bottom search tab (search is on Home); icons for categories/subcategories instead of images.
- **Payments:** Stripe (sandbox). Razorpay was tried but needs a real PAN and bank account, so it
  was dropped. Stripe is invite-only in India, but the sandbox works. **Currency switched to USD**
  across the website and both apps.
- Checkout flow: the server prices the cart and creates a PaymentIntent → the customer pays → the
  server verifies with Stripe and only then creates the order as paid. It auto-refunds if the cart,
  price or stock changed. A Stripe webhook is the backup if the tab closes. It is idempotent: one
  order per payment. A stale `stripeCustomerId` (after switching Stripe accounts) is recovered
  automatically.

### 2026-09-24 → 09-25 — Deployment
Free-forever stack. AWS free tier ends around 2026-11-24, so AWS was deliberately not used.
- **API:** Render free web service from root `render.yaml` (Singapore region),
  URL `https://shopwave-api-wdn4.onrender.com/api`. Cold starts take about 50 s.
  Render must use **Node 22** (`NODE_VERSION` in `render.yaml`): `@nestjs/config` v12 and other
  packages are ESM-only, and loading them with `require` needs Node 22.12 or newer.
  `STRIPE_WEBHOOK_SECRET` must be set in the Render dashboard, or the Stripe webhook
  (the backup path that creates the order) fails.
- **Redis:** Render Key Value, free. Not Upstash, because BullMQ polling would burn its quota.
- **Postgres:** Neon. **Mongo:** Atlas M0 (network access `0.0.0.0/0`, database `ecommerce`).
- **Website:** Vercel, Root Directory `website`. Env vars `NEXT_PUBLIC_API_BASE_URL` and
  `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` are baked in at build time, so a change needs a redeploy.
- **Apps → APK:** EAS, `preview` profile, `npm run build:apk` in each app folder. The API URL for
  builds is set in each app's `eas.json`, **not** in `.env`. Each app has its own EAS project and
  keystore (EAS-managed) under one Expo account. The free plan runs one build at a time; the second
  build queues.
- `.easignore` in each app ensures only that app's folder is uploaded to EAS.
- App icons: the customer app uses the website's logo; Seller Hub uses the same logo with a small
  "seller" label under the S. The seller app got `expo-font` and `npx expo install --fix` for APK stability.
- **Keyboard handling** in both apps: new `components/keyboard.tsx`, so input fields stay visible
  when the keyboard opens.
- `website/` and `api/` were cleaned up and pushed to GitHub from another laptop. `application/`
  and `customer-app/` were added from this machine afterwards.

## Open items / next steps (as of 2026-09-25)

1. **Multi-variant products — built 2026-09-25, API part not yet applied/deployed.**
   `api/src/catalog/dto/product.dto.ts` is **root-owned**, so the DTO half could not be written.
   Fix ownership (`sudo chown -R laitkor:laitkor /opt/eCommerce`), then apply the DTO change (it
   also restores the lost `attributes` fix). Until then the API does not compile. Then push so
   Render redeploys. What was built:
   - API: product update accepts the full `variants` list (adds new SKUs with opening stock,
     updates saved ones, removes missing ones — blocked if in undelivered orders or any cart).
     SKUs are checked for global uniqueness before writing. `GET /seller/inventory` lists stock.
     Each variant gets its own `price` (priceOverride + product discount/sale) on the public
     product endpoint, and the cart charges it. Deleting a product frees its SKUs. A missing
     main image is now a 400 ("Add a main product photo") instead of a 500.
   - Seller app: `components/variants-editor.tsx` (SKU, option pairs, price, opening stock,
     photos per variant); per-variant stock on the Edit screen; "N variants" on the list.
     The form now requires a main photo.
   - Website + customer app: the product page shows the selected variant's price.
2. **Website checkout follow-ups** (check whether they were done): show the real error when a
   payment is auto-refunded, refresh the cart after placing an order, show a clear message when
   the Stripe publishable key is missing, and don't mix ₹ and $ on one page.

## Gotchas worth knowing
- Local DB containers `ecommerce-postgres` / `ecommerce-redis` / `ecommerce-mongo` use host ports
  5433 / 6380 / 27018 and do **not** auto-restart: run `docker start …` after a reboot.
- Both apps' `.env` point at the **live Render API**, so testing from the apps writes to the
  live demo DB. Clean up test data.
- The login screens show "Invalid email or password" for **any** error, including network ones.
  Check that the API is reachable first. Render may just be cold-starting.
- The seller app can't run on web (it uses `expo-secure-store` unconditionally). The customer
  app has a localStorage fallback.
- Running Expo as root breaks React Native DevTools (Electron sandbox) and leaves `/tmp/metro-*`
  caches root-owned (EACCES later). Run as the normal user.
- Secrets are never committed: `.env*` (except examples), `reference`, `*.jks`. Set them in the
  Render / Vercel / EAS dashboards. See "Files kept out of git" above.
- Work as the normal user (`laitkor`), not root. On 2026-09-25 the repo ended up root-owned after
  being cloned as root; the fix was `sudo chown -R laitkor:laitkor /opt/eCommerce`.
- The old pre-GitHub repo was kept at `/opt/eCommerce-old` until the new one was verified.
