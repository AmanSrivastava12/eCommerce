# eCommerce Ecosystem — Overview & Backend Plan

## Context

Building a Flipkart/Amazon-style eCommerce ecosystem consisting of three separately-created projects under one root:
1. **website/** — public storefront where customers browse and purchase products.
2. **application/** — native mobile app used by sellers to list products and by admins to manage the platform.
3. **api/** — shared NestJS backend both of the above call over HTTP. One backend because catalog, orders, and inventory must stay consistent between what a seller lists and what a customer sees — two independent backends would need constant syncing for the same data.

Detailed, product-specific plans (including full DB schema relevant to each) live in:
- [website-implementation-plan.md](./website-implementation-plan.md)
- [application-implementation-plan.md](./application-implementation-plan.md)

This document covers the shared root structure and the backend itself.

## Root Directory Structure

```
eCommerce/
  website/         # Next.js customer storefront (own package.json, standalone project)
  application/      # React Native (Expo) seller/admin app (own package.json, standalone project)
  api/              # NestJS backend (own package.json, standalone project)
  docs/             # Planning docs (this folder)
```

Unlike a monorepo, each of the three is its own independent project (own `package.json`, own dependency tree, own repo-root tooling). They integrate purely over HTTP via the API's OpenAPI spec — `website` and `application` each generate/maintain their own typed API client from that spec rather than sharing a workspace package. This matches the requirement that website and application "need to be created separately."

## UI/UX Direction

Both frontends should feel modern and smooth, not a bare CRUD interface. Concretely:
- **Motion**: subtle transitions on route/tab changes, list-item add/remove, and cart/wishlist actions (Framer Motion on the website, `react-native-reanimated` — already an Expo-supported library — on the app), kept short (150-250ms) so it reads as responsive, not decorative.
- **Loading states**: skeleton placeholders for product grids/detail pages instead of spinners, since content layout is known ahead of the data arriving.
- **Feedback**: optimistic UI for cart/wishlist add-remove (update instantly, roll back on API failure) so actions feel instant despite the network round trip.
- **Design consistency**: a shared design-token set (color, spacing, type scale, border radius) defined once per project — Tailwind theme config for `website`, a matching theme object for `application` — so the two feel like one brand even though they're separate codebases.
- **Component quality bar**: proper empty states, error states, and disabled/loading button states on every list and form, not just the happy path.

This is a cross-cutting expectation applied throughout both product-specific plans, not a separate build phase.

## Backend (api/ — NestJS)

- **auth** — JWT (access + refresh), role guards for `customer` / `seller` / `admin`. Refresh tokens stored in Redis.
- **users** (Mongo) — customer, seller, and admin profiles; seller verification status.
- **catalog** (Mongo) — products, categories, images (S3/Cloudinary), owned by seller. Emits events to keep Meilisearch synced.
- **inventory** (Postgres) — stock per SKU, decremented inside DB transactions to prevent overselling under concurrent orders.
- **cart** (Mongo/Redis) — per-user cart; Redis TTL for guest carts.
- **orders** (Postgres) — order creation as a single DB transaction (inventory decrement + order insert); status state machine: `placed → paid → shipped → delivered → cancelled`.
- **payments** — Stripe PaymentIntents + webhook handler that confirms payment and transitions order status.
- **search** — Meilisearch client wrapper, reindexed on catalog change events via a queued job.
- **notifications** — queued email jobs (order confirmation, seller new-order alert).
- **reviews** (Mongo) — per-variant reviews/ratings, verified-purchase enforcement, denormalized rating recalculation (product + seller, seller broken down by category) whenever a review lands.
- **sales** (Mongo) — admin-managed sale windows; products opt in with a sale price that auto-reverts once the window ends.
- **coupons** (Mongo) — cart-level discount codes, validated on apply and re-validated at checkout.
- **wishlist** (Mongo) — per-customer saved products/variants.
- **returns** (Postgres) — return/replacement requests against a delivered order item, within the product's return window.
- Low-stock alerting, order cancellation, and abandoned-cart reminders are cross-cutting behaviors inside `inventory`, `orders`, and `notifications` respectively (see schema notes below), not separate modules.

Cross-cutting: global exception filter, DTO validation via `class-validator`, and a Swagger/OpenAPI spec at `/api/docs` that both `website` and `application` use to generate their own typed clients.

## Full Database Schema (owned by api/, referenced by both frontends)

### MongoDB collections

**`users`**
```
_id: ObjectId
email: string (unique, indexed)
passwordHash: string
role: "customer" | "seller" | "admin"
name: string
phone: string | null
addresses: [{ label, line1, line2, city, state, postalCode, country, phone, isDefault }]
sellerProfile: {                     // present only when role = "seller"
  businessName: string
  verificationStatus: "pending" | "verified" | "rejected"
  verifiedAt: Date | null
  payoutDetails: { bankAccountRef: string } | null
  ratingSummary: {                     // denormalized, recalculated whenever a review lands on one of this seller's products
    overall: { average: number, count: number }
    productQuality: { average: number, count: number }
    deliveryTimeliness: { average: number, count: number }
    packaging: { average: number, count: number }
  }
} | null
createdAt: Date
updatedAt: Date
```
Each address carries its own `phone` (e.g. a different contact number for a work vs. home address) in addition to the account-level `phone`.

**`products`**
```
_id: ObjectId
sellerId: ObjectId (ref users, indexed)
title: string
categoryId: ObjectId (ref categories, indexed)
description: {
  short: string                       // 1-2 line summary shown near the price
  sections: [{ heading, content }]    // e.g. "About this item", "Design", "Care Instructions"
  specifications: [{ group, items: [{ key, value }] }]   // grouped spec table, e.g. group "General" -> [{key:"Brand",value:"..."}]
}
faqs: [{ question, answer }]          // per-product FAQ section
images: {
  main: string                        // primary listing/thumbnail image
  gallery: [string]                   // additional product-level images
}
pricing: {
  basePrice: number
  currency: string                    // e.g. "INR", "USD"
  discountPercent: number | null      // e.g. 20 -> shown as basePrice struck through, discounted price displayed
  discountAmount: number | null       // flat-amount alternative to discountPercent (mutually exclusive)
  activeSaleId: ObjectId | null       // ref sales, set when this product is enrolled in a sale
  salePrice: number | null            // price while that sale is active; reverts to basePrice (minus discount) once the sale ends
}
variants: [{
  sku, attributes: { size, color, ... },
  priceOverride: number | null,
  images: [string]                    // images specific to this variant, e.g. a colorway's own photos
}]
fulfillment: {
  warranty: string | null             // e.g. "1 Year Manufacturer Warranty"
  isAssured: boolean                  // platform "assured/verified quality" badge, admin- or rule-toggled
  returnWindowDays: number | null     // e.g. 7; null = no returns accepted
  shipsFromPincode: string
  serviceablePincodes: [string] | null   // null = ships pan-country; otherwise an explicit allow-list
  estimatedDeliveryDays: number       // shown on product page after a pincode check
}
ratingSummary: { average: number, count: number }   // denormalized from reviews, recalculated on new review
status: "draft" | "active" | "inactive"
createdAt: Date
updatedAt: Date
```
Effective displayed price (computed at read time, not stored): if `activeSaleId` references a currently-active sale (see `sales` below), show `salePrice`; otherwise show `basePrice` minus `discountPercent`/`discountAmount` if set, with `basePrice` shown struck through. When the sale's `endAt` passes, the product automatically reverts to its normal price since the effective-price calculation checks the sale's active window rather than storing a flag that must be manually cleared.

Pincode serviceability check (`GET /products/:id/serviceability?pincode=`) compares the input against `serviceablePincodes` (or accepts any if `null`) and returns `estimatedDeliveryDays`; this is a v1-simple allow-list model, not live courier-API integration.

**`categories`**
```
_id: ObjectId
name: string
slug: string (unique, indexed)
parentId: ObjectId | null            // self-reference for nested categories
imageUrl: string | null
```

**`sales`**
```
_id: ObjectId
name: string                         // e.g. "Big Billion Days"
slug: string (unique, indexed)
startAt: Date
endAt: Date
createdAt: Date
```
A sale is "active" purely based on `now()` falling between `startAt` and `endAt` — no separate status flag to keep in sync. Admin creates/edits sales; sellers opt specific products into a sale by setting `activeSaleId` + `salePrice` on the product.

**`reviews`**
```
_id: ObjectId
productId: ObjectId (indexed)
sku: string                          // the exact variant being reviewed, not just the product
userId: ObjectId
orderId: string                      // references Postgres orders.id, used to enforce "verified purchase"
rating: number (1-5)                 // overall / product-quality rating
deliveryRating: number (1-5) | null  // optional, feeds the seller's deliveryTimeliness breakdown
packagingRating: number (1-5) | null // optional, feeds the seller's packaging breakdown
title: string | null
comment: string
images: [string]
createdAt: Date
```
Review/rating authorization rule: only an authenticated (logged-in) user who has an order containing that exact `productId` + `sku` may post a review for it — this is checked server-side on `POST /products/:id/reviews` by querying `order_items` for `product_id = :id AND sku = :sku AND order_items.order_id IN (orders where user_id = current user)`, not inferred from the client. An unauthenticated request is rejected by the `auth` guard before reaching this check; a logged-in user who never ordered that variant is rejected by this check specifically (distinct 403 reasons, so the frontend can show "sign in to review" vs. "you can review this after purchasing it"). One review per user per `productId`+`sku` (upsert, not duplicate). On create, a queued job recalculates `products.ratingSummary` (from `rating`) and `users.sellerProfile.ratingSummary` for the owning seller — `overall`/`productQuality` from `rating` across all their products' reviews, `deliveryTimeliness`/`packaging` from the optional per-review sub-ratings where present.

**`wishlists`**
```
_id: ObjectId
userId: ObjectId (indexed)
items: [{ productId, sku, addedAt }]
```

**`coupons`**
```
_id: ObjectId
code: string (unique, indexed)       // e.g. "WELCOME10"
discountType: "percent" | "flat"
discountValue: number
minCartValue: number | null
maxDiscountAmount: number | null     // cap applied when discountType = "percent"
validFrom: Date
validTo: Date
usageLimitPerUser: number | null
active: boolean
```

**`carts`**
```
_id: ObjectId
userId: ObjectId | null              // null for guest carts
guestSessionId: string | null        // set for guest carts
items: [{ productId, sku, quantity, priceAtAdd }]
appliedCoupons: [{ code, discountType, discountValue, discountApplied }]   // validated against `coupons` at apply-time and again at checkout
updatedAt: Date
lastActivityAt: Date                 // bumped on any cart mutation; a repeatable BullMQ job scans carts idle past a threshold (e.g. 24h) with items and no resulting order, and queues an abandoned-cart reminder email via `notifications`
expiresAt: Date                      // TTL index, guest carts only
```

### PostgreSQL tables

**`inventory`**
```
sku                  varchar   PRIMARY KEY
product_id           varchar   NOT NULL          -- references Mongo products._id (string form)
seller_id            varchar   NOT NULL          -- references Mongo users._id
quantity             integer   NOT NULL DEFAULT 0
reserved_qty         integer   NOT NULL DEFAULT 0   -- held during checkout, released on failure/timeout
low_stock_threshold  integer   NOT NULL DEFAULT 5   -- below this, a queued job notifies the seller
updated_at           timestamptz NOT NULL DEFAULT now()
```
On every decrement, if `quantity <= low_stock_threshold` the `inventory` module emits a job picked up by `notifications` to alert the owning seller — debounced so it fires once per drop below threshold, not on every subsequent order.

**`orders`**
```
id                     uuid       PRIMARY KEY DEFAULT gen_random_uuid()
user_id                varchar    NOT NULL      -- references Mongo users._id
status                 varchar    NOT NULL      -- placed | paid | shipped | delivered | cancelled
cancellable_until      timestamptz NULL         -- set at creation (e.g. now() + 1h); customer self-cancel allowed only while status = placed/paid AND now() < this
subtotal               numeric(10,2) NOT NULL
discount_total         numeric(10,2) NOT NULL DEFAULT 0   -- sum of applied coupon discounts
coupon_codes           varchar[]  NOT NULL DEFAULT '{}'   -- coupons applied at checkout, snapshotted from the cart
tax                    numeric(10,2) NOT NULL DEFAULT 0
shipping_fee           numeric(10,2) NOT NULL DEFAULT 0
total                  numeric(10,2) NOT NULL
currency               varchar    NOT NULL
stripe_payment_intent  varchar    NULL
shipping_address       jsonb      NOT NULL
shipping_phone         varchar    NOT NULL      -- snapshotted from the chosen address's phone at order time
created_at             timestamptz NOT NULL DEFAULT now()
updated_at             timestamptz NOT NULL DEFAULT now()
```

**`order_items`**
```
id             uuid       PRIMARY KEY DEFAULT gen_random_uuid()
order_id       uuid       NOT NULL REFERENCES orders(id)
product_id     varchar    NOT NULL       -- references Mongo products._id
sku            varchar    NOT NULL REFERENCES inventory(sku)
seller_id      varchar    NOT NULL       -- references Mongo users._id, for seller order-queue filtering
quantity       integer    NOT NULL
unit_price     numeric(10,2) NOT NULL
subtotal       numeric(10,2) NOT NULL
```

**`payments`**
```
id                     uuid       PRIMARY KEY DEFAULT gen_random_uuid()
order_id               uuid       NOT NULL REFERENCES orders(id)
stripe_payment_intent  varchar    NOT NULL UNIQUE
status                 varchar    NOT NULL     -- requires_payment | succeeded | failed
amount                 numeric(10,2) NOT NULL
currency               varchar    NOT NULL
created_at             timestamptz NOT NULL DEFAULT now()
```

**`return_requests`**
```
id             uuid       PRIMARY KEY DEFAULT gen_random_uuid()
order_item_id  uuid       NOT NULL REFERENCES order_items(id)
requested_by   varchar    NOT NULL      -- references Mongo users._id
reason         varchar    NOT NULL
status         varchar    NOT NULL DEFAULT 'requested'   -- requested | approved | rejected | completed
created_at     timestamptz NOT NULL DEFAULT now()
updated_at     timestamptz NOT NULL DEFAULT now()
```
Creatable only while `order_items.order_id` has `status = 'delivered'` and within that product's `fulfillment.returnWindowDays` of the delivery date; seller/admin transitions `status` through approval to completion.

Note: `product_id`/`seller_id`/`user_id`/`requested_by` are stored as strings referencing Mongo ObjectIds rather than foreign keys, since they cross databases — referential integrity for those is enforced at the application layer, not the DB layer.

## MVP Scope (v1) vs. Later

**v1**: browsing/search, wishlist, cart with coupon application, delivery pincode/serviceability check, checkout with real Stripe payment, seller product CRUD (rich description/specs/FAQ, warranty/assured badge, sale pricing, variant images), reviews/ratings per variant with seller rating rollup (broken down by product quality/delivery/packaging), order placement/fulfillment, customer self-cancellation window, return/replacement requests, low-stock seller alerts, abandoned-cart reminders, seller verification + basic admin controls (including sale/coupon management), auth/roles.

**Later phases (explicitly out of scope for v1)**: recommendations, multi-seller shipping splits, full analytics dashboards, push notifications, buyer Q&A (distinct from seller-authored FAQ), live courier-API delivery estimates (v1 uses a simple pincode allow-list, not real-time logistics integration).

## Backend Build Order

1. Scaffold `api/` NestJS project; set up Mongo + Postgres connections, Redis, BullMQ.
2. `auth` + `users` modules first (everything else depends on them).
3. `catalog` module, then `cart` / `orders` / `inventory` / `payments` together (transactionally linked).
4. `search` + `notifications` modules.
5. Publish OpenAPI spec at `/api/docs` — both `website` and `application` generate their clients from it.
6. Wire Stripe webhooks + Meilisearch indexing end-to-end.

## Verification Plan (backend)

- Unit tests per module (Jest).
- e2e test for the critical path: create product → add to cart → checkout → Stripe webhook → order marked paid → inventory decremented exactly once.
- Concurrency test confirming no overselling under simultaneous order attempts on the same SKU.
- Test that a low-stock notification fires exactly once when quantity crosses `low_stock_threshold`, not on every order after.
- Test that order self-cancellation is rejected once `cancellable_until` has passed or status has moved beyond `paid`.
- Test that a return request is rejected outside the product's `returnWindowDays` or before the order item is `delivered`.
- Test the abandoned-cart job only fires for carts with items, past the idle threshold, with no resulting order.

---

*This is a planning document. No code has been scaffolded yet.*
