import Link from 'next/link';
import { ArrowLeft, Compass, Gem, Heart, Sparkles, Star } from 'lucide-react';

export const metadata = { title: 'من نحن — وَهَج', description: 'تعرفي على قصة وفلسفة متجر وَهَج.' };

const values = [
  { icon: Gem, title: 'اختيارات مدروسة', text: 'نختار قطعًا عصرية بعناية لتمنحك تنوعًا أنيقًا يناسب أسلوبك ولحظاتك المختلفة.' },
  { icon: Compass, title: 'أناقة بلا تكلّف', text: 'نؤمن أن القطعة الجميلة هي التي تضيف لمسة واضحة دون أن تطغى على شخصيتك.' },
  { icon: Heart, title: 'تجربة تهتم بكِ', text: 'من اختيار القطعة وحتى وصولها إليكِ، نحرص على أن تكون كل خطوة جزءًا من تجربة وَهَج.' },
];

export default function AboutPage() {
  return <main className="wahaj-about-page" dir="rtl"><div className="wahaj-about-shell">
    <header className="wahaj-about-hero"><div className="wahaj-about-hero__copy"><span className="wahaj-about-kicker"><Sparkles size={15} /> وَهَج · قصتنا</span><h1>تفاصيل صغيرة<br /><em>تصنع وهجًا كبيرًا</em></h1><p>في وَهَج، نؤمن أن الأناقة لا تحتاج إلى مبالغة؛ يكفي أن تختاري التفاصيل التي تشبهكِ وتضيف إلى إطلالتكِ ذلك الأثر الخاص.</p><Link href="/shop" className="wahaj-about-cta">اكتشفي مجموعتنا <ArrowLeft size={17} /></Link></div><div className="wahaj-about-hero__seal" aria-hidden="true"><Star size={28} /><span>وَهَج</span><small>shine your way</small></div></header>
    <section className="wahaj-about-story"><div className="wahaj-about-section-label">01 · الحكاية</div><div><div className="wahaj-about-heading"><span><Gem size={18} /> من فكرة إلى تجربة</span><h2>لماذا وَهَج؟</h2></div><div className="wahaj-about-copy"><p><strong>وَهَج</strong> ليس مجرد إكسسوار، بل لمسة تعبّر عنكِ. وُلد وَهَج من فكرة بسيطة: أن قطعة صغيرة قادرة على تغيير إطلالة كاملة، وأن التفاصيل التي نختارها بعناية قد تكون أكثر ما يعبّر عن شخصيتنا.</p><p>اخترنا اسم وَهَج لما يحمله من معنى؛ فالوهج هو الإشراق والتألّق واللمعان، وهو الشعور الذي نريد أن تمنحكِ إياه كل قطعة تختارينها.</p><p>نقدم مجموعة مختارة من الإكسسوارات والمجوهرات الصناعية بتصاميم عصرية وأنيقة، تجمع بين البساطة والتفاصيل اللافتة لتناسب لحظاتك اليومية ومناسباتك الخاصة.</p></div></div></section>
    <section className="wahaj-about-values"><div className="wahaj-about-section-label">02 · قيمنا</div><div><div className="wahaj-about-heading"><span><Sparkles size={18} /> ما يميزنا</span><h2>فلسفة وَهَج</h2></div><div className="wahaj-about-value-grid">{values.map(({ icon: Icon, title, text }) => <article key={title}><span><Icon size={21} /></span><h3>{title}</h3><p>{text}</p></article>)}</div></div></section>
    <section className="wahaj-about-promise"><span className="wahaj-about-promise__icon"><Heart size={25} /></span><div><span className="wahaj-about-kicker">03 · وعد وَهَج</span><h2>قطعة تشبهكِ، وتكمل أسلوبكِ</h2><p>نريد أن تكون وَهَج أكثر من مجرد وجهة لشراء الإكسسوارات؛ مساحة تجدين فيها القطعة التي تشبهكِ وتضيف إلى إطلالتكِ التفصيل الصغير الذي يصنع الفرق.</p><b>وَهَج — لأنكِ تستحقين أن تتألقي بطريقتك.</b></div></section>
  </div></main>;
}
