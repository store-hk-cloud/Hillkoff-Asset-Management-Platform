"use client";

import Link from "next/link";

import { useLanguage } from "@/components/providers/language-provider";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import type { UserProfile } from "@/domain/entities/user-profile";
import { Users } from "lucide-react";

export function UserList({ users }: { users: readonly UserProfile[] }) {
  const { locale, t } = useLanguage();

  if (users.length === 0) {
    return <EmptyState icon={Users} message={t("users.empty")} />;
  }

  return (
    <div className="grid gap-3">
      {users.map((user) => (
        <Link href={`/users/${user.uid}`} key={user.uid}>
          <Card className="hover:bg-accent/40 py-0 transition-colors">
            <CardContent className="grid gap-3 p-4 sm:grid-cols-[1fr_160px_140px] sm:items-center">
              <div>
                <p className="font-medium">{user.displayName}</p>
                <p className="text-muted-foreground text-sm">{user.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium">{user.role}</p>
                <p className="text-muted-foreground text-xs">
                  {user.warehouseId ??
                    user.customerId ??
                    (locale === "th" ? "ทุกขอบเขต" : "All scope")}
                </p>
              </div>
              <StatusBadge
                tone={
                  user.status === "active"
                    ? "success"
                    : user.status === "invited"
                      ? "warning"
                      : "neutral"
                }
              >
                {locale === "th"
                  ? user.status === "active"
                    ? "ใช้งานอยู่"
                    : user.status === "invited"
                      ? "รอตั้งรหัสผ่าน"
                      : "ปิดใช้งาน"
                  : user.status}
              </StatusBadge>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
