// مسار الملف: app/checkout/page.tsx

'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Truck, CreditCard, ShieldCheck, ArrowRight, Upload, CheckCircle2, Sparkles } from 'lucide-react';

// مكون اختيار العناوين المحفوظة للعميل
interface Address {
  id: string;
  label?: string;
  name: string;
  phone: string;
  secondaryPhone?: string;
  governorate: string;
  city: string;
  address: string;
  notes?: string;
  isDefault: boolean;
}

function AddressSelector({ selectedId, onSelectAddress }: { selectedId: string | null, onSelectAddress: (address: Address | null) => void }) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAddresses() {
      try {
        const res = await fetch('/api/customer/addresses');
        if (res.ok) {
          const data = await res.json();
          setAddresses(data);
          // اختيار العنوان الافتراضي تلقائياً فقط إذا لم يكن هناك عنوان محدد مسبقاً
          if (!selectedId) {
            const defaultAddr = data.find((a: Address) => a.isDefault) || data[0];
            if (defaultAddr) {
              onSelectAddress(defaultAddr);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching addresses:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchAddresses();
  }, []);

  if (loading) return <div className="text-xs text-muted-foreground py-2">جاري التحقق من العناوين المحفوظة...</div>;
  if (addresses.length === 0) return null;

  return (
    <div className="space-y-3 mb-6 p-4 rounded-2xl bg-background/55 border border-border/60">
      <label className="block text-xs font-bold text-foreground">اختار من عناوينك المحفوظة:</label>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {addresses.map((addr) => (
          <div
            key={addr.id}
            onClick={() => onSelectAddress(addr)}
            className={`cursor-pointer rounded-xl border p-3 transition-all text-xs ${
              selectedId === addr.id
                ? 'border-[var(--gold)] bg-[var(--gold)]/10 ring-1 ring-[var(--gold)]'
                : 'border-border/60 bg-card hover:border-[var(--gold)]/40'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-foreground">{addr.label || 'عنوان'}</span>
              {addr.isDefault && (
                <span className="rounded bg-[var(--gold)] px-1.5 py-0.2 text-[10px] text-black font-bold">أساسي</span>
              )}
            </div>
            <p className="text-muted-foreground">{addr.name} - {addr.phone}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{addr.governorate}، {addr.city} - {addr.address}</p>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onSelectAddress(null)}
        className="text-[11px] text-[var(--gold)] underline hover:opacity-80 mt-1 block"
      >
        أو إدخال عنوان جديد لهذا الطلب
      </button>
    </div>
  );
}

function CheckoutContent() {
  const [c, setC] = useState<any[]>([]);
  const [pay, setPay] = useState('COD');
  const [methods, setMethods] = useState<any[]>([]);
  const [shippingZones, setShippingZones] = useState<any[]>([]);
  const [selectedGovernorate, setSelectedGovernorate] = useState('');
  const [coupon, setCoupon] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  
  // حالة تتبع معرف العنوان المختار حالياً
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  // حقول الفورم الموجهة لإدارة البيانات بدقة
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    city: '',
    address: '',
    notes: '',
  });

  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string>('');
  const [uploadError, setUploadError] = useState('');

  const r = useRouter();
  const sp = useSearchParams();

  useEffect(() => {
    setC(JSON.parse(localStorage.getItem('wahaj_cart') || '[]'));
    setCoupon(sp.get('coupon') || '');

    fetch('/api/settings')
      .then(x => x.json())
      .then(data => {
        const rawMethods = Array.isArray(data) ? data : (data.payments || []);
        const ms = rawMethods.filter((m: any) => m.enabled !== false);
        
        if (ms.length > 0) {
          setMethods(ms);
          setPay(ms[0].method);
        } else {
          const fallback = [
            { method: 'COD', label: 'الدفع عند الاستلام', description: 'الدفع نقداً عند استلام طلبك', enabled: true },
            { method: 'INSTAPAY', label: 'انستا باى (InstaPay)', description: 'التحويل اللحظي عبر إنستا باي', enabled: true, proofRequired: true },
            { method: 'VODAFONE_CASH', label: 'فودافون كاش', description: 'التحويل المباشر لمحفظة فودافون كاش', enabled: true, proofRequired: true }
          ];
          setMethods(fallback);
          setPay('COD');
        }
      })
      .catch(() => {
        const fallback = [
          { method: 'COD', label: 'الدفع عند الاستلام', description: 'الدفع نقداً عند استلام طلبك', enabled: true },
          { method: 'INSTAPAY', label: 'انستا باى (InstaPay)', description: 'التحويل اللحظي عبر إنستا باي', enabled: true, proofRequired: true },
          { method: 'VODAFONE_CASH', label: 'فودافون كاش', description: 'التحويل المباشر لمحفظة فودافون كاش', enabled: true, proofRequired: true }
        ];
        setMethods(fallback);
        setPay('COD');
      });

    fetch('/api/admin/shipping')
      .then(x => x.json())
      .then(data => {
        if (Array.isArray(data)) {
          setShippingZones(data);
          if (data[0] && !selectedGovernorate) setSelectedGovernorate(data[0].governorate);
        }
      })
      .catch(() => {});
  }, [sp]);

  // دالة متكاملة لتحديث الحقول والمحافظة عند اختيار أي عنوان
  const handleSelectAddress = (addr: Address | null) => {
    if (addr) {
      setSelectedAddressId(addr.id);
      setFormData({
        name: addr.name || '',
        phone: addr.phone || '',
        city: addr.city || '',
        address: addr.address || '',
        notes: addr.notes || '',
      });
      if (addr.governorate) {
        setSelectedGovernorate(addr.governorate);
      }
    } else {
      setSelectedAddressId(null);
      setFormData({ name: '', phone: '', city: '', address: '', notes: '' });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const selected = methods.find(x => x.method === pay);
  const currentZone = shippingZones.find(z => z.governorate === selectedGovernorate);
  const shippingCost = currentZone ? Number(currentZone.price) : 0;
  
  const subtotal = c.reduce((s, x) => s + Number(x.price) * x.quantity, 0);
  const finalTotal = subtotal + shippingCost;

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
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
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
        setProofPreview(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  async function submit(e: any) {
    e.preventDefault();
    if (!c.length || !methods.length) return;
    
    if (selected?.proofRequired && !proofPreview) {
      setMsg('يرجى رفع صورة إيصال التحويل لإتمام الطلب');
      return;
    }

    setBusy(true);
    setMsg('');
    const body = {
      name: formData.name,
      phone: formData.phone,
      governorate: selectedGovernorate,
      city: formData.city,
      address: formData.address,
      notes: formData.notes,
      paymentMethod: pay,
      couponCode: coupon || undefined,
      idempotencyKey: crypto.randomUUID(),
      paymentReference: e.currentTarget.paymentReference?.value || undefined,
      proofUrl: proofPreview || undefined,
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

  const getPaymentIcon = (methodKey: string) => {
    switch (methodKey.toLowerCase()) {
      case 'cod':
      case 'cash':
        return <Truck size={20} className="text-[var(--gold)]" />;
      case 'vodafone':
      case 'vodafone_cash':
        return <span className="text-red-500 font-bold text-xs">V-CASH</span>;
      case 'instapay':
        return <span className="text-purple-600 font-bold text-xs">InstaPay</span>;
      default:
        return <CreditCard size={20} className="text-[var(--gold)]" />;
    }
  };

  return (
    <main className="container max-w-5xl py-10 px-4 md:px-8 bg-background text-foreground transition-colors duration-300" dir="rtl">
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 border-b border-border/40 pb-6">
        <div className="space-y-1">
          <span className="text-[var(--gold)] font-medium text-sm flex items-center gap-1.5">
            <Sparkles size={16} /> متجر وَهَج للأناقة
          </span>
          <h1 className="text-2xl md:text-4xl font-bold tracking-tight">إتمام الطلب</h1>
          <p className="text-muted-foreground text-sm">تجربة دفع بسيطة، آمنة ومصممة خصيصاً لراحتك.</p>
        </div>
        <Link 
          href="/cart" 
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border/80 text-foreground hover:border-[var(--gold)]/50 transition text-sm font-semibold shadow-sm"
        >
          <ArrowRight size={16} /> العودة إلى السلة
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-2 p-3 bg-card border border-border/60 rounded-2xl shadow-sm mb-8">
        <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs md:text-sm font-bold text-muted-foreground">
          <span className="w-5 h-5 rounded-full bg-black/10 flex items-center justify-center text-xs">1</span>
          <span>مراجعة السلة</span>
        </div>
        <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs md:text-sm font-bold bg-[var(--gold)] text-black shadow-md">
          <span className="w-5 h-5 rounded-full bg-black/10 flex items-center justify-center text-xs">2</span>
          <span>الشحن والدفع</span>
        </div>
        <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs md:text-sm font-bold text-muted-foreground">
          <span className="w-5 h-5 rounded-full bg-black/10 flex items-center justify-center text-xs">3</span>
          <span>تأكيد الطلب</span>
        </div>
      </div>
      
      <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[1fr_380px] items-start">
        <section className="space-y-6">
          <div className="bg-card border border-border/60 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2 pb-4 border-b border-border/40">
              <div className="p-2.5 rounded-xl bg-[var(--gold)]/10 text-[var(--gold)]">
                <Truck size={22} />
              </div> 
              بيانات الشحن والتوصيل
            </h2>

            {/* مكون اختيار العناوين المحفوظة مع تتبع المعيار المختار */}
            <AddressSelector selectedId={selectedAddressId} onSelectAddress={handleSelectAddress} />

            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-xs font-semibold text-muted-foreground space-y-1">الاسم بالكامل
                <input name="name" required value={formData.name} onChange={handleInputChange} className="w-full mt-1 px-4 py-3 rounded-xl bg-background border border-border/80 text-foreground text-sm focus:outline-none focus:border-[var(--gold)]" placeholder="أدخلي اسمكِ الثلاثي" />
              </label>
              <label className="text-xs font-semibold text-muted-foreground space-y-1">رقم الهاتف
                <input name="phone" required value={formData.phone} onChange={handleInputChange} dir="ltr" className="w-full mt-1 px-4 py-3 rounded-xl bg-background border border-border/80 text-foreground text-sm focus:outline-none focus:border-[var(--gold)]" placeholder="01xxxxxxxx" />
              </label>
              
              <label className="text-xs font-semibold text-muted-foreground space-y-1">المحافظة
                <select 
                  name="governorate" 
                  required 
                  value={selectedGovernorate}
                  onChange={e => setSelectedGovernorate(e.target.value)}
                  className="w-full mt-1 px-4 py-3 rounded-xl bg-background border border-border/80 text-foreground text-sm focus:outline-none focus:border-[var(--gold)]"
                >
                  {shippingZones.map(zone => (
                    <option key={zone.id} value={zone.governorate}>
                      {zone.governorate} ({Number(zone.price).toLocaleString('ar-EG')} ج.م)
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs font-semibold text-muted-foreground space-y-1">المدينة / المركز
                <input name="city" required value={formData.city} onChange={handleInputChange} className="w-full mt-1 px-4 py-3 rounded-xl bg-background border border-border/80 text-foreground text-sm focus:outline-none focus:border-[var(--gold)]" placeholder="اسم المدينة أو الحي" />
              </label>
            </div>

            <label className="block text-xs font-semibold text-muted-foreground space-y-1">العنوان بالتفصيل
              <textarea name="address" required rows={2} value={formData.address} onChange={handleInputChange} className="w-full mt-1 px-4 py-3 rounded-xl bg-background border border-border/80 text-foreground text-sm focus:outline-none focus:border-[var(--gold)]" placeholder="اسم الشارع، رقم العمارة، رقم الشقة..." />
            </label>
            
            <label className="block text-xs font-semibold text-muted-foreground space-y-1">ملاحظات (اختياري)
              <input name="notes" value={formData.notes} onChange={handleInputChange} className="w-full mt-1 px-4 py-3 rounded-xl bg-background border border-border/80 text-foreground text-sm focus:outline-none focus:border-[var(--gold)]" placeholder="أي ملاحظات خاصة بالتوصيل..." />
            </label>
            
            <label className="block text-xs font-semibold text-muted-foreground space-y-1">كود الخصم
              <input value={coupon} onChange={e => setCoupon(e.target.value.toUpperCase())} className="w-full mt-1 px-4 py-3 rounded-xl bg-background border border-border/80 text-foreground text-sm focus:outline-none focus:border-[var(--gold)]" placeholder="اختياري" dir="ltr" />
            </label>
          </div>

          <div className="bg-card border border-border/60 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2 pb-4 border-b border-border/40">
              <div className="p-2.5 rounded-xl bg-[var(--gold)]/10 text-[var(--gold)]">
                <CreditCard size={22} />
              </div>
              طريقة الدفع
            </h2>
            
            <fieldset>
              <div className="grid gap-3">
                {methods.map((m: any) => (
                  <label 
                    key={m.method} 
                    className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition ${
                      pay === m.method ? 'border-[var(--gold)] bg-[var(--gold)]/5 shadow-sm' : 'border-border/60 bg-background hover:border-[var(--gold)]/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-background border border-border/40 flex items-center justify-center flex-shrink-0 shadow-sm">
                        {getPaymentIcon(m.method)}
                      </div>
                      <div>
                        <span className="font-bold block text-sm md:text-base">{m.label}</span>
                        {m.description && <span className="mt-0.5 block text-xs text-muted-foreground">{m.description}</span>}
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
              <div className="mt-4 rounded-2xl border border-[var(--gold)]/40 bg-[var(--gold)]/10 p-5 text-sm space-y-3">
                <b className="block text-[var(--gold)] font-bold">تعليمات الدفع الإلكتروني</b>
                {selected.accountName && <p>اسم الحساب: {selected.accountName}</p>}
                {selected.accountNumber && <p dir="ltr" className="font-bold">{selected.accountNumber}</p>}
                {selected.instructions && <p className="leading-6 text-xs text-muted-foreground">{selected.instructions}</p>}
                
                {selected.proofRequired && (
                  <div className="space-y-3 pt-3 border-t border-[var(--gold)]/20">
                    <label className="block text-xs font-semibold">رقم عملية التحويل (مرجع التحويل)
                      <input name="paymentReference" required className="w-full mt-1 px-4 py-2.5 rounded-xl bg-background border border-border/80 text-foreground text-sm focus:outline-none focus:border-[var(--gold)]" dir="ltr" placeholder="أدخل رقم العملية أو مرجع التحويل" />
                    </label>

                    <div className="space-y-1.5">
                      <span className="block text-xs font-semibold">صورة إيصال التحويل (مطلوبة)</span>
                      
                      <label className="flex flex-col items-center justify-center border-2 border-dashed border-[var(--gold)]/50 rounded-2xl p-4 bg-background/60 cursor-pointer hover:bg-[var(--gold)]/5 transition text-center">
                        <div className="flex items-center gap-2 text-xs font-bold text-[var(--gold)]">
                          {proofFile ? <CheckCircle2 size={18} /> : <Upload size={18} />}
                          <span>{proofFile ? proofFile.name : 'اضغط هنا لرفع صورة الإيصال مباشرة'}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-1">يدعم صور (JPG, PNG) بحد أقصى 5 ميجابايت ومحمية بالكامل</span>
                        <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                      </label>

                      {uploadError && <p className="text-xs text-red-500 font-medium">{uploadError}</p>}

                      {proofPreview && (
                        <div className="mt-2 relative w-24 h-24 rounded-xl overflow-hidden border border-[var(--gold)]/40 bg-black/5 shadow-sm">
                          <img src={proofPreview} alt="إيصال التحويل" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {msg && <p className="text-sm text-red-500 font-medium text-center p-3 rounded-xl bg-red-500/10 border border-red-500/20" role="alert">{msg}</p>}
          </div>
        </section>

        <aside className="bg-card border border-border/60 rounded-3xl p-6 md:p-8 shadow-md sticky top-24 space-y-6">
          <h2 className="text-xl font-bold pb-4 border-b border-border/40">ملخص الطلب</h2>
          
          <div className="space-y-3 max-h-52 overflow-y-auto text-sm">
            {c.map((x: any, i: number) => (
              <div key={i} className="flex justify-between gap-3 text-xs text-muted-foreground">
                <span className="truncate flex-1">{x.name} × {x.quantity}</span>
                <b className="flex-shrink-0 text-foreground font-semibold">{(Number(x.price) * x.quantity).toLocaleString('ar-EG')} ج.م</b>
              </div>
            ))}
          </div>

          <div className="border-t border-border/40 pt-4 space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>الإجمالي المبدئي</span>
              <span>{subtotal.toLocaleString('ar-EG')} ج.م</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>تكلفة الشحن</span>
              <span>{shippingCost.toLocaleString('ar-EG')} ج.م</span>
            </div>
          </div>

          <div className="border-t border-border/40 pt-4 flex justify-between text-base font-bold">
            <span className="text-muted-foreground text-sm">الإجمالي النهائي</span>
            <span className="text-[var(--gold)] text-xl">{finalTotal.toLocaleString('ar-EG')} ج.م</span>
          </div>

          <button 
            disabled={busy || !c.length || !methods.length} 
            className="w-full py-4 rounded-2xl bg-[var(--gold)] text-black font-bold text-base shadow-lg hover:opacity-95 transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{busy ? 'جارٍ إرسال الطلب...' : 'تأكيد وإتمام الطلب'}</span>
            <CheckCircle2 size=...
