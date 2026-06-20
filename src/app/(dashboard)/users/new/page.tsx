import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UserForm } from "@/features/users/components/user-form";
import { requireSession } from "@/lib/auth/dal";
import { getServerTranslator } from "@/lib/i18n/server";

export const metadata = { title: "เพิ่มผู้ใช้งาน" };

export default async function NewUserPage() {
  const { locale, t } = await getServerTranslator();
  const { profile } = await requireSession();
  if (profile.role !== "admin") notFound();

  return (
    <section className="mx-auto max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>{t("users.add")}</CardTitle>
          <CardDescription>
            {locale === "th"
              ? "ระบบจะส่งอีเมลให้ผู้ใช้ตั้งรหัสผ่านด้วยตนเอง"
              : "The system will email the user a secure password setup link."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserForm currentUserId={profile.uid} />
        </CardContent>
      </Card>
    </section>
  );
}
