import { prisma } from '@/lib/prisma';
import { AlertCircle, Database, Lock, ShieldCheck } from 'lucide-react';

export const revalidate = 3600;

export const metadata = {
  title: 'سياسة الخصوصية — وَهَج',
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

export default async function PrivacyPolicyPage() {
  const setting = await prisma.siteSetting.findUnique({
    where: { key: 'privacy_policy' },
  }).catch(() => null);

  const defaultPrivacyText = `نحن نحترم خصوصيتك ونلتزم بحماية سرية معلوماتك الشخصية بكل أمان وثقة.

المعلومات التي نجمعها:
• نحترم خصوصيتك ونستخدم البيانات التي تقدمها لإتمام الطلبات وتحسين تجربة التسوق وخدمة العملاء.
• قد نجمع بعض البيانات الأساسية اللازمة لتنفيذ الخدمة مثل: الاسم، رقم الهاتف، عنوان التوصيل، وبيانات الطلب.

حماية وأمان البيانات:
• نؤكد لك أننا لا نبيع بيانات العملاء لأطراف أخرى أبداً.
• نستخدم وسائل الحماية المناسبة والتقنيات اللازمة لتأمين البيانات المخزنة لدينا والحفاظ على سريتها.`;

  const content = setting?.value || defaultPrivacyText;

  return (
    <main dir="rtl" className="min-h-screen bg-background px-4 py-10 font-[Tajawal] text-foreground transition-colors duration-300 md:py-16">
      <div className="mx-auto max-w-5xl">
        <header className="relative overflow-hidden rounded-[28px] border border-border/60 bg-card px-5 py-10 text-center shadow-[0_18px_60px_rgba(0,0,0,0.06)] md:px-10 md:py-14">
          <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-[var(--gold)]/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -left-20 h-56 w-56 rounded-full bg-[var(--gold)]/8 blur-3xl" />
          <div className="relative">
            <span className="mb-4 inline-flex items-center gap-2 text-xs font-semibold tracking-[0.12em] text-[var(--gold-muted)] md:text-sm">
              <span className="h-px w-7 bg-[var(--gold)]/60" />
              وَهَج · الخصوصية والأمان
              <span className="h-px w-7 bg-[var(--gold)]/60" />
            </span>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--gold)]/30 bg-[var(--gold)]/10 text-[var(--gold)] shadow-sm">
              <Lock size={30} strokeWidth={1.8} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">سياسة الخصوصية</h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base md:leading-8">
              نوضح لك كيف نتعامل مع معلوماتك ونحافظ على خصوصيتها أثناء استخدام متجر وَهَج.
            </p>
          </div>
        </header>

        <section className="mt-7 rounded-[26px] border border-border/70 bg-card p-5 shadow-[0_14px_45px_rgba(0,0,0,0.05)] md:mt-8 md:p-9">
          <div className="mb-7 flex items-center gap-3 border-b border-border/60 pb-5">
            <span className="h-9 w-1 rounded-full bg-[var(--gold)]" />
            <div>
              <h2 className="text-xl font-bold text-foreground md:text-2xl">خصوصيتك محل اهتمامنا</h2>
              <p className="mt-1 text-xs text-muted-foreground md:text-sm">المعلومات والسياسات المعتمدة في متجر وَهَج</p>
            </div>
          </div>
          <PolicyContent content={content} />
        </section>

        <section className="mt-7 grid gap-4 md:grid-cols-2">
          <div className="rounded-[22px] border border-[var(--gold)]/25 bg-[var(--gold)]/7 p-5 md:p-6">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--gold)]/10 text-[var(--gold)]">
              <AlertCircle size={22} strokeWidth={1.8} />
            </div>
            <h3 className="text-base font-bold text-foreground md:text-lg">تنبيه مهم</h3>
            <p className="mt-2 text-sm leading-7 text-muted-foreground md:text-[15px]">
              لا نطلب بيانات بطاقات الدفع داخل المتجر نهائياً، حفاظاً على أمانك وسلامة معاملاتك.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-[22px] border border-border/70 bg-card p-5 text-center shadow-sm">
              <Database size={25} className="mx-auto text-[var(--gold)]" strokeWidth={1.7} />
              <h3 className="mt-3 text-sm font-bold text-foreground md:text-base">استخدام مسؤول</h3>
              <p className="mt-1 text-xs leading-6 text-muted-foreground">بياناتك لخدمتك وتحسين تجربتك.</p>
            </div>
            <div className="rounded-[22px] border border-border/70 bg-card p-5 text-center shadow-sm">
              <ShieldCheck size={25} className="mx-auto text-[var(--gold)]" strokeWidth={1.7} />
              <h3 className="mt-3 text-sm font-bold text-foreground md:text-base">حماية وخصوصية</h3>
              <p className="mt-1 text-xs leading-6 text-muted-foreground">نحافظ على سرية بيانات العملاء.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
