import type { Metadata } from "next";
import Link from "next/link";
import {
  Banknote,
  Smartphone,
  WalletCards,
  ShieldCheck,
  CheckCircle2,
  Info,
  ArrowLeft,
  Headphones,
} from "lucide-react";

export const metadata: Metadata = {
  title: "سياسة الدفع — وَهَج",
  description:
    "تعرف على طرق الدفع المتاحة في متجر وَهَج والتعليمات الخاصة بإتمام عملية الدفع بأمان وسهولة.",
};

const paymentMethods = [
  {
    id: "cod",
    number: "01",
    icon: Banknote,
    title: "الدفع عند الاستلام",
    subtitle: "ادفع عند وصول طلبك",
    description:
      "يمكنك اختيار الدفع عند الاستلام وإتمام عملية الشراء دون الحاجة إلى الدفع مقدمًا.",
    steps: [
      "أكمل بيانات الطلب وعنوان التوصيل.",
      "اختر «الدفع عند الاستلام» أثناء إتمام الطلب.",
      "راجع تفاصيل الطلب وقيمة الشحن.",
      "أكد طلبك وانتظر وصول الشحنة.",
      "ادفع القيمة المطلوبة إلى مندوب الشحن عند الاستلام.",
    ],
  },
  {
    id: "vodafone-cash",
    number: "02",
    icon: Smartphone,
    title: "Vodafone Cash",
    subtitle: "الدفع من محفظتك الإلكترونية",
    description:
      "يمكنك استخدام محفظة Vodafone Cash لتحويل قيمة الطلب إلكترونيًا وفق بيانات الدفع التي تظهر لك أثناء إتمام الطلب.",
    steps: [
      "أكمل بيانات الطلب وعنوان التوصيل.",
      "اختر «Vodafone Cash» كطريقة للدفع.",
      "استخدم بيانات التحويل الظاهرة أثناء إتمام الطلب.",
      "أتمم عملية التحويل من محفظتك.",
      "احتفظ بتفاصيل العملية حتى يتم تأكيد الدفع.",
    ],
  },
  {
    id: "instapay",
    number: "03",
    icon: WalletCards,
    title: "InstaPay",
    subtitle: "تحويل إلكتروني سريع",
    description:
      "يمكنك سداد قيمة طلبك من خلال InstaPay باستخدام الحساب البنكي أو وسيلة الدفع المدعومة لديك.",
    steps: [
      "أكمل بيانات الطلب واختر عنوان التوصيل.",
      "اختر «InstaPay» ضمن طرق الدفع.",
      "راجع بيانات التحويل التي تظهر لك.",
      "أتمم التحويل من تطبيق InstaPay.",
      "احتفظ بإثبات التحويل لحين تأكيد العملية.",
    ],
  },
];

const importantNotes = [
  "راجع قيمة الطلب قبل تنفيذ أي عملية دفع.",
  "تأكد من صحة بيانات المستفيد قبل تأكيد التحويل.",
  "احتفظ بإثبات الدفع حتى يتم تأكيد الطلب.",
  "لا تشارك الرقم السري أو رموز التحقق الخاصة بمحفظتك أو حسابك.",
  "إذا واجهتك مشكلة أثناء الدفع، تواصل معنا قبل إعادة تنفيذ التحويل.",
];

export default function PaymentPolicyPage() {
  return (
    <main
      dir="rtl"
      className="min-h-screen bg-background text-foreground transition-colors duration-300"
    >
      <div className="container mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">

        {/* =====================================================
            Page Header
        ====================================================== */}
        <header className="mb-10 border-b border-border/40 pb-7 text-center md:text-right">
          <div className="mb-3 flex items-center justify-center gap-2 text-xs font-medium tracking-wider text-[var(--gold)] md:justify-start">
            <span className="h-px w-7 bg-[var(--gold)]" />
            وَهَج
            <span className="h-px w-7 bg-[var(--gold)] md:hidden" />
          </div>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            سياسة الدفع
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base md:mx-0">
            نوفر لك مجموعة من طرق الدفع المرنة لتجعل تجربة الشراء من وَهَج
            أكثر سهولة ووضوحًا وأمانًا.
          </p>
        </header>

        {/* =====================================================
            Intro Notice
        ====================================================== */}
        <section className="mb-8">
          <div className="flex gap-4 rounded-2xl border border-[var(--gold)]/20 bg-card p-5 shadow-sm sm:p-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--gold)]/10 text-[var(--gold)]">
              <Info className="h-5 w-5" />
            </div>

            <div className="space-y-1">
              <h2 className="font-semibold">
                قبل إتمام عملية الدفع
              </h2>

              <p className="text-sm leading-7 text-muted-foreground">
                يرجى مراجعة قيمة الطلب وبيانات التوصيل وطريقة الدفع المختارة
                بعناية قبل تأكيد الطلب. بيانات التحويل الخاصة بوسائل الدفع
                الإلكتروني تظهر لك أثناء إتمام الطلب وفق إعدادات المتجر الحالية.
              </p>
            </div>
          </div>
        </section>

        {/* =====================================================
            Payment Methods
        ====================================================== */}
        <section className="space-y-6">

          <div className="space-y-2">
            <h2 className="text-xl font-semibold sm:text-2xl">
              طرق الدفع المتاحة
            </h2>

            <p className="text-sm leading-7 text-muted-foreground sm:text-base">
              اختر الطريقة الأنسب لك من بين وسائل الدفع المتاحة أثناء إتمام
              طلبك.
            </p>
          </div>

          {paymentMethods.map((method) => {
            const Icon = method.icon;

            return (
              <article
                key={method.id}
                id={method.id}
                className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition-all duration-300 hover:border-[var(--gold)]/30 hover:shadow-md"
              >
                {/* Card Header */}
                <div className="border-b border-border/40 p-5 sm:p-7">
                  <div className="flex items-start gap-4">

                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--gold)]/10 text-[var(--gold)]">
                      <Icon
                        className="h-6 w-6"
                        strokeWidth={1.8}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-lg font-semibold sm:text-xl">
                          {method.title}
                        </h3>

                        <span className="text-xs font-medium tracking-widest text-[var(--gold)]">
                          {method.number}
                        </span>
                      </div>

                      <p className="mt-1 text-sm font-medium text-[var(--gold)]">
                        {method.subtitle}
                      </p>

                      <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
                        {method.description}
                      </p>
                    </div>

                  </div>
                </div>

                {/* Steps */}
                <div className="p-5 sm:p-7">
                  <h4 className="mb-5 text-sm font-semibold">
                    خطوات الدفع
                  </h4>

                  <ol className="space-y-4">
                    {method.steps.map((step, index) => (
                      <li
                        key={step}
                        className="flex items-start gap-3"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--gold)]/10 text-xs font-semibold text-[var(--gold)]">
                          {index + 1}
                        </span>

                        <span className="pt-0.5 text-sm leading-7 text-muted-foreground sm:text-base">
                          {step}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              </article>
            );
          })}
        </section>

        {/* =====================================================
            Security
        ====================================================== */}
        <section className="mt-10">
          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm sm:p-8">

            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--gold)]/10 text-[var(--gold)]">
                <ShieldCheck className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-lg font-semibold sm:text-xl">
                  إرشادات مهمة للدفع
                </h2>

                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  لضمان إتمام عملية الدفع بشكل صحيح، يرجى الالتزام بالإرشادات
                  التالية:
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {importantNotes.map((note) => (
                <div
                  key={note}
                  className="flex items-start gap-3 border-r-2 border-[var(--gold)]/20 pr-4"
                >
                  <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[var(--gold)]" />

                  <p className="text-sm leading-7 text-muted-foreground sm:text-base">
                    {note}
                  </p>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* =====================================================
            Customer Support
        ====================================================== */}
        <section className="mt-10">
          <div className="rounded-2xl border border-[var(--gold)]/20 bg-[var(--gold)]/[0.04] p-6 text-center sm:p-8">

            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--gold)]/10 text-[var(--gold)]">
              <Headphones className="h-5 w-5" />
            </div>

            <h2 className="mt-4 text-xl font-semibold">
              تحتاج إلى مساعدة؟
            </h2>

            <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
              إذا واجهتك مشكلة أثناء الدفع أو لديك استفسار حول إحدى طرق الدفع،
              يمكنك التواصل مع فريق خدمة العملاء.
            </p>

            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">

              <Link
                href="/contact"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-foreground px-6 text-sm font-medium text-background transition-all duration-300 hover:opacity-90"
              >
                تواصل معنا
                <ArrowLeft className="h-4 w-4" />
              </Link>

              <Link
                href="/faq"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-6 text-sm font-medium transition-all duration-300 hover:border-[var(--gold)] hover:text-[var(--gold)]"
              >
                الأسئلة الشائعة
              </Link>

            </div>
          </div>
        </section>

        {/* =====================================================
            Footer Note
        ====================================================== */}
        <div className="mt-10 border-t border-border/40 pt-6 text-center">
          <p className="text-xs leading-6 text-muted-foreground">
            قد تختلف طرق الدفع المتاحة حسب إعدادات المتجر، وسيتم عرض الطرق
            المتاحة لك أثناء إتمام الطلب.
          </p>
        </div>

      </div>
    </main>
  );
}
