'use client';
import { useState, FormEvent } from 'react';
import { Search, Clock, CheckCircle2, Truck, PackageCheck, MapPin, Phone, Hash, ShieldCheck } from 'lucide-react';

interface TimelineItem {
  status: string;
  note?: string;
  createdAt: string;
}

interface OrderItem {
  id: string;
  name?: string;
  product?: { name: string };
  quantity: number;
  price: number;
  variantName?: string;
}

interface OrderData {
  number: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  total: number;
  shippingProvider?: string;
  trackingNumber?: string;
  shippingGovernorate?: string;
  shippingCity?: string;
  shippingAddress?: string;
  timeline?: TimelineItem[];
  items?: OrderItem[];
}

const statusSteps = [
  { key: 'NEW', label: 'تم استلام الطلب', icon: PackageCheck },
  { key: 'PROCESSING', label: 'قيد التجهيز', icon: Clock },
  { key: 'SHIPPED', label: 'تم الشحن', icon: Truck },
  { key: 'DELIVERED', label: 'تم التسليم', icon: CheckCircle2 },
];

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTrack = async (e: FormEvent) => {
    e.preventDefault();
    if (!orderNumber || !phone) {
      setError('يرجى إدخال رقم الطلب ورقم الهاتف المسجل');
      return;
    }

    setLoading(true);
    setError('');
    setOrder(null);

    try {
      const res = await fetch('/api/track-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber, phone }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'عذراً، لم يتم العثور على الطلب');
      } else {
        setOrder(data);
      }
    } catch (err) {
      setError('تعذر الاتصال بالخادم، يرجى المحاولة لاحقاً');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentStepIndex = (status: string) => {
    switch (status) {
      case 'NEW': return 0;
      case 'PROCESSING': return 1;
      case 'SHIPPED': return 2;
      case 'DELIVERED': return 3;
      case 'CANCELLED': return -1;
      default: return 0;
    }
  };

  const currentStep = order ? getCurrentStepIndex(order.status) : 0;

  return (
    <main className="container max-w-3xl py-12 px-4" dir="rtl">
      <div className="text-center space-y-2 mb-8">
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[var(--gold)]/15 text-[var(--gold)] border border-[var(--gold)]/30 inline-flex items-center gap-1">
          <ShieldCheck size={14} /> تتبع الشحنة المباشر
        </span>
        <h1 className="text-3xl font-bold tracking-tight">تابع خط سير طلبك</h1>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          أدخل رقم الطلب ورقم الهاتف المستخدم عند إتمام الشراء لمتابعة حالة التجهيز والشحن لحظة بلحظة.
        </p>
      </div>

      <form onSubmit={handleTrack} className="lux-card p-6 md:p-8 space-y-5 bg-card border border-border/60 rounded-3xl shadow-lg backdrop-blur-sm">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-muted-foreground">رقم الطلب</label>
            <div className="relative">
              <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted-foreground">
                <Hash size={16} />
              </span>
              <input
                type="text"
                placeholder="مثال: WAH-7B2A700C"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                className="w-full pr-10 pl-4 py-3 rounded-2xl bg-background border border-border text-sm focus:outline-none focus:border-[var(--gold)] transition"
                dir="ltr"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-muted-foreground">رقم الهاتف المسجل</label>
            <div className="relative">
              <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted-foreground">
                <Phone size={16} />
              </span>
              <input
                type="text"
                placeholder="01xxxxxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pr-10 pl-4 py-3 rounded-2xl bg-background border border-border text-sm focus:outline-none focus:border-[var(--gold)] transition"
                dir="ltr"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-sm text-red-500 font-medium text-center">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-2xl bg-[var(--gold)] text-black font-bold text-sm hover:opacity-95 transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-[var(--gold)]/10"
        >
          <Search size={18} />
          {loading ? 'جارٍ البحث في قاعدة البيانات...' : 'بحث وتتبع الطلب'}
        </button>
      </form>

      {order && (
        <div className="mt-8 space-y-6 animate-fade-in">
          <div className="lux-card p-6 md:p-8 space-y-6 bg-card border border-border/60 rounded-3xl shadow-lg">
            
            <div className="flex flex-wrap justify-between items-center gap-4 border-b border-border/40 pb-5">
              <div>
                <span className="text-xs text-muted-foreground">رقم الشحنة</span>
                <h2 className="text-2xl font-bold tracking-tight text-[var(--gold)]">#{order.number}</h2>
              </div>
              <span className={`px-4 py-1.5 rounded-full font-bold text-xs ${order.status === 'CANCELLED' ? 'bg-red-500/15 text-red-500 border border-red-500/30' : 'bg-[var(--gold)]/15 text-[var(--gold)] border border-[var(--gold)]/30'}`}>
                {order.status === 'CANCELLED' ? 'تم إلغاء الطلب' : `الحالة: ${order.status}`}
              </span>
            </div>

            {order.status !== 'CANCELLED' && (
              <div className="py-4">
                <h3 className="text-xs font-semibold text-muted-foreground mb-4">خط سير الطلب والمراحل</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {statusSteps.map((step, idx) => {
                    const IconComponent = step.icon;
                    const isCompleted = idx <= currentStep;
                    const isCurrent = idx === currentStep;
                    return (
                      <div 
                        key={step.key} 
                        className={`flex flex-col items-center text-center p-3 rounded-2xl border transition ${
                          isCurrent 
                            ? 'bg-[var(--gold)]/10 border-[var(--gold)] text-[var(--gold)]' 
                            : isCompleted 
                            ? 'bg-background border-border/80 text-foreground' 
                            : 'bg-background/40 border-border/30 text-muted-foreground opacity-50'
                        }`}
                      >
                        <div className={`p-2 rounded-xl mb-2 ${isCurrent ? 'bg-[var(--gold)] text-black' : isCompleted ? 'bg-[var(--gold)]/20 text-[var(--gold)]' : 'bg-muted text-muted-foreground'}`}>
                          <IconComponent size={18} />
                        </div>
                        <span className="text-xs font-bold">{step.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-background border border-border/60 text-sm">
              <div>
                <span className="text-muted-foreground block text-xs">طريقة الدفع</span>
                <span className="font-semibold">{order.paymentMethod}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">حالة الدفع</span>
                <span className="font-semibold">{order.paymentStatus}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">الإجمالي النهائي</span>
                <span className="font-semibold text-[var(--gold)]">{Number(order.total).toLocaleString('ar-EG')} ج.م</span>
              </div>
            </div>

            {order.shippingProvider && (
              <div className="p-4 rounded-2xl bg-[var(--gold)]/5 border border-[var(--gold)]/20 text-sm flex flex-wrap justify-between items-center gap-2">
                <div>
                  <span className="text-muted-foreground text-xs block">شركة الشحن المسؤولة</span>
                  <span className="font-bold">{order.shippingProvider}</span>
                </div>
                {order.trackingNumber && (
                  <div>
                    <span className="text-muted-foreground text-xs block">رقم التتبع</span>
                    <span className="font-mono font-bold text-[var(--gold)]" dir="ltr">{order.trackingNumber}</span>
                  </div>
                )}
              </div>
            )}

            {order.shippingGovernorate && (
              <div className="text-xs space-y-1 pt-2 border-t border-border/40">
                <span className="text-muted-foreground font-medium flex items-center gap-1">
                  <MapPin size={14} className="text-[var(--gold)]" /> عنوان الاستلام والشحن:
                </span>
                <p className="font-medium text-foreground">
                  {order.shippingGovernorate} - {order.shippingCity} - {order.shippingAddress}
                </p>
              </div>
            )}

            <div className="space-y-3 border-t border-border/40 pt-4">
              <h3 className="font-semibold flex items-center gap-2 text-sm">
                <Clock size={16} className="text-[var(--gold)]" /> سجل التحديثات التفصيلي
              </h3>
              
              <div className="space-y-2 max-h-56 overflow-y-auto text-xs pr-1">
                {order.timeline && order.timeline.length > 0 ? (
                  order.timeline.map((t, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-background border border-border/60">
                      <div>
                        <span className="font-bold text-[var(--gold)]">{t.status}</span>
                        {t.note && <span className="text-muted-foreground block mt-0.5">{t.note}</span>}
                      </div>
                      <span className="text-muted-foreground text-[11px]" dir="ltr">
                        {new Date(t.createdAt).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-3">لا توجد تحديثات مسجلة بعد.</p>
                )}
              </div>
            </div>

            <div className="border-t border-border/40 pt-4 space-y-3">
              <h3 className="font-semibold text-sm">محتويات الطلب</h3>
              <div className="space-y-2">
                {order.items?.map((item) => (
                  <div key={item.id} className="flex justify-between items-center text-sm p-3 rounded-2xl bg-background border border-border/60">
                    <div>
                      <span className="font-medium block">{item.product?.name || item.name}</span>
                      {item.variantName && <span className="text-xs text-muted-foreground">الخيار: {item.variantName}</span>}
                      <span className="text-xs text-muted-foreground block mt-0.5">الكمية: {item.quantity}</span>
                    </div>
                    <span className="font-semibold text-[var(--gold)]">{Number(item.price).toLocaleString('ar-EG')} ج.م</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}
    </main>
  );
}
