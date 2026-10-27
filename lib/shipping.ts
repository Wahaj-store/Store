import { prisma } from '@/lib/prisma';

export function normalizeShippingLocation(value: string | null | undefined): string {
  return String(value ?? '')
    .normalize('NFKC')
    .trim()
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/ـ/g, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[\u0660-\u0669]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (digit) => String(digit.charCodeAt(0) - 0x06F0))
    .replace(/[،,؛;./\\|()[\]{}:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('ar-EG');
}

type ShippingZoneRecord = Awaited<ReturnType<typeof prisma.shippingZone.findMany>>[number];

/**
 * Finds the most specific active zone without relying on exact Arabic spelling.
 * A city-specific zone always wins over the governorate-wide fallback.
 */
export async function findActiveShippingZone(
  governorate: string,
  city: string,
): Promise<ShippingZoneRecord | null> {
  const normalizedGovernorate = normalizeShippingLocation(governorate);
  const normalizedCity = normalizeShippingLocation(city);
  if (!normalizedGovernorate || !normalizedCity) return null;

  const zones = await prisma.shippingZone.findMany({
    where: { active: true },
    orderBy: { city: 'desc' },
  });

  const matchingGovernorateZones = zones.filter(
    (zone) => normalizeShippingLocation(zone.governorate) === normalizedGovernorate,
  );

  const cityZone = matchingGovernorateZones.find(
    (zone) => zone.city !== null && normalizeShippingLocation(zone.city) === normalizedCity,
  );
  const governorateZone = matchingGovernorateZones.find((zone) => zone.city === null) ?? null;
  if (cityZone) {
    // City rates override the governorate delivery price, while an unset city
    // free-shipping threshold inherits the governorate's configured threshold.
    return cityZone.freeAbove == null && governorateZone?.freeAbove != null
      ? { ...cityZone, freeAbove: governorateZone.freeAbove }
      : cityZone;
  }

  return governorateZone;
}

/** Resolve the threshold used by checkout: zone-specific value, then the
 * store-wide setting used by the storefront, then the legacy seeded key. */
export async function resolveShippingFreeAbove(zone: ShippingZoneRecord | null): Promise<number | null> {
  if (zone?.freeAbove != null) return Number(zone.freeAbove);

  const storeSetting = await prisma.siteSetting.findUnique({
    where: { key: 'free_shipping' },
    select: { value: true },
  });
  if (storeSetting) {
    const value = Number(storeSetting.value);
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  const legacySetting = await prisma.siteSetting.findUnique({
    where: { key: 'shipping_free_above' },
    select: { value: true },
  });
  const legacyValue = Number(legacySetting?.value);
  return Number.isFinite(legacyValue) && legacyValue > 0 ? legacyValue : null;
}
