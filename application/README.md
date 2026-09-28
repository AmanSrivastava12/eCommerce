# eCommerce Seller/Admin App

React Native (Expo, SDK 57) app for sellers to list products and for admins to manage the platform. Single app, role-based routing — see `/opt/eCommerce/docs/application-implementation-plan.md`.

## Setup

```bash
cp .env.example .env   # point EXPO_PUBLIC_API_BASE_URL at your running api/
npm install
npm run start           # then press w/i/a, or scan the QR code with Expo Go
```

## Structure

- `app/index.tsx` — routes to `(seller)` or `(admin)` based on role, or `(auth)/login` if signed out.
- `app/(auth)/` — login.
- `app/(seller)/` — product CRUD, inventory, order queue, returns, reviews (read-only), account.
- `app/(admin)/` — seller verification, users, categories, sales, coupons, returns, dashboard.
- `lib/api-client/` — typed fetch wrapper + resource functions (hand-written to mirror `api/`'s DTOs; regenerate/adjust if the backend's OpenAPI spec changes).
- `lib/auth/` — token storage (`expo-secure-store`) and the auth context driving role-based redirects.

## Expo upgrade conventions (see the plan for why)

- Always use `npx expo install <pkg>` for Expo/RN-adjacent dependencies, never raw `npm install`.
- Run `npx expo-doctor` before adding dependencies or bumping the SDK version.
- Stay on the managed workflow; avoid bare-workflow ejection.
- Bump the SDK one version at a time, verified clean via `expo-doctor`, as its own change.

## Known gaps in this scaffold

- Product photo upload currently stores the local picker URI directly — wire it to the backend's pre-signed S3/Cloudinary upload endpoint before shipping.
- The product create form covers the core fields (title, category, short description, one variant, fulfillment basics); the full grouped-specifications editor described in the plan isn't built out yet.
- No push notification wiring yet for low-stock/order alerts (backend queues them; this app doesn't yet register for or display push).

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
