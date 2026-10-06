export type StorePaymentMethod = {
  method: string;
  enabled?: boolean;
  label: string;
  description?: string | null;
  proofRequired?: boolean;
  displayOrder?: number;
};

// Keep the policy page aligned with the checkout's existing offline/empty-API fallback.
export const FALLBACK_PAYMENT_METHODS: StorePaymentMethod[] = [
  {
    method: 'COD',
    label: 'الدفع عند الاستلام',
    description: 'الدفع نقداً عند استلام طلبك',
    enabled: true,
    displayOrder: 0,
  },
  {
    method: 'INSTAPAY',
    label: 'انستا باى (InstaPay)',
    description: 'التحويل اللحظي عبر إنستا باي',
    enabled: true,
    proofRequired: true,
    displayOrder: 1,
  },
  {
    method: 'VODAFONE_CASH',
    label: 'فودافون كاش',
    description: 'التحويل المباشر لمحفظة فودافون كاش',
    enabled: true,
    proofRequired: true,
    displayOrder: 2,
  },
];
