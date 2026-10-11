import Link from 'next/link';
import { Clock3, Sparkles, Instagram, ArrowUpLeft } from 'lucide-react';

export const metadata = {
  title: 'نعود قريبًا | وَهَج',
  description: 'نعمل على تحسين تجربة وَهَج. سنعود إليكم قريبًا.',
};

export default function MaintenancePage() {
  return (
    <main className="wahaj-maintenance" dir="rtl">
      <div className="wahaj-maintenance__glow wahaj-maintenance__glow--one" aria-hidden="true" />
      <div className="wahaj-maintenance__glow wahaj-maintenance__glow--two" aria-hidden="true" />
      <section className="wahaj-maintenance__card">
        <div className="wahaj-maintenance__brand">
          <span className="wahaj-maintenance__mark" aria-hidden="true">و</span>
          <span>
            <strong>وَهَج</strong>
            <small>تفاصيل صغيرة تصنع وهجًا كبيرًا</small>
          </span>
        </div>

        <div className="wahaj-maintenance__illustration" aria-hidden="true">
          <span className="wahaj-maintenance__orbit wahaj-maintenance__orbit--outer" />
          <span className="wahaj-maintenance__orbit wahaj-maintenance__orbit--inner" />
          <span className="wahaj-maintenance__spark wahaj-maintenance__spark--a"><Sparkles size={22} /></span>
          <span className="wahaj-maintenance__clock"><Clock3 size={54} strokeWidth={1.25} /></span>
          <span className="wahaj-maintenance__spark wahaj-maintenance__spark--b">✦</span>
        </div>

        <span className="wahaj-maintenance__eyebrow">نعود قريبًا بإطلالة أجمل</span>
        <h1>نرتّب التفاصيل<br /><em>لتجربة تليق بك</em></h1>
        <p className="wahaj-maintenance__message">
          متجر وَهَج يخضع لبعض التحسينات حاليًا لنقدّم لك تجربة تسوّق أكثر سلاسة وتميّزًا.
          نعمل على التفاصيل الآن، وسنكون معك من جديد قريبًا.
        </p>

        <div className="wahaj-maintenance__status">
          <span className="wahaj-maintenance__status-dot" />
          <span>نقوم بتحسين المتجر حاليًا</span>
        </div>

        <div className="wahaj-maintenance__divider"><span>✦</span></div>
        <p className="wahaj-maintenance__thanks">شكرًا لصبرك وثقتك بوهج</p>
        <Link href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer" className="wahaj-maintenance__contact">
          تابع أخبارنا <ArrowUpLeft size={16} />
        </Link>
      </section>
      <footer className="wahaj-maintenance__footer">© وَهَج — تفاصيل صغيرة تصنع وهجًا كبيرًا</footer>
    </main>
  );
}
