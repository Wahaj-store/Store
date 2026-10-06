import type { Metadata } from 'next';
import PaymentPolicyClient from './PaymentPolicyClient';

export const metadata: Metadata = {
  title: 'سياسة الدفع — وَهَج',
  description: 'تعرفي على طرق الدفع المفعّلة في متجر وَهَج وخطوات إتمام عملية الدفع بأمان ووضوح.',
};

export default function PaymentPolicyPage() {
  return <PaymentPolicyClient />;
}
