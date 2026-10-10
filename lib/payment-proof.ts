import { del, issueSignedToken, presignUrl } from '@vercel/blob';
import { randomUUID } from 'node:crypto';

export const PAYMENT_PROOF_MAX_BYTES = 10 * 1024 * 1024;
export const PAYMENT_PROOF_PREFIX = 'wahaj/payment-proofs/';
const SIGNED_URL_TTL_MS = 5 * 60 * 1000;

const TYPE_TO_EXTENSION = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const;

type PaymentProofExtension = (typeof TYPE_TO_EXTENSION)[keyof typeof TYPE_TO_EXTENSION];

function detectImageType(bytes: Uint8Array): PaymentProofExtension | null {
  const jpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  const webp = bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  return jpeg ? 'jpg' : png ? 'png' : webp ? 'webp' : null;
}

export function isPrivatePaymentProofPath(value: string) {
  return value.startsWith(PAYMENT_PROOF_PREFIX) && !value.includes('..') && !value.includes('\\');
}

export async function validatePaymentProof(file: File) {
  const extension = TYPE_TO_EXTENSION[file.type as keyof typeof TYPE_TO_EXTENSION];
  if (!extension) throw new Error('صيغة صورة الإيصال غير مدعومة');
  if (file.size <= 0 || file.size > PAYMENT_PROOF_MAX_BYTES) throw new Error('حجم صورة الإيصال كبير جداً');

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (detectImageType(bytes) !== extension) throw new Error('محتوى صورة الإيصال غير صالح');
  return { extension, bytes };
}

export function createPaymentProofPath(extension: PaymentProofExtension) {
  return `${PAYMENT_PROOF_PREFIX}${randomUUID()}.${extension}`;
}

export async function getPaymentProofUrl(storedValue: string | null | undefined) {
  if (!storedValue) return null;

  // Existing public proofs remain readable for authorized staff during migration.
  if (!isPrivatePaymentProofPath(storedValue)) return storedValue;

  const validUntil = Date.now() + SIGNED_URL_TTL_MS;
  const delegation = await issueSignedToken({
    pathname: storedValue,
    operations: ['get'],
    validUntil,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  const { presignedUrl } = await presignUrl(delegation, {
    operation: 'get',
    pathname: storedValue,
    access: 'private',
    validUntil,
  });
  return presignedUrl;
}

export async function deletePaymentProof(storedValue: string | null | undefined) {
  if (!storedValue || !isPrivatePaymentProofPath(storedValue)) return;
  await del(storedValue, { token: process.env.BLOB_READ_WRITE_TOKEN });
}
