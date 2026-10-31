import { PaymentMethod } from '@prisma/client';
import { z } from 'zod';

const CheckoutItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional(),
  quantity: z.number().int().positive().max(50),
});

export const CheckoutRequestSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(8).max(30),
  governorate: z.string().trim().min(2).max(80),
  city: z.string().trim().min(2).max(100),
  address: z.string().trim().min(5).max(500),
  notes: z.string().trim().max(1000).optional(),
  paymentMethod: z.nativeEnum(PaymentMethod),
  giftCardCode: z.string().trim().max(40).optional(),
  giftWrap: z.boolean().optional(),
  idempotencyKey: z.string().uuid(),
  expectedTotal: z.number().finite().nonnegative(),
  addressId: z.string().min(1).optional(),
  items: z.array(CheckoutItemSchema).min(1).max(100),
  paymentReference: z.string().trim().max(100).optional(),
});

export type CheckoutRequest = z.infer<typeof CheckoutRequestSchema>;
