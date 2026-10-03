-- Remove the legacy coupon system. Promotional discounts are now handled by Offer,
-- and stored-value payments are handled by GiftCard.
ALTER TABLE "Order" DROP COLUMN "couponCode";
DROP TABLE "Coupon";
