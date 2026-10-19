export const PUBLIC_SETTING_KEYS = [
  'brand_name',
  'brand_tagline',
  'currency',
  'announcement',
  'whatsapp',
  'minimum_order',
  'free_shipping',
  'popup_enabled',
  'maintenance_mode',
  'gift_wrap_fee',
  'seo_title',
  'seo_description',
  'brand_story',
  'header_menu',
  'footer_links',
  'popup_config',
  'social_facebook',
  'social_instagram',
  'social_tiktok',
] as const;

const PUBLIC_SETTING_KEY_SET: ReadonlySet<string> = new Set(PUBLIC_SETTING_KEYS);

/** Keep server-rendered props limited to settings explicitly intended for shoppers. */
export function toPublicSettings(
  rows: readonly { key: string; value: string }[],
): Record<string, string> {
  return Object.fromEntries(
    rows
      .filter(({ key }) => PUBLIC_SETTING_KEY_SET.has(key))
      .map(({ key, value }) => [key, value]),
  );
}
