import type { ReactNode } from 'react';
import AdminRouteShell from '@/components/AdminRouteShell';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminRouteShell>{children}</AdminRouteShell>;
}
