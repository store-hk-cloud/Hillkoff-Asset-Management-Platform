import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { AppProviders } from "@/components/providers/app-providers";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Hillkoff Asset Management",
    template: "%s | Hillkoff Asset Management",
  },
  description: "Hillkoff enterprise asset lifecycle platform",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
