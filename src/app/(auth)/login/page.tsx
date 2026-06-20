import { Suspense } from "react";
import { redirect } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "@/features/auth/components/login-form";
import { getCurrentSession } from "@/lib/auth/dal";
import { DEFAULT_AUTHENTICATED_ROUTE } from "@/lib/constants";
import { getServerTranslator } from "@/lib/i18n/server";

export const metadata = {
  title: "เข้าสู่ระบบ",
};

export default async function LoginPage() {
  const session = await getCurrentSession();
  const { t } = await getServerTranslator();

  if (session) {
    redirect(DEFAULT_AUTHENTICATED_ROUTE);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">{t("login.title")}</CardTitle>
        <CardDescription>{t("login.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<p className="text-sm">{t("status.loading")}</p>}>
          <LoginForm />
        </Suspense>
      </CardContent>
    </Card>
  );
}
