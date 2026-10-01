-- Phase 12: Inventory Ledger
CREATE TYPE "InventoryLedgerType" AS ENUM ('OPENING', 'SALE', 'RESTOCK', 'ADJUSTMENT', 'ORDER_RELEASE');

CREATE TABLE "InventoryLedger" (
    "id" TEXT NOT NULL,
    "productId" TEXT,
    "variantId" TEXT,
    "orderId" TEXT,
    "userId" TEXT,
    "type" "InventoryLedgerType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "productNameSnapshot" TEXT,
    "variantNameSnapshot" TEXT,
    "variantValueSnapshot" TEXT,
    "skuSnapshot" TEXT,
    "reason" TEXT,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryLedger_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InventoryLedger_productId_createdAt_idx" ON "InventoryLedger"("productId", "createdAt");
CREATE INDEX "InventoryLedger_variantId_createdAt_idx" ON "InventoryLedger"("variantId", "createdAt");
CREATE INDEX "InventoryLedger_orderId_createdAt_idx" ON "InventoryLedger"("orderId", "createdAt");
CREATE INDEX "InventoryLedger_userId_createdAt_idx" ON "InventoryLedger"("userId", "createdAt");
CREATE INDEX "InventoryLedger_type_createdAt_idx" ON "InventoryLedger"("type", "createdAt");

-- Establish an auditable opening balance for everything that already exists.
INSERT INTO "InventoryLedger" (
    "id", "productId", "type", "quantity", "balanceAfter", "productNameSnapshot", "skuSnapshot"
)
SELECT
    md5('inventory:product:opening:' || p."id"),
    p."id",
    'OPENING'::"InventoryLedgerType",
    p."stock",
    p."stock",
    p."name",
    p."sku"
FROM "Product" p;

INSERT INTO "InventoryLedger" (
    "id", "productId", "variantId", "type", "quantity", "balanceAfter",
    "productNameSnapshot", "variantNameSnapshot", "variantValueSnapshot", "skuSnapshot"
)
SELECT
    md5('inventory:variant:opening:' || v."id"),
    v."productId",
    v."id",
    'OPENING'::"InventoryLedgerType",
    v."stock",
    v."stock",
    p."name",
    v."name",
    v."value",
    COALESCE(v."sku", p."sku")
FROM "ProductVariant" v
JOIN "Product" p ON p."id" = v."productId";

ALTER TABLE "InventoryLedger"
  ADD CONSTRAINT "InventoryLedger_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InventoryLedger"
  ADD CONSTRAINT "InventoryLedger_variantId_fkey"
  FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InventoryLedger"
  ADD CONSTRAINT "InventoryLedger_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InventoryLedger"
  ADD CONSTRAINT "InventoryLedger_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
