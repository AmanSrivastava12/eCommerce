# Seller/Admin Application Implementation Plan (application/)

## Purpose

Native mobile app used by **sellers** (to list products, manage inventory, fulfill orders) and **admins** (to verify sellers, manage categories/users, view platform activity). Never used by customers. Single app, role-based navigation — not two separate apps.

## Stack

- **Framework**: React Native via Expo (managed workflow), TypeScript.
- **Navigation**: React Navigation, with a role-gated stack chosen after login (seller stack vs admin stack) based on the JWT role claim.
- **Server state**: React Query.
- **Forms**: React Hook Form + Zod validation (matches DTO shapes from the backend).
- **API access**: typed client generated from `api/`'s OpenAPI spec, same approach as the website but a separate generated copy (no shared workspace package, per the "created separately" requirement).
- **Image upload**: `expo-image-picker` + `expo-camera` for product photos, uploaded to S3/Cloudinary via a backend-issued pre-signed URL.
- **Motion**: `react-native-reanimated` + `react-native-gesture-handler` (both Expo-managed-compatible) for screen transitions, list item add/remove, and pull-to-refresh — kept short (150-250ms) to match the website's feel.

See [implementation-plan.md's UI/UX Direction](./implementation-plan.md#uiux-direction) for the shared design expectations (skeleton loading states, optimistic updates, empty/error states) that apply throughout this app.

### Expo upgrade-pain mitigations (from prior experience with SDK upgrade dependency hell)

- Use `npx expo install <pkg>` exclusively for any Expo/RN-adjacent dependency — never raw `npm install`.
- Run `npx expo-doctor` as a CI check on every PR, not just manually before upgrades.
- Stay on managed workflow; no bare-workflow ejection unless a library strictly requires custom native code with no config-plugin support — check config-plugin support before adding any native-ish library.
- Treat SDK version bumps as their own isolated task, one version at a time (never skipping), verified clean via `expo-doctor` before merge — never bundled with feature work.
- Use **EAS Build** for native builds instead of local native builds.

## Project Structure

```
application/
  app/                          # expo-router file-based routes
    (auth)/
      login.tsx
    (seller)/
      products/index.tsx        # seller's product list
      products/[id]/edit.tsx
      products/new.tsx
      orders/index.tsx          # incoming order queue
      orders/[id].tsx
      returns/index.tsx         # return requests on seller's own orders
      account.tsx               # seller profile + payout details
    (admin)/
      sellers/index.tsx         # seller verification queue
      users/index.tsx
      categories/index.tsx
      sales/index.tsx           # sale window management
      sales/new.tsx
      coupons/index.tsx         # coupon CRUD
      coupons/new.tsx
      returns/index.tsx         # platform-wide return request queue
      dashboard.tsx             # basic sales overview
  lib/
    api-client/
    hooks/
    auth/                       # role-gating logic, token storage (expo-secure-store)
  components/
    forms/
    product/                    # includes DescriptionSectionsEditor, SpecTableEditor, FaqEditor
  package.json
  app.json                      # Expo config
```

## Screens & Functional Scope (v1)

**Seller flows**
| Screen | Functionality |
|---|---|
| Product list | Seller's own products, status (draft/active/inactive), rating summary, low-stock badge |
| Product create/edit | Title, category, main image + gallery, per-variant images, rich description (sections + grouped specs), FAQ entries, warranty text, "Assured" flag (if eligible), return window (days), shipping origin pincode + serviceable pincodes, base price, discount %/amount, opt into an active sale + sale price, variants |
| Inventory update | Adjust `quantity` per SKU, set `low_stock_threshold` |
| Order queue | Orders containing this seller's items, with a **status filter** (placed/paid/shipped/delivered/cancelled) and date-range filter |
| Order detail | Mark as shipped/delivered |
| Returns | Approve/reject/complete return requests on the seller's own order items |
| Reviews (read-only) | List of reviews on the seller's own products, own aggregate rating including quality/delivery/packaging breakdown — reviews remain customer-authored only, never editable here |
| Low-stock alerts | Push/in-app notification when a SKU crosses its threshold |
| Account | Business/profile details, payout details, password change |

**Admin flows**
| Screen | Functionality |
|---|---|
| Seller verification queue | Approve/reject pending sellers (`sellerProfile.verificationStatus`) |
| User management | View/deactivate customer or seller accounts |
| Category management | CRUD on `categories` |
| Sale management | Create/edit sale windows (`name`, `startAt`, `endAt`) products opt into |
| Coupon management | Create/edit coupon codes (`discountType`, `discountValue`, validity window, usage limits) |
| Returns queue | Platform-wide visibility into return requests, override seller decisions if needed |
| Dashboard | Basic counts: total orders, revenue, active sellers, top/bottom seller ratings (with category breakdown), pending returns (v1: simple aggregate numbers, not full analytics) |

## Data the Application Reads/Writes (schema it depends on)

Canonical schema owned by `api/` (full definitions in [implementation-plan.md](./implementation-plan.md)). The subset this app actively reads/writes:

**Reads**
- `users` (Mongo) — own seller profile including `sellerProfile.ratingSummary`; for admin, all users + `sellerProfile.verificationStatus`.
- `products` (Mongo) — seller's own products, full schema (description sections, specs, FAQs, images, pricing, variants, `ratingSummary`), filtered by `sellerId = current user`; admin can read all.
- `categories` (Mongo) — for the category picker on product create/edit, and admin CRUD.
- `sales` (Mongo) — active/upcoming sale windows, for the seller's sale-opt-in picker and admin's sale list.
- `coupons` (Mongo) — admin's coupon list.
- `reviews` (Mongo) — read-only, scoped to the seller's own `productId`s.
- `inventory` (Postgres) — current `quantity`/`reserved_qty`/`low_stock_threshold` for the seller's own SKUs.
- `orders` + `order_items` (Postgres) — orders containing `order_items.seller_id = current seller`; admin can read all orders.
- `return_requests` (Postgres) — scoped to the seller's own `order_items`; admin can read all.

**Writes**
- `products` (Mongo) — full CRUD, but scoped: a seller may only create/edit/delete where `sellerId = current user`. Includes `description.{sections,specifications}`, `faqs`, `images.{main,gallery}`, per-variant `images`, `fulfillment.{warranty,returnWindowDays,shipsFromPincode,serviceablePincodes,estimatedDeliveryDays}`, and `pricing.{basePrice,discountPercent,discountAmount,activeSaleId,salePrice}`. `fulfillment.isAssured` is admin-only (a seller cannot self-grant the badge).
- `inventory` (Postgres) — `quantity`/`low_stock_threshold` updates for the seller's own SKUs (via `PATCH /inventory/:sku`, never direct DB access — backend enforces ownership).
- `users.sellerProfile.verificationStatus` (Mongo) — admin-only, via `PATCH /admin/sellers/:id/verify`.
- `categories` (Mongo) — admin-only CRUD.
- `sales` (Mongo) — admin-only CRUD (`POST/PATCH /admin/sales`); a seller can only reference an existing sale's `_id` on their product, not create one.
- `coupons` (Mongo) — admin-only CRUD.
- `return_requests` (Postgres) — seller/admin transition `status` (approve/reject/complete) on requests tied to the seller's own order items; admin can act on any.
- `order_items` status transitions — seller can move their own line items through `shipped`/`delivered` (via `PATCH /orders/:id/fulfill`), which the backend aggregates into the parent order's overall status once all items reach the same state.

The application has **no write access** to `carts`, `payments`, `reviews` (reviews are customer-authored only), `wishlists`, or another seller's `products`/`inventory` — those are customer/website-owned or scoped to the acting seller only, enforced by backend role guards, not just UI hiding.

## API Endpoints Consumed (from api/)

```
POST /auth/login
POST /auth/refresh

GET   /seller/products
POST  /seller/products
PATCH /seller/products/:id
DELETE /seller/products/:id
PATCH /seller/inventory/:sku

GET   /seller/orders?status=&from=&to=
PATCH /seller/orders/:id/fulfill

GET   /me
PATCH /me

GET   /seller/returns
PATCH /seller/returns/:id
GET   /admin/returns
PATCH /admin/returns/:id

GET   /admin/sellers?status=pending
PATCH /admin/sellers/:id/verify

GET   /admin/users
PATCH /admin/users/:id/deactivate

GET   /categories
POST  /categories
PATCH /categories/:id
DELETE /categories/:id

GET   /sales
POST  /admin/sales
PATCH /admin/sales/:id

GET   /admin/coupons
POST  /admin/coupons
PATCH /admin/coupons/:id

GET   /seller/reviews

GET   /admin/dashboard/summary
```

## Build Order

1. `npx create-expo-app` scaffold (`application/`), configure TypeScript, expo-router, EAS project.
2. Set up `expo-doctor` as a CI check immediately, before any other dependency is added.
3. Auth: login screen, token storage (`expo-secure-store`), role-based route gating (seller stack vs admin stack).
4. Generate API client from `api/`'s OpenAPI spec.
5. Seller flows: product list → create/edit (title/category/images, then rich description sections + spec table + FAQ editor, then warranty/return-window/serviceability fields, then pricing/discount/sale opt-in, then variants + per-variant images) → inventory update (with low-stock threshold) → order queue (with filters) → order fulfillment → returns → own reviews list → account screen.
6. Admin flows: seller verification queue → user management → category management → sale management → coupon management → returns queue → dashboard summary.

## Verification

- Run via Expo Go / iOS-Android simulator.
- Walk: seller login → create product with photo, description sections, specs, FAQ, warranty, and serviceable pincodes → confirm it renders correctly on the website (cross-check against `website/` running locally) → simulate a website order → confirm it appears in the seller's order queue → mark fulfilled.
- Walk: admin login → approve a pending seller → confirm that seller can now create products (verification gating enforced).
- Walk: admin creates a sale window and a coupon → seller opts a product into the sale with a sale price → confirm the website shows the sale price only while the window is active, and that the coupon is accepted at checkout.
- Walk: customer (via website) submits a review after a completed order → confirm it shows in the seller's reviews list and both the product's and seller's `ratingSummary` (including delivery/packaging breakdown, when submitted) update.
- Walk: drop a SKU's stock below its threshold → confirm the seller gets exactly one low-stock alert, not one per subsequent order.
- Walk: customer requests a return on a delivered item within the return window → confirm it appears in both the seller's and admin's returns queue, and approving/completing it updates status visible to the customer.
- Verify the order queue's status/date filters narrow results correctly for a seller with orders in multiple states.
- Confirm `npx expo-doctor` runs clean before the app's first commit and stays clean in CI.
- Confirm a seller cannot see or edit another seller's products/inventory/reviews/returns (authorization test, not just UI check).
- Confirm reviews remain fully read-only in this app — no create/edit/delete affordance anywhere, even for admin.

---

*This is a planning document. No code has been scaffolded yet.*
