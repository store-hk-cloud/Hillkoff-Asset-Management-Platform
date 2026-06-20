"use client";

async function mutateUser(
  url: string,
  method: "POST" | "PATCH",
  body?: unknown,
): Promise<{ id: string; version?: number }> {
  const csrfResponse = await fetch("/api/auth/csrf", {
    cache: "no-store",
    credentials: "same-origin",
  });
  if (!csrfResponse.ok) throw new Error("Unable to secure the request.");
  const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };

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
    data?: { id: string; version?: number };
    error?: { message?: string };
  };
  if (!response.ok || !payload.data) {
    throw new Error(payload.error?.message ?? "Unable to manage the user.");
  }
  return payload.data;
}

export function createManagedUser(body: unknown) {
  return mutateUser("/api/users", "POST", body);
}

export function updateManagedUser(userId: string, body: unknown) {
  return mutateUser(`/api/users/${userId}`, "PATCH", body);
}

export function sendManagedUserPasswordReset(userId: string) {
  return mutateUser(`/api/users/${userId}/password-reset`, "POST");
}
