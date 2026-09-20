import { prisma } from '@/lib/prisma';
import { RotateCcw, ShieldCheck, Truck, HelpCircle } from 'lucide-react';

export const revalidate = 0;

export const metadata = {
  title: 'سياسة الاستبدال والاسترجاع — وَهَج',
};

export default async function ReturnsPolicyPage() {
  const setting = await prisma.siteSetting.findUnique({
    where: { key: 'return_policy' },
  }).catch(() => null);

  const defaultReturnsText = `
نحرص في "وَهَج" حرصاً بالغاً على وصول منتجاتنا إليك بحالة سليمة ومثالية. إذا واجهتك أي مشكلة في المنتج، فإن فريق خدمة العملاء لدينا مستعد دائماً لمساعدتك في أسرع وقت ممكن.

شروط الاستبدال والاسترجاع العامة:
• المدة الزمنية: يمكنكم طلب الاستبدال أو الاسترجاع خلال 7 أيام من تاريخ استلام الطلب.
• حالة المنتج: يجب أن يكون المنتج في حالته الأصلية، وغير مستخدم، وبغلافه الأصلي مع كافة ملحقاته.
• المنتجات المستثناة: لا يمكن استبدال أو استرجاع المنتجات التي تم فتحها أو استخدامها أو تضررها نتيجة سوء الاستخدام مالم تكن عيباً مصنعياً.

آلية وخطوات الخدمة:
• مراجعة الطلب: يتم مراجعة كل حالة استبدال أو استرجاع وفقاً لحالة المنتج وسبب الطلب بدقة.
• توثيق الحالة: قد يتطلب الأمر منكم إرسال صور واضحة للمنتج والمشكلة الظاهرة لتسريع إجراءات المعالجة.

رسوم الشحن والتكاليف:
• في حال وجود خطأ أو عيب مصنعي: يتحمل متجر "وَهَج" كامل رسوم الشحن الخاصة بالاستبدال أو الاسترجاع.
• في حال رغبة العميل في التغيير لغير عيب في المنتج: يتحمل العميل رسوم شحن الاستبدال أو الاسترجاع المتفق عليها.

كيف نبدأ؟
لتسهيل خدمة العملاء، يرجى التواصل معنا مباشرة عبر قنوات الدعم الخاصة بالمتجر مع إرفاق رقم الطلب وصورة واضحة للمنتج عند وجود أي ملاحظة.
  `;

  const content = setting?.value || defaultReturnsText;

  return (
    <main className="min-h-screen py-16 px-4 bg-background text-foreground transition-colors duration-300" dir="rtl">
      <div className="container max-w-4xl mx-auto space-y-12">
        
        {/* ترويسة الصفحة */}
        <div className="text-center space-y-4 border-b border-border/40 pb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--gold)]/10 text-[var(--gold)] border border-[var(--gold)]/30 shadow-sm">
            <RotateCcw size={32} />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            الاستبدال والاسترجاع
          </h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-lg mx-auto leading-relaxed">
            نحرص على راحتك وتجربة تسوق مريحة ومرنة بكل أمان وثقة.
          </p>
        </div>

        {/* صندوق المحتوى المتوافق مع الوضعين (الفاتح والداكن) */}
        <div className="bg-card border border-border/60 rounded-2xl p-6 md:p-10 shadow-lg space-y-6">
          <div className="whitespace-pre-wrap font-sans text-foreground/90 text-base md:text-lg leading-loose">
            {content}
          </div>
        </div>

        {/* بطاقات الضمان والخدمة السريعة */}
        <div className="grid gap-6 md:grid-cols-3 pt-2">
          <div className="bg-card border border-border/60 p-6 rounded-xl text-center space-y-3 shadow-sm hover:border-[var(--gold)]/50 transition">
            <ShieldCheck size={28} className="mx-auto text-[var(--gold)]" />
            <h3 className="font-semibold text-base">ضمان الجودة</h3>
            <p className="text-muted-foreground text-xs md:text-sm leading-relaxed">منتجات أصلية ومفحوصة بدقة وعناية فائقة.</p>
          </div>

          <div className="bg-card border border-border/60 p-6 rounded-xl text-center space-y-3 shadow-sm hover:border-[var(--gold)]/50 transition">
            <Truck size={28} className="mx-auto text-[var(--gold)]" />
            <h3 className="font-semibold text-base">إجراءات سريعة</h3>
            <p className="text-muted-foreground text-xs md:text-sm leading-relaxed">معالجة الطلبات في أسرع وقت ممكن.</p>
          </div>

          <div className="bg-card border border-border/60 p-6 rounded-xl text-center space-y-3 shadow-sm hover:border-[var(--gold)]/50 transition">
            <HelpCircle size={28} className="mx-auto text-[var(--gold)]" />
            <h3 className="font-semibold text-base">دعم العملاء</h3>
            <p className="text-muted-foreground text-xs md:text-sm leading-relaxed">فريق دعم جاهز لمساعدتك دائماً.</p>
          </div>
        </div>

      </div>
    </main>
  );
}
