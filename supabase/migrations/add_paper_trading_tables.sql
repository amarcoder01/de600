-- Add Paper Trading Tables
-- This migration adds the necessary tables for paper trading functionality

-- Create PaperTradingAccount table
CREATE TABLE IF NOT EXISTS "PaperTradingAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "initialBalance" DOUBLE PRECISION NOT NULL DEFAULT 100000,
    "currentBalance" DOUBLE PRECISION NOT NULL DEFAULT 100000,
    "availableCash" DOUBLE PRECISION NOT NULL DEFAULT 100000,
    "totalValue" DOUBLE PRECISION NOT NULL DEFAULT 100000,
    "totalPnL" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPnLPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaperTradingAccount_pkey" PRIMARY KEY ("id")
);

-- Create PaperPosition table
CREATE TABLE IF NOT EXISTS "PaperPosition" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "averagePrice" DOUBLE PRECISION NOT NULL,
    "currentPrice" DOUBLE PRECISION NOT NULL,
    "marketValue" DOUBLE PRECISION NOT NULL,
    "unrealizedPnL" DOUBLE PRECISION NOT NULL,
    "unrealizedPnLPercent" DOUBLE PRECISION NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'stock',
    "exchange" TEXT,
    "sector" TEXT,
    "notes" TEXT, -- NEW: For storing risk management parameters
    "entryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaperPosition_pkey" PRIMARY KEY ("id")
);

-- Create PaperOrder table
CREATE TABLE IF NOT EXISTS "PaperOrder" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "price" DOUBLE PRECISION,
    "stopPrice" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "filledQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averagePrice" DOUBLE PRECISION,
    "commission" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaperOrder_pkey" PRIMARY KEY ("id")
);

-- Create PaperTransaction table
CREATE TABLE IF NOT EXISTS "PaperTransaction" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "orderId" TEXT,
    "symbol" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION,
    "price" DOUBLE PRECISION,
    "amount" DOUBLE PRECISION NOT NULL,
    "commission" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "description" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaperTransaction_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "PaperTradingAccount" ADD CONSTRAINT "PaperTradingAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PaperPosition" ADD CONSTRAINT "PaperPosition_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "PaperTradingAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PaperOrder" ADD CONSTRAINT "PaperOrder_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "PaperTradingAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PaperTransaction" ADD CONSTRAINT "PaperTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "PaperTradingAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PaperTransaction" ADD CONSTRAINT "PaperTransaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "PaperOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "PaperTradingAccount_userId_idx" ON "PaperTradingAccount"("userId");
CREATE INDEX IF NOT EXISTS "PaperPosition_accountId_idx" ON "PaperPosition"("accountId");
CREATE INDEX IF NOT EXISTS "PaperPosition_symbol_idx" ON "PaperPosition"("symbol");
CREATE INDEX IF NOT EXISTS "PaperOrder_accountId_idx" ON "PaperOrder"("accountId");
CREATE INDEX IF NOT EXISTS "PaperOrder_symbol_idx" ON "PaperOrder"("symbol");
CREATE INDEX IF NOT EXISTS "PaperOrder_status_idx" ON "PaperOrder"("status");
CREATE INDEX IF NOT EXISTS "PaperTransaction_accountId_idx" ON "PaperTransaction"("accountId");
CREATE INDEX IF NOT EXISTS "PaperTransaction_symbol_idx" ON "PaperTransaction"("symbol");
CREATE INDEX IF NOT EXISTS "PaperTransaction_timestamp_idx" ON "PaperTransaction"("timestamp");
