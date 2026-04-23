ALTER TABLE "assets" ADD COLUMN "qrCodeToken" TEXT;
ALTER TABLE "assets" ADD COLUMN "qrCodeGeneratedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "assets"
SET "qrCodeToken" = 'qr_' || substr(md5(random()::text || "id" || clock_timestamp()::text), 1, 24)
WHERE "qrCodeToken" IS NULL;

ALTER TABLE "assets" ALTER COLUMN "qrCodeToken" SET NOT NULL;
CREATE UNIQUE INDEX "assets_qrCodeToken_key" ON "assets"("qrCodeToken");
