"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/components/providers/language-provider";
import { loginSchema } from "@/features/auth/schemas/auth.schema";
import { login } from "@/features/auth/services/auth.service";
import { DEFAULT_AUTHENTICATED_ROUTE } from "@/lib/constants";

function getSafeNextPath(value: string | null): string {
  return value?.startsWith("/") && !value.startsWith("//")
    ? value
    : DEFAULT_AUTHENTICATED_ROUTE;
}

export function LoginForm() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const result = loginSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
      return;
    }

    setSubmitting(true);

    try {
      await login(result.data);
      router.replace(getSafeNextPath(searchParams.get("next")));
      router.refresh();
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "ไม่สามารถเข้าสู่ระบบได้",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="email">{t("field.email")}</Label>
        <Input
          autoComplete="email"
          id="email"
          name="email"
          placeholder="name@hillkoff.com"
          required
          type="email"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">{t("field.password")}</Label>
        <Input
          autoComplete="current-password"
          id="password"
          name="password"
          required
          type="password"
        />
      </div>

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <Button className="w-full" disabled={submitting} type="submit">
        {submitting ? t("status.loading") : t("action.login")}
      </Button>
    </form>
  );
}
