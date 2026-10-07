import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { normalizeArabic } from '@/lib/security';
import { getClientKey, rateLimit } from '@/lib/rate-limit';

const Body = z.object({ query: z.string().trim().min(2).max(160) });

const STOP_WORDS = new Set([
  'عايزه', 'عايزة', 'اريد', 'أريد', 'ابغى', 'أبغى', 'محتاجه', 'محتاجة', 'من', 'و', 'في', 'على',
  'لي', 'لـ', 'ل', 'شيء', 'شي', 'قطعة', 'قطعه', 'منتج', 'منتجات', 'مناسب', 'مناسبة', 'يكون',
  'تكون', 'عندي', 'هدية', 'هديه', 'اختيار', 'اختاري', 'لو', 'سمحتي', 'رجاء', 'فضلا', 'فقط',
]);

function westernDigits(value: string) {
  return value.replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
}

function extractNumber(query: string, pattern: RegExp) {
  const match = westernDigits(query).match(pattern);
  if (!match) return undefined;
  const number = Number(match[1]);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

function meaningfulQuery(query: string) {
  const normalized = normalizeArabic(query)
    .replace(/(اقل|أقل|اكبر|أكبر|تحت|فوق|حد اقصى|حد أقصى|ميزانيه|ميزانية|جنيه|جنيهات|جنيه مصري|متاحه|متاحة|متوفره|متوفرة|فقط)/g, ' ')
    .replace(/[٠-٩0-9]+/g, ' ');
  return normalized
    .split(/\s+/)
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word))
    .slice(0, 5)
    .join(' ')
    .slice(0, 100);
}

export async function POST(request: Request) {
  const limit = rateLimit(`ai-search:${getClientKey(request)}`, 30, 60_000);
  if (!limit.ok) return NextResponse.json({ ok: false, error: 'محاولات كثيرة. حاولي بعد قليل.' }, { status: 429 });
  try {
    const { query } = Body.parse(await request.json());
    const normalized = normalizeArabic(query);
    const categories = await prisma.category.findMany({
      where: { active: true },
      select: { name: true, slug: true },
    });
    const category = categories.find((item) => {
      const name = normalizeArabic(item.name);
      const slug = normalizeArabic(item.slug.replace(/[-_]/g, ' '));
      return normalized.includes(name) || (slug.length > 2 && normalized.includes(slug));
    });

    const minPrice = extractNumber(normalized, /(?:من|فوق|ابتداء من)\s*([0-9]+(?:\.[0-9]+)?)/);
    const maxPrice = extractNumber(normalized, /(?:تحت|اقل من|أقل من|بحد اقصى|حد اقصى|ميزانيه|ميزانية)\s*([0-9]+(?:\.[0-9]+)?)/);
    const inStock = /متاح|متوفر|موجود|جاهز/.test(normalized) && !/غير متاح|غير متوفر/.test(normalized);
    const sort = /ارخص|الأرخص|اقل سعر|أقل سعر/.test(normalized)
      ? 'price-asc'
      : /اغلى|الأعلى|اعلى سعر|أعلى سعر/.test(normalized)
        ? 'price-desc'
        : 'newest';

    return NextResponse.json({
      ok: true,
      engine: 'local-semantic',
      explanation: 'حلّل المساعد طلبك إلى كلمات بحث ومرشحات متجر قابلة للتنفيذ.',
      filters: {
        q: meaningfulQuery(query) || undefined,
        category: category?.slug,
        minPrice,
        maxPrice,
        stock: inStock ? 'in-stock' : undefined,
        sort,
      },
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof z.ZodError ? 'اكتبي وصفًا أطول قليلًا للبحث.' : 'تعذر تحليل البحث.' }, { status: 400 });
  }
}
