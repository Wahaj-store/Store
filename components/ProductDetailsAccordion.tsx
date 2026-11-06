import Link from 'next/link';
import { ArrowLeft, ChevronDown, Droplets, FileText, Gem, Truck } from 'lucide-react';

type Props = {
  productName: string;
  description?: string | null;
  material?: string | null;
  careInstructions?: string | null;
};

export default function ProductDetailsAccordion({
  productName,
  description,
  material,
  careInstructions,
}: Props) {
  const items = [
    {
      id: 'description',
      title: 'الوصف والتفاصيل',
      Icon: FileText,
      content: <p>{description || `قطعة ${productName} مختارة بعناية لتضيف لمسة أنيقة إلى إطلالتك.`}</p>,
    },
    {
      id: 'material',
      title: 'الخامة',
      Icon: Gem,
      content: <p>{material || 'مختارة بعناية فائقة.'}</p>,
    },
    {
      id: 'care',
      title: 'العناية بالقطعة',
      Icon: Droplets,
      content: <p>{careInstructions || 'يُحفظ بعيدًا عن الرطوبة والعطور المباشرة، ويمسح بقطعة قماش ناعمة بعد الاستخدام.'}</p>,
    },
    {
      id: 'shipping',
      title: 'الشحن والاستبدال',
      Icon: Truck,
      content: (
        <>
          <p>تعرّفي على تفاصيل التوصيل والاستبدال قبل إتمام طلبك.</p>
          <Link href="/policies/shipping">عرض سياسة الشحن والاستبدال <ArrowLeft size={14} aria-hidden="true" /></Link>
        </>
      ),
    },
  ];

  return (
    <div className="wahaj-product-accordions wahaj-help-list" aria-label="تفاصيل المنتج">
      {items.map(({ id, title, Icon, content }) => (
        <details className="wahaj-faq-item" key={id} name="product-details" open={id === 'description'}>
          <summary className="wahaj-faq-question">
            <span><i><Icon size={17} aria-hidden="true" /></i>{title}</span>
            <ChevronDown size={18} aria-hidden="true" />
          </summary>
          <div className="wahaj-faq-answer">{content}</div>
        </details>
      ))}
    </div>
  );
}
