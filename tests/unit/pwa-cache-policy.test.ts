import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  isPrivateApplicationRequest,
  isStaticPwaAsset,
  PWA_CACHE_VERSION,
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

  it("stays in sync with the hand-copied config in public/sw.js", () => {
    // public/sw.js is a plain script (not TypeScript) and can't import
    // cache-policy.ts directly, so its CACHE_NAME/PRECACHE_URLS are a manual
    // copy. This guards against that copy silently drifting out of sync.
    const swSource = readFileSync(
      path.join(process.cwd(), "public", "sw.js"),
      "utf8",
    );

    expect(swSource).toContain(`const CACHE_NAME = "${PWA_CACHE_VERSION}"`);
    for (const url of PWA_PRECACHE_URLS) {
      expect(swSource).toContain(`"${url}"`);
    }
  });
});
