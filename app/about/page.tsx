import Link from 'next/link';
import { Sparkles, Heart, Compass, Gem, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'من نحن — وَهَج',
};

export default function AboutPage() {
  return (
    <main className="min-h-screen py-16 px-4 md:px-8 bg-background text-foreground transition-colors duration-300" dir="rtl">
      <div className="container max-w-4xl mx-auto space-y-16">
        
        {/* ترويسة الصفحة */}
        <div className="text-center space-y-4 border-b border-border/40 pb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--gold)]/10 text-[var(--gold)] border border-[var(--gold)]/30 shadow-sm">
            <Sparkles size={32} />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            عن وَهَج
          </h1>
          <p className="text-[var(--gold)] font-medium text-base md:text-lg max-w-md mx-auto">
            تفاصيل صغيرة تصنع وهجًا كبيرًا.
          </p>
          <p className="text-muted-foreground text-sm md:text-base max-w-lg mx-auto leading-relaxed pt-2">
            في وَهَج، نؤمن أن الأناقة لا تحتاج إلى مبالغة؛ يكفي أن تختاري التفاصيل التي تشبهك.
          </p>
        </div>

        {/* قسم القصة */}
        <div className="bg-card border border-border/60 rounded-3xl p-6 md:p-12 shadow-lg space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--gold)]/5 rounded-bl-full pointer-events-none" />
          
          <div className="flex items-center gap-3 text-[var(--gold)]">
            <Gem size={24} />
            <h2 className="text-2xl font-bold tracking-wide text-foreground">قصتنا</h2>
          </div>
          
          <div className="space-y-4 text-foreground/90 text-base md:text-lg leading-loose font-sans">
            <p>
              <strong className="text-[var(--gold)] font-semibold">وَهَج</strong> ليس مجرد إكسسوار، بل لمسة تعبّر عنكِ. وُلد وَهَج من فكرة بسيطة: أن قطعة صغيرة قادرة على تغيير إطلالة كاملة، وأن التفاصيل التي نختارها بعناية قد تكون أكثر ما يعبّر عن شخصيتنا.
            </p>
            <p>
              اخترنا اسم وَهَج لما يحمله من معنى؛ فالوهج هو الإشراق والتألّق واللمعان، وهو الشعور الذي نريد أن تمنحكِ إياه كل قطعة تختارينها.
            </p>
            <p>
              نقدم مجموعة مختارة من الإكسسوارات والمجوهرات الصناعية بتصاميم عصرية وأنيقة، تجمع بين البساطة والتفاصيل اللافتة، لتناسب لحظاتك اليومية ومناسباتك الخاصة.
            </p>
            <div className="p-4 rounded-2xl bg-[var(--gold)]/5 border border-[var(--gold)]/20 text-center font-medium text-[var(--gold)] my-6">
              لأن أناقتك لا تحتاج إلى أن تكون صاخبة… يكفي أن يكون لها وَهَجها الخاص.
            </div>
          </div>
        </div>

        {/* قسم الفلسفة والمميزات */}
        <div className="grid gap-6 md:grid-cols-2 items-stretch">
          <div className="bg-card border border-border/60 rounded-3xl p-8 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="inline-flex p-3 rounded-xl bg-[var(--gold)]/10 text-[var(--gold)]">
                <Compass size={24} />
              </div>
              <h3 className="text-xl font-bold">فلسفتنا</h3>
              <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
                نختار التفاصيل بعناية. من التصميم إلى طريقة تقديم القطعة، نهتم بأن تكون تجربة وَهَج مختلفة؛ بسيطة، أنيقة، أنثوية، ومليئة بالتفاصيل التي تشعركِ بأن القطعة صُممت لتكون جزءًا من أسلوبك.
              </p>
            </div>
            <p className="text-sm font-semibold text-[var(--gold)] pt-4 border-t border-border/40">
              نؤمن أن الفخامة ليست في كثرة التفاصيل، بل في اختيار التفاصيل الصحيحة.
            </p>
          </div>

          <div className="bg-card border border-border/60 rounded-3xl p-8 shadow-sm space-y-6">
            <h3 className="text-xl font-bold text-foreground">ما الذي يميز وَهَج؟</h3>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <h4 className="font-semibold text-sm md:text-base text-[var(--gold)]">✦ تصاميم مختارة</h4>
                <p className="text-muted-foreground text-xs md:text-sm leading-relaxed">قطع عصرية نختارها بعناية لتناسب مختلف الأذواق والإطلالات.</p>
              </div>

              <div className="space-y-1">
                <h4 className="font-semibold text-sm md:text-base text-[var(--gold)]">✦ أناقة بلا تكلّف</h4>
                <p className="text-muted-foreground text-xs md:text-sm leading-relaxed">تصاميم تجمع بين البساطة والفخامة لتكون سهلة التنسيق وملفتة في الوقت نفسه.</p>
              </div>

              <div className="space-y-1">
                <h4 className="font-semibold text-sm md:text-base text-[var(--gold)]">✦ تجربة تهتم بكِ</h4>
                <p className="text-muted-foreground text-xs md:text-sm leading-relaxed">من اختيار القطعة وحتى وصولها إليكِ، نحرص على أن تكون كل خطوة جزءًا من تجربة وَهَج.</p>
              </div>
            </div>
          </div>
        </div>

        {/* وعد وَهَج */}
        <div className="bg-gradient-to-br from-[var(--gold)]/10 via-card to-card border border-[var(--gold)]/30 rounded-3xl p-8 md:p-10 text-center space-y-6 shadow-md">
          <div className="inline-flex p-3 rounded-2xl bg-[var(--gold)]/15 text-[var(--gold)]">
            <Heart size={28} />
          </div>
          <div className="space-y-3 max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold">وعد وَهَج</h3>
            <p className="text-foreground/90 text-base md:text-lg leading-relaxed">
              أن تكون كل قطعة تختارينها… إضافة حقيقية إلى أسلوبك. نحن لا نريد أن تكون وَهَج مجرد وجهة لشراء الإكسسوارات، بل مساحة تجدين فيها القطعة التي تشبهك، وتضيف إلى إطلالتك ذلك التفصيل الصغير الذي يصنع الفرق.
            </p>
          </div>
          <p className="text-[var(--gold)] font-bold text-base md:text-lg tracking-wide pt-2">
            وَهَج — لأنكِ تستحقين أن تتألقي بطريقتك.
          </p>
        </div>

        {/* زر تسوقي الآن */}
        <div className="text-center pt-4">
          <Link
            href="/shop"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-[var(--gold)] text-black font-bold text-base shadow-lg hover:opacity-90 transition transform hover:-translate-y-0.5"
          >
            <span>تسوقي الآن</span>
            <ArrowLeft size={20} />
          </Link>
        </div>

      </div>
    </main>
  );
}
