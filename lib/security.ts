import crypto from 'crypto';

export function normalizePhone(phone: string) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.startsWith('0020')) return `+20${digits.slice(4)}`;
  if (digits.startsWith('20')) return `+${digits}`;
  if (digits.startsWith('0')) return `+20${digits.slice(1)}`;
  return `+${digits}`;
}

export function normalizeArabic(value: string) {
  return String(value || '').trim().toLowerCase()
    .replace(/[إأآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه').replace(/[ًٌٍَُِّْـ]/g, '').replace(/\s+/g, ' ');
}

export function safeJson(value: unknown) {
  try { return JSON.stringify(value); } catch { return undefined; }
}

export function hashIdentifier(value: string) {
  return crypto.createHash('sha256').update(`${process.env.AUTH_SECRET || 'development'}:${value}`).digest('hex');
}

export function requestKey(req: Request) {
  return req.headers.get('x-request-id') || crypto.randomUUID();
}
