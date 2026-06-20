import Link from "next/link";
import { Plus } from "lucide-react";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { UserList } from "@/features/users/components/user-list";
import { requireSession } from "@/lib/auth/dal";
import { UserManagementService } from "@/services/user-management.service";

const service = new UserManagementService();
export const metadata = { title: "Users & Access" };

export default async function UsersPage() {
  const { profile } = await requireSession();
  if (profile.role !== "admin") notFound();
  const users = await service.list(profile);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-muted-foreground text-sm">Administration</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            ผู้ใช้งานและสิทธิ์
          </h1>
        </div>
        <Button asChild>
          <Link href="/users/new">
            <Plus aria-hidden="true" className="size-4" />
            เพิ่มผู้ใช้งาน
          </Link>
        </Button>
      </div>
      <UserList users={users} />
    </section>
  );
}
