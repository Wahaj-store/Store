import Link from 'next/link';
import { ArrowUpLeft, Check, Clock3, Instagram, ShieldCheck, Sparkles, Wrench } from 'lucide-react';

export const metadata = {
  title: 'نعود قريبًا | وَهَج',
  description: 'نعمل على تحسين تجربة وَهَج. سنعود إليكم قريبًا.',
};

const improvements = [
  { label: 'ترتيب تفاصيل التجربة', done: true },
  { label: 'تحسين سرعة التصفح', done: true },
  { label: 'مراجعة الخطوات الأخيرة', done: false },
];

export default function MaintenancePage() {
  return (
    <main className="wahaj-maintenance" dir="rtl">
      <div className="wahaj-maintenance__ambient wahaj-maintenance__ambient--top" aria-hidden="true" />
      <div className="wahaj-maintenance__ambient wahaj-maintenance__ambient--bottom" aria-hidden="true" />
      <div className="wahaj-maintenance__frame">
        <header className="wahaj-maintenance__header">
          <div className="wahaj-maintenance__brand" aria-label="وَهَج">
            <span className="wahaj-maintenance__mark" aria-hidden="true">و</span>
            <span className="wahaj-maintenance__brand-copy">
              <strong>وَهَج</strong>
              <small>تفاصيل صغيرة تصنع وهجًا كبيرًا</small>
            </span>
          </div>
          <span className="wahaj-maintenance__edition"><Sparkles size={14} /> مساحة قصيرة للتجديد</span>
        </header>

        <section className="wahaj-maintenance__panel" aria-labelledby="maintenance-title">
          <div className="wahaj-maintenance__copy">
            <div className="wahaj-maintenance__status">
              <span className="wahaj-maintenance__status-indicator" aria-hidden="true"><Wrench size={13} /></span>
              نعمل على تحسين المتجر
            </div>

            <span className="wahaj-maintenance__eyebrow">استراحة صغيرة، وعودة أجمل</span>
            <h1 id="maintenance-title">نعتني بالتفاصيل<br /><em>لتليق بكِ.</em></h1>
            <p className="wahaj-maintenance__message">
              متجر وَهَج في جولة تحسين قصيرة. نرتّب تجربتكِ ونراجع أدق التفاصيل لتعودي إلى تسوّق أكثر سلاسة وراحة.
            </p>

            <div className="wahaj-maintenance__promise">
              <ShieldCheck size={19} strokeWidth={1.7} aria-hidden="true" />
              <p><strong>اختياراتكِ محفوظة</strong><span>سنعود قريبًا، ومعنا تجربة أجمل.</span></p>
            </div>

            <div className="wahaj-maintenance__actions">
              <Link href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer" className="wahaj-maintenance__primary">
                <Instagram size={17} /> تابعي أخبارنا <ArrowUpLeft size={16} />
              </Link>
              <span className="wahaj-maintenance__return-note"><Clock3 size={14} /> نعود إليكِ قريبًا</span>
            </div>
          </div>

          <aside className="wahaj-maintenance__visual" aria-label="حالة أعمال التحسين">
            <div className="wahaj-maintenance__visual-topline">
              <span>WAHAJ · STUDIO</span>
              <span className="wahaj-maintenance__live"><i /> مباشر</span>
            </div>

            <div className="wahaj-maintenance__art" aria-hidden="true">
              <span className="wahaj-maintenance__art-orbit wahaj-maintenance__art-orbit--one" />
              <span className="wahaj-maintenance__art-orbit wahaj-maintenance__art-orbit--two" />
              <span className="wahaj-maintenance__art-ring"><Sparkles size={34} strokeWidth={1.35} /></span>
              <span className="wahaj-maintenance__art-spark wahaj-maintenance__art-spark--one">✦</span>
              <span className="wahaj-maintenance__art-spark wahaj-maintenance__art-spark--two">✧</span>
              <span className="wahaj-maintenance__art-caption">قريبًا بإطلالة جديدة</span>
            </div>

            <div className="wahaj-maintenance__work-card">
              <div className="wahaj-maintenance__work-heading">
                <span className="wahaj-maintenance__work-icon"><Sparkles size={16} /></span>
                <span><strong>خلف الكواليس</strong><small>كل تفصيلة تصنع فرقًا</small></span>
                <span className="wahaj-maintenance__work-clock"><Clock3 size={17} /></span>
              </div>
              <ul className="wahaj-maintenance__checklist">
                {improvements.map((item) => (
                  <li key={item.label} className={item.done ? 'is-done' : 'is-current'}>
                    <span className="wahaj-maintenance__check-icon" aria-hidden="true">{item.done ? <Check size={12} /> : <i />}</span>
                    <span>{item.label}</span>
                    {item.done && <small>تم</small>}
                    {!item.done && <small>جارٍ</small>}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </section>

        <footer className="wahaj-maintenance__footer">
          <span>© وَهَج — تفاصيل صغيرة تصنع وهجًا كبيرًا</span>
          <span className="wahaj-maintenance__footer-mark"><i /> تجربة أجمل في الطريق</span>
        </footer>
      </div>
    </main>
  );
}
