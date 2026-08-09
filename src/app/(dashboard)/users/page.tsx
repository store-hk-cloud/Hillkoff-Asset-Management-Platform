import Link from "next/link";
import { Plus } from "lucide-react";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { UserList } from "@/features/users/components/user-list";
import { UserSearchForm } from "@/features/users/components/user-search-form";
import { userSearchSchema } from "@/features/users/schemas/user.schema";
import { requireSession } from "@/lib/auth/dal";
import { getServerTranslator } from "@/lib/i18n/server";
import { UserManagementService } from "@/services/user-management.service";

const service = new UserManagementService();
export const metadata = { title: "Users & Access" };

type Props = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function UsersPage({ searchParams }: Props) {
  const { locale, t } = await getServerTranslator();
  const { profile } = await requireSession();
  if (profile.role !== "admin") notFound();
  const params = await searchParams;
  const criteria = userSearchSchema.parse({
    role: params.role,
    status: params.status,
    query: params.query,
    limit: params.limit,
  });

  const allUsers = await service.list(profile);
  const normalizedQuery = criteria.query.toLocaleLowerCase(
    locale === "th" ? "th-TH" : "en-US",
  );
  const filtered = allUsers.filter((user) => {
    if (criteria.role !== "all" && user.role !== criteria.role) return false;
    if (criteria.status !== "all" && user.status !== criteria.status) {
      return false;
    }
    if (!normalizedQuery) return true;
    return (
      user.displayName.toLocaleLowerCase().includes(normalizedQuery) ||
      user.email.toLocaleLowerCase().includes(normalizedQuery)
    );
  });
  const users = filtered.slice(0, criteria.limit);

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
      <UserSearchForm
        query={criteria.query}
        role={criteria.role}
        status={criteria.status}
      />
      {users.length > 0 ? (
        <p className="text-muted-foreground text-sm">
          {locale === "th"
            ? `แสดง ${users.length} จาก ${filtered.length} รายการ`
            : `Showing ${users.length} of ${filtered.length} results`}
        </p>
      ) : null}
      <UserList
        emptyMessage={
          filtered.length === 0 && allUsers.length > 0
            ? locale === "th"
              ? "ไม่พบผู้ใช้งานตามตัวกรอง"
              : "No users match these filters."
            : undefined
        }
        users={users}
      />
      {filtered.length > criteria.limit && criteria.limit < 150 ? (
        <div className="flex justify-center">
          <Link
            className="ghost-button rounded-md border px-4 py-2 text-sm"
            href={`/users?role=${criteria.role}&status=${criteria.status}&query=${encodeURIComponent(criteria.query)}&limit=${criteria.limit + 50}`}
          >
            {locale === "th" ? "โหลดเพิ่ม" : "Load more"}
          </Link>
        </div>
      ) : filtered.length > criteria.limit ? (
        <p className="text-muted-foreground text-center text-xs">
          {locale === "th"
            ? `แสดงผลสูงสุด ${criteria.limit} รายการแล้ว ลองปรับตัวกรองให้แคบลง`
            : `Showing the first ${criteria.limit} results — narrow your filters to see more.`}
        </p>
      ) : null}
    </section>
  );
}
