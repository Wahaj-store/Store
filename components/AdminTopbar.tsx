'use client';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpLeft, LogOut, ShieldCheck, Store } from 'lucide-react';

export default function AdminTopbar() {
  return (
    <header className="wahaj-admin-page__bar w-full">
      <Link href="/admin" className="wahaj-admin-page__identity">
        <span className="wahaj-admin-page__logo"><Image src="/images/wahaj.logo.png" alt="" fill sizes="42px" priority /></span>
        <span><b>وَهَج</b><small>لوحة تحكم المتجر</small></span>
      </Link>
      <div className="wahaj-admin-page__bar-actions">
        <span className="wahaj-admin-page__secure"><i /> النظام يعمل</span>
        <Link href="/" target="_blank" rel="noopener noreferrer" className="wahaj-admin-page__store-link"><Store size={16} /><span>زيارة المتجر</span><ArrowUpLeft size={13} /></Link>
        <form action="/api/admin/logout" method="post"><button type="submit" className="wahaj-admin-page__logout"><LogOut size={16} /><span>خروج</span></button></form>
      </div>
    </header>
  );
}
