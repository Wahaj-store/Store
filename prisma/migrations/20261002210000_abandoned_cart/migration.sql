-- Phase 21: abandoned cart tracking and recovery
CREATE TYPE "AbandonedCartStatus" AS ENUM ('ACTIVE', 'ABANDONED', 'RECOVERED', 'CLEARED');

CREATE TABLE "AbandonedCart" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "items" JSONB NOT NULL,
  "subtotal" DECIMAL(10,2) NOT NULL,
  "itemCount" INTEGER NOT NULL,
  "cartHash" TEXT NOT NULL,
  "status" "AbandonedCartStatus" NOT NULL DEFAULT 'ACTIVE',
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reminderSentAt" TIMESTAMP(3),
  "recoveredAt" TIMESTAMP(3),
  "orderId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AbandonedCart_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AbandonedCart_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AbandonedCart_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AbandonedCart_customerId_key" ON "AbandonedCart"("customerId");
CREATE UNIQUE INDEX "AbandonedCart_orderId_key" ON "AbandonedCart"("orderId");
CREATE INDEX "AbandonedCart_status_lastSeenAt_idx" ON "AbandonedCart"("status", "lastSeenAt");
CREATE INDEX "AbandonedCart_customerId_status_idx" ON "AbandonedCart"("customerId", "status");
CREATE INDEX "AbandonedCart_reminderSentAt_idx" ON "AbandonedCart"("reminderSentAt");
