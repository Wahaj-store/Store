import { prisma } from '@/lib/prisma';
import { HelpCircle, RotateCcw, ShieldCheck, Truck } from 'lucide-react';

export const revalidate = 0;

export const metadata = {
  title: 'سياسة الاستبدال والاسترجاع — وَهَج',
};

function PolicyContent({ content }: { content: string }) {
  const blocks = content
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <div className="space-y-7 text-[15px] leading-8 text-foreground/85 md:text-[16px] md:leading-9">
      {blocks.map((block, index) => {
        const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
        const bulletLines = lines.filter((line) => /^[•*-]\s*/.test(line));
        const title = lines.find((line) => !/^[•*-]\s*/.test(line));

        if (bulletLines.length > 0 && title) {
          return (
            <section key={`${index}-${title}`} className="space-y-3">
              <h2 className="text-lg font-bold text-foreground md:text-xl">{title}</h2>
              <ul className="space-y-3 pr-1">
                {bulletLines.map((line, itemIndex) => (
                  <li key={`${index}-${itemIndex}`} className="flex items-start gap-3">
                    <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--gold)]" />
                    <span>{line.replace(/^[•*-]\s*/, '')}</span>
                  </li>
                ))}
              </ul>
            </section>
          );
        }

        return (
          <p key={`${index}-${title || 'paragraph'}`} className="whitespace-pre-line">
            {block}
          </p>
        );
      })}
    </div>
  );
}

export default async function ReturnsPolicyPage() {
  const setting = await prisma.siteSetting.findUnique({
    where: { key: 'return_policy' },
  }).catch(() => null);

  const defaultReturnsText = `نحرص في "وَهَج" حرصاً بالغاً على وصول منتجاتنا إليك بحالة سليمة ومثالية. إذا واجهتك أي مشكلة في المنتج، فإن فريق خدمة العملاء لدينا مستعد دائماً لمساعدتك في أسرع وقت ممكن.

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
لتسهيل خدمة العملاء، يرجى التواصل معنا مباشرة عبر قنوات الدعم الخاصة بالمتجر مع إرفاق رقم الطلب وصورة واضحة للمنتج عند وجود أي ملاحظة.`;

  const content = setting?.value || defaultReturnsText;

  return (
    <main dir="rtl" className="min-h-screen bg-background px-4 py-10 font-[Tajawal] text-foreground transition-colors duration-300 md:py-16">
      <div className="mx-auto max-w-5xl">
        <header className="relative overflow-hidden rounded-[28px] border border-border/60 bg-card px-5 py-10 text-center shadow-[0_18px_60px_rgba(0,0,0,0.06)] md:px-10 md:py-14">
          <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-[var(--gold)]/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -left-20 h-56 w-56 rounded-full bg-[var(--gold)]/8 blur-3xl" />
          <div className="relative">
            <span className="mb-4 inline-flex items-center gap-2 text-xs font-semibold tracking-[0.12em] text-[var(--gold-muted)] md:text-sm">
              <span className="h-px w-7 bg-[var(--gold)]/60" />
              وَهَج · خدمة ما بعد البيع
              <span className="h-px w-7 bg-[var(--gold)]/60" />
            </span>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--gold)]/30 bg-[var(--gold)]/10 text-[var(--gold)] shadow-sm">
              <RotateCcw size={30} strokeWidth={1.8} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">الاستبدال والاسترجاع</h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base md:leading-8">
              سياسة واضحة ومنظمة تساعدك على معرفة حقوقك وخطوات طلب الاستبدال أو الاسترجاع بكل سهولة.
            </p>
          </div>
        </header>

        <section className="mt-7 rounded-[26px] border border-border/70 bg-card p-5 shadow-[0_14px_45px_rgba(0,0,0,0.05)] md:mt-8 md:p-9">
          <div className="mb-7 flex items-center gap-3 border-b border-border/60 pb-5">
            <span className="h-9 w-1 rounded-full bg-[var(--gold)]" />
            <div>
              <h2 className="text-xl font-bold text-foreground md:text-2xl">تفاصيل السياسة</h2>
              <p className="mt-1 text-xs text-muted-foreground md:text-sm">الشروط والخطوات والتكاليف الخاصة بخدمة ما بعد البيع</p>
            </div>
          </div>
          <PolicyContent content={content} />
        </section>

        <section className="mt-7 grid gap-4 sm:grid-cols-3">
          <div className="rounded-[22px] border border-border/70 bg-card p-5 text-center shadow-sm">
            <ShieldCheck size={26} className="mx-auto text-[var(--gold)]" strokeWidth={1.7} />
            <h3 className="mt-3 text-sm font-bold text-foreground md:text-base">ضمان الجودة</h3>
            <p className="mt-1 text-xs leading-6 text-muted-foreground">نتعامل مع كل حالة بعناية واهتمام.</p>
          </div>
          <div className="rounded-[22px] border border-border/70 bg-card p-5 text-center shadow-sm">
            <Truck size={26} className="mx-auto text-[var(--gold)]" strokeWidth={1.7} />
            <h3 className="mt-3 text-sm font-bold text-foreground md:text-base">إجراءات واضحة</h3>
            <p className="mt-1 text-xs leading-6 text-muted-foreground">خطوات مرتبة لتسهيل معالجة طلبك.</p>
          </div>
          <div className="rounded-[22px] border border-border/70 bg-card p-5 text-center shadow-sm">
            <HelpCircle size={26} className="mx-auto text-[var(--gold)]" strokeWidth={1.7} />
            <h3 className="mt-3 text-sm font-bold text-foreground md:text-base">دعم العملاء</h3>
            <p className="mt-1 text-xs leading-6 text-muted-foreground">فريق الدعم جاهز لمساعدتك عند الحاجة.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
