import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/rbac';

const DEFAULTS: Record<string, string> = {
  brand_name: 'وَهَج',
  brand_tagline: 'تفاصيل صغيرة تصنع وهجًا كبيرًا.',
  currency: 'EGP',
  announcement: 'شحن لجميع المحافظات',
  whatsapp: '',
  minimum_order: '0',
  free_shipping: '0',
  popup_enabled: 'false',
  maintenance_mode: 'false',
  seo_title: 'وَهَج | إكسسوارات عصرية',
  seo_description: 'قطع مختارة بعناية لتضيف لمسة من الوهج إلى كل إطلالة.',
};

const settingSchema = z.record(z.string().max(500));

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

  const settings = {
    ...DEFAULTS,
    ...Object.fromEntries(rows.map((row) => [row.key, row.value])),
  };

  return { settings, theme, sections, payments };
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

    if (settings) {
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
        fontFamily: themeBody.fontFamily ?? null,
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
        metadata: JSON.stringify({ settings: settings ? Object.keys(settings) : [], theme: Boolean(body?.theme) }),
      },
    });

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
    await prisma.siteSetting.delete({ where: { key: body.key } });

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'DELETE_SETTING',
        entity: 'SiteSetting',
        metadata: JSON.stringify({ key: body.key }),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    const message = error?.issues?.[0]?.message || error?.message || 'تعذر حذف الإعداد.';
    return NextResponse.json({ error: message }, { status: error?.code === 'P2025' ? 404 : 400 });
  }
}
