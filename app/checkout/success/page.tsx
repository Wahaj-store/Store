'use type';
import { Suspense } from 'react';
import Link from 'next/link';
import { Sparkles, CheckCircle2, ShoppingBag, PackageCheck } from 'lucide-react';

function SuccessContent({ searchParams }: { searchParams: { order?: string } }) {
  const orderNumber = searchParams?.order || 'WAH-XXXXX';

  return (
    <main className="min-h-screen py-12 px-4 md:px-8 bg-background text-foreground transition-colors duration-300 flex items-center justify-center" dir="rtl">
      <div className="container max-w-2xl mx-auto space-y-8">
        
        {/* الترويسة العليا */}
        <div className="text-center space-y-2">
          <span className="text-[var(--gold)] font-medium text-sm inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--gold)]/10 border border-[var(--gold)]/20">
            <Sparkles size={14} /> تم تأكيد طلبك بنجاح
          </span>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">شكراً لاختيارك وَهَج</h1>
          <p className="text-muted-foreground text-sm">نحن نقدر ثقتكِ، ويتم الآن تجهيز طلبكِ بكل عناية واهتمام.</p>
        </div>

        {/* مؤشر خطوات الطلب التفاعلي (مكتمل كلياً) */}
        <div className="grid grid-cols-3 gap-2 p-3 bg-card border border-border/60 rounded-2xl shadow-sm">
          <div className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-muted-foreground">
            <span className="w-4 h-4 rounded-full bg-[var(--gold)] text-black flex items-center justify-center text-[10px]">✓</span>
            <span>مراجعة السلة</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-muted-foreground">
            <span className="w-4 h-4 rounded-full bg-[var(--gold)] text-black flex items-center justify-center text-[10px]">✓</span>
            <span>الشحن والدفع</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-[var(--gold)] text-black shadow-sm">
            <span className="w-4 h-4 rounded-full bg-black/20 flex items-center justify-center text-[10px]">3</span>
            <span>تأكيد الطلب</span>
          </div>
        </div>

        {/* بطاقة النجاح الفاخرة */}
        <div className="bg-card border border-border/60 rounded-3xl p-8 md:p-10 shadow-lg text-center space-y-6 relative overflow-hidden">
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-[var(--gold)]/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="w-20 h-20 mx-auto rounded-2xl bg-[var(--gold)]/10 text-[var(--gold)] border border-[var(--gold)]/30 flex items-center justify-center shadow-inner">
            <CheckCircle2 size={40} />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold">تم استلام طلبك</h2>
            <p className="text-muted-foreground text-xs md:text-sm">رقم الطلب الخاص بكِ:</p>
            <div className="inline-block px-4 py-2 rounded-xl bg-background border border-[var(--gold)]/40 text-[var(--gold)] font-mono font-bold text-lg tracking-wider shadow-sm" dir="ltr">
              {orderNumber}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-background/60 border border-border/60 text-xs text-muted-foreground space-y-1 text-right">
            <span className="font-bold text-foreground block flex items-center gap-1.5">
              <PackageCheck size={16} className="text-[var(--gold)]" /> خطوتنا التالية
            </span>
            <p>سيقوم فريقنا بتجهيز قطعكِ المختارة بعناية فائقة وتوصيلها في أقرب وقت.</p>
          </div>

          <div className="pt-4 border-t border-border/40">
            <Link 
              href="/" 
              className="w-full py-4 rounded-2xl bg-[var(--gold)] text-black font-bold text-base shadow-lg hover:opacity-95 transition inline-flex items-center justify-center gap-2"
            >
              <ShoppingBag size={18} /> العودة للمتجر
            </Link>
          </div>
        </div>

      </div>
    </main>
  );
}

export default function Success({ searchParams }: { searchParams: { order?: string } }) {
  return (
    <Suspense fallback={<main className="min-h-screen py-24 text-center bg-background text-foreground"><div className="mx-auto max-w-xl bg-card border border-border/60 rounded-3xl p-10">جاري تحميل تفاصيل الطلب...</div></main>}>
      <SuccessContent searchParams={searchParams} />
    </Suspense>
  );
}
