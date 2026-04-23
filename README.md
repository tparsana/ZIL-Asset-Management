# ZIL Asset Manager

Operational asset tracking for the Zoom Innovation Lab. Built with Next.js 16, React 19, TypeScript, Tailwind CSS, Prisma, and Neon Postgres.

## Features

- Asset inventory with asset types, serials, purchase metadata, consumable tracking, home location, current location, and status.
- Immutable event log for creates, updates, moves, checkouts, returns, missing/repair transitions, retirements, and audits.
- Location tracking for Room 140, Room 135, Room 134, Room 133, ZIL Store, and Upstairs Storage.
- Backend-connected dashboard, inventory, location, history, scan, audit, and settings workflows.
- App-generated QR codes for each asset, including download/regenerate controls and camera QR scanning.

## Environment

Create `.env.local` from `.env.example` and add your Neon connection string. The app also requires a simple shared-login gate configured through environment variables:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST.neon.tech/DB?sslmode=require"
BASIC_AUTH_EMAIL="your-login-email@example.com"
BASIC_AUTH_PASSWORD="your-strong-password"
AUTH_SECRET="replace-with-a-long-random-secret"
```

Use Neon's pooled connection string for serverless deployments when available.
Restart `npm run dev` after changing environment variables.
If these auth variables are missing, login stays disabled until you set them.

## Setup

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

Open `http://localhost:3000`.

## Database

The Prisma schema lives in `prisma/schema.prisma`, with the initial migration in `prisma/migrations/20260423000000_initial_asset_manager/`.

Seed data creates:

- Locations: Room 140, Room 135, Room 134, Room 133, ZIL Store, Upstairs Storage.
- Asset types: Camera, Battery, SD Card, Tripod, Microphone, Cable, Light, Accessory.

No fake assets are seeded.

## Routes

| Page | Path | Purpose |
| --- | --- | --- |
| Dashboard | `/` | Operational counts, recent activity, location summary |
| Scan Asset | `/scan` | Asset lookup and single-asset mutations |
| Inventory | `/inventory` | Searchable/filterable asset catalog |
| Asset Details | `/assets/[id]` | Asset details and history |
| History | `/history` | Immutable event log |
| Locations | `/locations` | Location counts and details |
| Audit Mode | `/audit` | Location audit sessions and scan reconciliation |
| Login | `/login` | Shared device login gate |
| Settings | `/settings` | Add assets, manage asset types, locations, and users |

Batch add is built into `/scan`. Legacy `/batch` and `/batch-scan` routes redirect to `/scan`.

## Development

```bash
npm run build
npx tsc --noEmit
```

Image upload storage is not implemented yet. The schema and Add Asset form support a `referenceImageUrl` field so storage can be added without changing the asset model.

## QR Codes

Every asset stores a unique QR token. The QR payload is independent from the visible Asset ID, so the asset ID can be edited without breaking existing QR lookup. Regenerating a QR code creates a new token and invalidates older printed labels for that asset.
