# Backend Integration

The app is wired to a real Prisma/Neon Postgres backend. Runtime UI paths no longer use mock data.

## Core Files

- `prisma/schema.prisma` defines the relational schema and enums.
- `prisma/migrations/20260423000000_initial_asset_manager/migration.sql` creates the initial Postgres schema.
- `prisma/seed.js` seeds canonical ZIL locations and asset types.
- `lib/db/prisma.ts` provides the Prisma client.
- `lib/validators/assets.ts` contains Zod validation for mutations and filters.
- `lib/services/*` contains backend business logic for assets, events, locations, dashboard, catalog data, and audits.
- `app/api/*` exposes backend-connected route handlers.

## Operational Rules

- Supported statuses are `Available`, `In Use`, `Missing`, `In Repair`, and `Retired`.
- Storage is represented by `Location.kind = storage`, not by asset status.
- Every asset mutation creates an `AssetEvent`.
- Audit sessions and scans are persisted, and missing assets are computed from expected home-location assets minus scanned expected assets.
- Asset IDs can be manually supplied or auto-generated from asset type prefixes.

## API Surface

- `GET /api/dashboard`
- `GET /api/assets`
- `POST /api/assets`
- `GET /api/assets/[id]`
- `PATCH /api/assets/[id]`
- `DELETE /api/assets/[id]`
- `POST /api/assets/[id]/scan`
- `POST /api/batch`
- `GET /api/events`
- `GET /api/locations`
- `POST /api/locations`
- `GET /api/asset-types`
- `POST /api/asset-types`
- `GET /api/users`
- `POST /api/users`
- `POST /api/audits/start`
- `GET /api/audits/[id]`
- `POST /api/audits/[id]`
- `PUT /api/audits/[id]`

## Local Setup

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

Set `DATABASE_URL` in `.env.local` before running migrations or the app. Restart the dev server after changing environment variables.
