import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { UserForm } from "@/features/users/components/user-form";
import { requireSession } from "@/lib/auth/dal";
import { getServerTranslator } from "@/lib/i18n/server";

export const metadata = { title: "เพิ่มผู้ใช้งาน" };

export default async function NewUserPage() {
  const { locale, t } = await getServerTranslator();
  const { profile } = await requireSession();
  if (profile.role !== "admin") notFound();

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        description={
          locale === "th"
            ? "สร้างผู้ใช้ใหม่และส่งลิงก์ตั้งรหัสผ่านอย่างปลอดภัย"
            : "Create a user and send a secure password setup link."
        }
        eyebrow={t("nav.users")}
        title={t("users.add")}
      />
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
