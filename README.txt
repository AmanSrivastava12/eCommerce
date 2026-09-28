SHOPWAVE — eCommerce monorepo
=============================

  api/           NestJS backend (MongoDB + PostgreSQL + Redis/BullMQ, Stripe payments)
  website/       Next.js customer storefront
  application/   Shopwave Seller Hub — Expo app for sellers and admins
  customer-app/  Shopwave — Expo customer app (mirrors the website)
  docs/          Plans and project-history.md (what was built, deployment, open items)

LOCAL DEVELOPMENT
  1. Start the databases (they do not auto-restart after a reboot):
       docker start ecommerce-postgres ecommerce-redis ecommerce-mongo
  2. API:      cd api && npm install && npm run start:dev          (port 3000)
     Seed:     npm run seed      Remove seed data:  npm run unseed
  3. Website:  cd website && npm install && npm run dev -- -p 3001
  4. Apps:     cd application (or customer-app) && npm install && npx expo start
     Set EXPO_PUBLIC_API_BASE_URL in the app's .env (a phone needs the LAN IP, not localhost).

Each project has a .env.example; copy it to .env (website: .env.local) and fill in values.
Requires Node 22.12+.

NOT IN GIT (keep a backup): the .env files, the "reference" file with demo logins, and each
app's app.json, eas.json and .easignore. The apps can't run or build without app.json/eas.json.
See "Files kept out of git" in docs/project-history.md.

DEPLOYMENT (free tier)
  API        Render (render.yaml) — https://shopwave-api-wdn4.onrender.com/api
  Databases  Neon (Postgres), MongoDB Atlas M0, Render Key Value (Redis)
  Website    Vercel, root directory "website"
  Apps       EAS APK builds: npm run build:apk in each app folder (API URL comes from eas.json)

Read docs/project-history.md first: history, conventions, deployment details and open items.
