"use client";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, credentials: "same-origin" });
  const payload = (await response.json()) as {
    data?: T;
    error?: { message?: string };
  };
  if (!response.ok || payload.data === undefined) {
    throw new Error(payload.error?.message ?? "ดำเนินการใบงานช่างไม่สำเร็จ");
  }
  return payload.data;
}

async function csrfToken() {
  const response = await fetch("/api/auth/csrf", {
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("เริ่มต้นการเชื่อมต่อที่ปลอดภัยไม่สำเร็จ");
  }
  return ((await response.json()) as { csrfToken: string }).csrfToken;
}

export type ServiceJobListItem = {
  id: string;
  jobNumber: string;
  title: string;
  status: string;
  workType: string;
  fulfillmentMode: string;
  customerName: string;
  assetLabel: string;
  updatedAt: string;
};

export function listServiceJobs(query = "") {
  return request<readonly ServiceJobListItem[]>(
    `/api/service-jobs${query ? `?${query}` : ""}`,
  );
}

export function createServiceJob(payload: unknown) {
  return csrfToken().then((token) =>
    request<unknown>("/api/service-jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
      body: JSON.stringify(payload),
    }),
  );
}

export function getServiceJob(id: string) {
  return request<unknown>(`/api/service-jobs/${encodeURIComponent(id)}`);
}
