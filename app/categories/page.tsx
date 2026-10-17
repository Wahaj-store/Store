import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'كل التصنيفات',
  description: 'اكتشفي تصنيفات وَهَج وتصفّحي مجموعات الإكسسوارات المختارة بعناية.',
  alternates: { canonical: '/categories' },
};

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    where: { active: true },
    select: { id: true, name: true, slug: true, description: true, imageUrl: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });

  return <main className="wahaj-categories-page" dir="rtl">
    <div className="container">
      <header className="wahaj-categories-page__heading">
        <span className="wahaj-home-kicker"><Sparkles size={14} /> عالم وَهَج</span>
        <h1>كل التصنيفات</h1>
        <p>اكتشفي مجموعات مختارة بعناية، واعثري على التفاصيل الأقرب إلى أسلوبكِ.</p>
      </header>
      {categories.length ? <div className="wahaj-categories-page__grid">
        {categories.map((category, index) => <Link key={category.id} href={`/shop?category=${encodeURIComponent(category.slug)}`} className="wahaj-category-card">
          <span className="wahaj-category-card__visual"><Image src={category.imageUrl || '/placeholder.svg'} alt={category.imageUrl ? category.name : `صورة غير متاحة لتصنيف ${category.name}`} fill sizes="(max-width:600px) 44vw, (max-width:900px) 30vw, 22vw" className="wahaj-category-card__image" loading={index < 4 ? 'eager' : 'lazy'} /></span>
          <span className="wahaj-category-card__name">{category.name}</span>
          {category.description ? <span className="wahaj-category-card__description">{category.description}</span> : null}
          <span className="wahaj-category-card__link">تصفّحي التصنيف <ArrowLeft size={14} /></span>
        </Link>)}
      </div> : <div className="wahaj-categories-page__empty"><Sparkles size={24} /><h2>نحضّر لكِ مجموعات وَهَج</h2><p>لا توجد تصنيفات متاحة للعرض حاليًا. عودي قريبًا لاكتشاف الجديد.</p><Link href="/shop">تصفّحي المتجر <ArrowLeft size={15} /></Link></div>}
    </div>
  </main>;
}
