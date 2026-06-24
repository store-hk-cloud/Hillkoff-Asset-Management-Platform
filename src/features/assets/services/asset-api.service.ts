"use client";

import type { AssetCatalog } from "@/domain/entities/asset";

async function getCsrfToken(): Promise<string> {
  const response = await fetch("/api/auth/csrf", {
    cache: "no-store",
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error("Unable to initialize a secure request.");
  }

  const body = (await response.json()) as { csrfToken: string };
  return body.csrfToken;
}

async function mutateAsset(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<{ id: string }> {
  const csrfToken = await getCsrfToken();
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken,
    },
    credentials: "same-origin",
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const payload = (await response.json()) as {
    data?: { id: string };
    error?: { message?: string };
  };

  if (!response.ok || !payload.data) {
    throw new Error(payload.error?.message ?? "Unable to save the asset.");
  }

  return payload.data;
}

export function createAsset(body: unknown) {
  return mutateAsset("/api/assets", "POST", body);
}

export function updateAsset(id: string, body: unknown) {
  return mutateAsset(`/api/assets/${id}`, "PATCH", body);
}

export function archiveAsset(id: string) {
  return mutateAsset(`/api/assets/${id}`, "DELETE");
}

export async function findAssetCatalog(
  assetCode: string,
): Promise<AssetCatalog | null> {
  const response = await fetch(
    `/api/assets/catalog/${encodeURIComponent(assetCode)}`,
    { cache: "no-store", credentials: "same-origin" },
  );
  const payload = (await response.json()) as {
    data?: AssetCatalog | null;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(
      payload.error?.message ?? "Unable to load asset master data.",
    );
  }

  return payload.data ?? null;
}
