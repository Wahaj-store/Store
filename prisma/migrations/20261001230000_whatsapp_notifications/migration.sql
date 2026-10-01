CREATE TABLE "WhatsAppNotification" (
  "id" TEXT NOT NULL,
  "eventKey" TEXT NOT NULL,
  "customerId" TEXT,
  "orderId" TEXT,
  "phone" TEXT NOT NULL,
  "template" TEXT NOT NULL,
  "language" TEXT NOT NULL DEFAULT 'ar',
  "status" TEXT NOT NULL DEFAULT 'PROCESSING',
  "providerMessageId" TEXT,
  "error" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WhatsAppNotification_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WhatsAppNotification_eventKey_key" UNIQUE ("eventKey"),
  CONSTRAINT "WhatsAppNotification_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "WhatsAppNotification_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "WhatsAppNotification_customerId_createdAt_idx" ON "WhatsAppNotification"("customerId","createdAt");
CREATE INDEX "WhatsAppNotification_orderId_createdAt_idx" ON "WhatsAppNotification"("orderId","createdAt");
CREATE INDEX "WhatsAppNotification_status_createdAt_idx" ON "WhatsAppNotification"("status","createdAt");
