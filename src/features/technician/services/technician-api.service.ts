"use client";

import type {
  TechnicianSummary,
  TechnicianWorkType,
} from "@/domain/entities/technician-work";

async function csrfToken(): Promise<string> {
  const response = await fetch("/api/auth/csrf", {
    cache: "no-store",
    credentials: "same-origin",
  });
  if (!response.ok) throw new Error("Unable to secure request.");
  return ((await response.json()) as { csrfToken: string }).csrfToken;
}

async function mutate(url: string, body: unknown) {
  const token = await csrfToken();
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as {
    data?: Record<string, unknown>;
    error?: { message?: string };
  };
  if (!response.ok || !payload.data) {
    throw new Error(payload.error?.message ?? "Technician action failed.");
  }
  return payload.data;
}

export async function listTechnicians(): Promise<readonly TechnicianSummary[]> {
  const response = await fetch("/api/technicians", {
    cache: "no-store",
    credentials: "same-origin",
  });
  const payload = (await response.json()) as {
    data?: readonly TechnicianSummary[];
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Unable to load technicians.");
  }
  return payload.data ?? [];
}

export function respondToTechnicianWork(
  type: TechnicianWorkType,
  workId: string,
  body: unknown,
) {
  return mutate(`/api/technician/work/${type}/${workId}/respond`, body);
}

export function assignTechnicianWork(
  type: TechnicianWorkType,
  workId: string,
  body: unknown,
) {
  return mutate(`/api/technician/work/${type}/${workId}/assign`, body);
}

export async function lookupTechnicianWork(reference: string) {
  const response = await fetch(
    `/api/technician/lookup/${encodeURIComponent(reference)}`,
    { cache: "no-store", credentials: "same-origin" },
  );
  const payload = (await response.json()) as {
    data?: {
      asset: {
        id: string;
        assetCode: string;
        name: string;
        serialNumber: string | null;
      } | null;
      work: readonly { href: string; title: string; number: string }[];
    };
    error?: { message?: string };
  };
  if (!response.ok || !payload.data) {
    throw new Error(payload.error?.message ?? "Unable to find assigned work.");
  }
  return payload.data;
}
