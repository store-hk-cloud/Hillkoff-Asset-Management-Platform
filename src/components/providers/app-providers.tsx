"use client";

import type { ReactNode } from "react";

import { NetworkStatus } from "@/components/pwa/network-status";
import { PwaProvider } from "@/components/pwa/pwa-provider";
import { AuthProvider } from "@/features/auth/providers/auth-provider";

type AppProvidersProps = Readonly<{
  children: ReactNode;
}>;

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <PwaProvider>
      <AuthProvider>{children}</AuthProvider>
      <NetworkStatus />
    </PwaProvider>
  );
}
