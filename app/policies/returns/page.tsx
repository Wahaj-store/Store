import { prisma } from '@/lib/prisma';
import { RotateCcw, ShieldCheck, Truck, HelpCircle } from 'lucide-react';

export const revalidate = 0; // لضمان تحديث المحتوى فورا عند التعديل من لوحة التحكم

export const metadata = {
  title: 'سياسة الاستبدال والاسترجاع — وَهَج',
};

export default async function ReturnsPolicyPage() {
  // جلب سياسة الاستبدال والاسترجاع من جدول الإعدادات الصحيح SiteSetting
  const setting = await prisma.siteSetting.findUnique({
    where: { key: 'return_policy' },
  }).catch(() => null);

  const defaultReturnsText = `
نحمل في "وَهَج" حرصاً بالغاً على وصول منتجاتنا إليك بحالة سليمة ومثالية. إذا واجهتك أي مشكلة في المنتج، فإن فريق خدمة العملاء لدينا مستعد دائماً لمساعدتك في أسرع وقت ممكن.  
​شروط الاستبدال والاسترجاع العامة:
​المدة الزمنية: يمكنكم طلب الاستبدال أو الاسترجاع خلال 7 أيام من تاريخ استلام الطلب.
​حالة المنتج: يجب أن يكون المنتج في حالته الأصلية، وغير مستخدم، وبغلافه الأصلي مع كافة ملحقاته.
​المنتجات المستثناة: لا يمكن استبدال أو استرجاع المنتجات التي تم فتحها أو استخدامها أو تضررها نتيجة سوء الاستخدام (مالم تكن عيباً مصنعيّاً).
​آلية وخطوات الخدمة:
​مراجعة الطلب: يتم مراجعة كل حالة استبدال أو استرجاع وفقاً لحالة المنتج وسبب الطلب بدقة.  
​توثيق الحالة: قد يتطلب الأمر منكم إرسال صور واضحة للمنتج والمشكلة الظاهرة لتسريع إجراءات المعالجة.  
​رسوم الشحن والتكاليف:
​في حال وجود خطأ أو عيب مصنعي: يتحمل متجر "وَهَج" كامل رسوم الشحن الخاصة بالاستبدال أو الاسترجاع.
​في حال رغبة العميل في التغيير (لغير عيب في المنتج): يتحمل العميل رسوم شحن الاستبدال أو الاسترجاع المتفق عليها.
​كيف نبدأ؟
​لتسهيل خدمة العملاء، يُرجى التواصل معنا مباشرة عبر قنوات الدعم الخاصة بالمتجر مع إرفاق رقم الطلب وصورة واضحة للمنتج عند وجود أي ملاحظة. `;

  const content = setting?.value || defaultReturnsText;

  return (
    <main className="min-h-screen py-16 px-4 bg-background text-foreground" dir="rtl">
      <div className="container max-w-4xl mx-auto space-y-10">
        
        {/* ترويسة الصفحة */}
        <div className="text-center space-y-3 border-b hairline pb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--gold)]/10 text-[var(--gold)] border border-[var(--gold)]/20 shadow-sm">
            <RotateCcw size={28} />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">الاستبدال والاسترجاع</h1>
          <p className="muted text-sm max-w-lg mx-auto">
            نحرص على راحتك وتجربة تسوق مريحة ومرنة بكل أمان وثقة.
          </p>
        </div>

        {/* محتوى الصفحة المستورد من قاعدة البيانات */}
        <div className="lux-card p-8 md:p-12 space-y-6 leading-9 text-sm md:text-base border hairline rounded-2xl bg-background shadow-sm">
          <div className="whitespace-pre-wrap font-sans text-foreground/90">
            {content}
          </div>
        </div>

        {/* بطاقات الضمان والخدمة */}
        <div className="grid gap-4 md:grid-cols-3 pt-4">
          <div className="lux-card p-5 text-center space-y-2 border hairline rounded-xl">
            <ShieldCheck size={24} className="mx-auto text-[var(--gold)]" />
            <h3 className="font-semibold text-sm">ضمان الجودة</h3>
            <p className="muted text-xs">منتجات أصلية ومفحوصة بدقة وعناية فائقة.</p>
          </div>
          <div className="lux-card p-5 text-center space-y-2 border hairline rounded-xl">
            <Truck size={24} className="mx-auto text-[var(--gold)]" />
            <h3 className="font-semibold text-sm">إجراءات سريعة</h3>
            <p className="muted text-xs">معالجة الطلبات في أسرع وقت ممكن.</p>
          </div>
          <div className="lux-card p-5 text-center space-y-2 border hairline rounded-xl">
            <HelpCircle size={24} className="mx-auto text-[var(--gold)]" />
            <h3 className="font-semibold text-sm">دعم العملاء</h3>
            <p className="muted text-xs">فريق دعم جاهز لمساعدتك دائماً.</p>
          </div>
        </div>

      </div>
    </main>
  );
}
