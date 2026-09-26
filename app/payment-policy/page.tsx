import type { Metadata } from "next";
import Link from "next/link";
import {
  Banknote,
  CheckCircle2,
  ChevronLeft,
  CircleAlert,
  CreditCard,
  Info,
  LockKeyhole,
  MessageCircle,
  Smartphone,
  WalletCards,
} from "lucide-react";

export const metadata: Metadata = {
  title: "طرق الدفع | وَهَج",
  description:
    "تعرف على طرق الدفع المتاحة في متجر وَهَج، وخطوات الدفع والتعليمات المهمة لإتمام طلبك بسهولة وأمان.",
  alternates: {
    canonical: "/payment-policy",
  },
};

const paymentMethods = [
  {
    id: "cod",
    number: "01",
    icon: Banknote,
    title: "الدفع عند الاستلام",
    subtitle: "استلم طلبك وادفع عند وصوله",
    description:
      "يمكنك إتمام طلبك واختيار الدفع عند الاستلام، ثم دفع قيمة الطلب نقدًا إلى مندوب الشحن عند استلام المنتجات.",
    steps: [
      "أضف المنتجات التي ترغب بها إلى سلة التسوق.",
      "انتقل إلى إتمام الطلب وأدخل بيانات الشحن بدقة.",
      "اختر «الدفع عند الاستلام» ضمن طرق الدفع المتاحة.",
      "راجع تفاصيل الطلب ثم أكد عملية الشراء.",
      "ادفع قيمة الطلب للمندوب عند الاستلام.",
    ],
    note:
      "يرجى التأكد من صحة رقم الهاتف والعنوان لتسهيل التواصل والتوصيل.",
  },
  {
    id: "vodafone-cash",
    number: "02",
    icon: Smartphone,
    title: "Vodafone Cash",
    subtitle: "دفع سريع من محفظتك الإلكترونية",
    description:
      "يمكنك دفع قيمة طلبك باستخدام محفظة Vodafone Cash. بعد اختيار طريقة الدفع، اتبع تعليمات الدفع التي تظهر لك أثناء إتمام الطلب.",
    steps: [
      "أكمل بيانات الطلب وعنوان التوصيل.",
      "اختر «Vodafone Cash» كطريقة للدفع.",
      "استخدم بيانات الدفع المعروضة لك أثناء إتمام الطلب.",
      "أتمم عملية التحويل من محفظتك.",
      "احتفظ بتفاصيل العملية لحين تأكيد الدفع والطلب.",
    ],
    note:
      "لا تشارك الرقم السري للمحفظة أو أي رمز تحقق مع أي شخص، بما في ذلك خدمة العملاء.",
  },
  {
    id: "instapay",
    number: "03",
    icon: WalletCards,
    title: "InstaPay",
    subtitle: "تحويل إلكتروني سريع وآمن",
    description:
      "يتيح لك InstaPay تحويل قيمة الطلب إلكترونيًا من خلال حسابك البنكي أو وسيلة الدفع المدعومة لديك، وفق البيانات والتعليمات التي تظهر أثناء إتمام الطلب.",
    steps: [
      "أكمل بيانات الطلب واختر عنوان التوصيل.",
      "اختر «InstaPay» ضمن طرق الدفع.",
      "استخدم بيانات التحويل المعروضة لك في صفحة الدفع.",
      "أتمم التحويل من تطبيق InstaPay.",
      "احتفظ بإثبات التحويل حتى يتم تأكيد العملية.",
    ],
    note:
      "تأكد من مراجعة اسم المستفيد وقيمة التحويل قبل تأكيد العملية.",
  },
];

const paymentFeatures = [
  {
    icon: LockKeyhole,
    title: "دفع أكثر أمانًا",
    description:
      "نتعامل مع بيانات الدفع وفق آلية منظمة، ولا نطلب منك مشاركة كلمات المرور أو رموز التحقق السرية.",
  },
  {
    icon: CheckCircle2,
    title: "تأكيد واضح للطلب",
    description:
      "بعد إتمام الطلب، يمكنك مراجعة تفاصيله والاحتفاظ ببيانات العملية للرجوع إليها عند الحاجة.",
  },
  {
    icon: MessageCircle,
    title: "دعم عند الحاجة",
    description:
      "إذا واجهتك مشكلة أثناء الدفع، تواصل معنا قبل تكرار عملية التحويل لتجنب تنفيذ العملية أكثر من مرة.",
  },
];

function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="max-w-2xl">
      <span className="mb-3 inline-flex items-center gap-2 text-xs font-medium tracking-[0.16em] text-[#B88D87]">
        <span className="h-px w-7 bg-[#C6A46A]" />
        {eyebrow}
      </span>

      <h2 className="text-2xl font-semibold leading-[1.5] tracking-[-0.02em] text-[#201D1C] dark:text-[#F7F2EA] sm:text-3xl">
        {title}
      </h2>

      {description ? (
        <p className="mt-3 text-sm leading-8 text-[#201D1C]/65 dark:text-[#F7F2EA]/65 sm:text-base">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export default function PaymentPolicyPage() {
  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#F7F2EA] text-[#201D1C] transition-colors dark:bg-[#241B1A] dark:text-[#F7F2EA]"
    >
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[#241B1A]/8 dark:border-[#F7F2EA]/10">
        <div className="absolute -right-28 -top-28 h-72 w-72 rounded-full bg-[#B88D87]/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-[#C6A46A]/10 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-5 pb-14 pt-8 sm:px-8 sm:pb-20 sm:pt-12 lg:px-10">
          {/* Breadcrumb */}
          <nav
            aria-label="مسار الصفحة"
            className="mb-12 flex items-center gap-2 text-xs text-[#201D1C]/55 dark:text-[#F7F2EA]/55"
          >
            <Link
              href="/"
              className="transition-colors hover:text-[#B88D87]"
            >
              الرئيسية
            </Link>

            <ChevronLeft
              aria-hidden="true"
              className="h-3.5 w-3.5"
            />

            <span className="text-[#201D1C]/75 dark:text-[#F7F2EA]/75">
              طرق الدفع
            </span>
          </nav>

          <div className="max-w-3xl">
            <span className="mb-5 inline-flex items-center gap-2 text-xs font-medium tracking-[0.18em] text-[#B88D87]">
              <span className="h-px w-8 bg-[#C6A46A]" />
              وَهَج · PAYMENT
            </span>

            <h1 className="text-4xl font-semibold leading-[1.35] tracking-[-0.035em] text-[#241B1A] dark:text-[#F7F2EA] sm:text-5xl lg:text-6xl">
              طرق الدفع
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-[#201D1C]/70 dark:text-[#F7F2EA]/70 sm:text-lg sm:leading-9">
              اختر الطريقة الأنسب لك لإتمام طلبك بسهولة ووضوح. نوفر في وَهَج
              خيارات دفع متنوعة لتجعل تجربة الشراء أكثر مرونة وراحة.
            </p>
          </div>

          {/* Intro card */}
          <div className="mt-10 flex flex-col gap-4 rounded-2xl border border-[#C6A46A]/25 bg-white/45 p-5 backdrop-blur-sm dark:bg-white/[0.04] sm:flex-row sm:items-start sm:p-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#C6A46A]/12 text-[#C6A46A]">
              <Info className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-[#241B1A] dark:text-[#F7F2EA]">
                قبل إتمام الدفع
              </h2>

              <p className="mt-1.5 text-sm leading-7 text-[#201D1C]/65 dark:text-[#F7F2EA]/65">
                راجع قيمة الطلب وبيانات التوصيل وطريقة الدفع المختارة بعناية.
                بيانات التحويل الخاصة بوسائل الدفع الإلكتروني يتم عرضها لك
                أثناء إتمام الطلب وفق إعدادات المتجر الحالية.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Payment methods */}
      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20 lg:px-10">
        <SectionTitle
          eyebrow="PAYMENT METHODS"
          title="طرق الدفع المتاحة"
          description="تعرف على تفاصيل كل طريقة وخطوات استخدامها قبل إتمام طلبك."
        />

        <div className="mt-10 space-y-6">
          {paymentMethods.map((method) => {
            const Icon = method.icon;

           
