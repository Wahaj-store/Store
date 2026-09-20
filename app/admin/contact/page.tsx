'use client';
import { useState, useEffect } from 'react';
import { Mail, Phone, Trash2, Clock, User } from 'lucide-react';

export default function AdminContactMessagesPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/admin/contact');
      const data = await res.json();
      if (Array.isArray(data)) setMessages(data);
    } catch {
      console.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الرسالة؟')) return;

    try {
      const res = await fetch(`/api/admin/contact?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchMessages();
      } else {
        alert('فشل حذف الرسالة');
      }
    } catch {
      alert('خطأ في الاتصال');
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="text-[var(--gold)]" /> رسائل العملاء (تواصل معنا)
          </h1>
          <p className="text-xs text-gray-500 mt-1">عرض والاستعلام عن كافة الرسائل والاستفسارات الواردة من صفحة التواصل بالمتجر.</p>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="bg-white p-8 rounded-2xl border text-center text-gray-400">جارٍ تحميل الرسائل...</div>
        ) : messages.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border text-center text-gray-400">لا توجد أي رسائل واردة حتى الآن.</div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className="bg-white p-6 rounded-2xl border shadow-sm space-y-4 transition hover:border-[var(--gold)]">
              <div className="flex flex-wrap justify-between items-start gap-4 border-b pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-bold text-gray-900 text-base">
                    <User size={16} className="text-[var(--gold)]" /> {msg.name}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1 font-mono" dir="ltr">
                      <Phone size={14} className="text-gray-400" /> {msg.phone}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock size={14} className="text-gray-400" /> {new Date(msg.createdAt).toLocaleString('ar-EG')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs bg-[var(--gold)]/10 text-[var(--gold)] font-medium">
                    {msg.subject || 'استفسار عام'}
                  </span>
                  <button 
                    onClick={() => handleDelete(msg.id)} 
                    className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition"
                    title="حذف الرسالة"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="text-sm text-gray-700 bg-gray-50 p-4 rounded-xl leading-relaxed whitespace-pre-wrap">
                {msg.message}
              </div>

              <div className="flex justify-end">
                <a 
                  href={`https://wa.me/${msg.phone}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-medium flex items-center gap-2 hover:bg-green-700 transition"
                >
                  الرد عبر واتساب مباشرة
                </a>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
