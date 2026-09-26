// مسار الملف: app/checkout/success/page.tsx

'use type';
import { Suspense } from 'react';
import Link from 'next/link';
import { Sparkles, CheckCircle2, ShoppingBag, PackageCheck } from 'lucide-react';

function SuccessContent({ searchParams }: { searchParams: { order?: string } }) {
  const orderNumber = searchParams?.order || 'WAH-XXXXX';

  return (
    <main className="min-h-screen py-16 px-4 md:px-8 bg-[var(--bg)] text-foreground transition-colors duration-300 flex items-center justify-center" dir="rtl">
      <div className="container max-w-2xl mx-auto space-y-8">
        
        {/* الترويسة العليا */}
        <div className="text-center space-y-3">
          <span className="text-[#D4AF37] font-medium text-xs uppercase tracking-widest inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 shadow-xs">
            <Sparkles size={14} /> تم تأكيد طلبك بنجاح
          </span>
          <h1 className="text-3xl md:text-4xl font-serif font-bold tracking-tight">شكراً لاختيارك وَهَج</h1>
          <p className="text-muted-foreground text-sm font-light">نحن نقدر ثقتكِ، ويتم الآن تجهيز طلبكِ بكل عناية واهتمام.</p>
        </div>

        {/* مؤشر خطوات الطلب التفاعلي (مكتمل كلياً) */}
        <div className="grid grid-cols-3 gap-3 p-3 bg-muted/10 border border-border/40 rounded-3xl shadow-xs">
          <div className="flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-medium text-muted-foreground">
            <span className="w-5 h-5 rounded-full bg-[#D4AF37] text-black flex items-center justify-center text-[10px] font-bold">✓</span>
            <span>مراجعة السلة</span>
          </div>
          <div className="flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-medium text-muted-foreground">
            <span className="w-5 h-5 rounded-full bg-[#D4AF37] text-black flex items-center justify-center text-[10px] font-bold">✓</span>
            <span>الشحن والدفع</span>
          </div>
          <div className="flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-bold bg-[#D4AF37] text-black shadow-md">
            <span className="w-5 h-5 rounded-full bg-black/20 flex items-center justify-center text-[10px]">3</span>
            <span>تأكيد الطلب</span>
          </div>
        </div>

        {/* بطاقة النجاح الفاخرة */}
        <div className="bg-muted/10 border border-border/40 rounded-3xl p-8 md:p-12 shadow-md text-center space-y-6 relative overflow-hidden">
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-[#D4AF37]/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="w-20 h-20 mx-auto rounded-3xl bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 flex items-center justify-center shadow-inner">
            <CheckCircle2 size={40} />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-serif font-bold">تم استلام طلبك</h2>
            <p className="text-muted-foreground text-xs md:text-sm font-light">رقم الطلب الخاص بكِ:</p>
            <div className="inline-block px-5 py-2.5 rounded-2xl bg-[var(--bg)] border border-[#D4AF37]/40 text-[#D4AF37] font-mono font-bold text-lg tracking-wider shadow-xs" dir="ltr">
              {orderNumber}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[var(--bg)]/60 border border-border/40 text-xs text-muted-foreground space-y-1.5 text-right shadow-xs">
            <span className="font-serif font-bold text-foreground block flex items-center gap-2 text-sm text-[#D4AF37]">
              <PackageCheck size={18} /> خطوتنا التالية
            </span>
            <p className="font-light leading-relaxed">سيقوم فريقنا بتجهيز قطعكِ المختارة بعناية فائقة وتوصيلها في أقرب وقت.</p>
          </div>

          <div className="pt-4 border-t border-border/30">
            <Link 
              href="/" 
              className="w-full py-4 rounded-2xl bg-[#D4AF37] text-black font-serif font-bold text-base shadow-lg hover:opacity-95 transition inline-flex items-center justify-center gap-2"
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
    <Suspense fallback={<main className="min-h-screen py-24 text-center bg-[var(--bg)] text-foreground"><div className="mx-auto max-w-xl bg-muted/10 border border-border/40 rounded-3xl p-10 text-sm font-light">جاري تحميل تفاصيل الطلب...</div></main>}>
      <SuccessContent searchParams={searchParams} />
    </Suspense>
  );
}
