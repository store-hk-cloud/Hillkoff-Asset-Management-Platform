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

export const metadata = {
  title: "เข้าสู่ระบบ",
};

export default async function LoginPage() {
  const session = await getCurrentSession();

  if (session) {
    redirect(DEFAULT_AUTHENTICATED_ROUTE);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">เข้าสู่ระบบ</CardTitle>
        <CardDescription>
          ใช้บัญชีที่ผู้ดูแลระบบ Hillkoff จัดเตรียมให้
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<p className="text-sm">กำลังโหลด…</p>}>
          <LoginForm />
        </Suspense>
      </CardContent>
    </Card>
  );
}
