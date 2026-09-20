import { prisma } from '@/lib/prisma';
import { RotateCcw, ShieldCheck, Truck, HelpCircle } from 'lucide-react';

export const revalidate = 0;

export const metadata = {
  title: 'سياسة الاستبدال والاسترجاع — وَهَج',
};

export default async function ReturnsPolicyPage() {
  // جلب الإعدادات من الموديل الصحيح والمعرف في مشروعك (مثل setting أو settings)
  let content = '';
  try {
    // جرب البحث بالموديل الصحيح للإعدادات (تأكد من اسم الموديل في schema.prisma لديك)
    const setting = await prisma.setting.findUnique({
      where: { key: 'return_policy' },
    });
    content = setting?.value || '';
  } catch {
    try {
      // محاولة بديلة في حال كان الجدول باسم settings أو بطريقة أخرى
      const setting = await (prisma as any).config?.findUnique({
        where: { key: 'return_policy' },
      });
      content = setting?.value || '';
    } catch {}
  }

  const defaultReturnsText = `
    نحرص على وصول منتجات وَهَج بحالة سليمة. عند وجود مشكلة في المنتج، تواصلي مع خدمة العملاء بأسرع وقت ممكن.
    
    تُراجع كل حالة وفق حالة المنتج وسبب الطلب، وقد يُطلب إرسال صور واضحة للمنتج.
    
    يجب الحفاظ على المنتج وتغليفه بحالتهما المناسبة لحين إتمام المراجعة.
  `;

  const finalContent = content || defaultReturnsText;

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

        {/* محتوى الصفحة */}
        <div className="lux-card p-8 md:p-12 space-y-6 leading-9 text-sm md:text-base border hairline rounded-2xl bg-background shadow-sm">
          <div className="whitespace-pre-wrap font-sans text-foreground/90">
            {finalContent}
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
