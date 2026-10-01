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

  async function load() {
    try {
      const r = await fetch('/api/customer/me');
      if (r.ok) setC(await r.json());
    } catch (error) {
      console.error('Failed to load customer data', error);
    }
  }

  useEffect(() => {
    load();
    const recents = JSON.parse(localStorage.getItem('wahaj_recent_products') || '[]');
    setRecentProducts(recents);
  }, []);

  async function auth() {
    setMsg('');
    const r = await fetch('/api/customer/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, action: mode, rememberMe }),
    });
    const j = await r.json();
    if (!r.ok) return setMsg(j.error);
    load();
  }

  async function logout() {
    await fetch('/api/customer/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    });
    setC(null);
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
        loading={loading}
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
    />
  );
}
