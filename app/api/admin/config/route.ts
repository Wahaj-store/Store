import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/rbac';
import { DEFAULT_POPUP_CONFIG } from '@/lib/popup-config';
import { revalidateHomepageData } from '@/lib/homepage-data';

const DEFAULTS: Record<string, string> = {
  brand_name: 'وَهَج',
  brand_tagline: 'تفاصيل صغيرة تصنع وهجًا كبيرًا.',
  currency: 'EGP',
  announcement: 'شحن لجميع المحافظات',
  whatsapp: '',
  minimum_order: '0',
  free_shipping: '0',
  popup_enabled: 'false',
  popup_config: JSON.stringify(DEFAULT_POPUP_CONFIG),
  maintenance_mode: 'false',
  seo_title: 'وَهَج | إكسسوارات عصرية',
  seo_description: 'قطع مختارة بعناية لتضيف لمسة من الوهج إلى كل إطلالة.',
  social_facebook: '',
  social_instagram: '',
  social_tiktok: '',
};

const HERO_SETTINGS_CONFIG_KEY = 'wahajOfferMarquee';
const HERO_SETTING_KEYS = ['hero_marquee_speed', 'hero_marquee_items', 'hero_marquee_bg', 'hero_marquee_color', 'hero_marquee_accent', 'hero_height_desktop', 'hero_height_mobile'];
const settingSchema = z.record(z.string(), z.string().max(20000));
const popupConfigSchema = z.object({
  title: z.string().trim().min(1).max(120),
  message: z.string().max(700),
  imageUrl: z.string().max(2000),
  ctaText: z.string().max(50),
  ctaUrl: z.string().max(2048),
  delaySeconds: z.number().int().min(0).max(60),
  frequency: z.enum(['session', 'daily', 'always']),
});

const marqueeItemsSchema = z.array(z.object({
  text: z.string().trim().min(1).max(120),
  href: z.string().trim().max(1000),
  imageUrl: z.string().trim().max(1000),
})).max(8);
const heroSettingsSchema = z.object({
  hero_marquee_speed: z.coerce.number().int().min(12).max(90),
  hero_marquee_items: marqueeItemsSchema,
  hero_marquee_bg: z.string().regex(/^#[0-9a-f]{6}$/i),
  hero_marquee_color: z.string().regex(/^#[0-9a-f]{6}$/i),
  hero_marquee_accent: z.string().regex(/^#[0-9a-f]{6}$/i),
  hero_height_desktop: z.coerce.number().int().min(260).max(700),
  hero_height_mobile: z.coerce.number().int().min(220).max(600),
});

function parseJsonRecord(value: unknown): Record<string, any> {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, any> : {};
  } catch {
    return {};
  }
}

function parseLegacyMarqueeItems(value: unknown) {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isSafePopupUrl(value: string, allowHash = false) {
  const input = value.trim();
  if (!input) return true;
  if (input.startsWith('/') && !input.startsWith('//')) return true;
  if (allowHash && /^#[\w-]+$/.test(input)) return true;
  try {
    const url = new URL(input);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function unauthorized() {
  return NextResponse.json({ error: 'غير مصرح: يلزم تسجيل الدخول إلى لوحة الإدارة.' }, { status: 401 });
}

function forbidden() {
  return NextResponse.json({ error: 'غير مصرح: إعدادات المتجر متاحة للـ OWNER و ADMIN فقط.' }, { status: 403 });
}

async function readConfig() {
  const [rows, theme, sections, payments] = await Promise.all([
    prisma.siteSetting.findMany({ orderBy: { key: 'asc' } }),
    prisma.themeSetting.findFirst(),
    prisma.homepageSection.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.paymentSetting.findMany({ orderBy: { displayOrder: 'asc' } }),
  ]);

  const allStoredSettings = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  const storedSettings = Object.fromEntries(Object.entries(allStoredSettings).filter(([key]) => !HERO_SETTING_KEYS.includes(key)));
  const settings = {
    ...DEFAULTS,
    ...storedSettings,
  };
  const heroSection = sections.find((section) => section.type === 'hero');
  const sectionConfig = parseJsonRecord(heroSection?.config);
  const savedHeroSettings = parseJsonRecord(sectionConfig[HERO_SETTINGS_CONFIG_KEY]);
  const heroSettings = {
    hero_marquee_speed: String(savedHeroSettings.hero_marquee_speed ?? allStoredSettings.hero_marquee_speed ?? '28'),
    hero_marquee_items: Array.isArray(savedHeroSettings.hero_marquee_items)
      ? savedHeroSettings.hero_marquee_items
      : parseLegacyMarqueeItems(allStoredSettings.hero_marquee_items),
    hero_marquee_bg: String(savedHeroSettings.hero_marquee_bg ?? allStoredSettings.hero_marquee_bg ?? '#171513'),
    hero_marquee_color: String(savedHeroSettings.hero_marquee_color ?? allStoredSettings.hero_marquee_color ?? '#ffffff'),
    hero_marquee_accent: String(savedHeroSettings.hero_marquee_accent ?? allStoredSettings.hero_marquee_accent ?? '#c8a96b'),
    hero_height_desktop: String(savedHeroSettings.hero_height_desktop ?? allStoredSettings.hero_height_desktop ?? '420'),
    hero_height_mobile: String(savedHeroSettings.hero_height_mobile ?? allStoredSettings.hero_height_mobile ?? '320'),
  };

  return { settings, storedSettings, heroSettings, theme: theme ? { ...theme, fontFamily: 'Tajawal' } : null, sections, payments };
}

export async function GET() {
  try {
    const user = await requireUser();
    if (!user) return unauthorized();
    if (!can(user.role, 'settingsRead')) return forbidden();

    return NextResponse.json(await readConfig(), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'تعذر جلب إعدادات المتجر.' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await requireUser();
    if (!user) return unauthorized();
    if (!can(user.role, 'settingsWrite')) return forbidden();

    const body = await req.json();
    const settings = body?.settings ? settingSchema.parse(body.settings) : null;
    const heroSettings = body?.heroSettings ? heroSettingsSchema.parse(body.heroSettings) : null;

    if (settings) {
      const reservedKeys = Object.keys(settings).filter((key) => HERO_SETTING_KEYS.includes(key));
      if (reservedKeys.length) {
        throw new Error('إعدادات الواجهة وشريط العروض تُحفظ من محررها المخصص فقط.');
      }
      if (settings.popup_enabled !== undefined && !['true', 'false'].includes(settings.popup_enabled.trim().toLowerCase())) {
        throw new Error('قيمة popup_enabled يجب أن تكون true أو false.');
      }
      if (settings.popup_config !== undefined) {
        let rawPopupConfig: unknown;
        try {
          rawPopupConfig = JSON.parse(settings.popup_config);
        } catch {
          throw new Error('إعدادات النافذة المنبثقة غير صالحة.');
        }
        const popupConfig = popupConfigSchema.parse(rawPopupConfig);
        if (!isSafePopupUrl(popupConfig.imageUrl) || !isSafePopupUrl(popupConfig.ctaUrl, true)) {
          throw new Error('استخدمي رابطًا داخليًا أو رابط HTTP/HTTPS صالحًا للصورة والزر.');
        }
        settings.popup_config = JSON.stringify(popupConfig);
      }
      await prisma.$transaction(
        Object.entries(settings).map(([key, value]) =>
          prisma.siteSetting.upsert({
            where: { key },
            create: { key, value },
            update: { value },
          }),
        ),
      );
    }

    if (heroSettings) {
      const items = heroSettings.hero_marquee_items.map((item) => {
        if (!isSafePopupUrl(item.href, true) || !isSafePopupUrl(item.imageUrl)) {
          throw new Error('استخدمي روابط داخلية أو روابط HTTP/HTTPS صالحة للإعلان والبنر.');
        }
        return { ...item, href: item.href || '/offers' };
      });
      const heroSection = await prisma.homepageSection.findFirst({
        where: { type: 'hero' },
        orderBy: { sortOrder: 'asc' },
        select: { id: true, config: true },
      });
      if (!heroSection) throw new Error('لا يوجد قسم واجهة رئيسية لحفظ هذه الإعدادات. أضيفي قسم الواجهة من إدارة الصفحة الرئيسية أولًا.');
      const sectionConfig = parseJsonRecord(heroSection.config);
      sectionConfig[HERO_SETTINGS_CONFIG_KEY] = { ...heroSettings, hero_marquee_items: items };
      await prisma.$transaction([
        prisma.homepageSection.update({ where: { id: heroSection.id }, data: { config: JSON.stringify(sectionConfig) } }),
        prisma.siteSetting.deleteMany({ where: { key: { in: HERO_SETTING_KEYS } } }),
      ]);
    }

    if (body?.theme) {
      const themeSchema = z.object({
        primaryColor: z.string().optional(),
        accentColor: z.string().optional(),
        background: z.string().optional(),
        textColor: z.string().optional(),
        logoUrl: z.string().nullable().optional(),
        faviconUrl: z.string().nullable().optional(),
        fontFamily: z.string().nullable().optional(),
        radiusScale: z.string().nullable().optional(),
        darkMode: z.boolean().optional(),
      });
      const themeBody = themeSchema.parse(body.theme);
      const themeData = {
        primaryColor: themeBody.primaryColor || '#171513',
        accentColor: themeBody.accentColor || '#C8A96B',
        background: themeBody.background || '#F8F5EF',
        textColor: themeBody.textColor || '#171513',
        logoUrl: themeBody.logoUrl ?? null,
        faviconUrl: themeBody.faviconUrl ?? null,
        fontFamily: 'Tajawal',
        radiusScale: themeBody.radiusScale || 'luxury',
        darkMode: themeBody.darkMode !== false,
      };

      const current = await prisma.themeSetting.findFirst();
      if (current) {
        await prisma.themeSetting.update({ where: { id: current.id }, data: themeData });
      } else {
        await prisma.themeSetting.create({ data: themeData });
      }
    }

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE_CONFIG',
        entity: 'StoreConfiguration',
        severity: 'INFO',
        metadata: JSON.stringify({ settings: settings ? Object.keys(settings) : [], heroSettings: Boolean(heroSettings), theme: Boolean(body?.theme) }),
      },
    });

    if (settings || heroSettings || body?.theme) revalidateHomepageData();

    return NextResponse.json(await readConfig(), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error: any) {
    const message = error?.issues?.[0]?.message || error?.message || 'تعذر حفظ إعدادات المتجر.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireUser();
    if (!user) return unauthorized();
    if (!can(user.role, 'settingsWrite')) return forbidden();

    const body = z.object({ key: z.string().min(1).max(255) }).parse(await req.json());
    if (HERO_SETTING_KEYS.includes(body.key)) {
      return NextResponse.json({ error: 'إعدادات الواجهة تُدار من صفحة إعدادات الواجهة وشريط العروض.' }, { status: 400 });
    }
    if (['popup_enabled', 'popup_config', 'gift_wrap_fee'].includes(body.key)) {
      return NextResponse.json({ error: 'لا يمكن حذف إعدادات النافذة المنبثقة أو رسوم تغليف الهدايا.' }, { status: 400 });
    }
    await prisma.siteSetting.delete({ where: { key: body.key } });

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'DELETE_SETTING',
        entity: 'SiteSetting',
        metadata: JSON.stringify({ key: body.key }),
      },
    });

    revalidateHomepageData();
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    const message = error?.issues?.[0]?.message || error?.message || 'تعذر حذف الإعداد.';
    return NextResponse.json({ error: message }, { status: error?.code === 'P2025' ? 404 : 400 });
  }
}
