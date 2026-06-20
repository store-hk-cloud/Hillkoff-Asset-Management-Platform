import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import Script from "next/script";

import { AppProviders } from "@/components/providers/app-providers";
import { getServerLocale } from "@/lib/i18n/server";

import "./globals.css";

export const metadata: Metadata = {
  applicationName: "Hillkoff Asset Management",
  title: {
    default: "Hillkoff Asset Management",
    template: "%s | Hillkoff Asset Management",
  },
  description: "Hillkoff enterprise asset lifecycle platform",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Hillkoff Assets",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#163b2a",
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default async function RootLayout({ children }: RootLayoutProps) {
  const locale = await getServerLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <Script id="hillkoff-theme" strategy="beforeInteractive">
          {`try{var t=localStorage.getItem("hillkoff_theme");var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);document.documentElement.style.colorScheme=d?"dark":"light"}catch(e){}`}
        </Script>
        <AppProviders locale={locale}>{children}</AppProviders>
      </body>
    </html>
  );
}
