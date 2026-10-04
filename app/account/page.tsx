// مسار الملف: app/account/page.tsx

'use client';

import { useEffect, useState } from 'react';
import AccountAuthView from '@/components/account/AccountAuthView';
import AccountDashboardView from '@/components/account/AccountDashboardView';

export default function Account() {
  const [c, setC] = useState<any>(null);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState<any>({});
  const [msg, setMsg] = useState('');
  const [tab, setTab] = useState('profile');

  // حالات خاصة بنظام نسيت كلمة المرور عبر البريد (OTP)
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [forgotStep, setForgotStep] = useState<'email' | 'verify'>('email');
  const [resetData, setResetData] = useState({ email: '', otp: '', newPassword: '' });
  const [loading, setLoading] = useState(false);
  
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [recentProducts, setRecentProducts] = useState<any[]>([]);
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirmPass: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // حالة التحكم في إظهار وإخفاء نموذج إضافة العنوان داخل الصفحة
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressFormMsg, setAddressFormMsg] = useState('');
  const [sessionReady, setSessionReady] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);

  async function load() {
    try {
      const r = await fetch('/api/customer/me', { credentials: 'include', cache: 'no-store' });
      if (r.ok) setC(await r.json());
      else if (r.status === 401) setC(null);
    } catch (error) {
      console.error('Failed to load customer data', error);
    } finally {
      setSessionReady(true);
    }
  }

  useEffect(() => {
    load();
    const socialCode = new URLSearchParams(window.location.search).get('social');
    if (socialCode) {
      const socialMessages: Record<string, string> = {
        success: 'تم تسجيل الدخول بنجاح',
        google_unavailable: 'تسجيل الدخول عبر Google غير مفعّل حاليًا',
        facebook_unavailable: 'تسجيل الدخول عبر Facebook غير مفعّل حاليًا',
        cancelled: 'تم إلغاء تسجيل الدخول الاجتماعي',
        email_required: 'يجب أن يسمح الحساب الاجتماعي بمشاركة البريد الإلكتروني',
        invalid_state: 'انتهت جلسة تسجيل الدخول، حاولي مرة أخرى',
        rate_limited: 'محاولات كثيرة. حاولي مرة أخرى لاحقًا.',
        oauth_failed: 'تعذر إكمال تسجيل الدخول الاجتماعي حاليًا',
      };
      setMsg(socialMessages[socialCode] || 'تعذر إكمال تسجيل الدخول الاجتماعي');
      window.history.replaceState({}, '', window.location.pathname);
    }
    try {
      const recents = JSON.parse(localStorage.getItem('wahaj_recent_products') || '[]');
      setRecentProducts(Array.isArray(recents) ? recents : []);
    } catch {
      setRecentProducts([]);
    }
  }, []);

  async function auth() {
    setMsg('');
    setAuthBusy(true);
    try {
      const r = await fetch('/api/customer/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...form, action: mode, rememberMe }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return setMsg(j.error || 'تعذر تسجيل الدخول');
      setC(j);
      setTab('profile');
    } catch {
      setMsg('تعذر الاتصال بالخادم، يرجى المحاولة لاحقًا');
    } finally {
      setAuthBusy(false);
    }
  }

  async function logout() {
    setAuthBusy(true);
    try {
      await fetch('/api/customer/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'logout' }),
      });
      setC(null);
      setMode('login');
      setForm({});
    } finally {
      setAuthBusy(false);
    }
  }

  async function changePassword(values: { current: string; newPass: string }) {
    try {
      const response = await fetch('/api/customer/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword: values.current, newPassword: values.newPass }),
      });
      const data = await response.json().catch(() => ({}));
      return { ok: response.ok, error: data.error };
    } catch {
      return { ok: false, error: 'تعذر الاتصال بالخادم، يرجى المحاولة لاحقًا' };
    }
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetData.email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'حدث خطأ ما');
      
      setMsg('تم إرسال رمز التحقق إلى بريدك الإلكتروني بنجاح');
      setForgotStep('verify');
    } catch (err: any) {
      setMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resetData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تغيير كلمة المرور');

      setMsg('تم تغيير كلمة المرور بنجاح! جاري العودة لتسجيل الدخول...');
      setTimeout(() => {
        setIsForgotMode(false);
        setForgotStep('email');
        setMsg('');
      }, 2500);
    } catch (err: any) {
      setMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  const getTimelineDate = (statusName: string) => {
    if (!selectedOrder?.timeline) return null;
    const match = selectedOrder.timeline.find((t: any) => t.status === statusName);
    if (!match) return null;
    return new Date(match.createdAt).toLocaleString('ar-EG', { 
      dateStyle: 'medium', 
      timeStyle: 'short' 
    });
  };



  if (!sessionReady) {
    return <main className="wahaj-account-loading" dir="rtl"><span className="wahaj-account-loading__spinner" /><p>جاري تجهيز مساحة حسابك...</p></main>;
  }
  if (!c) {
    return (
      <AccountAuthView
        mode={mode}
        setMode={setMode}
        form={form}
        setForm={setForm}
        msg={msg}
        setMsg={setMsg}
        isForgotMode={isForgotMode}
        setIsForgotMode={setIsForgotMode}
        forgotStep={forgotStep}
        setForgotStep={setForgotStep}
        resetData={resetData}
        setResetData={setResetData}
        loading={loading || authBusy}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        showResetPassword={showResetPassword}
        setShowResetPassword={setShowResetPassword}
        rememberMe={rememberMe}
        setRememberMe={setRememberMe}
        auth={auth}
        handleSendOtp={handleSendOtp}
        handleResetPassword={handleResetPassword}
      />
    );
  }

  return (
    <AccountDashboardView
      c={c}
      setC={setC}
      logout={logout}
      tab={tab}
      setTab={setTab}
      setSelectedOrder={setSelectedOrder}
      selectedOrder={selectedOrder}
      recentProducts={recentProducts}
      passwords={passwords}
      setPasswords={setPasswords}
      msg={msg}
      setMsg={setMsg}
      showAddressForm={showAddressForm}
      setShowAddressForm={setShowAddressForm}
      addressFormMsg={addressFormMsg}
      setAddressFormMsg={setAddressFormMsg}
      load={load}
      getTimelineDate={getTimelineDate}
      changePassword={changePassword}
    />
  );
}
