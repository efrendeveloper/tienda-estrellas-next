"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import { AppTopBar } from "@/components/AppTopBar";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppTopBar />
      <div className="min-h-screen pt-12 sm:pt-14">{children}</div>
    </AuthProvider>
  );
}
