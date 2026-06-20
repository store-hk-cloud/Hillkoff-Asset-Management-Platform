"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/providers/language-provider";

export function RedeemInvitationButton({ token }: { token: string }) {
  const { locale, t } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function redeem() {
    setBusy(true);
    setError(null);
    try {
      const csrfResponse = await fetch("/api/auth/csrf", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const { csrfToken } = (await csrfResponse.json()) as {
        csrfToken: string;
      };
      const response = await fetch("/api/auth/invitations/redeem", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        credentials: "same-origin",
        body: JSON.stringify({ token }),
      });
      const payload = (await response.json()) as {
        data?: { redirectUrl: string };
        error?: { message?: string };
      };
      if (!response.ok || !payload.data) {
        throw new Error(
          payload.error?.message ?? "Unable to open password setup.",
        );
      }
      window.location.assign(payload.data.redirectUrl);
    } catch (redeemError) {
      setError(
        redeemError instanceof Error
          ? redeemError.message
          : "Unable to open password setup.",
      );
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <Button className="h-12 w-full" disabled={busy} onClick={redeem}>
        {busy
          ? t("status.loading")
          : locale === "th"
            ? "ดำเนินการตั้งรหัสผ่าน"
            : "Continue to password setup"}
      </Button>
    </div>
  );
}
