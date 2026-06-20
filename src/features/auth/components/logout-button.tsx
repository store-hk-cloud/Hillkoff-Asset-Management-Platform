"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/providers/language-provider";
import { logout } from "@/features/auth/services/auth.service";
import { LOGIN_ROUTE } from "@/lib/constants";

export function LogoutButton() {
  const { t } = useLanguage();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleLogout() {
    setSubmitting(true);
    await logout();
    router.replace(LOGIN_ROUTE);
    router.refresh();
  }

  return (
    <Button
      disabled={submitting}
      onClick={handleLogout}
      size="sm"
      type="button"
      variant="ghost"
    >
      <LogOut aria-hidden="true" className="size-4" />
      <span className="hidden sm:inline">{t("action.logout")}</span>
    </Button>
  );
}
