"use client";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { ReactNode } from "react";
import SiteChrome from "@/components/SiteChrome";
const SiteFooter = dynamic(() => import("@/components/SiteFooter"), { ssr: true });

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
