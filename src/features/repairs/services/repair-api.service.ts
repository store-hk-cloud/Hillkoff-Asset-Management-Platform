"use client";

async function csrf(): Promise<string> {
  const response = await fetch("/api/auth/csrf", {
    cache: "no-store",
    credentials: "same-origin",
  });
  if (!response.ok) throw new Error("Unable to initialize secure request.");
  return ((await response.json()) as { csrfToken: string }).csrfToken;
}

async function mutate(url: string, method: "POST" | "PATCH", body: unknown) {
  const token = await csrf();
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": token,
    },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as {
    data?: Record<string, unknown>;
    error?: { message?: string };
  };
  if (!response.ok || !payload.data) {
    throw new Error(payload.error?.message ?? "Repair operation failed.");
  }
  return payload.data;
}

export function createRepairTicket(input: unknown) {
  return mutate("/api/repairs", "POST", input);
}

export function assignRepairTicket(id: string, input: unknown) {
  return mutate(`/api/repairs/${id}/assign`, "POST", input);
}

export function updateRepairTicket(id: string, input: unknown) {
  return mutate(`/api/repairs/${id}`, "PATCH", input);
}
