"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import { AppTopBar } from "@/components/AppTopBar";
import { useAuth } from "@/contexts/AuthContext";
import { usePathname } from "next/navigation";

function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const hideGlobalTopBar = pathname === "/";
  return <div className={`min-h-screen ${user && !hideGlobalTopBar ? "pt-12 sm:pt-14" : ""}`}>{children}</div>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideGlobalTopBar = pathname === "/";
  return (
    <AuthProvider>
      {!hideGlobalTopBar && <AppTopBar />}
      <AppLayout>{children}</AppLayout>
    </AuthProvider>
  );
}
