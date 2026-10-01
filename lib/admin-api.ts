export async function adminApi(url: string, method = 'GET', body?: any) {
  const r = await fetch(url, {
    method,
    credentials: 'same-origin',
    cache: 'no-store',
    headers: body instanceof FormData ? undefined : body ? { 'Content-Type': 'application/json' } : undefined,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (r.status === 401) {
      if (typeof window !== 'undefined') window.location.assign('/admin/login');
      throw new Error(j.error || 'انتهت جلسة الإدارة.');
    }
    if (r.status === 403) throw new Error(j.error || 'غير مصرح: لا تملك صلاحية الوصول إلى هذا القسم.');
    throw new Error(j.error || 'حدث خطأ في النظام');
  }
  return j;
}
