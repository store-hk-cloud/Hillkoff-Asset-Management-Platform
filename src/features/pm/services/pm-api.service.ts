"use client";

async function csrf(): Promise<string> {
  const response = await fetch("/api/auth/csrf", {
    cache: "no-store",
    credentials: "same-origin",
  });
  if (!response.ok) throw new Error("Unable to initialize secure request.");
  return ((await response.json()) as { csrfToken: string }).csrfToken;
}

async function post(url: string, body: unknown) {
  const token = await csrf();
  const response = await fetch(url, {
    method: "POST",
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
    throw new Error(payload.error?.message ?? "PM operation failed.");
  }
  return payload.data;
}

export function schedulePm(input: unknown) {
  return post("/api/pm", input);
}

export function completePm(id: string, input: unknown) {
  return post(`/api/pm/${id}/complete`, input);
}
