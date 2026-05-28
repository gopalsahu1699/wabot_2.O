"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { Sidebar } from "@/components/layout/Sidebar";
import { usePathname } from "next/navigation";

const PUBLIC_PATHS = ["/login", "/auth/callback"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!user || isPublic) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <main className="flex-1 overflow-y-auto pt-16 pb-4 px-4 sm:pt-6 sm:pb-6 sm:px-6 lg:pt-8 lg:pb-8 lg:px-8 md:pt-4">
          {children}
        </main>
      </div>
    </div>
  );
}
