import { prisma } from '@/lib/prisma';
import { Lock, ShieldCheck, Database, AlertCircle } from 'lucide-react';

export const revalidate = 0;

export const metadata = {
  title: 'سياسة الخصوصية — وَهَج',
};

export default async function PrivacyPolicyPage() {
  // يمكنك جلب النص من قاعدة البيانات أو استخدام النص المنسق والمحسن أدناه
  const setting = await prisma.siteSetting.findUnique({
    where: { key: 'privacy_policy' },
  }).catch(() => null);

  const defaultPrivacyText = `
نحن نحترم خصوصيتك ونلتزم بحماية سرية معلوماتك الشخصية بكل أمان وثقة.

المعلومات التي نجمعها:
• نحترم خصوصيتك ونستخدم البيانات التي تقدمها لإتمام الطلبات وتحسين تجربة التسوق وخدمة العملاء.  
• قد نجمع بعض البيانات الأساسية اللازمة لتنفيذ الخدمة مثل: الاسم، رقم الهاتف، عنوان التوصيل، وبيانات الطلب.  

حماية وأمان البيانات:
• نؤكد لك أننا لا نبيع بيانات العملاء لأطراف أخرى أبداً.  
• نستخدم وسائل الحماية المناسبة والتقنيات اللازمة لتأمين البيانات المخزنة لدينا والحفاظ على سريرتها.
  `;

  const content = setting?.value || defaultPrivacyText;

  return (
    <main className="min-h-screen py-16 px-4 bg-background text-foreground transition-colors duration-300" dir="rtl">
      <div className="container max-w-4xl mx-auto space-y-12">
        
        {/* ترويسة الصفحة */}
        <div className="text-center space-y-4 border-b border-border/40 pb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--gold)]/10 text-[var(--gold)] border border-[var(--gold)]/30 shadow-sm">
            <Lock size={32} />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            سياسة الخصوصية
          </h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-lg mx-auto leading-relaxed">
            نحترم خصوصيتك ونلتزم بحماية سرية معلوماتك الشخصية بكل أمان وثقة.
          </p>
        </div>

        {/* صندوق المحتوى الرئيسي */}
        <div className="bg-card border border-border/60 rounded-2xl p-6 md:p-10 shadow-lg space-y-6">
          <div className="whitespace-pre-wrap font-sans text-foreground/90 text-base md:text-lg leading-loose">
            {content}
          </div>
        </div>

        {/* تنبيه هام خاص ببطاقات الدفع (مميز بشكل بصري فاخر) */}
        <div className="bg-[var(--gold)]/5 border border-[var(--gold)]/30 rounded-2xl p-6 flex items-start gap-4 shadow-sm">
          <div className="p-3 rounded-xl bg-[var(--gold)]/10 text-[var(--gold)] shrink-0">
            <AlertCircle size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-base text-[var(--gold)]">تنبيه هام جداً</h3>
            <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
              لا نطلب بيانات بطاقات الدفع داخل المتجر نهائياً، حفاظاً على أمانك وسلامة معاملاتك.
            </p>
          </div>
        </div>

        {/* بطاقات مميزات الحماية والأمان */}
        <div className="grid gap-6 md:grid-cols-2 pt-2">
          <div className="bg-card border border-border/60 p-6 rounded-xl text-center space-y-3 shadow-sm hover:border-[var(--gold)]/50 transition">
            <Database size={28} className="mx-auto text-[var(--gold)]" />
            <h3 className="font-semibold text-base">استخدام آمن للبيانات</h3>
            <p className="text-muted-foreground text-xs md:text-sm leading-relaxed">نستخدم بياناتك فقط لإتمام طلباتك وتحسين تجربتك بكل مصداقية.</p>
          </div>

          <div className="bg-card border border-border/60 p-6 rounded-xl text-center space-y-3 shadow-sm hover:border-[var(--gold)]/50 transition">
            <ShieldCheck size={28} className="mx-auto text-[var(--gold)]" />
            <h3 className="font-semibold text-base">حماية و سرية تامة</h3>
            <p className="text-muted-foreground text-xs md:text-sm leading-relaxed">نؤكد أننا لا نبيع بيانات العملاء لأطراف أخرى أبداً وتحت أي ظرف.</p>
          </div>
        </div>

      </div>
    </main>
  );
}
