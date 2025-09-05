-- Add notes field to PaperPosition table for risk management
-- This migration adds the notes field to support storing stop-loss, take-profit, and trailing stop parameters

-- Add notes column to PaperPosition table
ALTER TABLE IF EXISTS "PaperPosition" 
ADD COLUMN IF NOT EXISTS "notes" TEXT;

-- Add comment to explain the purpose of the notes field
COMMENT ON COLUMN "PaperPosition"."notes" IS 'Stores risk management parameters (stop-loss, take-profit, trailing stop) as JSON string';

-- Update existing records to have empty notes
UPDATE "PaperPosition" 
SET "notes" = NULL 
WHERE "notes" IS NULL;
