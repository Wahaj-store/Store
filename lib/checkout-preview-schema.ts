import { z } from 'zod';

const CheckoutPreviewItemSchema = z.object({
  productId: z.string().trim().min(1).max(64),
  variantId: z.string().trim().max(64).nullable().optional(),
  quantity: z.number().int().min(1).max(50),
});

export const CheckoutPreviewSchema = z.object({
  items: z.array(CheckoutPreviewItemSchema).max(100).default([]),
  phone: z.string().trim().max(30).optional().default(''),
  governorate: z.string().trim().max(80).optional().default(''),
  city: z.string().trim().max(100).optional().default(''),
  giftWrap: z.boolean().optional().default(false),
  giftCardCode: z.string().trim().max(40).optional().default(''),
  couponCode: z.string().trim().max(100).optional(),
}).strip();

export type CheckoutPreviewInput = z.infer<typeof CheckoutPreviewSchema>;
