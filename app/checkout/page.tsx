// مسار الملف: app/checkout/page.tsx

'use client';
import { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Truck, CreditCard, ShieldCheck, ArrowRight, Upload, Check, CheckCircle2, Sparkles, ShoppingBag } from 'lucide-react';
import { buildCheckoutPreviewPayload, checkoutTotalsMatch } from '@/lib/checkout-preview-client';
import { normalizeShippingLocation } from '@/lib/shipping-location';
import CheckoutProgress from '@/components/CheckoutProgress';

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

type CheckoutRequiredField = 'name' | 'phone' | 'governorate' | 'city' | 'address' | 'paymentReference';
type CheckoutFieldErrors = Partial<Record<CheckoutRequiredField, string>>;

const checkoutFieldLabels: Record<CheckoutRequiredField, string> = {
  name: 'الاسم بالكامل',
  phone: 'رقم الهاتف',
  governorate: 'المحافظة',
  city: 'المدينة / المركز',
  address: 'العنوان بالتفصيل',
  paymentReference: 'رقم عملية التحويل',
};

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
    <fieldset className="space-y-3 mb-6 p-5 rounded-3xl bg-muted/10 border border-border/40 shadow-2xs">
      <legend className="block text-xs font-semibold text-foreground tracking-wide">اختاري من عناوينك المحفوظة:</legend>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {addresses.map((addr) => (
          <button
            type="button"
            key={addr.id}
            onClick={() => onSelectAddress(addr)}
            aria-pressed={selectedId === addr.id}
            className={`w-full cursor-pointer rounded-2xl border p-4 text-right text-foreground transition-all text-xs focus-visible:outline-2 focus-visible:outline-(--gold) ${
              selectedId === addr.id
                ? 'border-(--gold) bg-(--gold)/10 ring-1 ring-(--gold)'
                : 'border-border/40 bg-(--bg) hover:border-(--gold)/40 shadow-2xs'
            }`}
          >
            <span className="mb-1.5 flex items-center justify-between">
              <span className="font-serif font-bold text-foreground">{addr.label || 'عنوان'}</span>
              {addr.isDefault && (
                <span className="rounded-full bg-(--gold) px-2 py-0.5 text-[10px] text-(--gold-contrast) font-bold">أساسي</span>
              )}
            </span>
            <span className="block text-muted-foreground font-light">{addr.name} - {addr.phone}</span>
            <span className="mt-1 block truncate text-[11px] text-muted-foreground font-light">{addr.governorate}، {addr.city} - {addr.address}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onSelectAddress(null)}
        className="text-xs text-(--gold) underline hover:opacity-80 mt-2 block font-medium"
      >
        أو إدخال عنوان جديد لهذا الطلب
      </button>
    </fieldset>
  );
}

function CheckoutContent() {
  const idempotencyKeyRef = useRef<string | null>(null);
  const [c, setC] = useState<any[]>([]);
  const [cartLoaded, setCartLoaded] = useState(false);
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
  const [pricingKey, setPricingKey] = useState('');
  const [pricingRefreshToken, setPricingRefreshToken] = useState(0);
  const [priceConfirmationRequired, setPriceConfirmationRequired] = useState(false);
  const [giftWrapAvailable, setGiftWrapAvailable] = useState(false);
  const [giftWrapFee, setGiftWrapFee] = useState(0);
  const [giftWrapSelected, setGiftWrapSelected] = useState(false);
  
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
  const [fieldErrors, setFieldErrors] = useState<CheckoutFieldErrors>({});
  const [paymentReference, setPaymentReference] = useState('');

  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string>('');
  const [uploadError, setUploadError] = useState('');

  const r = useRouter();
  const sp = useSearchParams();

  useEffect(() => {
    try {
      const storedCart = JSON.parse(localStorage.getItem('wahaj_cart') || '[]');
      setC(Array.isArray(storedCart) ? storedCart : []);
    } catch {
      setC([]);
    } finally {
      setCartLoaded(true);
    }
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
        setGiftWrapAvailable(data?.features?.gift_wrap === true);
        setGiftWrapFee(Math.max(0, Math.min(100000, Number(data?.settings?.gift_wrap_fee || 0))));
        try { setGiftWrapSelected(localStorage.getItem('wahaj_gift_wrap') === 'true'); } catch {}
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
        }
      })
      .catch(() => {});
  }, [sp]);

  const handleSelectAddress = (addr: Address | null) => {
    setFieldErrors({});
    setMsg('');
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
          z => normalizeShippingLocation(z.governorate) === normalizeShippingLocation(addr.governorate)
        );
        if (matchedZone) {
          setSelectedGovernorate(matchedZone.governorate);
        } else {
          setSelectedGovernorate(addr.governorate);
        }
      }
    } else {
      setSelectedAddressId(null);
      setSelectedGovernorate('');
      setFormData({ name: customer?.name || '', phone: customer?.phone || '', city: '', address: '', notes: '' });
    }
  };

  const clearFieldError = (field: CheckoutRequiredField) => {
    setFieldErrors(current => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(current => ({ ...current, [name]: value }));
    if (name in checkoutFieldLabels) clearFieldError(name as CheckoutRequiredField);
    setMsg('');
  };

  const selected = methods.find(x => x.method === pay);
  const normalizedGovernorate = normalizeShippingLocation(selectedGovernorate);
  const governorateZones = shippingZones.filter((zone: any) => normalizeShippingLocation(zone.governorate) === normalizedGovernorate);
  const governorateOptions = Array.from(new Map(
    shippingZones
      .map((zone: any) => String(zone?.governorate || '').trim())
      .filter(Boolean)
      .map((governorate: string) => [normalizeShippingLocation(governorate), governorate] as const),
  ).values());
  const governorateFallback = governorateZones.find((zone: any) => zone.city === null);
  const citySpecificZones = governorateZones.filter((zone: any) => zone.city !== null && normalizeShippingLocation(zone.city));
  const cityOptions = Array.from(new Map(
    citySpecificZones
      .map((zone: any) => String(zone.city || '').trim())
      .filter(Boolean)
      .map((city: string) => [normalizeShippingLocation(city), city] as const),
  ).values());
  const requiresCitySelection = cityOptions.length > 0 && !governorateFallback;
  const citySpecificZone = citySpecificZones.find((zone: any) => normalizeShippingLocation(zone.city) === normalizeShippingLocation(formData.city));
  const currentZone = citySpecificZone || governorateFallback;
  const shippingCost = currentZone ? Number(currentZone.price) : 0;
  const subtotal = Number(pricing.subtotal || 0);
  const offerDiscount = Number(pricing.discount || 0);
  const giftCardAmount = Number(pricing.giftCardAmount || 0);
  const finalShipping = Number(pricing.shipping ?? shippingCost);
  const finalTotal = Number(pricing.total || 0);
  const appliedGiftWrapFee = giftWrapAvailable && giftWrapSelected ? giftWrapFee : 0;
  const previewPayload = buildCheckoutPreviewPayload({
    items: c.map((item: any) => ({ productId: item.productId, variantId: item.variantId, quantity: item.quantity })),
    giftCardCode: coupon,
    governorate: selectedGovernorate.trim(),
    city: formData.city.trim(),
    phone: formData.phone.trim(),
    giftWrap: giftWrapAvailable && giftWrapSelected,
  });
  const previewKey = JSON.stringify(previewPayload);
  const hasCartItems = c.length > 0;
  const hasShippingLocation = Boolean(currentZone && formData.city.trim().length >= 2);
  const phoneDigits = formData.phone.replace(/\D/g, '');
  const deliveryFieldsComplete = formData.name.trim().length >= 2
    && phoneDigits.length >= 10
    && phoneDigits.length <= 15
    && Boolean(currentZone)
    && formData.city.trim().length >= 2
    && formData.address.trim().length >= 5;
  const paymentFieldsComplete = methods.length > 0
    && Boolean(pay)
    && (!selected?.proofRequired || (paymentReference.trim().length > 0 && Boolean(proofPreview)));
  const pricingIsCurrent = !pricingLoading && pricingKey === previewKey;
  const checkoutProgressStep = deliveryFieldsComplete && paymentFieldsComplete && pricingIsCurrent ? 3 : 2;

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      if (!hasCartItems) {
        setPricing({ subtotal: 0, discount: 0, shipping: 0, total: 0, freeShipping: false, appliedOffers: [] });
        setPricingKey(previewKey);
        setPricingLoading(false);
        setPricingMessage('');
        return;
      }
      if (!hasShippingLocation) {
        setPricingKey('');
        setPricingLoading(false);
        setPricingMessage('');
        return;
      }
      setPricingLoading(true);
      setPricingMessage('');
      try {
        const res = await fetch('/api/checkout/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: previewKey,
        });
        const data = await res.json();
        if (!cancelled && res.ok) {
          setPricing(data);
          setPricingKey(previewKey);
          setPricingMessage(data.giftCardError || data.couponError || '');
          setMsg('');
        } else if (!cancelled) {
          setPricingKey('');
          setPricingMessage(data.error || 'تعذر تحديث الأسعار');
        }
      } catch {
        if (!cancelled) {
          setPricingKey('');
          setPricingMessage('تعذر تحديث الأسعار حاليًا');
        }
      } finally {
        if (!cancelled) setPricingLoading(false);
      }
    }, 250);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [hasCartItems, hasShippingLocation, previewKey, pricingRefreshToken]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadError('');
    setMsg('');
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

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formElement = e.currentTarget;
    const submittedPaymentReference = paymentReference.trim();
    if (!c.length || !methods.length) return;

    const nextErrors: CheckoutFieldErrors = {};
    if (formData.name.trim().length < 2) nextErrors.name = 'أدخلي الاسم الكامل، بمقدار حرفين على الأقل.';
    const submittedPhoneDigits = formData.phone.replace(/\D/g, '');
    if (submittedPhoneDigits.length < 10 || submittedPhoneDigits.length > 15) {
      nextErrors.phone = 'تحققي من رقم الهاتف؛ أدخلي من 10 إلى 15 رقمًا صالحًا للتواصل.';
    }
    if (!governorateZones.length) {
      nextErrors.governorate = governorateOptions.length
        ? 'اختاري المحافظة من القائمة لتحديد منطقة الشحن.'
        : 'تعذر تحميل المحافظات المتاحة. أعيدي المحاولة قبل إتمام الطلب.';
    }
    if (formData.city.trim().length < 2) {
      nextErrors.city = requiresCitySelection ? 'اختاري المدينة من قائمة مناطق التوصيل المتاحة.' : 'أدخلي اسم المدينة أو المركز، بمقدار حرفين على الأقل.';
    } else if (governorateZones.length > 0 && !currentZone) {
      nextErrors.city = 'لا توجد منطقة شحن مفعّلة لهذه المدينة. اختاري مدينة متاحة أو راجعي العنوان المحفوظ.';
    }
    if (formData.address.trim().length < 5) nextErrors.address = 'أدخلي عنوانًا تفصيليًا لا يقل عن 5 أحرف.';
    if (selected?.proofRequired && !submittedPaymentReference) {
      nextErrors.paymentReference = 'أدخلي رقم العملية أو مرجع التحويل.';
    }

    const fieldOrder: CheckoutRequiredField[] = ['name', 'phone', 'governorate', 'city', 'address', 'paymentReference'];
    const firstInvalidField = fieldOrder.find(field => nextErrors[field]);
    if (firstInvalidField) {
      setFieldErrors(nextErrors);
      const missingFields = fieldOrder.filter(field => nextErrors[field]).map(field => checkoutFieldLabels[field]);
      setMsg(`لا يمكن إتمام الطلب قبل استكمال: ${missingFields.join('، ')}.`);
      window.requestAnimationFrame(() => {
        const firstInvalidControl = formElement.querySelector<HTMLElement>(`[name="${firstInvalidField}"]`);
        firstInvalidControl?.focus({ preventScroll: true });
        firstInvalidControl?.scrollIntoView({
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
          block: 'center',
        });
      });
      return;
    }

    if (pricingLoading || pricingKey !== previewKey) {
      setMsg('جارٍ تحديث ملخص الطلب. انتظري حتى تظهر الأسعار المحدثة قبل التأكيد.');
      return;
    }
    if (pricing.giftCardError) {
      setMsg(pricing.giftCardError);
      return;
    }
    
    if (selected?.proofRequired && !proofPreview) {
      setMsg('يرجى رفع صورة إيصال التحويل لإتمام الطلب');
      document.querySelector('.wahaj-proof-upload')?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'center',
      });
      return;
    }

    setBusy(true);
    setMsg('');
    if (customer?.phone && !formData.phone) {
      setMsg('تعذر قراءة رقم الهاتف الأساسي من حسابكِ');
      setBusy(false);
      return;
    }

    let verifiedPricing: any;
    try {
      const previewResponse = await fetch('/api/checkout/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: previewKey,
        cache: 'no-store',
      });
      const previewData = await previewResponse.json();
      if (!previewResponse.ok) throw new Error(previewData?.error || 'تعذر التحقق من الأسعار الحالية. حاولي مرة أخرى.');
      if (previewData?.giftCardError) {
        setPricing(previewData);
        setPricingKey(previewKey);
        setPricingMessage(previewData.giftCardError);
        setMsg(previewData.giftCardError);
        setBusy(false);
        return;
      }
      const verifiedTotal = Number(previewData?.total);
      if (!Number.isFinite(verifiedTotal)) throw new Error('تعذر التحقق من الإجمالي الحالي. حاولي مرة أخرى.');

      setPricing(previewData);
      setPricingKey(previewKey);
      setPricingMessage('');
      if (!checkoutTotalsMatch(finalTotal, verifiedTotal)) {
        setPriceConfirmationRequired(true);
        setMsg('تغيّر إجمالي الطلب بعد تحديث الأسعار. راجعي الإجمالي الجديد ثم اضغطي تأكيد مرة أخرى.');
        setBusy(false);
        return;
      }
      setPriceConfirmationRequired(false);
      verifiedPricing = previewData;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر التحقق من الأسعار الحالية. حاولي مرة أخرى.';
      setPricingKey('');
      setPricingMessage(message);
      setMsg(message);
      setBusy(false);
      return;
    }

    const checkoutIntent = {
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      governorate: selectedGovernorate.trim(),
      city: formData.city.trim(),
      address: formData.address.trim(),
      notes: formData.notes.trim(),
      giftWrap: giftWrapAvailable && giftWrapSelected,
      addressId: selectedAddressId || undefined,
      paymentMethod: pay,
      giftCardCode: coupon.trim() || undefined,
      paymentReference: submittedPaymentReference || undefined,
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
    const body = { ...checkoutIntent, idempotencyKey: stableIdempotencyKey, expectedTotal: Number(verifiedPricing.total) };

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
        localStorage.removeItem('wahaj_gift_wrap');
        window.dispatchEvent(new Event('wahaj-cart-change'));
        r.push(`/checkout/success?order=${j.orderNumber}`);
      } else {
        if (x.status === 409 && Number.isFinite(Number(j?.actualTotal))) {
          setPriceConfirmationRequired(true);
          setPricing((current: any) => ({ ...current, total: Number(j.actualTotal) }));
          setPricingMessage(j.error || 'تغيّر إجمالي الطلب؛ راجعي السعر المحدث قبل التأكيد.');
          setPricingRefreshToken(value => value + 1);
        }
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
      case 'cash_on_delivery':
        return <img src="/images/payment-cash-on-delivery.png" alt="الدفع عند الاستلام" className="wahaj-payment-logo wahaj-payment-logo--cod" />;
      case 'vodafone':
      case 'vodafone_cash':
      case 'vodafone cash':
        return <img src="/images/payment-wallet.png" alt="فودافون كاش" className="wahaj-payment-logo wahaj-payment-logo--wallet" />;
      case 'instapay':
        return <img src="/images/payment-instapay.png" alt="InstaPay" className="wahaj-payment-logo wahaj-payment-logo--instapay" />;
      default:
        return <CreditCard size={20} className="text-(--gold)" />;
    }
  };

  const goToCheckoutSection = (sectionId: string) => {
    const target = document.getElementById(sectionId);
    if (!target) return;
    target.focus({ preventScroll: true });
    target.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    });
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

        {cartLoaded && c.length > 0 && (
          <CheckoutProgress
            currentStep={checkoutProgressStep}
            completedSteps={checkoutProgressStep === 3 ? [1, 2] : [1]}
            stepTargets={{
              2: () => goToCheckoutSection('checkout-payment'),
              3: () => goToCheckoutSection('checkout-review'),
            }}
          />
        )}

        {!cartLoaded ? (
          <div className="wahaj-checkout-empty-card" role="status" aria-live="polite">جارٍ التحقق من سلتكِ...</div>
        ) : c.length === 0 ? (
          <div className="wahaj-cart-empty-card wahaj-checkout-empty-card">
            <div className="wahaj-cart-empty-card__icon"><ShoppingBag size={32} strokeWidth={1.5} /></div>
            <span className="wahaj-commerce-kicker"><Sparkles size={14} /> وَهَج للأناقة</span>
            <h2>لا توجد منتجات في سلتكِ</h2>
            <p>أضيفي اختياراتكِ إلى السلة أولًا، ثم سنجهز لكِ خطوات الشحن والدفع.</p>
            <Link href="/shop" className="wahaj-commerce-primary"><ArrowRight size={17} /> اكتشفي المجموعة</Link>
          </div>
        ) : <form noValidate onSubmit={submit} className="wahaj-checkout-layout">
          {msg && <p className="wahaj-checkout-error wahaj-checkout-form-alert" role="alert">{msg}</p>}
          <section className="wahaj-checkout-main">
            <div id="checkout-shipping" tabIndex={-1} className="wahaj-checkout-card">
              <div className="wahaj-checkout-card__heading"><span className="wahaj-checkout-icon"><Truck size={19} /></span><div><span>التوصيل إلى بابكِ</span><h2>بيانات الشحن</h2></div><em>01</em></div>
              {customer ? <div className="checkout-member-strip"><span>مرحبًا {customer.name || 'بكِ'}، سيتم استخدام بيانات حسابكِ بأمان.</span><Link href="/account">إدارة الحساب</Link></div> : addressAuthState === false ? <div className="checkout-login-hint">سجّلي الدخول لعرض عناوينكِ المحفوظة تلقائيًا، أو أكملي كزائرة بإدخال عنوان جديد.</div> : null}
              <AddressSelector selectedId={selectedAddressId} onSelectAddress={handleSelectAddress} onAuthState={setAddressAuthState} />
              <div className="wahaj-form-grid">
                <label htmlFor="checkout-name">الاسم بالكامل<input id="checkout-name" name="name" required autoComplete="name" maxLength={100} aria-invalid={fieldErrors.name ? 'true' : undefined} aria-describedby={fieldErrors.name ? 'checkout-name-error' : undefined} value={formData.name} onChange={handleInputChange} placeholder="أدخلي اسمكِ بالكامل" />{fieldErrors.name && <small id="checkout-name-error" className="wahaj-checkout-field-error">{fieldErrors.name}</small>}</label>
                <label htmlFor="checkout-phone">رقم الهاتف<input id="checkout-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required readOnly={Boolean(customer?.phone)} maxLength={30} aria-invalid={fieldErrors.phone ? 'true' : undefined} aria-describedby={fieldErrors.phone ? 'checkout-phone-error' : customer?.phone ? 'checkout-phone-hint' : undefined} value={formData.phone} onChange={handleInputChange} dir="ltr" placeholder="01xxxxxxxx" />{fieldErrors.phone && <small id="checkout-phone-error" className="wahaj-checkout-field-error">{fieldErrors.phone}</small>}{customer?.phone && <small id="checkout-phone-hint">رقم الهاتف الأساسي لحسابكِ — غير قابل للتعديل من صفحة الطلب.</small>}</label>
                <label htmlFor="checkout-governorate">المحافظة<select id="checkout-governorate" name="governorate" autoComplete="address-level1" required disabled={Boolean(selectedAddressId)} aria-invalid={fieldErrors.governorate ? 'true' : undefined} aria-describedby={fieldErrors.governorate ? 'checkout-governorate-error' : undefined} value={selectedGovernorate} onChange={event => { setSelectedGovernorate(event.target.value); setFormData(current => ({ ...current, city: '' })); clearFieldError('governorate'); clearFieldError('city'); setMsg(''); }}><option value="">اختاري المحافظة</option>{governorateOptions.map(governorate => <option key={governorate} value={governorate}>{governorate}</option>)}</select>{fieldErrors.governorate && <small id="checkout-governorate-error" className="wahaj-checkout-field-error">{fieldErrors.governorate}</small>}</label>
                <label htmlFor="checkout-city">المدينة / المركز{requiresCitySelection ? <select id="checkout-city" name="city" required disabled={Boolean(selectedAddressId)} autoComplete="address-level2" aria-invalid={fieldErrors.city ? 'true' : undefined} aria-describedby={`checkout-city-hint${fieldErrors.city ? ' checkout-city-error' : ''}`} value={formData.city} onChange={handleInputChange}><option value="">اختاري المدينة أو المركز</option>{cityOptions.map(city => <option key={normalizeShippingLocation(city)} value={city}>{city}</option>)}</select> : <><input id="checkout-city" name="city" required readOnly={Boolean(selectedAddressId)} autoComplete="address-level2" list={cityOptions.length ? 'checkout-city-options' : undefined} maxLength={100} aria-invalid={fieldErrors.city ? 'true' : undefined} aria-describedby={`checkout-city-hint${fieldErrors.city ? ' checkout-city-error' : ''}`} value={formData.city} onChange={handleInputChange} placeholder="مثال: المعادي" />{cityOptions.length > 0 && <datalist id="checkout-city-options">{cityOptions.map(city => <option key={normalizeShippingLocation(city)} value={city} />)}</datalist>}</>}<small id="checkout-city-hint" className="wahaj-checkout-field-hint">{requiresCitySelection ? 'اختاري مدينة مدرجة ضمن مناطق التوصيل.' : cityOptions.length > 0 ? 'اختاري مدينة مقترحة أو اكتبي مدينة أخرى ضمن المحافظة.' : 'اكتبي المدينة أو المركز بوضوح لسهولة تحديد العنوان.'}</small>{fieldErrors.city && <small id="checkout-city-error" className="wahaj-checkout-field-error">{fieldErrors.city}</small>}</label>
              </div>
              <label htmlFor="checkout-address" className="wahaj-form-field">العنوان بالتفصيل<textarea id="checkout-address" name="address" required readOnly={Boolean(selectedAddressId)} autoComplete="street-address" maxLength={500} rows={3} aria-invalid={fieldErrors.address ? 'true' : undefined} aria-describedby={`checkout-address-hint${fieldErrors.address ? ' checkout-address-error' : ''}`} value={formData.address} onChange={handleInputChange} placeholder="اسم الشارع، رقم العمارة، الدور أو الشقة..." /><small id="checkout-address-hint" className="wahaj-checkout-field-hint">اذكري الشارع ورقم العقار والدور أو الشقة لتقليل صعوبة الوصول.</small>{fieldErrors.address && <small id="checkout-address-error" className="wahaj-checkout-field-error">{fieldErrors.address}</small>}</label>
              {giftWrapAvailable && <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-(--gold)/30 bg-(--gold)/5 p-4"><input type="checkbox" checked={giftWrapSelected} onChange={event => { const enabled = event.target.checked; setGiftWrapSelected(enabled); try { localStorage.setItem('wahaj_gift_wrap', enabled ? 'true' : 'false'); } catch {} }} className="mt-1 accent-(--gold)" /><span className="grid gap-1"><b className="text-sm text-foreground">خدمة تغليف هدايا</b><small className="text-xs leading-5 text-muted-foreground">{giftWrapFee > 0 ? `رسوم الخدمة: ${giftWrapFee.toLocaleString('ar-EG')} ج.م` : 'خدمة تغليف هدايا مجانية'}. يمكنكِ اختيارها قبل تأكيد الطلب.</small></span></label>}
              <div className="wahaj-form-grid wahaj-form-grid--secondary"><label>ملاحظات التوصيل <span>اختياري</span><input name="notes" maxLength={1000} value={formData.notes} onChange={handleInputChange} placeholder="أي ملاحظات خاصة بالتوصيل..." /></label><label>بطاقة هدية <span>اختياري</span><input value={coupon} onChange={event => setCoupon(event.target.value.toUpperCase())} placeholder="أدخلي رمز البطاقة" dir="ltr" /></label></div>
            </div>

            <div id="checkout-payment" tabIndex={-1} className="wahaj-checkout-card">
              <div className="wahaj-checkout-card__heading"><span className="wahaj-checkout-icon"><CreditCard size={19} /></span><div><span>اختاري ما يناسبكِ</span><h2>طريقة الدفع</h2></div><em>02</em></div>
              <fieldset className="wahaj-payment-list"><legend className="sr-only">طرق الدفع المتاحة</legend>{methods.map((method: any) => <label key={method.method} className={pay === method.method ? 'is-selected' : ''}><span className="wahaj-payment-radio"><input type="radio" name="payment" checked={pay === method.method} onChange={() => { setPay(method.method); clearFieldError('paymentReference'); setMsg(''); }} /><i /></span><span className="wahaj-payment-icon">{getPaymentIcon(method.method)}</span><span className="wahaj-payment-copy"><b>{method.label}</b>{method.description && <small>{method.description}</small>}</span>{pay === method.method && <CheckCircle2 className="wahaj-payment-check" size={17} />}</label>)}</fieldset>
              {selected && (selected.instructions || selected.accountNumber || selected.proofRequired) && <div className="wahaj-payment-instructions"><b>تعليمات الدفع الإلكتروني</b>{selected.accountName && <p>اسم الحساب: {selected.accountName}</p>}{selected.accountNumber && <p dir="ltr">{selected.accountNumber}</p>}{selected.instructions && <p>{selected.instructions}</p>}{selected.proofRequired && <div className="wahaj-proof-fields"><label htmlFor="checkout-payment-reference">رقم عملية التحويل<input id="checkout-payment-reference" name="paymentReference" required maxLength={100} autoComplete="off" aria-invalid={fieldErrors.paymentReference ? 'true' : undefined} aria-describedby={fieldErrors.paymentReference ? 'checkout-payment-reference-error' : undefined} value={paymentReference} onChange={event => { setPaymentReference(event.target.value); clearFieldError('paymentReference'); setMsg(''); }} dir="ltr" placeholder="رقم العملية أو المرجع" />{fieldErrors.paymentReference && <small id="checkout-payment-reference-error" className="wahaj-checkout-field-error">{fieldErrors.paymentReference}</small>}</label><label className="wahaj-proof-upload">{proofFile ? <CheckCircle2 size={17} /> : <Upload size={17} />}<span>{proofFile ? proofFile.name : 'رفع صورة إيصال التحويل'}</span><small>JPG أو PNG — بحد أقصى 10 ميجابايت</small><input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} /></label>{uploadError && <p className="wahaj-upload-error">{uploadError}</p>}{proofPreview && <img src={proofPreview} alt="معاينة إيصال التحويل" className="wahaj-proof-preview" />}</div>}</div>}
            </div>
          </section>

          <aside id="checkout-review" tabIndex={-1} className="wahaj-checkout-summary">
            <div className="wahaj-cart-summary__label">مراجعة نهائية</div><h2>ملخص طلبكِ</h2>
            <div className="wahaj-checkout-items">{c.map((item: any, index: number) => <div key={`${item.productId}:${item.variantId || index}`}><span><b>{item.quantity}×</b> {item.name}</span><strong>{(Number(item.price) * Number(item.quantity)).toLocaleString('ar-EG')} ج.م</strong></div>)}</div>
            <div className="wahaj-summary-lines"><div><span>الإجمالي المبدئي</span><b>{pricingIsCurrent ? `${subtotal.toLocaleString('ar-EG')} ج.م` : '—'}</b></div>{pricingIsCurrent && offerDiscount > 0 && <div className="is-discount"><span>خصم العروض</span><b>−{offerDiscount.toLocaleString('ar-EG')} ج.م</b></div>}{pricingIsCurrent && giftCardAmount > 0 && <div className="is-discount"><span>خصم بطاقة الهدية</span><b>−{giftCardAmount.toLocaleString('ar-EG')} ج.م</b></div>}<div><span>الشحن</span><b>{!pricingIsCurrent ? '—' : pricing.freeShipping ? <span className="is-gold">مجانًا</span> : `${finalShipping.toLocaleString('ar-EG')} ج.م`}</b></div>{pricingIsCurrent && giftWrapAvailable && giftWrapSelected && <div><span>خدمة تغليف هدايا</span><b>{appliedGiftWrapFee.toLocaleString('ar-EG')} ج.م</b></div>}</div>
            {pricingIsCurrent && pricing.freeShipping && <p className="wahaj-shipping-free-note"><Check size={14} /> تم خصم رسوم الشحن من إجمالي طلبكِ؛ الشحن مجاني.</p>}
            {priceConfirmationRequired && <div className="wahaj-pricing-note" role="alert">تحدّث إجمالي الطلب. راجعي المبلغ المعروض ثم اضغطي «تأكيد وإتمام الطلب» مرة أخرى للموافقة عليه.</div>}
            {pricingKey !== previewKey && !pricingMessage && <div className="wahaj-pricing-note" role="status" aria-live="polite">{pricingLoading ? 'جارٍ تحديث إجمالي الطلب…' : !hasShippingLocation ? 'اختاري المحافظة وأدخلي المدينة لعرض تكلفة الشحن والإجمالي.' : 'ملخص الأسعار يحتاج إلى تحديث قبل التأكيد.'}</div>}
            {pricingMessage && <div className="wahaj-pricing-note" role={pricingKey ? 'status' : 'alert'}>{pricingMessage}{!pricingKey && <button type="button" className="ms-2 underline underline-offset-2" onClick={() => setPricingRefreshToken(value => value + 1)}>إعادة المحاولة</button>}</div>}
            <div className="wahaj-summary-total"><span>الإجمالي النهائي {pricingLoading ? '…' : ''}</span><strong>{pricingIsCurrent ? `${finalTotal.toLocaleString('ar-EG')} ج.م` : '—'}</strong></div>
            <button aria-label={busy ? 'جارٍ إرسال الطلب' : 'تأكيد وإتمام الطلب'} disabled={busy || !c.length || !methods.length || (deliveryFieldsComplete && !pricingIsCurrent) || (pricingIsCurrent && Boolean(pricing.giftCardError))} className="wahaj-commerce-primary wahaj-checkout-submit wahaj-mobile-conversion-cta">
              <span className="wahaj-checkout-submit__label">{busy ? 'جارٍ إرسال الطلب...' : 'تأكيد وإتمام الطلب'}</span>
              <span className="wahaj-checkout-submit__amount" aria-live="polite"><small>الإجمالي النهائي</small><strong>{pricingIsCurrent ? `${finalTotal.toLocaleString('ar-EG')} ج.م` : '—'}</strong></span>
              <CheckCircle2 size={18} aria-hidden="true" />
            </button>
            <p className="wahaj-summary-note"><ShieldCheck size={14} /> بياناتكِ وطلبكِ محميان بعناية</p>
          </aside>
        </form>}
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
