CREATE TYPE "location_kind" AS ENUM ('room', 'storage');
CREATE TYPE "asset_status" AS ENUM ('available', 'in_use', 'missing', 'in_repair', 'retired');
CREATE TYPE "asset_event_type" AS ENUM ('asset_created', 'asset_updated', 'moved', 'checked_out', 'returned', 'marked_missing', 'marked_in_repair', 'restored_to_available', 'retired', 'audit_started', 'audit_scanned', 'audit_completed');
CREATE TYPE "audit_status" AS ENUM ('in_progress', 'completed', 'cancelled');
CREATE TYPE "audit_result_type" AS ENUM ('expected_found', 'unexpected_found', 'duplicate_scan');

CREATE TABLE "asset_types" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "prefix" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "asset_types_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "locations" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "kind" "location_kind" NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "assets" (
  "id" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "assetTypeId" TEXT NOT NULL,
  "serialNumber" TEXT,
  "purchaseDate" TIMESTAMP(3),
  "cost" DECIMAL(10,2),
  "consumable" BOOLEAN NOT NULL DEFAULT false,
  "homeLocationId" TEXT NOT NULL,
  "currentLocationId" TEXT NOT NULL,
  "status" "asset_status" NOT NULL DEFAULT 'available',
  "notes" TEXT,
  "referenceImageUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "asset_events" (
  "id" TEXT NOT NULL,
  "assetId" TEXT,
  "eventType" "asset_event_type" NOT NULL,
  "fromLocationId" TEXT,
  "toLocationId" TEXT,
  "previousStatus" "asset_status",
  "newStatus" "asset_status",
  "handledBy" TEXT,
  "remarks" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "asset_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_sessions" (
  "id" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "startedBy" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "status" "audit_status" NOT NULL DEFAULT 'in_progress',
  "notes" TEXT,
  CONSTRAINT "audit_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_scans" (
  "id" TEXT NOT NULL,
  "auditSessionId" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "resultType" "audit_result_type" NOT NULL,
  "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_scans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "app_users" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "app_users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "asset_types_name_key" ON "asset_types"("name");
CREATE UNIQUE INDEX "asset_types_prefix_key" ON "asset_types"("prefix");
CREATE UNIQUE INDEX "locations_name_key" ON "locations"("name");
CREATE UNIQUE INDEX "assets_assetId_key" ON "assets"("assetId");
CREATE UNIQUE INDEX "app_users_email_key" ON "app_users"("email");

CREATE INDEX "assets_assetTypeId_idx" ON "assets"("assetTypeId");
CREATE INDEX "assets_homeLocationId_idx" ON "assets"("homeLocationId");
CREATE INDEX "assets_currentLocationId_idx" ON "assets"("currentLocationId");
CREATE INDEX "assets_status_idx" ON "assets"("status");
CREATE INDEX "asset_events_assetId_idx" ON "asset_events"("assetId");
CREATE INDEX "asset_events_eventType_idx" ON "asset_events"("eventType");
CREATE INDEX "asset_events_fromLocationId_idx" ON "asset_events"("fromLocationId");
CREATE INDEX "asset_events_toLocationId_idx" ON "asset_events"("toLocationId");
CREATE INDEX "asset_events_handledBy_idx" ON "asset_events"("handledBy");
CREATE INDEX "asset_events_createdAt_idx" ON "asset_events"("createdAt");
CREATE INDEX "audit_sessions_locationId_idx" ON "audit_sessions"("locationId");
CREATE INDEX "audit_sessions_status_idx" ON "audit_sessions"("status");
CREATE INDEX "audit_scans_auditSessionId_idx" ON "audit_scans"("auditSessionId");
CREATE INDEX "audit_scans_assetId_idx" ON "audit_scans"("assetId");
CREATE INDEX "app_users_isActive_idx" ON "app_users"("isActive");

ALTER TABLE "assets" ADD CONSTRAINT "assets_assetTypeId_fkey" FOREIGN KEY ("assetTypeId") REFERENCES "asset_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assets" ADD CONSTRAINT "assets_homeLocationId_fkey" FOREIGN KEY ("homeLocationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assets" ADD CONSTRAINT "assets_currentLocationId_fkey" FOREIGN KEY ("currentLocationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "asset_events" ADD CONSTRAINT "asset_events_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "asset_events" ADD CONSTRAINT "asset_events_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "asset_events" ADD CONSTRAINT "asset_events_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_sessions" ADD CONSTRAINT "audit_sessions_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_scans" ADD CONSTRAINT "audit_scans_auditSessionId_fkey" FOREIGN KEY ("auditSessionId") REFERENCES "audit_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_scans" ADD CONSTRAINT "audit_scans_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
