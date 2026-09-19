'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Truck, CreditCard, ShieldCheck, ArrowRight, Upload, CheckCircle2 } from 'lucide-react';

function CheckoutContent() {
  const [c, setC] = useState<any[]>([]);
  const [pay, setPay] = useState('COD');
  const [methods, setMethods] = useState<any[]>([]);
  const [shippingZones, setShippingZones] = useState<any[]>([]);
  const [selectedGovernorate, setSelectedGovernorate] = useState('');
  const [coupon, setCoupon] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  
  // حالات خاصة برفع إيصال الدفع بشكل آمن ومباشر
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string>('');
  const [uploadError, setUploadError] = useState('');

  const r = useRouter();
  const sp = useSearchParams();

  useEffect(() => {
    setC(JSON.parse(localStorage.getItem('wahaj_cart') || '[]'));
    setCoupon(sp.get('coupon') || '');

    // جلب طرق الدفع وإعدادات المتجر
    fetch('/api/settings')
      .then(x => x.json())
      .then(x => {
        const ms = (x.payments || []).filter((m: any) => m.enabled);
        setMethods(ms);
        if (ms[0]) setPay(ms[0].method);
      })
      .catch(() => {});

    // جلب مناطق وأسعار الشحن من لوحة التحكم
    fetch('/api/admin/shipping')
      .then(x => x.json())
      .then(data => {
        if (Array.isArray(data)) {
          setShippingZones(data);
          if (data[0]) setSelectedGovernorate(data[0].governorate);
        }
      })
      .catch(() => {});
  }, [sp]);

  const selected = methods.find(x => x.method === pay);
  
  // حساب سياق الشحن الحالي بناءً على المحافظة المختارة
  const currentZone = shippingZones.find(z => z.governorate === selectedGovernorate);
  const shippingCost = currentZone ? Number(currentZone.price) : 0;
  
  const subtotal = c.reduce((s, x) => s + Number(x.price) * x.quantity, 0);
  const finalTotal = subtotal + shippingCost;

  // دالة للتعامل مع رفع الصورة بشكل آمن والتحقق من النوع والحجم
    // دالة محسنة لضغط الصورة وتهئتها لتكون بحجم صغير جداً وآمن
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadError('');
    
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('يرجى رفع ملف صورة صالح (JPG, PNG)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('حجم الصورة كبير جداً');
      return;
    }

    setProofFile(file);

    // ضغط الصورة باستخدام Canvas لتكون مساحتها النصية صغيرة جداً وتتخطى قيود الـ API بسهولة
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // تصغير الأبعاد القصوى للصورة لتناسب الإيصالات (مثلاً بحد أقصى 800 بكسل)
        const maxDim = 800;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        // استخراج الصورة بجودة مضغوطة (0.7) لتصبح صغيرة الحجم وسريعة الإرسال
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        setProofPreview(compressedBase64);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  async function submit(e: any) {
    e.preventDefault();
    if (!c.length || !methods.length) return;
    
    // التحقق من إرفاق صورة التحويل إذا كانت طريقة الدفع تتطلب إثباتاً
    if (selected?.proofRequired && !proofPreview) {
      setMsg('يرجى رفع صورة إيصال التحويل لإتمام الطلب');
      return;
    }

    setBusy(true);
    setMsg('');
    const f = new FormData(e.currentTarget);
    const body = {
      name: f.get('name'),
      phone: f.get('phone'),
      governorate: selectedGovernorate,
      city: f.get('city'),
      address: f.get('address'),
      notes: f.get('notes'),
      paymentMethod: pay,
      couponCode: coupon || undefined,
      idempotencyKey: crypto.randomUUID(),
      paymentReference: f.get('paymentReference') || undefined,
      proofUrl: proofPreview || f.get('proofUrl') || undefined, // إرسال الصورة المرفوعة بشكل آمن
      items: c.map(x => ({ productId: x.productId, variantId: x.variantId, quantity: x.quantity }))
    };

    try {
      const x = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const j = await x.json();
      if (x.ok) {
        localStorage.removeItem('wahaj_cart');
        window.dispatchEvent(new Event('wahaj-cart-change'));
        r.push(`/checkout/success?order=${j.orderNumber}`);
      } else {
        setMsg(j.error || 'تعذر إنشاء الطلب');
      }
    } catch {
      setMsg('تعذر الاتصال بالخادم. حاولي مرة أخرى.');
    } finally {
      setBusy(false);
    }
  }

  // دالة لتحديد الأيقونة حسب طريقة الدفع
  const getPaymentIcon = (methodKey: string) => {
    switch (methodKey.toLowerCase()) {
      case 'cod':
      case 'cash':
        return <Truck size={22} className="text-[var(--gold)]" />;
      case 'vodafone':
      case 'vodafone_cash':
        return <span className="text-red-600 font-bold text-xs">V-CASH</span>;
      case 'instapay':
        return <span className="text-purple-700 font-bold text-xs">InstaPay</span>;
      default:
        return <CreditCard size={22} className="text-[var(--gold)]" />;
    }
  };

  return (
    <main className="container max-w-5xl py-8">
      {/* الترويسة العلوية مع زر العودة للسلة */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-semibold">إتمام الطلب</h1>
          <p className="mt-1 muted text-sm">تجربة دفع بسيطة، آمنة ومصممة خصيصاً لراحتك.</p>
        </div>
        <Link 
          href="/cart" 
          className="border border-[var(--gold)] text-[var(--gold)] hover:bg-[var(--gold)] hover:text-white transition flex items-center gap-2 text-sm py-2 px-4 rounded-lg font-medium shadow-sm"
        >
          <ArrowRight size={16} /> العودة إلى السلة
        </Link>
      </div>
      
      <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* قسم البيانات وطرق الدفع */}
        <section className="space-y-6">
          <div className="lux-card p-6 bg-background border hairline rounded-xl space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2 pb-2 border-b hairline">
              <Truck size={20} className="text-[var(--gold)]" /> بيانات الشحن والتوصيل
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium">الاسم بالكامل
                <input name="name" required className="input mt-1 w-full" placeholder="أدخل اسمك الثلاثي" />
              </label>
              <label className="text-sm font-medium">رقم الهاتف
                <input name="phone" required className="input mt-1 w-full" placeholder="01xxxxxxxxx" />
              </label>
              
              <label className="text-sm font-medium">المحافظة
                <select 
                  name="governorate" 
                  required 
                  value={selectedGovernorate}
                  onChange={e => setSelectedGovernorate(e.target.value)}
                  className="input mt-1 bg-background w-full"
                >
                  {shippingZones.map(zone => (
                    <option key={zone.id} value={zone.governorate}>
                      {zone.governorate} ({Number(zone.price).toLocaleString('ar-EG')} ج.م)
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium">المدينة / المركز
                <input name="city" required className="input mt-1 w-full" placeholder="اسم المدينة أو الحي" />
              </label>
            </div>

            <label className="block text-sm font-medium pt-2">العنوان بالتفصيل
              <textarea name="address" required className="input mt-1 min-h-24 w-full" placeholder="اسم الشارع، رقم الحقة، الدور..." />
            </label>
            
            <label className="block text-sm font-medium">ملاحظات (اختياري)
              <textarea name="notes" className="input mt-1 w-full" placeholder="أي ملاحظات خاصة بالتوصيل..." />
            </label>
            
            <label className="block text-sm font-medium">كود الخصم
              <input value={coupon} onChange={e => setCoupon(e.target.value.toUpperCase())} className="input mt-1 w-full" placeholder="اختياري" dir="ltr" />
            </label>
          </div>

          {/* طرق الدفع */}
          <div className="lux-card p-6 bg-background border hairline rounded-xl space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2 pb-2 border-b hairline">
              <CreditCard size={20} className="text-[var(--gold)]" /> طريقة الدفع
            </h2>
            
            <fieldset>
              <div className="grid gap-3">
                {methods.map((m: any) => (
                  <label 
                    key={m.method} 
                    className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition ${pay === m.method ? 'border-[var(--gold)] bg-[var(--gold)]/5 shadow-sm' : 'hairline'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-black/5 flex items-center justify-center flex-shrink-0">
                        {getPaymentIcon(m.method)}
                      </div>
                      <div>
                        <span className="font-semibold block text-sm">{m.label}</span>
                        {m.description && <span className="mt-0.5 block text-xs muted">{m.description}</span>}
                      </div>
                    </div>
                    <input 
                      type="radio" 
                      name="payment" 
                      checked={pay === m.method} 
                      onChange={() => setPay(m.method)} 
                      className="accent-[var(--gold)] w-4 h-4"
                    />
                  </label>
                ))}
              </div>
            </fieldset>

            {selected && (selected.instructions || selected.accountNumber) && (
              <div className="mt-4 rounded-xl border border-[var(--gold)]/40 bg-[var(--gold)]/10 p-4 text-sm space-y-3">
                <b className="block text-[var(--gold)]">تعليمات الدفع</b>
                {selected.accountName && <p>اسم الحساب: {selected.accountName}</p>}
                {selected.accountNumber && <p dir="ltr" className="font-semibold">{selected.accountNumber}</p>}
                {selected.instructions && <p className="leading-6">{selected.instructions}</p>}
                
                {selected.proofRequired && (
                  <div className="space-y-3 pt-2 border-t border-[var(--gold)]/20">
                    <label className="block text-xs font-medium">رقم عملية التحويل (مرجع التحويل)
                      <input name="paymentReference" required className="input mt-1 w-full" dir="ltr" placeholder="أدخل رقم العملية أو مرجع التحويل" />
                    </label>

                    {/* زر رفع صورة الإيصال المباشر مع الحماية والتحقق */}
                    <div className="space-y-1.5">
                      <span className="block text-xs font-medium">صورة إيصال التحويل (مطلوبة)</span>
                      
                      <label className="flex flex-col items-center justify-center border-2 border-dashed border-[var(--gold)]/50 rounded-xl p-4 bg-background/60 cursor-pointer hover:bg-[var(--gold)]/5 transition text-center">
                        <div className="flex items-center gap-2 text-xs font-medium text-[var(--gold)]">
                          {proofFile ? <CheckCircle2 size={18} /> : <Upload size={18} />}
                          <span>{proofFile ? proofFile.name : 'اضغط هنا لرفع صورة الإيصال مباشرة'}</span>
                        </div>
                        <span className="text-[10px] muted mt-1">يدعم صور (JPG, PNG) بحد أقصى 5 ميجابايت ومحمية بالكامل</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleFileChange} 
                          className="hidden" 
                        />
                      </label>

                      {uploadError && <p className="text-xs text-red-600 font-medium">{uploadError}</p>}

                      {/* معاينة الصورة المرفوعة بشكل آمن */}
                      {proofPreview && (
                        <div className="mt-2 relative w-24 h-24 rounded-lg overflow-hidden border border-[var(--gold)]/40 bg-black/5">
                          <img src={proofPreview} alt="إيصال التحويل" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {msg && <p className="text-sm text-red-600 font-medium" role="alert">{msg}</p>}
          </div>
        </section>

        {/* ملخص الطلب الجانبي */}
        <aside className="lux-card h-fit p-6 bg-background border hairline rounded-xl sticky top-24 space-y-4">
          <h2 className="text-lg font-semibold pb-2 border-b hairline">ملخص الطلب</h2>
          
          <div className="space-y-3 max-h-52 overflow-y-auto text-sm">
            {c.map((x: any, i: number) => (
              <div key={i} className="flex justify-between gap-3 text-xs">
                <span className="truncate flex-1">{x.name} × {x.quantity}</span>
                <b className="flex-shrink-0">{(Number(x.price) * x.quantity).toLocaleString('ar-EG')} ج.م</b>
              </div>
            ))}
          </div>

          <div className="border-t hairline pt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="muted">الإجمالي المبدئي</span>
              <span>{subtotal.toLocaleString('ar-EG')} ج.م</span>
            </div>
            <div className="flex justify-between">
              <span className="muted">تكلفة الشحن</span>
              <span>{shippingCost.toLocaleString('ar-EG')} ج.م</span>
            </div>
          </div>

          <div className="border-t hairline pt-4 flex justify-between text-base font-bold">
            <span>الإجمالي النهائي</span>
            <span className="text-[var(--gold)]">{finalTotal.toLocaleString('ar-EG')} ج.م</span>
          </div>

          <button 
            disabled={busy || !c.length || !methods.length} 
            className="btn btn-gold w-full text-center py-3 rounded-lg font-medium shadow-md disabled:opacity-50"
          >
            {busy ? 'جارٍ إرسال الطلب...' : 'تأكيد وإتمام الطلب'}
          </button>

          <div className="flex items-center justify-center gap-1.5 text-xs muted pt-2">
            <ShieldCheck size={14} className="text-[var(--gold)]" /> تسوق آمن ومحمي 100%
          </div>
        </aside>
      </form>
    </main>
  );
}

export default function Checkout() {
  return (
    <Suspense fallback={<main className="container py-12"><div className="lux-card p-6 text-center">جاري تحميل صفحة الدفع...</div></main>}>
      <CheckoutContent />
    </Suspense>
  );
}
