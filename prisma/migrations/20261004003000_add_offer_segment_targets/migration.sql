-- Target promotional offers to one or more Customer Segmentation audiences.
CREATE TABLE "OfferSegmentTarget" (
  "id" TEXT NOT NULL,
  "offerId" TEXT NOT NULL,
  "segmentKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OfferSegmentTarget_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OfferSegmentTarget_offerId_segmentKey_key" ON "OfferSegmentTarget"("offerId", "segmentKey");
CREATE INDEX "OfferSegmentTarget_segmentKey_idx" ON "OfferSegmentTarget"("segmentKey");

ALTER TABLE "OfferSegmentTarget"
  ADD CONSTRAINT "OfferSegmentTarget_offerId_fkey"
  FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
