# eCommerce API

NestJS backend shared by `website/` and `application/`. See `/opt/eCommerce/docs/implementation-plan.md` for the full design.

## Prerequisites

- Node 20+
- MongoDB running locally (or update `MONGO_URI`)
- PostgreSQL running locally (or update `POSTGRES_URL`)
- Redis running locally (or update `REDIS_HOST`/`REDIS_PORT`)
- (Optional for search) Meilisearch running at `MEILISEARCH_HOST` — the app degrades gracefully (empty results, logged warnings) if it's unreachable
- A Stripe test secret key for `STRIPE_SECRET_KEY`

## Setup

```bash
cp .env.example .env   # then fill in real values
npm install
npm run start:dev
```

API is served under `/api` (e.g. `http://localhost:3000/api/products`). Swagger docs at `http://localhost:3000/api/docs`. Health check at `http://localhost:3000/health` (unprefixed).

## Seeding dummy data

`seed/seed.ts` populates the real Mongo/Postgres tables with demo categories, sellers, products (with variants, images, pricing, sale, fulfillment info), inventory, reviews (each backed by a real delivered order so the verified-purchase rule holds up), a coupon, and a sale. It's **additive and idempotent** — upserts by natural key (email, slug, sku, title+seller) — so it's safe to re-run, and anything a real user adds through the website/app afterward shows up right alongside it, since it's the same database, not a separate mock layer.

```bash
# with the API's MongoDB/Postgres already running and reachable via .env
npm run start:dev    # first run once — lets TypeORM `synchronize` create the Postgres tables
# stop it, then:
npm run seed
```

Seeded sign-in accounts (see `seed/data/users.json` for the full list):

| Role | Email | Password |
|---|---|---|
| Admin | `admin@shopwave.test` | `Password123!` |
| Seller | `seller1@shopwave.test` | `Password123!` |
| Seller | `seller2@shopwave.test` | `Password123!` |
| Customer | `customer1@shopwave.test` | `Password123!` |
| Customer | `customer2@shopwave.test` | `Password123!` |

Edit the JSON files under `seed/data/` to add more dummy products/categories/reviews — the script reads them by index/slug/sku, not by count, so you can add or remove entries freely.

> **Note on this sandbox**: this seed script was type-checked against the real Mongoose schemas and TypeORM entities (so its data shapes are guaranteed to match what the API actually expects), and the full backend still builds cleanly with it in place — but it could not be run end-to-end against live databases in this environment because Docker Hub image pulls for MongoDB were too slow/unreliable here. Run it in your own environment with Mongo/Postgres/Redis available and verify it end-to-end before relying on it.

## Notes on this scaffold

- `TypeOrmModule` is configured with `synchronize: true` for local development convenience — replace with real migrations before production.
- `NotificationsProcessor` logs instead of sending real email/push — wire up a provider (Resend/SendGrid/Expo push) before going live.
- `PaymentsService` requires a real Stripe key to create PaymentIntents; the webhook route (`/payments/webhook`) needs `STRIPE_WEBHOOK_SECRET` set to verify signatures.
