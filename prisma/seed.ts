import { PrismaClient, Role, ProductStatus, PaymentMethod } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

function hash(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, 'wahaj-salt', 64, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey.toString('hex'));
    });
  });
}

/**
 * Search text used by the Product trigram GIN index.
 * Keeps Arabic letters searchable while removing diacritics/tatweel and normalizing whitespace.
 */
function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/\u0640/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();
}

async function upsertSiteSetting(key: string, value: string) {
  await prisma.siteSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

async function seedSiteSettingIfMissing(key: string, value: string) {
  await prisma.siteSetting.upsert({
    where: { key },
    update: {},
    create: { key, value },
  });
}

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error(
      'ADMIN_EMAIL و ADMIN_PASSWORD مطلوبان لتشغيل seed. لا تستخدم بيانات دخول افتراضية في الإنتاج.',
    );
  }

  // 1) Owner/admin account required by the admin login flow.
  const passwordHash = await hash(adminPassword);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { active: true, role: Role.OWNER, name: 'مالك المتجر' },
    create: {
      email: adminEmail,
      passwordHash,
      role: Role.OWNER,
      name: 'مالك المتجر',
      active: true,
    },
  });

  // 2) Store categories.
  const categories = [
    { name: 'خواتم', slug: 'rings', imageUrl: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=900&q=82' },
    { name: 'سلاسل', slug: 'necklaces', imageUrl: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=900&q=82' },
    { name: 'أساور', slug: 'bracelets', imageUrl: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=900&q=82' },
    { name: 'انسيالات', slug: 'anklets', imageUrl: 'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?auto=format&fit=crop&w=900&q=82' },
    { name: 'حلقان', slug: 'earrings', imageUrl: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=900&q=82' },
    { name: 'أطقم', slug: 'sets', imageUrl: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=900&q=82' },
    { name: 'هدايا', slug: 'gifts', imageUrl: 'https://images.unsplash.com/photo-1512909006721-3d6018887383?auto=format&fit=crop&w=900&q=82' },
    { name: 'إكسسوارات', slug: 'accessories', imageUrl: 'https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=900&q=82' },
  ];

  const categoryMap = new Map<string, string>();
  for (let index = 0; index < categories.length; index += 1) {
    const category = categories[index];
    const saved = await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        imageUrl: category.imageUrl,
        active: true,
        sortOrder: index,
      },
      create: {
        name: category.name,
        slug: category.slug,
        imageUrl: category.imageUrl,
        active: true,
        sortOrder: index,
      },
    });
    categoryMap.set(category.slug, saved.id);
  }

  // 3) Published catalog products with searchText populated for the trigram index.
  const products = [
    {
      name: 'سلسلة وهج الذهبية', slug: 'wahaj-golden-necklace', price: 399, comparePrice: 599,
      sku: 'WAH-NECK-001', category: 'necklaces', image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=900&q=82',
      featured: true, newArrival: true, bestSeller: true,
    },
    {
      name: 'خاتم اللمعة', slug: 'glow-ring', price: 474, comparePrice: 679,
      sku: 'WAH-RING-001', category: 'rings', image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=900&q=82',
      featured: true, newArrival: true, bestSeller: false,
    },
    {
      name: 'سوار كلاسيك', slug: 'classic-bracelet', price: 549, comparePrice: 799,
      sku: 'WAH-BRAC-001', category: 'bracelets', image: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=900&q=82',
      featured: true, newArrival: false, bestSeller: true,
    },
    {
      name: 'انسيال ناعم', slug: 'soft-anklet', price: 624, comparePrice: 899,
      sku: 'WAH-ANKL-001', category: 'anklets', image: 'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?auto=format&fit=crop&w=900&q=82',
      featured: false, newArrival: true, bestSeller: true,
    },
  ];

  const productMap = new Map<string, string>();
  for (const product of products) {
    const categoryId = categoryMap.get(product.category);
    if (!categoryId) throw new Error(`Category not found: ${product.category}`);

    const description = 'قطعة أنيقة مختارة بعناية لتضيف لمسة من الوهج إلى إطلالتك.';
    const searchText = normalizeSearchText(
      [product.name, product.slug, product.sku, description, product.category].join(' '),
    );

    const saved = await prisma.product.upsert({
      where: { slug: product.slug },
      update: {
        name: product.name,
        price: product.price,
        comparePrice: product.comparePrice,
        stock: 20,
        categoryId,
        description,
        searchText,
        featured: product.featured,
        newArrival: product.newArrival,
        bestSeller: product.bestSeller,
        status: ProductStatus.PUBLISHED,
        seoTitle: product.name,
        seoDescription: description,
        tags: product.category,
      },
      create: {
        name: product.name,
        slug: product.slug,
        price: product.price,
        comparePrice: product.comparePrice,
        stock: 20,
        sku: product.sku,
        material: 'ستانلس ستيل مطلي',
        careInstructions: 'يحفظ بعيدًا عن الماء والعطور والمواد الكيميائية.',
        description,
        searchText,
        featured: product.featured,
        newArrival: product.newArrival,
        bestSeller: product.bestSeller,
        status: ProductStatus.PUBLISHED,
        categoryId,
        seoTitle: product.name,
        seoDescription: description,
        tags: product.category,
      },
    });

    productMap.set(product.slug, saved.id);

    const imageExists = await prisma.productImage.findFirst({ where: { productId: saved.id } });
    if (!imageExists) {
      await prisma.productImage.create({
        data: { productId: saved.id, url: product.image, alt: product.name, sortOrder: 0 },
      });
    }
  }

  // 4) Core site settings used by the storefront.
  const settings: Array<[string, string]> = [
    ['brand_story', 'وَهَج ليس مجرد إكسسوار، بل تلك اللمعة الصغيرة التي تغيّر الإطلالة كاملة. اخترنا اسم وَهَج لأنه يعبّر عن التألق الذي تضيفه التفاصيل الجميلة إلى حضورك، وعن القطع التي تمنح كل إطلالة لمستها الخاصة. في وَهَج نختار قطعًا عصرية وأنيقة بعناية، لنمنحك فرصة التعبير عن أسلوبك بطريقتك.'],
    ['whatsapp', ''],
    ['announcement', 'شحن لجميع المحافظات • اختاري ما يعبّر عن وهجك'],
    ['store_name', 'وهج'],
    ['currency', 'EGP'],
    ['shipping_free_above', '1000'],
    ['contact_phone', ''],
    ['contact_email', adminEmail],
  ];
  for (const [key, value] of settings) await upsertSiteSetting(key, value);

  // These remain blank until the store owner supplies the real social profiles.
  // Unlike other seed settings, they must never replace a value saved from the admin panel.
  const socialSettings: Array<[string, string]> = [
    ['social_facebook', ''],
    ['social_instagram', ''],
    ['social_tiktok', ''],
  ];
  for (const [key, value] of socialSettings) await seedSiteSettingIfMissing(key, value);

  // 5) Homepage sections.
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

  for (const section of sections) {
    const existing = await prisma.homepageSection.findFirst({ where: { type: section.type } });
    if (existing) {
      await prisma.homepageSection.update({
        where: { id: existing.id },
        data: { ...section, visible: true, status: 'PUBLISHED' },
      });
    } else {
      await prisma.homepageSection.create({
        data: { ...section, visible: true, status: 'PUBLISHED' },
      });
    }
  }

  // 6) Theme defaults matching the existing Wahaj visual identity.
  const theme = await prisma.themeSetting.findFirst();
  if (theme) {
    await prisma.themeSetting.update({
      where: { id: theme.id },
      data: {
        primaryColor: '#171513',
        accentColor: '#C8A96B',
        background: '#F8F5EF',
        textColor: '#171513',
        fontFamily: 'Tajawal',
        radiusScale: 'luxury',
        darkMode: true,
      },
    });
  } else {
    await prisma.themeSetting.create({
      data: {
        primaryColor: '#171513',
        accentColor: '#C8A96B',
        background: '#F8F5EF',
        textColor: '#171513',
        fontFamily: 'Tajawal',
        radiusScale: 'luxury',
        darkMode: true,
      },
    });
  }

  // 7) Feature flags used by the current storefront/admin feature set.
  const flags: Array<[string, string, boolean]> = [
    ['wishlist', 'المفضلة', true],
    ['dark_mode', 'الوضع الداكن', true],
    ['quick_view', 'العرض السريع', true],
    ['recently_viewed', 'شوهد مؤخرًا', true],
    ['cart_drawer', 'سلة جانبية', true],
    ['gift_wrap', 'تغليف الهدايا', false],
    ['popup', 'النوافذ المنبثقة', true],
    ['smart_recommendations', 'التوصيات الذكية', true],
    ['newsletter', 'النشرة البريدية', true],
    ['abandoned_cart', 'السلات المتروكة', false],
  ];
  for (const [key, description, enabled] of flags) {
    await prisma.featureFlag.upsert({
      where: { key },
      update: { description, enabled },
      create: { key, description, enabled },
    });
  }

  // 8) Payment methods defined by the schema.
  const paymentSettings = [
    { method: PaymentMethod.COD, label: 'الدفع عند الاستلام', description: 'الدفع عند استلام الطلب.', displayOrder: 0 },
    { method: PaymentMethod.VODAFONE_CASH, label: 'Vodafone Cash', description: 'الدفع عبر Vodafone Cash. أضيفي بيانات الحساب من لوحة التحكم.', displayOrder: 1 },
    { method: PaymentMethod.INSTAPAY, label: 'InstaPay', description: 'الدفع عبر InstaPay. أضيفي بيانات الحساب من لوحة التحكم.', displayOrder: 2 },
  ];
  for (const config of paymentSettings) {
    const method = config.method;
    await prisma.paymentSetting.upsert({
      where: { method },
      update: {
        enabled: true,
        label: config.label,
        description: config.description,
        displayOrder: config.displayOrder,
      },
      create: {
        method,
        enabled: true,
        label: config.label,
        description: config.description,
        displayOrder: config.displayOrder,
      },
    });
  }

  // 9) Shipping zones: safe baseline for Egypt. Admin can edit/extend these later.
  const shippingZones = [
    { governorate: 'القاهرة', price: 60, freeAbove: 1000, etaMinDays: 1, etaMaxDays: 2 },
    { governorate: 'الجيزة', price: 60, freeAbove: 1000, etaMinDays: 1, etaMaxDays: 2 },
    { governorate: 'الإسكندرية', price: 65, freeAbove: 1000, etaMinDays: 1, etaMaxDays: 2 },
    { governorate: 'البحيرة', price: 70, freeAbove: 1000, etaMinDays: 1, etaMaxDays: 3 },
    { governorate: 'الدقهلية', price: 70, freeAbove: 1000, etaMinDays: 1, etaMaxDays: 3 },
    { governorate: 'الشرقية', price: 70, freeAbove: 1000, etaMinDays: 1, etaMaxDays: 3 },
    { governorate: 'الغربية', price: 70, freeAbove: 1000, etaMinDays: 1, etaMaxDays: 3 },
    { governorate: 'المنوفية', price: 70, freeAbove: 1000, etaMinDays: 1, etaMaxDays: 3 },
    { governorate: 'القليوبية', price: 65, freeAbove: 1000, etaMinDays: 1, etaMaxDays: 3 },
    { governorate: 'بورسعيد', price: 80, freeAbove: 1000, etaMinDays: 2, etaMaxDays: 4 },
    { governorate: 'الإسماعيلية', price: 80, freeAbove: 1000, etaMinDays: 2, etaMaxDays: 4 },
    { governorate: 'السويس', price: 80, freeAbove: 1000, etaMinDays: 2, etaMaxDays: 4 },
    { governorate: 'دمياط', price: 80, freeAbove: 1000, etaMinDays: 2, etaMaxDays: 4 },
    { governorate: 'كفر الشيخ', price: 75, freeAbove: 1000, etaMinDays: 2, etaMaxDays: 4 },
    { governorate: 'الفيوم', price: 80, freeAbove: 1000, etaMinDays: 2, etaMaxDays: 4 },
    { governorate: 'بني سويف', price: 85, freeAbove: 1000, etaMinDays: 2, etaMaxDays: 4 },
    { governorate: 'المنيا', price: 90, freeAbove: 1000, etaMinDays: 2, etaMaxDays: 5 },
    { governorate: 'أسيوط', price: 90, freeAbove: 1000, etaMinDays: 2, etaMaxDays: 5 },
    { governorate: 'سوهاج', price: 95, freeAbove: 1000, etaMinDays: 3, etaMaxDays: 5 },
    { governorate: 'قنا', price: 100, freeAbove: 1000, etaMinDays: 3, etaMaxDays: 6 },
    { governorate: 'الأقصر', price: 100, freeAbove: 1000, etaMinDays: 3, etaMaxDays: 6 },
    { governorate: 'أسوان', price: 110, freeAbove: 1000, etaMinDays: 3, etaMaxDays: 6 },
    { governorate: 'البحر الأحمر', price: 110, freeAbove: 1000, etaMinDays: 3, etaMaxDays: 6 },
    { governorate: 'الوادي الجديد', price: 120, freeAbove: 1000, etaMinDays: 4, etaMaxDays: 7 },
    { governorate: 'مطروح', price: 110, freeAbove: 1000, etaMinDays: 3, etaMaxDays: 6 },
    { governorate: 'شمال سيناء', price: 120, freeAbove: 1000, etaMinDays: 4, etaMaxDays: 7 },
    { governorate: 'جنوب سيناء', price: 120, freeAbove: 1000, etaMinDays: 4, etaMaxDays: 7 },
  ];
  for (const zone of shippingZones) {
    const existing = await prisma.shippingZone.findFirst({
      where: { governorate: zone.governorate, city: null },
    });
    if (existing) {
      await prisma.shippingZone.update({
        where: { id: existing.id },
        data: { price: zone.price, freeAbove: zone.freeAbove, etaMinDays: zone.etaMinDays, etaMaxDays: zone.etaMaxDays, active: true },
      });
    } else {
      await prisma.shippingZone.create({ data: { ...zone, city: null, active: true } });
    }
  }

  // 10) Small set of public FAQs so the FAQ model is not left empty.
  const faqs = [
    ['كم يستغرق الشحن؟', 'يختلف وقت التوصيل حسب المحافظة، ويظهر النطاق المتوقع عند اختيار منطقة الشحن.', 'shipping', 0],
    ['هل يمكن الاستبدال أو الإرجاع؟', 'يمكنك مراجعة سياسة الاستبدال والإرجاع من صفحة السياسات أو التواصل مع خدمة العملاء قبل إتمام الطلب.', 'returns', 1],
    ['ما طرق الدفع المتاحة؟', 'الدفع عند الاستلام، Vodafone Cash، وInstaPay وفق الإعدادات المتاحة في المتجر.', 'payment', 2],
    ['كيف أحافظ على الإكسسوارات؟', 'احفظي القطعة بعيدًا عن الماء والعطور والمواد الكيميائية، وامسحيها بقطعة قماش ناعمة.', 'products', 3],
  ] as const;
  for (const [question, answer, category, displayOrder] of faqs) {
    const exists = await prisma.faqItem.findFirst({ where: { question } });
    if (exists) {
      await prisma.faqItem.update({ where: { id: exists.id }, data: { answer, category, displayOrder, published: true } });
    } else {
      await prisma.faqItem.create({ data: { question, answer, category, displayOrder, published: true } });
    }
  }

  // 11) Public media records matching the seeded category/product visuals.
  for (const category of categories) {
    const exists = await prisma.media.findFirst({ where: { url: category.imageUrl } });
    if (!exists) {
      await prisma.media.create({
        data: { url: category.imageUrl, name: category.slug, type: 'image', alt: category.name, width: 900 },
      });
    }
  }

  // 12) Redirects for common legacy paths; idempotent and non-destructive.
  const redirects = [
    { fromPath: '/products', toPath: '/shop', statusCode: 301 },
    { fromPath: '/collections', toPath: '/shop', statusCode: 301 },
  ];
  for (const redirect of redirects) {
    await prisma.redirect.upsert({
      where: { fromPath: redirect.fromPath },
      update: { toPath: redirect.toPath, statusCode: redirect.statusCode, active: true },
      create: { ...redirect, active: true },
    });
  }

  // 13) Basic customer segments used by the segmentation feature.
  const segments = [
    { name: 'عملاء جدد', description: 'العملاء الجدد في المتجر.', rule: JSON.stringify({ type: 'new_customer', days: 30 }) },
    { name: 'عملاء متكررون', description: 'العملاء الذين لديهم أكثر من طلب.', rule: JSON.stringify({ type: 'repeat_customer', minOrders: 2 }) },
    { name: 'عملاء غير نشطين', description: 'عملاء لم يشتروا مؤخرًا.', rule: JSON.stringify({ type: 'inactive_customer', days: 90 }) },
  ];
  for (const segment of segments) {
    await prisma.customerSegment.upsert({
      where: { name: segment.name },
      update: { description: segment.description, rule: segment.rule, active: true },
      create: { ...segment, active: true },
    });
  }

  // Keep references above intentionally used so future seed extensions can add relations safely.
  void productMap;

  console.log('Wahaj seed complete: admin, catalog, homepage, theme, flags, payments, shipping, FAQs, media, redirects and segments restored.');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
