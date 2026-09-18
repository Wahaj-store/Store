"use client";
import { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, Save, X, Truck, ArrowLeft } from "lucide-react";

export default function AdminShippingPage() {
  const [zones, setZones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editFreeAbove, setEditFreeAbove] = useState("");
  
  // نموذج إضافة محافظة جديدة
  const [newGov, setNewGov] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newFreeAbove, setNewFreeAbove] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async () => {
    try {
      const res = await fetch("/api/admin/shipping");
      const data = await res.json();
      if (Array.isArray(data)) setZones(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/shipping/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price: editPrice, freeAbove: editFreeAbove }),
      });
      if (res.ok) {
        setEditingId(null);
        fetchZones();
      }
    } catch (err) {
      alert("حدث خطأ أثناء التحديث");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه المحافظة؟")) return;
    try {
      const res = await fetch(`/api/admin/shipping/${id}`, { method: "DELETE" });
      if (res.ok) fetchZones();
    } catch (err) {
      alert("حدث خطأ أثناء الحذف");
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/shipping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ governorate: newGov, price: newPrice, freeAbove: newFreeAbove }),
      });
      if (res.ok) {
        setNewGov("");
        setNewPrice("");
        setNewFreeAbove("");
        setShowAddModal(false);
        fetchZones();
      } else {
        alert("فشل الإضافة، تأكد أن المحافظة غير مسجلة مسبقاً");
      }
    } catch (err) {
      alert("حدث خطأ أثناء الإضافة");
    }
  };

  return (
    <div className="container py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <a href="/admin" className="text-sm muted flex items-center gap-1 mb-2">
            <ArrowLeft size={16} /> العودة للوحة التحكم
          </a>
          <h1 className="text-3xl font-semibold flex items-center gap-2">
            <Truck className="gold" /> إدارة الشحن والمحافظات
          </h1>
          <p className="muted text-sm mt-1">تحكم في أسعار الشحن لجميع المحافظات المصرية بسهولة.</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn btn-gold flex items-center gap-2">
          <Plus size={18} /> إضافة محافظة جديدة
        </button>
      </div>

      {loading ? (
        <p className="text-center py-12 muted">جاري تحميل بيانات الشحن...</p>
      ) : (
        <div className="lux-card overflow-hidden">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="border-b hairline bg-black/5">
                <th className="p-4">المحافظة</th>
                <th className="p-4">سعر الشحن (ج.م)</th>
                <th className="p-4">شحن مجاني عند (ج.م)</th>
                <th className="p-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {zones.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center p-8 muted">لا توجد محافظات مضافة حالياً.</td>
                </tr>
              ) : (
                zones.map((zone) => (
                  <tr key={zone.id} className="border-b hairline hover:bg-black/5 transition">
                    <td className="p-4 font-medium">{zone.governorate}</td>
                    <td className="p-4">
                      {editingId === zone.id ? (
                        <input
                          type="number"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          className="border rounded p-1 w-28 text-center"
                        />
                      ) : (
                        <span>{Number(zone.price).toLocaleString("ar-EG")} ج.م</span>
                      )}
                    </td>
                    <td className="p-4">
                      {editingId === zone.id ? (
                        <input
                          type="number"
                          value={editFreeAbove}
                          onChange={(e) => setEditFreeAbove(e.target.value)}
                          className="border rounded p-1 w-28 text-center"
                          placeholder="اختياري"
                        />
                      ) : (
                        <span>{zone.freeAbove ? `${Number(zone.freeAbove).toLocaleString("ar-EG")} ج.م` : "غير متوفر"}</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {editingId === zone.id ? (
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleSave(zone.id)} className="p-2 bg-green-600 text-white rounded" title="حفظ">
                            <Save size={16} />
                          </button>
                          <button onClick={() => setEditingId(null)} className="p-2 bg-gray-500 text-white rounded" title="إلغاء">
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setEditingId(zone.id);
                              setEditPrice(zone.price);
                              setEditFreeAbove(zone.freeAbove || "");
                            }}
                            className="p-2 border rounded hover:bg-black/10"
                            title="تعديل"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(zone.id)}
                            className="p-2 border rounded text-red-600 hover:bg-red-50"
                            title="حذف"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* مودال إضافة محافظة */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4">
          <div className="lux-card max-w-md w-full p-6">
            <h2 className="text-xl font-semibold mb-4">إضافة محافظة جديدة وسعر الشحن</h2>
            <form onSubmit={handleAdd} className="grid gap-4">
              <div>
                <label className="block text-sm mb-1">اسم المحافظة</label>
                <input
                  type="text"
                  required
                  value={newGov}
                  onChange={(e) => setNewGov(e.target.value)}
                  placeholder="مثال: القهيرة، الإسكندرية..."
                  className="w-full border rounded p-2"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">سعر الشحن (ج.م)</label>
                <input
                  type="number"
                  required
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  placeholder="مثال: 60"
                  className="w-full border rounded p-2"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">شحن مجاني عند طلب مبلغ (اختياري)</label>
                <input
                  type="number"
                  value={newFreeAbove}
                  onChange={(e) => setNewFreeAbove(e.target.value)}
                  placeholder="مثال: 1000"
                  className="w-full border rounded p-2"
                />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn">إلغاء</button>
                <button type="submit" className="btn btn-gold">حفظ وإضافة</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
