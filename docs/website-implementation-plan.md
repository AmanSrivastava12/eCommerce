# Website Implementation Plan (website/)

## Purpose

Public, customer-facing storefront — browse, search, cart, checkout, order tracking. SEO and page-load speed matter directly (anonymous shoppers arrive via search engines).

## Stack

- **Framework**: Next.js (React, TypeScript) — App Router, SSR for product/category pages, ISR for catalog listing pages.
- **Server state**: React Query — caches API responses, handles refetch/invalidation.
- **Client state**: Zustand — cart UI state, kept in sync with the backend cart endpoint (not stored only client-side, so cart survives across devices for logged-in users).
- **Checkout**: Stripe Elements + Stripe.js.
- **Styling**: Tailwind CSS (fast to build a product-grid-heavy UI), with a shared design-token theme (color/spacing/type scale/radius) for a consistent, modern look.
- **Motion**: Framer Motion for page/route transitions, list add-remove, and micro-interactions (add-to-cart, wishlist toggle) — kept short (150-250ms) for a smooth, responsive feel rather than decorative animation.
- **API access**: typed client generated from `api/`'s OpenAPI spec (e.g. via `openapi-typescript` + a thin fetch wrapper), regenerated whenever the backend spec changes.

See [implementation-plan.md's UI/UX Direction](./implementation-plan.md#uiux-direction) for the shared design expectations (skeleton loading states, optimistic updates, empty/error states) that apply throughout this app.

## Project Structure

```
website/
  app/
    (shop)/
      page.tsx                 # home
      category/[slug]/page.tsx
      product/[id]/page.tsx
      search/page.tsx
    cart/page.tsx
    checkout/page.tsx
    orders/page.tsx
    orders/[id]/page.tsx
    account/page.tsx           # profile details
    account/addresses/page.tsx # saved addresses (add/edit/delete/set default)
    account/wishlist/page.tsx
    login/page.tsx
    register/page.tsx
  lib/
    api-client/                # generated + hand-written wrapper
    stores/                    # Zustand stores (cart)
    hooks/                     # React Query hooks per resource
  components/
    product/                   # ProductCard, ProductGallery, VariantPicker, PriceTag, SpecTable, FaqAccordion, PincodeCheck, WishlistButton
    filters/                   # FilterSidebar (category/price/rating), SortDropdown
    reviews/                   # ReviewList, ReviewForm, RatingStars, SellerRatingBadge (with category breakdown)
    cart/                      # includes CouponInput
    checkout/
    account/                   # AddressForm, AddressCard
    layout/                    # Header, Footer, Nav
  package.json
```

## Pages & Functional Scope (v1)

| Page | Functionality |
|---|---|
| Home | Featured categories, featured/best-selling products |
| Category listing | Paginated product grid with **filters** (category, price range, rating, brand/attribute facets, in-stock only) and **sort** (price low-high/high-low, rating, newest, best-selling); filter/sort state reflected in the URL query string so results are shareable/bookmarkable |
| Product detail | Main image + gallery + per-variant images, variant selection, price (with strikethrough base price / sale price when active), rich description (sections + grouped specs), warranty + "Assured" badge, FAQ accordion, seller rating badge (overall + quality/delivery/packaging breakdown), pincode serviceability check with estimated delivery, add-to-cart, add-to-wishlist, stock status |
| Product reviews (section on detail page) | Review list filtered to the selected variant, average rating + count, "write a review" form (overall + optional delivery/packaging ratings) gated to verified purchasers |
| Search | Meilisearch-backed full text search, same filter/sort component as category listing |
| Cart | View/edit quantities, remove items, apply/remove coupon code, subtotal + discount breakdown |
| Checkout | Shipping address (with per-address phone), Stripe payment, order review |
| Order confirmation | Order summary post-payment |
| Order history | List of past orders with a **status filter** (placed/paid/shipped/delivered/cancelled) and date-range filter; self-cancel button while within the order's cancellation window; "request return" on delivered items within the return window |
| Account | Profile details (name, email, phone), password change |
| Saved Addresses | List/add/edit/delete addresses, set default, per-address phone |
| Wishlist | Saved products/variants, move-to-cart action |
| Login/Register | Email/password auth against `api/` `auth` module |

## Data the Website Reads/Writes (schema it depends on)

The website is a consumer of the schema owned by `api/` (see [implementation-plan.md](./implementation-plan.md) for full canonical definitions). The subset it actively reads/writes:

**Reads**
- `products` (Mongo) — `title`, `description.{short,sections,specifications}`, `faqs`, `images.{main,gallery}`, `pricing.{basePrice,discountPercent,discountAmount,activeSaleId,salePrice}`, `variants[].{sku,attributes,priceOverride,images}`, `fulfillment.{warranty,isAssured,returnWindowDays,serviceablePincodes,estimatedDeliveryDays}`, `ratingSummary`, `status` (only `active` shown).
- `categories` (Mongo) — `name`, `slug`, `parentId` for nav/breadcrumbs.
- `sales` (Mongo) — `startAt`/`endAt` for the product's `activeSaleId`, to confirm the sale window is currently active before showing the sale price (also re-verified server-side at checkout, never trusted from the client alone).
- `reviews` (Mongo) — list scoped to `productId` + selected `sku`, for the reviews section.
- `users.sellerProfile.ratingSummary` (Mongo) — seller rating badge (overall + quality/delivery/packaging breakdown) shown on the product detail page.
- `wishlists` (Mongo) — the logged-in user's own saved items.
- `coupons` (Mongo) — validated (not browsed) when the user enters a code in the cart.
- `inventory` (Postgres) — `quantity - reserved_qty` per SKU, to show in-stock/out-of-stock state on product pages.
- `orders` + `order_items` (Postgres) — for the logged-in user's own order history only (`orders.user_id = current user`), including `cancellable_until` to decide whether to show a cancel button.
- `return_requests` (Postgres) — the logged-in user's own requests, to show status in order history.

**Writes**
- `carts` (Mongo) — create/update on add-to-cart, update-quantity, remove-item, apply/remove coupon (`appliedCoupons`). Guest carts keyed by `guestSessionId`, merged into the user's cart on login.
- `wishlists` (Mongo) — add/remove items for the logged-in user.
- `reviews` (Mongo) — create, only for a logged-in user with a completed order containing that exact `productId`/`sku` (server-enforced via the `auth` guard + an order-ownership check on every request — the UI hides the form for logged-out/non-purchasing users as a convenience, but the backend never trusts that alone).
- `users.addresses` (Mongo) — add/edit/delete/set-default from the Saved Addresses page; `users.name`/`phone` from the Account page.
- `orders` + `order_items` (Postgres) — created at checkout, inside the backend's transactional order-creation flow (website never writes these tables directly — always via the `POST /orders` API call, which re-validates any applied coupon and handles the inventory-decrement transaction server-side). `status` also transitions to `cancelled` via a dedicated cancel endpoint, gated server-side on `cancellable_until`.
- `return_requests` (Postgres) — create, only for the user's own delivered order items within `returnWindowDays`.
- `payments` (Postgres) — indirectly, via Stripe Elements client-side confirmation + the backend's webhook handler; website never writes this table directly either.

The website has **no write access** to `products`, `categories`, `inventory`, or `sales`/`coupons` definitions — those are seller/admin-owned via the `application/` app. It can only *apply* an existing coupon to a cart, not create one, and can only *request* a return, not approve it.

## API Endpoints Consumed (from api/)

```
GET  /products?category=&search=&page=&minPrice=&maxPrice=&minRating=&inStock=&sort=
GET  /products/:id
GET  /products/:id/serviceability?pincode=
GET  /categories
GET  /products/:id/reviews?sku=
POST /products/:id/reviews
GET  /wishlist
POST /wishlist/items
DELETE /wishlist/items/:sku
POST /cart/items
PATCH /cart/items/:sku
DELETE /cart/items/:sku
POST /cart/coupon
DELETE /cart/coupon/:code
GET  /cart
POST /orders                # creates order + Stripe PaymentIntent, re-validates coupon + sale pricing
GET  /orders?status=&from=&to=     # current user's orders, filterable
GET  /orders/:id
POST /orders/:id/cancel
POST /orders/:id/items/:itemId/return
GET  /me
PATCH /me
GET  /me/addresses
POST /me/addresses
PATCH /me/addresses/:id
DELETE /me/addresses/:id
POST /auth/login
POST /auth/register
POST /auth/refresh
```

## Build Order

1. Scaffold Next.js project (`website/`), Tailwind, ESLint/TS config.
2. Generate API client from `api/`'s OpenAPI spec; set up React Query provider.
3. Auth pages (login/register) + auth token handling (httpOnly cookie or secure storage).
4. Product browse/detail pages (SSR), category nav.
5. Filter/sort component (shared between category listing and search), URL-state-driven.
6. Search page wired to `/products?search=`.
7. Cart (Zustand + backend sync) with coupon input; wishlist pages.
8. Checkout with Stripe Elements, order confirmation page.
9. Account, Saved Addresses pages.
10. Order history pages, including status filter, self-cancel, and return-request actions.
11. Reviews section + pincode serviceability check on product detail.

## Verification

- `next dev`, manually walk: browse → product detail → add to cart → checkout with Stripe test card (`4242 4242 4242 4242`) → confirm order appears in order history.
- Verify guest cart merges correctly into user cart on login.
- Verify out-of-stock products cannot be added to cart / checked out (race with `application/`'s inventory updates).
- Verify sale pricing: a product with an active sale shows `salePrice`; after the sale's `endAt` passes, reload and confirm it reverts to `basePrice`/discount price automatically.
- Verify a review cannot be submitted while logged out, and cannot be submitted by a logged-in user without a completed order for that exact product+variant; confirm submitting a valid one updates both the product's and the seller's `ratingSummary`.
- Verify category/search filters (price range, rating, in-stock) and sort options narrow/order results correctly, and that reloading a filtered URL reproduces the same result set.
- Verify order history's status/date filters narrow the list correctly.
- Verify Saved Addresses CRUD (add/edit/delete/set-default) and that checkout correctly picks the default address.
- Verify a coupon rejected by the backend (expired, below `minCartValue`, usage limit hit) surfaces a clear error in the cart, and that the discount is recalculated server-side at checkout rather than trusted from client state.
- Verify the pincode check correctly blocks a non-serviceable pincode and shows an estimated delivery date for a serviceable one.
- Verify order self-cancel disappears once `cancellable_until` passes, and a return request can only be filed on a delivered item within its return window.
- Verify wishlist add/remove and "move to cart" round-trip correctly for a logged-in user.
- Lighthouse check on home + product detail pages for SEO/performance baseline.

---

*This is a planning document. No code has been scaffolded yet.*
