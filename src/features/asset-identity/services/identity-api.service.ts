"use client";

async function getCsrfToken(): Promise<string> {
  const response = await fetch("/api/auth/csrf", {
    cache: "no-store",
    credentials: "same-origin",
  });
  if (!response.ok) throw new Error("Unable to initialize secure request.");
  return ((await response.json()) as { csrfToken: string }).csrfToken;
}

async function postIdentity(
  url: string,
  body: unknown,
): Promise<{ status: string }> {
  const csrfToken = await getCsrfToken();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken,
    },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as {
    data?: { status: string };
    error?: { message?: string };
  };

  if (!response.ok || !payload.data) {
    throw new Error(payload.error?.message ?? "NFC operation failed.");
  }

  return payload.data;
}

export function registerNfc(assetId: string, tagType: string) {
  return postIdentity(`/api/assets/${assetId}/nfc/register`, { tagType });
}

export function verifyNfc(
  assetId: string,
  observedUrl: string,
  tagSerialNumber: string | null,
) {
  return postIdentity(`/api/assets/${assetId}/nfc/verify`, {
    observedUrl,
    tagSerialNumber,
  });
}
