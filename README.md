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
BASIC_AUTH_NAME="Your Workspace Name"
BASIC_AUTH_EMAIL="your-login-email@example.com"
BASIC_AUTH_PASSWORD="your-strong-password"
AUTH_SECRET="replace-with-a-long-random-secret"
```

Use Neon's pooled connection string for serverless deployments when available.
Restart `npm run dev` after changing environment variables.
If these auth variables are missing, login stays disabled until you set them.
`BASIC_AUTH_NAME` is optional, but it lets you control the display name shown in the account menu.

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

## Reset To Launch State

If you want to go live with a clean database while keeping the full schema and app features intact, reset only the operational data and then re-seed the baseline catalog:

```bash
CONFIRM_RESET=RESET_ZIL_ASSETS npm run prisma:reset-app-data
```

This reset:

- deletes assets
- deletes asset events / transaction logs
- deletes audit sessions and audit scans
- deletes app users from the handler list
- clears and re-seeds the canonical locations and asset types

This does **not**:

- change the Prisma schema or migrations
- remove code or features
- touch your auth environment variables
- delete uploaded files under `public/uploads/assets`

Before running it, make sure `.env.local` or your production environment points at the exact database you want to wipe.

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
