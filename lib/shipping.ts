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
  if (cityZone) return cityZone;

  return matchingGovernorateZones.find((zone) => zone.city === null) ?? null;
                                       }
