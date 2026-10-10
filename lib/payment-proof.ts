import { del, issueSignedToken, presignUrl } from '@vercel/blob';
import { randomUUID } from 'node:crypto';

export const PAYMENT_PROOF_MAX_BYTES = 10 * 1024 * 1024;
export const PAYMENT_PROOF_PREFIX = 'wahaj/payment-proofs/';
export const PAYMENT_PROOF_SIGNED_URL_TTL_MS = 5 * 60 * 1000;

const TYPE_TO_EXTENSION = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const;

export type PaymentProofExtension =
  (typeof TYPE_TO_EXTENSION)[keyof typeof TYPE_TO_EXTENSION];

function detectImageType(bytes: Uint8Array): PaymentProofExtension | null {
  const jpeg =
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff;

  const png =
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a;

  const webp =
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';

  if (jpeg) return 'jpg';
  if (png) return 'png';
  if (webp) return 'webp';
  return null;
}

function requireBlobToken(): string {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error('BLOB_READ_WRITE_TOKEN is not configured');
  return token;
}

export function isPrivatePaymentProofPath(value: string): boolean {
  if (typeof value !== 'string' || !value.startsWith(PAYMENT_PROOF_PREFIX)) {
    return false;
  }

  const filename = value.slice(PAYMENT_PROOF_PREFIX.length);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/i.test(filename);
}

export async function validatePaymentProof(file: File): Promise<{
  extension: PaymentProofExtension;
  bytes: Uint8Array;
}> {
  if (!file || typeof file.arrayBuffer !== 'function') {
    throw new Error('ملف إثبات الدفع غير صالح');
  }

  const extension = TYPE_TO_EXTENSION[file.type as keyof typeof TYPE_TO_EXTENSION];
  if (!extension) throw new Error('صيغة صورة الإيصال غير مدعومة');
  if (!Number.isSafeInteger(file.size) || file.size <= 0 || file.size > PAYMENT_PROOF_MAX_BYTES) {
    throw new Error('حجم صورة الإيصال يجب ألا يتجاوز 10MB');
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength !== file.size || detectImageType(bytes) !== extension) {
    throw new Error('محتوى صورة الإيصال لا يطابق نوع الملف');
  }

  return { extension, bytes };
}

export function createPaymentProofPath(extension: PaymentProofExtension): string {
  if (!Object.values(TYPE_TO_EXTENSION).includes(extension)) {
    throw new Error('امتداد إثبات الدفع غير مدعوم');
  }
  return `${PAYMENT_PROOF_PREFIX}${randomUUID()}.${extension}`;
}

export async function getPaymentProofUrl(
  storedValue: string | null | undefined,
): Promise<string | null> {
  if (!storedValue) return null;
  if (!isPrivatePaymentProofPath(storedValue)) {
    throw new Error('Invalid private payment proof path');
  }

  const token = requireBlobToken();
  const validUntil = Date.now() + PAYMENT_PROOF_SIGNED_URL_TTL_MS;
  const delegation = await issueSignedToken({
    pathname: storedValue,
    operations: ['get'],
    validUntil,
    token,
  });

  const { presignedUrl } = await presignUrl(delegation, {
    operation: 'get',
    pathname: storedValue,
    access: 'private',
    validUntil,
  });

  return presignedUrl;
}

export async function deletePaymentProof(
  storedValue: string | null | undefined,
): Promise<void> {
  if (!storedValue) return;
  if (!isPrivatePaymentProofPath(storedValue)) {
    throw new Error('Invalid private payment proof path');
  }

  await del(storedValue, { token: requireBlobToken() });
}
