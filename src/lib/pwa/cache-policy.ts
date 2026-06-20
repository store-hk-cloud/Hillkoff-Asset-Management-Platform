export const PWA_CACHE_VERSION = "hillkoff-pwa-v1";
export const PWA_OFFLINE_URL = "/offline";

export const PWA_PRECACHE_URLS = [
  PWA_OFFLINE_URL,
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
  "/icons/apple-touch-icon.png",
] as const;

export function isPrivateApplicationRequest(pathname: string): boolean {
  return (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/assets") ||
    pathname.startsWith("/warehouse") ||
    pathname.startsWith("/installations") ||
    pathname.startsWith("/repairs") ||
    pathname.startsWith("/pm") ||
    pathname.startsWith("/inventory") ||
    pathname.startsWith("/notifications") ||
    pathname.startsWith("/users")
  );
}

export function isStaticPwaAsset(pathname: string): boolean {
  return (
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/icons/") ||
    pathname === "/manifest.webmanifest"
  );
}
