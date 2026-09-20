'use client';
import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, CheckCircle, XCircle, HelpCircle } from 'lucide-react';

export default function AdminFaqPage() {
  const [faqs, setFaqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    id: '',
    question: '',
    answer: '',
    category: 'general',
    displayOrder: 0,
    published: true,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');

  const fetchFaqs = async () => {
    try {
      const res = await fetch('/api/admin/faq');
      const data = await res.json();
      if (Array.isArray(data)) setFaqs(data);
    } catch {
      setError('تعذر جلب الأسئلة');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaqs();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const url = isEditing ? `/api/admin/faq/${formData.id}` : '/api/admin/faq';
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setFormData({ id: '', question: '', answer: '', category: 'general', displayOrder: 0, published: true });
        setIsEditing(false);
        fetchFaqs();
      } else {
        const j = await res.json();
        setError(j.error || 'حدث خطأ أثناء الحفظ');
      }
    } catch {
      setError('تعذر الاتصال بالخادم');
    }
  };

  const handleEdit = (faq: any) => {
    setFormData(faq);
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا السؤال؟')) return;

    try {
      const res = await fetch(`/api/admin/faq/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchFaqs();
      } else {
        alert('فشل الحذف');
      }
    } catch {
      alert('خطأ في الاتصال');
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <HelpCircle className="text-[var(--gold)]" /> إدارة الأسئلة الشائعة (FAQ)
          </h1>
          <p className="text-xs text-gray-500 mt-1">إضافة وتعديل الأسئلة التي تظهر للعملاء في صفحة الأسئلة الشائعة.</p>
        </div>
      </div>

      {/* نموذج الإضافة والتعديل */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
        <h2 className="font-semibold text-lg">{isEditing ? 'تعديل السؤال' : 'إضافة سؤال جديد'}</h2>
        
        {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-xs font-medium">السؤال
            <input 
              required 
              value={formData.question} 
              onChange={e => setFormData({ ...formData, question: e.target.value })}
              className="input mt-1 w-full p-2 border rounded-xl text-sm" 
              placeholder="مثال: ما هي طرق الدفع المتاحة؟" 
            />
          </label>

          <label className="block text-xs font-medium">القسم
            <select 
              value={formData.category} 
              onChange={e => setFormData({ ...formData, category: e.target.value })}
              className="input mt-1 w-full p-2 border rounded-xl text-sm bg-white"
            >
              <option value="general">عام</option>
              <option value="shipping">الشحن والتوصيل</option>
              <option value="payment">الدفع</option>
              <option value="returns">الاستبدال والاسترجاع</option>
              <option value="products">المنتجات</option>
            </select>
          </label>
        </div>

        <label className="block text-xs font-medium">الإجابة
          <textarea 
            required 
            rows={3}
            value={formData.answer} 
            onChange={e => setFormData({ ...formData, answer: e.target.value })}
            className="input mt-1 w-full p-2 border rounded-xl text-sm" 
            placeholder="اكتب الإجابة المفصلة هنا..." 
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2 items-center">
          <label className="block text-xs font-medium">ترتيب العرض (الرقم الأصغر يظهر أولاً)
            <input 
              type="number" 
              value={formData.displayOrder} 
              onChange={e => setFormData({ ...formData, displayOrder: Number(e.target.value) })}
              className="input mt-1 w-full p-2 border rounded-xl text-sm" 
            />
          </label>

          <div className="flex items-center gap-3 pt-4">
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
              <input 
                type="checkbox" 
                checked={formData.published} 
                onChange={e => setFormData({ ...formData, published: e.target.checked })}
                className="w-4 h-4 accent-[var(--gold)]"
              />
              منشور في المتجر
            </label>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="px-6 py-2.5 bg-[var(--gold)] text-white rounded-xl text-sm font-medium">
            {isEditing ? 'حفظ التعديلات' : 'إضافة السؤال'}
          </button>
          {isEditing && (
            <button 
              type="button" 
              onClick={() => { setIsEditing(false); setFormData({ id: '', question: '', answer: '', category: 'general', displayOrder: 0, published: true }); }}
              className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium"
            >
              إلغاء التعديل
            </button>
          )}
        </div>
      </form>

      {/* جدول عرض الأسئلة */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <table className="w-full text-start border-collapse">
          <thead>
            <tr className="border-b bg-gray-50 text-xs text-gray-500 text-start">
              <th className="p-4">السؤال وال قسم</th>
              <th className="p-4">الترتيب</th>
              <th className="p-4">الحالة</th>
              <th className="p-4 text-end">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm">
            {loading ? (
              <tr><td colSpan={4} className="p-8 text-center text-gray-400">جارٍ التحميل...</td></tr>
            ) : faqs.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-gray-400">لا توجد أي أسئلة مضافة حتى الآن.</td></tr>
            ) : (
              faqs.map(faq => (
                <tr key={faq.id} className="hover:bg-gray-50/50 transition">
                  <td className="p-4 space-y-1">
                    <p className="font-semibold text-gray-900">{faq.question}</p>
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] bg-gray-100 text-gray-600">
                      {faq.category}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-gray-600">{faq.displayOrder}</td>
                  <td className="p-4">
                    {faq.published ? (
                      <span className="flex items-center gap-1 text-green-600 text-xs font-medium"><CheckCircle size={14} /> منشور</span>
                    ) : (
                      <span className="flex items-center gap-1 text-gray-400 text-xs font-medium"><XCircle size={14} /> مخفي</span>
                    )}
                  </td>
                  <td className="p-4 text-end space-x-2 space-x-reverse">
                    <button onClick={() => handleEdit(faq)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handleDelete(faq.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
      }
