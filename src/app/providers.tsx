"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import { AppTopBar } from "@/components/AppTopBar";
import { useAuth } from "@/contexts/AuthContext";

function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return <div className={`min-h-screen ${user ? "pt-12 sm:pt-14" : ""}`}>{children}</div>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppTopBar />
      <AppLayout>{children}</AppLayout>
    </AuthProvider>
  );
}
