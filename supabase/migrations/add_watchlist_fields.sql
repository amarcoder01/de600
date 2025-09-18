-- Add missing fields to WatchlistItem table
ALTER TABLE "WatchlistItem" 
ADD COLUMN "exchange" TEXT,
ADD COLUMN "sector" TEXT,
ADD COLUMN "industry" TEXT,
ADD COLUMN "volume" DOUBLE PRECISION,
ADD COLUMN "marketCap" DOUBLE PRECISION,
ADD COLUMN "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Update existing records to have addedAt timestamp
UPDATE "WatchlistItem" 
SET "addedAt" = "lastUpdated" 
WHERE "addedAt" IS NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS "WatchlistItem_symbol_idx" ON "WatchlistItem"("symbol");
CREATE INDEX IF NOT EXISTS "WatchlistItem_sector_idx" ON "WatchlistItem"("sector");
CREATE INDEX IF NOT EXISTS "WatchlistItem_addedAt_idx" ON "WatchlistItem"("addedAt");