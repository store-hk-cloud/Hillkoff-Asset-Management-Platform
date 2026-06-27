"use client";

import type { Asset } from "@/domain/entities/asset";

async function getCsrfToken(): Promise<string> {
  const response = await fetch("/api/auth/csrf", {
    cache: "no-store",
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error("Unable to initialize a secure request.");
  }

  return ((await response.json()) as { csrfToken: string }).csrfToken;
}

export async function findWarehouseAsset(reference: string): Promise<Asset> {
  const response = await fetch(
    `/api/warehouse/assets/by-code/${encodeURIComponent(reference)}`,
    { cache: "no-store", credentials: "same-origin" },
  );
  const payload = (await response.json()) as {
    data?: Asset;
    error?: { message?: string };
  };

  if (!response.ok || !payload.data) {
    throw new Error(payload.error?.message ?? "ไม่พบทรัพย์สิน");
  }

  return payload.data;
}

export async function bulkFindWarehouseAssets(
  codes: readonly string[],
): Promise<{
  found: Asset[];
  notFound: string[];
  errors: string[];
}> {
  const results = await Promise.allSettled(
    codes.map((code) => findWarehouseAsset(code.trim())),
  );
  const found: Asset[] = [];
  const notFound: string[] = [];
  const errors: string[] = [];

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      found.push(result.value);
    } else {
      const code = codes[index]?.trim() ?? "unknown";
      const msg = result.reason instanceof Error
        ? result.reason.message
        : "Not found";
      if (msg.includes("not found") || msg.includes("ไม่พบ")) {
        notFound.push(code);
      } else {
        errors.push(`${code}: ${msg}`);
      }
    }
  });

  return { found, notFound, errors };
}

export async function submitMovement(
  action: "transfer" | "sale",
  input: unknown,
): Promise<{ id: string; movementNumber: string }> {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`/api/warehouse/${action}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken,
    },
    credentials: "same-origin",
    body: JSON.stringify(input),
  });
  const payload = (await response.json()) as {
    data?: { id: string; movementNumber: string };
    error?: { message?: string };
  };

  if (!response.ok || !payload.data) {
    throw new Error(payload.error?.message ?? "ไม่สามารถทำรายการได้");
  }

  return payload.data;
}

export async function submitBulkTransfer(input: {
  assetCodes: readonly string[];
  destinationWarehouseId: string;
  referenceNumber: string | null;
  notes: string;
}): Promise<{
  total: number;
  succeeded: readonly { assetCode: string; movementNumber: string }[];
  failed: readonly { assetCode: string; error: string }[];
}> {
  const csrfToken = await getCsrfToken();
  const response = await fetch("/api/warehouse/transfer/bulk", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken,
    },
    credentials: "same-origin",
    body: JSON.stringify(input),
  });
  const payload = (await response.json()) as {
    data?: {
      total: number;
      succeeded: readonly { assetCode: string; movementNumber: string }[];
      failed: readonly { assetCode: string; error: string }[];
    };
    error?: { message?: string };
  };

  if (!response.ok || !payload.data) {
    throw new Error(payload.error?.message ?? "ไม่สามารถทำรายการได้");
  }

  return payload.data;
}
