import { ShipmentStatus } from '@prisma/client';
import { z } from 'zod';

const finiteShippingNumber = z.union([
  z.number(),
  z.string().trim().min(1),
]).transform(value => typeof value === 'string' ? Number(value) : value).pipe(z.number().finite());
const nonNegativeShippingPrice = finiteShippingNumber.pipe(z.number().finite().min(0).max(1_000_000));
const freeShippingThreshold = z.preprocess(
  value => value === '' || value === null ? null : value,
  z.union([
    z.null(),
    finiteShippingNumber.pipe(z.number().finite().min(0).max(99_999_999.99)),
  ]),
);

export const createShippingZoneSchema = z.object({
  governorate: z.string().trim().min(2).max(80),
  price: nonNegativeShippingPrice,
  freeAbove: freeShippingThreshold.optional(),
}).strict();

export const updateShippingZoneSchema = z.object({
  id: z.string().trim().min(1).max(128),
  price: nonNegativeShippingPrice.optional(),
  freeAbove: freeShippingThreshold.optional(),
  active: z.boolean().optional(),
}).strict().refine(value => Object.keys(value).some(key => key !== 'id'), {
  message: 'يجب تحديد حقل واحد على الأقل للتحديث.',
});

export const updateShippingZoneByIdSchema = z.object({
  price: nonNegativeShippingPrice.optional(),
  freeAbove: freeShippingThreshold.optional(),
  active: z.boolean().optional(),
}).strict().refine(value => Object.keys(value).length > 0, {
  message: 'يجب تحديد حقل واحد على الأقل للتحديث.',
});

const provider = z.string().trim().max(120);
const trackingNumber = z.string().trim().max(160);
const note = z.string().trim().max(1000);
const deliveryDays = z.number().int().min(0).max(365);

export const createShipmentSchema = z.object({
  orderId: z.string().trim().min(1).max(128),
  status: z.nativeEnum(ShipmentStatus).optional(),
  provider: provider.optional(),
  trackingNumber: trackingNumber.optional(),
  estimatedMinDays: deliveryDays.nullable().optional(),
  estimatedMaxDays: deliveryDays.nullable().optional(),
  note: note.optional(),
  notes: note.optional(),
}).strict().refine(value => value.estimatedMinDays == null || value.estimatedMaxDays == null || value.estimatedMinDays <= value.estimatedMaxDays, {
  message: 'المدة الدنيا يجب ألا تتجاوز المدة القصوى.',
});

export const updateShipmentSchema = z.object({
  id: z.string().trim().min(1).max(128),
  status: z.nativeEnum(ShipmentStatus),
  note: note.optional(),
  provider: provider.optional(),
  trackingNumber: trackingNumber.optional(),
}).strict();

export type CreateShipmentRequest = z.infer<typeof createShipmentSchema>;
export type UpdateShipmentRequest = z.infer<typeof updateShipmentSchema>;
