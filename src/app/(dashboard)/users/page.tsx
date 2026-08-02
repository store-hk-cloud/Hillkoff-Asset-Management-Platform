import Link from "next/link";
import { Plus } from "lucide-react";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { UserList } from "@/features/users/components/user-list";
import { requireSession } from "@/lib/auth/dal";
import { getServerTranslator } from "@/lib/i18n/server";
import { UserManagementService } from "@/services/user-management.service";

const service = new UserManagementService();
export const metadata = { title: "Users & Access" };

export default async function UsersPage() {
  const { locale, t } = await getServerTranslator();
  const { profile } = await requireSession();
  if (profile.role !== "admin") notFound();
  const users = await service.list(profile);

  return (
    <section className="space-y-6">
      <PageHeader
        action={
          <Button asChild>
            <Link href="/users/new">
              <Plus aria-hidden="true" className="size-4" />
              {t("users.add")}
            </Link>
          </Button>
        }
        description={
          locale === "th"
            ? "จัดการผู้ใช้งาน บทบาท และสิทธิ์การเข้าถึง"
            : "Manage users, roles, and access permissions."
        }
        eyebrow={t("nav.users")}
        title={t("users.title")}
      />
      <UserList users={users} />
    </section>
  );
}
