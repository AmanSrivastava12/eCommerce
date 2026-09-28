# Shopwave — customer app

Native (Expo / React Native) storefront for **customers**. It mirrors the `website/` feature for
feature and talks to the same `api/` routes. The seller/admin app lives separately in `application/`.

## Run

```bash
npm install
npx expo start          # scan the QR code with Expo Go, or press a / i / w
```

Environment (`.env`):

| Variable | Purpose |
| --- | --- |
| `EXPO_PUBLIC_API_BASE_URL` | API base, e.g. `http://<your-LAN-IP>:3000/api` (a phone can't reach `localhost`) |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key — same one the website uses |

Customer test login: `customer1@shopwave.test` / `Password123!`

## What maps to what

| Website | App |
| --- | --- |
| `/` home (banners, deals, top rated, new arrivals, category nav) | Home tab |
| header search dropdown, `/search`, filter sidebar, sort tabs | `search` (opened from the Home search bar; live preview + filter sheet) |
| category nav, `/category/[slug]` | Categories tab (categories → subcategories, with icons) and `category/[slug]` |
| `/product/[id]` (gallery, variants, pincode check, features, specs, FAQs, reviews) | `product/[id]` |
| `/cart` (qty, stock limits, coupons, shipping total) | Cart tab |
| `/checkout` + Stripe Elements | `checkout` + Stripe PaymentSheet |
| `/orders`, `/orders/[id]` (filters, cancel, tracker, returns) | `orders`, `orders/[id]` |
| `/account`, `/account/addresses`, `/account/wishlist` | Account tab, `addresses`, Wishlist tab |
| `/login`, `/register`, `/forgot-password`, `/reset-password` | same routes |
| footer pages (about, FAQ, policies…) | `info/[slug]`, linked from the Account tab |

Product listings (search results, category pages, wishlist) can be shown as large cards, a grid,
or a compact list; the choice is remembered. Category icons are chosen by keyword in
`lib/category-icons.ts` — add a rule there for a new kind of category.

Guests can browse and use the cart (a per-install `guestSessionId`, merged into the account cart
on sign-in, exactly like the website). Access tokens refresh automatically; if the refresh
token is rejected the app signs out and says so.

## Notes

- **Payments** run through `@stripe/stripe-react-native`, which works in Expo Go and dev builds
  but has no web implementation — the web preview can place orders but shows a message instead
  of the payment sheet. As on the website, an order becomes `paid` via the API's Stripe webhook.
- **Password reset** emails link to the website. Paste the token from that link into the app's
  reset screen, or open `shopwave://reset-password?token=…`.
- Use `npx expo install <pkg>` for native dependencies and keep `npx expo-doctor` green.

## Build an APK

```bash
npm run build:apk     # from this folder; first run asks you to log in to Expo and create the project
```

This runs an EAS cloud build with the `preview` profile in `eas.json` and prints a download link
for the `.apk`. It uploads **only this folder** (not the whole eCommerce repo): the script sets
`EAS_NO_VCS=1` and `EAS_PROJECT_ROOT` to this directory, and `.easignore` here decides what is
excluded — it replaces `.gitignore` in that mode, so keep `node_modules/` and `.env` listed in it.

- Build-time settings (`EXPO_PUBLIC_*`) come from the `env` block in `eas.json`, **not** `.env`.
  They are baked into the APK in plain text — never put secrets there.
- Bump `expo.version` / `android.versionCode` in `app.json` for builds meant to install over an
  older one; keep using the same Expo account so the signing key matches.
