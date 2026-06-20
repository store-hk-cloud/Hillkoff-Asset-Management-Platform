"use client";

import type { Asset } from "@/domain/entities/asset";
import type { AssetTransfer } from "@/domain/entities/asset-transfer";

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

export async function findWarehouseAsset(assetCode: string): Promise<Asset> {
  const response = await fetch(
    `/api/warehouse/assets/by-code/${encodeURIComponent(assetCode)}`,
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

export async function submitMovement(
  action: "receive" | "transfer" | "sale",
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

export async function submitTransferAction(
  transferId: string,
  action: "dispatch" | "receive" | "cancel" | "reject" | "return",
  input: unknown,
): Promise<AssetTransfer> {
  const csrfToken = await getCsrfToken();
  const response = await fetch(
    `/api/warehouse/transfers/${encodeURIComponent(transferId)}/${action}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
      credentials: "same-origin",
      body: JSON.stringify(input),
    },
  );
  const payload = (await response.json()) as {
    data?: AssetTransfer;
    error?: { message?: string };
  };
  if (!response.ok || !payload.data) {
    throw new Error(payload.error?.message ?? "Unable to update transfer.");
  }
  return payload.data;
}
