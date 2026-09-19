'use client';
import { useEffect, useState } from 'react';

export default function OrderDetail({ params }: { params: { id: string } }) {
  const [o, setO] = useState<any>();

  useEffect(() => {
    fetch(`/api/admin/orders/${params.id}`).then(r => r.json()).then(setO);
  }, [params.id]);

  if (!o) return <main className="container py-10">جارٍ التحميل…</main>;

  return (
    <main className="container py-10">
      <a href="/admin" className="gold">‹ الإدارة</a>
      <h1 className="mt-5 text-3xl font-semibold">تفاصيل الطلب #{o.number}</h1>
      
      <div className="mt-7 grid gap-5 lg:grid-cols-3">
        {/* قسم المنتجات */}
        <section className="lux-card p-5 lg:col-span-2 space-y-4">
          <h2 className="font-semibold">المنتجات</h2>
          {o.items.map((x: any) => (
            <div key={x.id} className="flex justify-between border-b hairline py-4">
              <div>
                <b>{x.name}</b>
                {x.variantName && <p className="text-xs muted mt-0.5">الخيار: {x.variantName}</p>}
                <p className="muted text-sm">الكمية: {x.quantity}</p>
              </div>
              <span>{Number(x.price).toLocaleString('ar-EG')} ج.م</span>
            </div>
          ))}
          <div className="mt-5 flex justify-between font-semibold text-base pt-2 border-t hairline">
            <span>الإجمالي النهائي</span>
            <span className="text-[var(--gold)]">{Number(o.total).toLocaleString('ar-EG')} ج.م</span>
          </div>
        </section>

        {/* قسم بيانات العميل والدفع وإيصال التحويل */}
        <aside className="lux-card p-5 space-y-4">
          <div>
            <h2 className="font-semibold">بيانات العميل</h2>
            <p className="mt-2 font-medium">{o.customer?.name || o.customerNameSnapshot || 'زائر'}</p>
            <p className="muted text-sm" dir="ltr">{o.customer?.phone || o.customerPhoneSnapshot}</p>
          </div>

          <div className="border-t hairline pt-3 space-y-1.5 text-sm">
            <p><span className="muted">الحالة:</span> <span className="font-semibold">{o.status}</span></p>
            <p><span className="muted">طريقة الدفع:</span> <span className="font-semibold">{o.paymentMethod}</span></p>
            <p><span className="muted">حالة الدفع:</span> <span className="font-semibold">{o.paymentStatus}</span></p>
          </div>

          {/* عرض تفاصيل إيصال التحويل وصورته إذا كانت متوفرة */}
          {o.payments && o.payments.length > 0 && (
            <div className="border-t hairline pt-3 space-y-2">
              <h3 className="font-semibold text-sm text-[var(--gold)]">إيصال التحويل والدفع</h3>
              {o.payments.map((p: any, idx: number) => (
                <div key={idx} className="space-y-2 text-xs">
                  {p.reference && (
                    <p>
                      <span className="muted">رقم العملية:</span>{' '}
                      <span dir="ltr" className="font-bold">{p.reference}</span>
                    </p>
                  )}
                  {p.proofUrl && (
                    <div className="space-y-1">
                      <span className="muted block">صورة الإيصال (اضغط للتكبير):</span>
                      <a 
                        href={p.proofUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="block relative w-full h-40 rounded-lg overflow-hidden border border-[var(--gold)]/40 bg-black/5 hover:opacity-95 transition shadow-sm"
                      >
                        <img src={p.proofUrl} alt="إيصال التحويل" className="w-full h-full object-cover" />
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="border-t hairline pt-3 text-xs leading-relaxed">
            <span className="muted block font-medium mb-1">عنوان الشحن:</span>
            <p>
              {o.shippingGovernorate 
                ? `${o.shippingGovernorate} - ${o.shippingCity} - ${o.shippingAddress}` 
                : (o.customer?.addresses?.[0] 
                    ? `${o.customer.addresses[0].governorate} - ${o.customer.addresses[0].city} - ${o.customer.addresses[0].address}` 
                    : 'لا يوجد عنوان محفوظ')}
            </p>
          </div>

          {o.couponCode && (
            <div className="border-t hairline pt-3 text-xs">
              <p>كوبون الخصم: <b dir="ltr">{o.couponCode}</b></p>
              <p className="muted mt-0.5">قيمة الخصم: {Number(o.discount || 0).toLocaleString('ar-EG')} ج.م • الشحن: {Number(o.shipping || 0).toLocaleString('ar-EG')} ج.م</p>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
                                                                    }
