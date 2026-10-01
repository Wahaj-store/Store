CREATE TYPE "ShipmentStatus" AS ENUM ('PENDING','PROCESSING','SHIPPED','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED','FAILED','RETURNED','CANCELLED');
CREATE TYPE "ReturnStatus" AS ENUM ('REQUESTED','APPROVED','REJECTED','RECEIVED','REFUNDED','CANCELLED');
CREATE TYPE "ReturnReason" AS ENUM ('DAMAGED','WRONG_ITEM','NOT_AS_DESCRIBED','SIZE_ISSUE','CHANGED_MIND','OTHER');

CREATE TABLE "Shipment" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "provider" TEXT,
  "trackingNumber" TEXT,
  "status" "ShipmentStatus" NOT NULL DEFAULT 'PENDING',
  "shippedAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "estimatedMinDays" INTEGER,
  "estimatedMaxDays" INTEGER,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Shipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Shipment_orderId_createdAt_idx" ON "Shipment"("orderId","createdAt");
CREATE INDEX "Shipment_status_updatedAt_idx" ON "Shipment"("status","updatedAt");
CREATE INDEX "Shipment_trackingNumber_idx" ON "Shipment"("trackingNumber");

CREATE TABLE "ShipmentEvent" (
  "id" TEXT NOT NULL,
  "shipmentId" TEXT NOT NULL,
  "status" "ShipmentStatus" NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShipmentEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ShipmentEvent_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ShipmentEvent_shipmentId_createdAt_idx" ON "ShipmentEvent"("shipmentId","createdAt");

CREATE TABLE "ReturnRequest" (
  "id" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "status" "ReturnStatus" NOT NULL DEFAULT 'REQUESTED',
  "reason" "ReturnReason" NOT NULL,
  "note" TEXT,
  "adminNote" TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approvedAt" TIMESTAMP(3),
  "receivedAt" TIMESTAMP(3),
  "refundedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReturnRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ReturnRequest_number_key" UNIQUE ("number"),
  CONSTRAINT "ReturnRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ReturnRequest_orderId_requestedAt_idx" ON "ReturnRequest"("orderId","requestedAt");
CREATE INDEX "ReturnRequest_status_requestedAt_idx" ON "ReturnRequest"("status","requestedAt");

CREATE TABLE "ReturnItem" (
  "id" TEXT NOT NULL,
  "returnRequestId" TEXT NOT NULL,
  "orderItemId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "restocked" BOOLEAN NOT NULL DEFAULT false,
  "restockedAt" TIMESTAMP(3),
  CONSTRAINT "ReturnItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ReturnItem_returnRequestId_orderItemId_key" UNIQUE ("returnRequestId","orderItemId"),
  CONSTRAINT "ReturnItem_returnRequestId_fkey" FOREIGN KEY ("returnRequestId") REFERENCES "ReturnRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ReturnItem_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON UPDATE CASCADE
);
CREATE INDEX "ReturnItem_orderItemId_idx" ON "ReturnItem"("orderItemId");
