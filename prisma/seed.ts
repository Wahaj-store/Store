import { PrismaClient, Role, ProductStatus, PaymentMethod } from '@prisma/client';
import { hashPassword } from '../lib/auth';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    throw new Error('ADMIN_EMAIL و ADMIN_PASSWORD مطلوبان لتشغيل seed. لا تستخدم بيانات دخول افتراضية في الإنتاج.');
  }

  // 1) المالك
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: await hashPassword(adminPassword),
      role: Role.OWNER,
      name: 'مالك المتجر',
    },
  });

  // 2) التصنيفات
  const cats: Array<[string, string]> = [
    ['خواتم', 'rings'],
    ['سلاسل', 'necklaces'],
    ['أساور', 'bracelets'],
    ['انسيالات', 'anklets'],
    ['حلقان', 'earrings'],
    ['أطقم', 'sets'],
    ['هدايا', 'gifts'],
    ['إكسسوارات', 'accessories'],
  ];
  const categoryBySlug: Record<string, string> = {};
  for (const [name, slug] of cats) {
    const c = await prisma.category.upsert({
      where: { slug },
      update: { name },
      create: { name, slug, active: true },
    });
    categoryBySlug[slug] = c.id;
  }

  // 3) المنتجات — كل منتج في تصنيفه الصحيح
  const products: Array<{
    name: string; slug: string; price: number; compare: number;
    photoId: string; catSlug: string;
  }> = [
    { name: 'سلسلة وهج الذهبية', slug: 'wahaj-golden-necklace', price: 399, compare: 599, photoId: '1515562141207-7a88fb7ce338', catSlug: 'necklaces' },
    { name: 'خاتم اللمعة', slug: 'glow-ring', price: 474, compare: 679, photoId: '1605100804763-247f67b3557e', catSlug: 'rings' },
    { name: 'سوار كلاسيك', slug: 'classic-bracelet', price: 549, compare: 799, photoId: '1611652022419-a9419f74343d', catSlug: 'bracelets' },
    { name: 'انسيال ناعم', slug: 'soft-anklet', price: 624, compare: 899, photoId: '1573408301185-9146fe634ad0', catSlug: 'anklets' },
  ];

  for (const item of products) {
    const sku = `WAH-${item.slug.toUpperCase()}`;
    const existingSku = await prisma.product.findUnique({ where: { sku } });
    const finalSku = existingSku && existingSku.slug !== item.slug
      ? `${sku}-${Date.now()}`
      : sku;

    const p = await prisma.product.upsert({
      where: { slug: item.slug },
      update: {},
      create: {
        name: item.name,
        slug: item.slug,
        price: item.price,
        comparePrice: item.compare,
        stock: 20,
        sku: finalSku,
        status: ProductStatus.PUBLISHED,
        categoryId: categoryBySlug[item.catSlug],
        description: 'قطعة أنيقة مختارة بعناية لتضيف لمسة من الوهج إلى إطلالتك.',
      },
    });

    const hasImages = await prisma.productImage.count({ where: { productId: p.id } });
    if (!hasImages) {
      await prisma.productImage.create({
        data: {
          productId: p.id,
          url: `https://images.unsplash.com/photo-${item.photoId}?auto=format&fit=crop&w=900&q=82`,
          alt: item.name,
        },
      });
    }
  }

  // 4) إعدادات الموقع
  const settings: Array<[string, string]> = [
    ['brand_story', 'وَهَج ليس مجرد إكسسوار، بل تلك اللمعة الصغيرة التي تغيّر الإطلالة كاملة. اخترنا اسم وَهَج لأنه يعبّر عن التألق الذي تضيفه التفاصيل الجميلة إلى حضورك، وعن القطع التي تمنح كل إطلالة لمستها الخاصة. في وَهَج نختار قطعًا عصرية وأنيقة بعناية، لنمنحك فرصة التعبير عن أسلوبك بطريقتك.'],
    ['whatsapp', ''],
    ['announcement', 'شحن لجميع المحافظات • اختاري ما يعبّر عن وهجك'],
  ];
  for (const [key, value] of settings) {
    await prisma.siteSetting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }

  // 5) أقسام الصفحة الرئيسية
  const sections = [
    { type: 'hero', title: 'لأن أناقتك تستحق أن تتألّق', subtitle: 'قطع مختارة بعناية لتضيف لمسة من الوهج إلى كل إطلالة.', ctaText: 'اكتشفي المجموعة', ctaUrl: '/shop', sortOrder: 0 },
    { type: 'products', title: 'الأكثر تألقًا', subtitle: 'اختيارات وَهَج', sortOrder: 1 },
    { type: 'collections', title: 'المجموعات', sortOrder: 2 },
    { type: 'offers', title: 'عروض مختارة', subtitle: 'لمعتك تبدأ من التفاصيل', sortOrder: 3 },
    { type: 'trust', title: 'ثقة تستحقها تجربتك', sortOrder: 4 },
    { type: 'story', title: 'تفاصيل صغيرة تصنع وهجًا كبيرًا.', subtitle: '', sortOrder: 5 },
    { type: 'testimonials', title: 'ماذا تقول عميلات وَهَج؟', subtitle: 'تجارب حقيقية تصنع الثقة.', sortOrder: 6 },
    { type: 'social', title: 'من عالم وَهَج', subtitle: 'إلهام يومي من تفاصيلنا.', sortOrder: 7 },
    { type: 'newsletter', title: 'انضمي إلى عالم وَهَج', subtitle: 'احصلي على آخر العروض والمجموعات الجديدة.', sortOrder: 8 },
  ];
  for (const x of sections) {
    const exists = await prisma.homepageSection.findFirst({ where: { type: x.type } });
    if (!exists) await prisma.homepageSection.create({ data: x });
  }

  // 6) الثيم
  const theme = await prisma.themeSetting.findFirst();
  if (!theme) {
    await prisma.themeSetting.create({
      data: {
        primaryColor: '#171513',
        accentColor: '#C8A96B',
        background: '#F8F5EF',
        textColor: '#171513',
        darkMode: true,
      },
    });
  }

  // 7) أعلام الميزات
  const flags: Array<[string, string]> = [
    ['wishlist', 'المفضلة'],
    ['dark_mode', 'الوضع الداكن'],
    ['quick_view', 'العرض السريع'],
    ['recently_viewed', 'شوهد مؤخراً'],
    ['cart_drawer', 'سلة جانبية'],
    ['gift_wrap', 'تغليف الهدايا'],
    ['popup', 'النوافذ المنبثقة'],
    ['smart_recommendations', 'التوصيات الذكية'],
    ['newsletter', 'النشرة البريدية'],
    ['abandoned_cart', 'السلات المتروكة'],
  ];
  for (const [key, description] of flags) {
    await prisma.featureFlag.upsert({
      where: { key },
      update: { description },
      create: { key, description, enabled: key !== 'gift_wrap' && key !== 'abandoned_cart' },
    });
  }

  // 8) طرق الدفع
  for (const method of Object.values(PaymentMethod)) {
    await prisma.paymentSetting.upsert({
      where: { method },
      update: {},
      create: {
        method,
        enabled: true,
        label: method === 'COD' ? 'الدفع عند الاستلام' : method === 'VODAFONE_CASH' ? 'Vodafone Cash' : 'InstaPay',
        description: method === 'COD' ? 'الدفع عند استلام الطلب' : 'بيانات الدفع تظهر بعد اختيار الطريقة',
        displayOrder: method === 'COD' ? 0 : method === 'VODAFONE_CASH' ? 1 : 2,
      },
    });
  }

  console.log('✅ Seed complete');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
