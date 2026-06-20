import { describe, expect, it } from "vitest";

import {
  isPrivateApplicationRequest,
  isStaticPwaAsset,
  PWA_PRECACHE_URLS,
} from "@/lib/pwa/cache-policy";

describe("PWA cache policy", () => {
  it("never classifies authenticated or API routes as static assets", () => {
    for (const path of ["/api/assets", "/assets", "/users", "/profile"]) {
      expect(isPrivateApplicationRequest(path)).toBe(true);
      expect(isStaticPwaAsset(path)).toBe(false);
    }
  });

  it("only precaches the offline shell and public application assets", () => {
    expect(PWA_PRECACHE_URLS).toContain("/offline");
    expect(PWA_PRECACHE_URLS.some((path) => path.startsWith("/api/"))).toBe(
      false,
    );
    expect(PWA_PRECACHE_URLS.some((path) => path.startsWith("/assets"))).toBe(
      false,
    );
  });

  it("allows immutable Next.js assets and icons to use cache-first", () => {
    expect(isStaticPwaAsset("/_next/static/chunks/app.js")).toBe(true);
    expect(isStaticPwaAsset("/icons/icon-192.png")).toBe(true);
  });
});
