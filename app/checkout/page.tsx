// مسار الملف: app/checkout/page.tsx

'use client';
import { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Truck, CreditCard, ShieldCheck, ArrowRight, Upload, CheckCircle2, Sparkles } from 'lucide-react';

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

interface CustomerSummary { id: string; name?: string | null; phone?: string | null; email?: string | null }

function AddressSelector({ selectedId, onSelectAddress, onAuthState }: { selectedId: string | null, onSelectAddress: (address: Address | null) => void, onAuthState: (authenticated: boolean) => void }) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAddresses() {
      try {
        const res = await fetch('/api/customer/addresses');
        if (res.ok) {
          onAuthState(true);
          const data = await res.json();
          setAddresses(data);
          if (!selectedId) {
            const defaultAddr = data.find((a: Address) => a.isDefault) || data[0];
            if (defaultAddr) {
              onSelectAddress(defaultAddr);
            }
          }
        } else if (res.status === 401) {
          onAuthState(false);
        }
      } catch (error) {
        console.error('Error fetching addresses:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchAddresses();
  }, []);

  if (loading) return <div className="text-xs text-muted-foreground py-2 font-light">جاري التحقق من العناوين المحفوظة...</div>;
  if (addresses.length === 0) return <p className="checkout-addresses__empty">لا توجد عناوين محفوظة بعد. يمكنكِ إدخال عنوان جديد أدناه.</p>;

  return (
    <div className="space-y-3 mb-6 p-5 rounded-3xl bg-muted/10 border border-border/40 shadow-xs">
      <label className="block text-xs font-semibold text-foreground tracking-wide">اختاري من عناوينك المحفوظة:</label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {addresses.map((addr) => (
          <div
            key={addr.id}
            onClick={() => onSelectAddress(addr)}
            className={`cursor-pointer rounded-2xl border p-4 transition-all text-xs ${
              selectedId === addr.id
                ? 'border-[var(--gold)] bg-[var(--gold)]/10 ring-1 ring-[var(--gold)]'
                : 'border-border/40 bg-[var(--bg)] hover:border-[var(--gold)]/40 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-serif font-bold text-foreground">{addr.label || 'عنوان'}</span>
              {addr.isDefault && (
                <span className="rounded-full bg-[var(--gold)] px-2 py-0.5 text-[10px] text-[var(--gold-contrast)] font-bold">أساسي</span>
              )}
            </div>
            <p className="text-muted-foreground font-light">{addr.name} - {addr.phone}</p>
            <p className="text-[11px] text-muted-foreground mt-1 truncate font-light">{addr.governorate}، {addr.city} - {addr.address}</p>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onSelectAddress(null)}
        className="text-xs text-[var(--gold)] underline hover:opacity-80 mt-2 block font-medium"
      >
        أو إدخال عنوان جديد لهذا الطلب
      </button>
    </div>
  );
}

function CheckoutContent() {
  const idempotencyKeyRef = useRef<string | null>(null);
  const [c, setC] = useState<any[]>([]);
  const [pay, setPay] = useState('COD');
  const [methods, setMethods] = useState<any[]>([]);
  const [shippingZones, setShippingZones] = useState<any[]>([]);
  const [selectedGovernorate, setSelectedGovernorate] = useState('');
  const [coupon, setCoupon] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [pricing, setPricing] = useState<any>({ subtotal: 0, discount: 0, shipping: 0, total: 0, freeShipping: false, appliedOffers: [] });
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingMessage, setPricingMessage] = useState('');
  
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [customer, setCustomer] = useState<CustomerSummary | null>(null);
  const [addressAuthState, setAddressAuthState] = useState<boolean | null>(null);

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

    fetch('/api/customer/auth', { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.id) {
          setCustomer(data);
          setFormData(prev => ({ ...prev, name: data.name || prev.name, phone: data.phone || prev.phone }));
        }
      })
      .catch(() => {});

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

    fetch('/api/shipping')
      .then(x => x.json())
      .then(data => {
        if (Array.isArray(data)) {
          setShippingZones(data);
          if (data[0] && !selectedGovernorate) setSelectedGovernorate(data[0].governorate);
        }
      })
      .catch(() => {});
  }, [sp]);

  const handleSelectAddress = (addr: Address | null) => {
    if (addr) {
      setSelectedAddressId(addr.id);
      setFormData({
        name: customer?.name || addr.name || '',
        phone: customer?.phone || addr.phone || '',
        city: addr.city || '',
        address: addr.address || '',
        notes: addr.notes || '',
      });
      if (addr.governorate) {
        const matchedZone = shippingZones.find(
          z => z.governorate.trim().toLowerCase() === addr.governorate.trim().toLowerCase()
        );
        if (matchedZone) {
          setSelectedGovernorate(matchedZone.governorate);
        } else if (shippingZones.length > 0) {
          setSelectedGovernorate(addr.governorate);
        }
      }
    } else {
      setSelectedAddressId(null);
      setFormData({ name: customer?.name || '', phone: customer?.phone || '', city: '', address: '', notes: '' });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const selected = methods.find(x => x.method === pay);
  const currentZone = shippingZones.find(z => z.governorate.trim().toLowerCase() === selectedGovernorate.trim().toLowerCase());
  const shippingCost = currentZone ? Number(currentZone.price) : 0;
  const subtotal = Number(pricing.subtotal || 0);
  const offerDiscount = Number(pricing.discount || 0);
  const finalShipping = Number(pricing.shipping ?? shippingCost);
  const finalTotal = Number(pricing.total || 0);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      if (!c.length) {
        setPricing({ subtotal: 0, discount: 0, shipping: 0, total: 0, freeShipping: false, appliedOffers: [] });
        return;
      }
      setPricingLoading(true);
      try {
        const res = await fetch('/api/checkout/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: c.map((x: any) => ({ productId: x.productId, variantId: x.variantId, quantity: x.quantity })),
            couponCode: coupon || undefined,
            governorate: selectedGovernorate || undefined,
            city: formData.city || undefined,
            phone: formData.phone || undefined,
          }),
        });
        const data = await res.json();
        if (!cancelled && res.ok) {
          setPricing(data);
          setPricingMessage(data.couponError || '');
        } else if (!cancelled) {
          setPricingMessage(data.error || 'تعذر تحديث الأسعار');
        }
      } catch {
        if (!cancelled) setPricingMessage('تعذر تحديث الأسعار حاليًا');
      } finally {
        if (!cancelled) setPricingLoading(false);
      }
    }, 250);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [c, coupon, selectedGovernorate, formData.city, formData.phone]);

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
        canvas.toBlob((blob) => {
          if (!blob) {
            setUploadError('تعذر تجهيز صورة الإيصال');
            return;
          }
          const optimizedFile = new File([blob], 'payment-proof.jpg', { type: 'image/jpeg' });
          setProofFile(optimizedFile);
          setProofPreview(URL.createObjectURL(optimizedFile));
        }, 'image/jpeg', 0.7);
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
    if (customer?.phone && !formData.phone) {
      setMsg('تعذر قراءة رقم الهاتف الأساسي من حسابكِ');
      setBusy(false);
      return;
    }
    const checkoutIntent = {
      name: formData.name,
      phone: formData.phone,
      governorate: selectedGovernorate,
      city: formData.city,
      address: formData.address,
      notes: formData.notes,
      addressId: selectedAddressId || undefined,
      paymentMethod: pay,
      giftCardCode: coupon || undefined,
      paymentReference: e.currentTarget.paymentReference?.value || undefined,
      items: c.map(x => ({ productId: x.productId, variantId: x.variantId, quantity: x.quantity }))
    };
    const intentFingerprint = JSON.stringify(checkoutIntent);
    let idempotencyKey = idempotencyKeyRef.current;

    try {
      const savedFingerprint = sessionStorage.getItem('wahaj_checkout_fingerprint');
      const savedKey = sessionStorage.getItem('wahaj_checkout_idempotency_key');
      if (savedFingerprint === intentFingerprint && savedKey) {
        idempotencyKey = savedKey;
      } else {
        idempotencyKey = crypto.randomUUID();
        sessionStorage.setItem('wahaj_checkout_fingerprint', intentFingerprint);
        sessionStorage.setItem('wahaj_checkout_idempotency_key', idempotencyKey);
      }
    } catch {
      idempotencyKey = idempotencyKey || crypto.randomUUID();
    }

    const stableIdempotencyKey = idempotencyKey || crypto.randomUUID();
    idempotencyKeyRef.current = stableIdempotencyKey;
    const body = { ...checkoutIntent, idempotencyKey: stableIdempotencyKey };

    try {
      const uploadData = new FormData();
      uploadData.append('data', JSON.stringify(body));
      if (proofFile) uploadData.append('proof', proofFile, proofFile.name);

      const x = await fetch('/api/checkout', {
        method: 'POST',
        body: uploadData
      });
      const j = await x.json();
      if (x.ok) {
        idempotencyKeyRef.current = null;
        try {
          sessionStorage.removeItem('wahaj_checkout_fingerprint');
          sessionStorage.removeItem('wahaj_checkout_idempotency_key');
        } catch {}
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
    <main className="wahaj-checkout-page" dir="rtl">
      <div className="wahaj-commerce-shell">
        <header className="wahaj-commerce-header">
          <div>
            <span className="wahaj-commerce-kicker"><Sparkles size={14} /> تجربة وَهَج</span>
            <h1>إتمام الطلب</h1>
            <p>خطوة أخيرة تفصل اختياراتكِ عن وصولها إليكِ.</p>
          </div>
          <Link href="/cart" className="wahaj-commerce-ghost"><ArrowRight size={16} /> العودة إلى السلة</Link>
        </header>

        <nav className="wahaj-order-steps" aria-label="مراحل الطلب">
          <Link href="/cart"><b>01</b><span>السلة</span></Link><i />
          <div className="is-active"><b>02</b><span>الشحن والدفع</span></div><i />
          <div><b>03</b><span>التأكيد</span></div>
        </nav>

        <form onSubmit={submit} className="wahaj-checkout-layout">
          <section className="wahaj-checkout-main">
            <div className="wahaj-checkout-card">
              <div className="wahaj-checkout-card__heading"><span className="wahaj-checkout-icon"><Truck size={19} /></span><div><span>التوصيل إلى بابكِ</span><h2>بيانات الشحن</h2></div><em>01</em></div>
              {customer ? <div className="checkout-member-strip"><span>مرحبًا {customer.name || 'بكِ'}، سيتم استخدام بيانات حسابكِ بأمان.</span><Link href="/account">إدارة الحساب</Link></div> : addressAuthState === false ? <div className="checkout-login-hint">سجّلي الدخول لعرض عناوينكِ المحفوظة تلقائيًا، أو أكملي كزائرة بإدخال عنوان جديد.</div> : null}
              <AddressSelector selectedId={selectedAddressId} onSelectAddress={handleSelectAddress} onAuthState={setAddressAuthState} />
              <div className="wahaj-form-grid">
                <label>الاسم بالكامل<input name="name" required value={formData.name} onChange={handleInputChange} placeholder="أدخلي اسمكِ الثلاثي" /></label>
                <label>رقم الهاتف<input name="phone" required readOnly={Boolean(customer?.phone)} value={formData.phone} onChange={handleInputChange} dir="ltr" placeholder="01xxxxxxxx" />{customer?.phone && <small>رقم الهاتف الأساسي لحسابكِ — غير قابل للتعديل من صفحة الطلب.</small>}</label>
                <label>المحافظة<select name="governorate" required disabled={Boolean(selectedAddressId)} value={selectedGovernorate} onChange={event => setSelectedGovernorate(event.target.value)}>{shippingZones.map(zone => <option key={zone.id} value={zone.governorate}>{zone.governorate} ({Number(zone.price).toLocaleString('ar-EG')} ج.م)</option>)}</select></label>
                <label>المدينة / المركز<input name="city" required readOnly={Boolean(selectedAddressId)} value={formData.city} onChange={handleInputChange} placeholder="اسم المدينة أو الحي" /></label>
              </div>
              <label className="wahaj-form-field">العنوان بالتفصيل<textarea name="address" required readOnly={Boolean(selectedAddressId)} rows={3} value={formData.address} onChange={handleInputChange} placeholder="اسم الشارع، رقم العمارة، رقم الشقة..." /></label>
              <div className="wahaj-form-grid wahaj-form-grid--secondary"><label>ملاحظات التوصيل <span>اختياري</span><input name="notes" value={formData.notes} onChange={handleInputChange} placeholder="أي ملاحظات خاصة بالتوصيل..." /></label><label>بطاقة هدية / كود خصم <span>اختياري</span><input value={coupon} onChange={event => setCoupon(event.target.value.toUpperCase())} placeholder="أدخلي الكود" dir="ltr" /></label></div>
            </div>

            <div className="wahaj-checkout-card">
              <div className="wahaj-checkout-card__heading"><span className="wahaj-checkout-icon"><CreditCard size={19} /></span><div><span>اختاري ما يناسبكِ</span><h2>طريقة الدفع</h2></div><em>02</em></div>
              <fieldset className="wahaj-payment-list"><legend className="sr-only">طرق الدفع المتاحة</legend>{methods.map((method: any) => <label key={method.method} className={pay === method.method ? 'is-selected' : ''}><span className="wahaj-payment-radio"><input type="radio" name="payment" checked={pay === method.method} onChange={() => setPay(method.method)} /><i /></span><span className="wahaj-payment-icon">{getPaymentIcon(method.method)}</span><span className="wahaj-payment-copy"><b>{method.label}</b>{method.description && <small>{method.description}</small>}</span>{pay === method.method && <CheckCircle2 className="wahaj-payment-check" size={17} />}</label>)}</fieldset>
              {selected && (selected.instructions || selected.accountNumber) && <div className="wahaj-payment-instructions"><b>تعليمات الدفع الإلكتروني</b>{selected.accountName && <p>اسم الحساب: {selected.accountName}</p>}{selected.accountNumber && <p dir="ltr">{selected.accountNumber}</p>}{selected.instructions && <p>{selected.instructions}</p>}{selected.proofRequired && <div className="wahaj-proof-fields"><label>رقم عملية التحويل<input name="paymentReference" required dir="ltr" placeholder="رقم العملية أو المرجع" /></label><label className="wahaj-proof-upload">{proofFile ? <CheckCircle2 size={17} /> : <Upload size={17} />}<span>{proofFile ? proofFile.name : 'رفع صورة إيصال التحويل'}</span><small>JPG أو PNG — بحد أقصى 10 ميجابايت</small><input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} /></label>{uploadError && <p className="wahaj-upload-error">{uploadError}</p>}{proofPreview && <img src={proofPreview} alt="معاينة إيصال التحويل" className="wahaj-proof-preview" />}</div>}</div>}
              {msg && <p className="wahaj-checkout-error" role="alert">{msg}</p>}
            </div>
          </section>

          <aside className="wahaj-checkout-summary">
            <div className="wahaj-cart-summary__label">مراجعة نهائية</div><h2>ملخص طلبكِ</h2>
            <div className="wahaj-checkout-items">{c.map((item: any, index: number) => <div key={`${item.productId}:${item.variantId || index}`}><span><b>{item.quantity}×</b> {item.name}</span><strong>{(Number(item.price) * Number(item.quantity)).toLocaleString('ar-EG')} ج.م</strong></div>)}</div>
            <div className="wahaj-summary-lines"><div><span>الإجمالي المبدئي</span><b>{subtotal.toLocaleString('ar-EG')} ج.م</b></div>{offerDiscount > 0 && <div className="is-discount"><span>الخصم</span><b>−{offerDiscount.toLocaleString('ar-EG')} ج.م</b></div>}<div><span>الشحن</span><b>{pricing.freeShipping ? <span className="is-gold">مجانًا</span> : `${finalShipping.toLocaleString('ar-EG')} ج.م`}</b></div></div>
            {pricingMessage && <div className="wahaj-pricing-note">{pricingMessage}</div>}
            <div className="wahaj-summary-total"><span>الإجمالي النهائي {pricingLoading ? '…' : ''}</span><strong>{finalTotal.toLocaleString('ar-EG')} ج.م</strong></div>
            <button disabled={busy || !c.length || !methods.length} className="wahaj-commerce-primary wahaj-checkout-submit">{busy ? 'جارٍ إرسال الطلب...' : 'تأكيد وإتمام الطلب'}<CheckCircle2 size={18} /></button>
            <p className="wahaj-summary-note"><ShieldCheck size={14} /> بياناتكِ وطلبكِ محميان بعناية</p>
          </aside>
        </form>
      </div>
    </main>
  );
}

export default function Checkout() {
  return (
    <Suspense fallback={<main className="container py-12"><div className="bg-muted/10 border border-border/40 rounded-3xl p-8 text-center text-sm font-light">جاري تحميل صفحة الدفع...</div></main>}>
      <CheckoutContent />
    </Suspense>
  );
}
