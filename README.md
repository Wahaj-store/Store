# وَهَج | Wahaj Store — V8 Final Candidate

متجر إلكتروني عربي RTL مبني بـ Next.js 14 + Prisma + PostgreSQL، مع واجهة متجر ولوحة إدارة موحدة.

## أهم ما تم تضمينه

- تصميم RTL عربي فاخر + Light/Dark mode.

- إدارة المنتجات، الصور، الخيارات، الأسعار، المخزون، التصنيفات، العروض والكوبونات.

- علاقات المنتجات: مرتبط، مكمل، Upsell، Cross-sell، Frequently Bought.

- تنبيه عند عودة المنتج للمخزون.

- سلة وCheckout مع COD / Vodafone Cash / InstaPay، إثبات الدفع، كوبونات، شحن وIdempotency.

- حسابات العملاء، العناوين، الطلبات، المفضلة، المراجعات.

- Homepage sections، إعدادات الهيدر والفوتر والإعلانات وPopup وSEO.

- إدارة المستخدمين والصلاحيات وسجل النشاط والأمان.

- Analytics، Notifications، Feature Flags، Redirects، Media Library.

- Gift Cards architecture وMarketing/Customer segments architecture.

- SEO metadata، sitemap، robots، Product structured data.

- حماية كلمات المرور والجلسات، rate limiting، validation، وعدم وضع الأسرار داخل الكود.

## متطلبات البيئة

ضع القيم في Vercel Environment Variables ولا تضعها داخل GitHub:
`PRISMA_DATABASE_URL`, `PRISMA_DIRECT_URL`, `AUTH_SECRET`, `RATE_LIMIT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.

للبيئة الإنتاجية أضف أيضًا:

- `UPSTASH_REDIS_REST_URL` و`UPSTASH_REDIS_REST_TOKEN` لتحديد المعدل عبر جميع Serverless Instances.

- `BLOB_READ_WRITE_TOKEN` لمخزن Blob خاص بإثباتات الدفع.

- `BLOB_PUBLIC_READ_WRITE_TOKEN` لمخزن Blob عام منفصل لصور المنتجات والبنرات.

- لا تستخدم Token المخزن الخاص مع مسار الوسائط العامة.

## تشغيل محلي

```bash
npm install
npm run db:validate
npm run db:generate
npm run typecheck
npm run build
```

> ملاحظة: تم إجراء فحص syntax ثابت لجميع ملفات TS/TSX في بيئة التجهيز. تعذر إكمال تثبيت الحزم/Prisma validation الفعلي أثناء التجهيز بسبب انتهاء مهلة الشبكة في بيئة التنفيذ؛ لذلك يجب تنفيذ الأوامر أعلاه مرة واحدة بعد رفع المشروع على بيئة متصلة.

## V8 hardening

- Fixed invalid admin helper imports and completed CRUD routes for product relations and gift cards.

- Secured admin configuration/feature endpoints.

- Whitelisted theme settings updates to prevent Prisma unknown-field errors.

- Fixed variant stock decrement and minimum-order enforcement.

- Prevented adding products with variants without selecting a variant.

- Removed customer password hashes from admin responses.

- Added missing placeholder/icon assets.

- Added private checkout payment-proof storage with protected admin access.

- Added a separate public media Blob token to keep product images public without weakening payment-proof privacy.

- Static TypeScript/TSX syntax scan passes; full dependency install/Prisma/build still requires running in GitHub/Vercel because this environment cannot download npm packages.
