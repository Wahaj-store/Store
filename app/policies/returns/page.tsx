import { prisma } from '@/lib/prisma';
import { RotateCcw, ShieldCheck, Truck, HelpCircle, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

export const revalidate = 0;

export const metadata = {
  title: 'سياسة الاستبدال والاسترجاع — وَهَج',
};

export default async function ReturnsPolicyPage() {
  const setting = await prisma.siteSetting.findUnique({
    where: { key: 'return_policy' },
  }).catch(() => null);

  // النص الافتراضي المقسم والمنظم
  const defaultReturnsText = `نحرص في "وَهَج" حرصاً بالغاً على وصول منتجاتنا إليك بحالة سليمة ومثالية. إذا واجهتك أي مشكلة في المنتج، فإن فريق خدمة العملاء لدينا مستعد دائماً لمساعدتك في أسرع وقت ممكن.`;

  return (
    <main className="min-h-screen py-12 px-4 md:px-8 bg-background text-foreground transition-colors duration-300" dir="rtl">
      <div className="container max-w-4xl mx-auto space-y-10">
        
        {/* ترويسة الصفحة */}
        <div className="text-center space-y-4 border-b border-border/40 pb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--gold)]/10 text-[var(--gold)] border border-[var(--gold)]/30 shadow-sm">
            <RotateCcw size={30} />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            الاستبدال والاسترجاع
          </h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-lg mx-auto leading-relaxed">
            {setting?.value ? "نحرص على راحتك وتجربة تسوق مريحة ومرنة بكل أمان وثقة." : defaultReturnsText}
          </p>
        </div>

        {/* محتوى السياسة مقسم في بطاقات أنيقة وواضحة */}
        <div className="grid gap-6">

          {/* 1. شروط الاستبدال والاسترجاع العامة */}
          <div className="bg-card border border-border/60 rounded-2xl p-6 md:p-8 shadow-sm space-y-4">
            <div className="flex items-center gap-3 border-b border-border/30 pb-4">
              <div className="p-2 rounded-xl bg-[var(--gold)]/10 text-[var(--gold)]">
                <CheckCircle2 size={22} />
              </div>
              <h2 className="text-lg md:text-xl font-bold">شروط الاستبدال والاسترجاع العامة</h2>
            </div>
            
            <ul className="space-y-3 text-sm md:text-base text-foreground/90 leading-relaxed">
              <li className="flex items-start gap-2.5">
                <span className="inline-block w-2 h-2 rounded-full bg-[var(--gold)] mt-2 shrink-0"></i>
                <span><strong>المدة الزمنية:</strong> يمكنكم طلب الاستبدال أو الاسترجاع خلال 7 أيام من تاريخ استلام الطلب.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="inline-block w-2 h-2 rounded-full bg-[var(--gold)] mt-2 shrink-0"></i>
                <span><strong>حالة المنتج:</strong> يجب أن يكون المنتج في حالته الأصلية، وغير مستخدم، وبغلافه الأصلي مع كافة ملحقاته.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="inline-block w-2 h-2 rounded-full bg-[var(--gold)] mt-2 shrink-0"></i>
                <span><strong>المنتجات المستثناة:</strong> لا يمكن استبدال أو استرجاع المنتجات التي تم فتحها أو استخدامها أو تضررها نتيجة سوء الاستخدام مالم تكن عيباً مصنعياً.</span>
              </li>
            </ul>
          </div>

          {/* 2. آلية وخطوات الخدمة */}
          <div className="bg-card border border-border/60 rounded-2xl p-6 md:p-8 shadow-sm space-y-4">
            <div className="flex items-center gap-3 border-b border-border/30 pb-4">
              <div className="p-2 rounded-xl bg-[var(--gold)]/10 text-[var(--gold)]">
                <Clock size={22} />
              </div>
              <h2 className="text-lg md:text-xl font-bold">آلية وخطوات الخدمة</h2>
            </div>
            
            <ul className="space-y-3 text-sm md:text-base text-foreground/90 leading-relaxed">
              <li className="flex items-start gap-2.5">
                <span className="inline-block w-2 h-2 rounded-full bg-[var(--gold)] mt-2 shrink-0"></i>
                <span><strong>مراجعة الطلب:</strong> يتم مراجعة كل حالة استبدال أو استرجاع وفقاً لحالة المنتج وسبب الطلب بدقة.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="inline-block w-2 h-2 rounded-full bg-[var(--gold)] mt-2 shrink-0"></i>
                <span><strong>توثيق الحالة:</strong> قد يتطلب الأمر منكم إرسال صور واضحة للمنتج والمشكلة الظاهرة لتسريع إجراءات المعالجة.</span>
              </li>
            </ul>
          </div>

          {/* 3. رسوم الشحن والتكاليف */}
          <div className="bg-card border border-border/60 rounded-2xl p-6 md:p-8 shadow-sm space-y-4">
            <div className="flex items-center gap-3 border-b border-border/30 pb-4">
              <div className="p-2 rounded-xl bg-[var(--gold)]/10 text-[var(--gold)]">
                <Truck size={22} />
              </div>
              <h2 className="text-lg md:text-xl font-bold">رسوم الشحن والتكاليف</h2>
            </div>
            
            <ul className="space-y-3 text-sm md:text-base text-foreground/90 leading-relaxed">
              <li className="flex items-start gap-2.5">
                <span className="inline-block w-2 h-2 rounded-full bg-[var(--gold)] mt-2 shrink-0"></i>
                <span><strong>في حال وجود خطأ أو عيب مصنعي:</strong> يتحمل متجر "وَهَج" كامل رسوم الشحن الخاصة بالاستبدال أو الاسترجاع.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="inline-block w-2 h-2 rounded-full bg-[var(--gold)] mt-2 shrink-0"></i>
                <span><strong>في حال رغبة العميل في التغيير لغير عيب في المنتج:</strong> يتحمل العميل رسوم شحن الاستبدال أو الاسترجاع المتفق عليها.</span>
              </li>
            </ul>
          </div>

          {/* 4. كيف نبدأ؟ */}
          <div className="bg-[var(--gold)]/5 border border-[var(--gold)]/20 rounded-2xl p-6 md:p-8 space-y-3">
            <div className="flex items-center gap-3">
              <AlertCircle size={22} className="text-[var(--gold)] shrink-0" />
              <h2 className="text-lg md:text-xl font-bold">كيف نبدأ؟</h2>
            </div>
            <p className="text-sm md:text-base text-foreground/90 leading-relaxed">
              لتسهيل خدمة العملاء، يرجى التواصل معنا مباشرة عبر قنوات الدعم الخاصة بالمتجر مع إرفاق رقم الطلب وصورة واضحة للمنتج عند وجود أي ملاحظة.
            </p>
          </div>

        </div>

        {/* بطاقات الضمان والخدمة السريعة السفليّة */}
        <div className="grid gap-4 md:grid-cols-3 pt-2">
          <div className="bg-card border border-border/60 p-5 rounded-xl text-center space-y-2 shadow-sm">
            <ShieldCheck size={24} className="mx-auto text-[var(--gold)]" />
            <h3 className="font-semibold text-sm">ضمان الجودة</h3>
            <p className="text-muted-foreground text-xs">منتجات أصلية ومفحوصة بدقة وعناية.</p>
          </div>

          <div className="bg-card border border-border/60 p-5 rounded-xl text-center space-y-2 shadow-sm">
            <Truck size={24} className="mx-auto text-[var(--gold)]" />
            <h3 className="font-semibold text-sm">إجراءات سريعة</h3>
            <p className="text-muted-foreground text-xs">معالجة الطلبات في أسرع وقت ممكن.</p>
          </div>

          <div className="bg-card border border-border/60 p-5 rounded-xl text-center space-y-2 shadow-sm">
            <HelpCircle size={24} className="mx-auto text-[var(--gold)]" />
            <h3 className="font-semibold text-sm">دعم العملاء</h3>
            <p className="text-muted-foreground text-xs">فريق دعم جاهز لمساعدتك دائماً.</p>
          </div>
        </div>

      </div>
    </main>
  );
}
