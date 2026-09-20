export const metadata = {
  title: 'سياسة الشحن — وَهَج',
};

export default function Page() {
  return (
    <main className="min-h-screen py-16 px-4 bg-background text-foreground transition-colors duration-300" dir="rtl">
      <div className="container max-w-3xl mx-auto space-y-10">
        
        {/* ترويسة الصفحة */}
        <div className="border-b border-border/40 pb-6 text-center md:text-right space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">سياسة الشحن</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            نصل إليك أينما كنت لنضيف إلى إطلالتك بريقاً وتألقاً يليق بك.
          </p>
        </div>

        {/* محتوى السياسة بتصميم مرتب وبحجم وخط مريح للقراءة */}
        <div className="bg-card border border-border/60 rounded-2xl p-6 md:p-10 shadow-lg space-y-8">
          
          {/* القسم الأول */}
          <div className="space-y-3">
            <h2 className="text-lg md:text-xl font-semibold text-[var(--gold)] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--gold)]"></span>
              نطاق وتكلفة الشحن:
            </h2>
            <div className="text-muted-foreground text-base md:text-lg leading-loose space-y-2 pr-4 border-r-2 border-[var(--gold)]/20">
              <p>نقوم بالشحن إلى جميع المحافظات المتاحة في إعدادات المتجر.</p>
              <p>تظهر تكلفة الشحن النهائية بكل شفافية ضمن خطوات إتمام الطلب وقبل تأكيده.</p>
            </div>
          </div>

          {/* القسم الثاني */}
          <div className="space-y-3">
            <h2 className="text-lg md:text-xl font-semibold text-[var(--gold)] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--gold)]"></span>
              متوسط أيام التوصيل:
            </h2>
            <div className="text-muted-foreground text-base md:text-lg leading-loose space-y-2 pr-4 border-r-2 border-[var(--gold)]/20">
              <p>يستغرق توصيل الطلبات عادةً ما بين (2 إلى 5 أيام عمل) بحسب المحافظة أو المدينة وظروف شركة الشحن.</p>
              <p>حرصاً منا على دقة وصول طلبك، قد نتواصل معك عند الحاجة لتأكيد بيانات الطلب قبل إرساله.</p>
            </div>
          </div>

          {/* القسم الثالث */}
          <div className="space-y-3">
            <h2 className="text-lg md:text-xl font-semibold text-[var(--gold)] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--gold)]"></span>
              خدمة العملاء والاستفسارات:
            </h2>
            <div className="text-muted-foreground text-base md:text-lg leading-loose pr-4 border-r-2 border-[var(--gold)]/20">
              <p>للاستفسار عن حالة طلب قائم أو متابعة خط سير الشحنة، يرجى التواصل مع فريق خدمة العملاء عبر القنوات المتاحة في صفحة التواصل.</p>
            </div>
          </div>

        </div>

      </div>
    </main>
  );
}
