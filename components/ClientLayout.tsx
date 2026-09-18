"use client";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import SiteChrome from "@/components/SiteChrome";
import SiteFooter from "@/components/SiteFooter";

export default function ClientLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <SiteChrome />
      {children}
      <SiteFooter />
    </>
  );
}
