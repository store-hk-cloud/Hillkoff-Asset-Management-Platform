import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import type { UserProfile } from "@/domain/entities/user-profile";

export function UserList({ users }: { users: readonly UserProfile[] }) {
  if (users.length === 0) {
    return (
      <div className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
        ยังไม่มีบัญชีผู้ใช้งาน
      </div>
    );
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
                  {user.branchId ?? user.customerId ?? "All scope"}
                </p>
              </div>
              <span
                className={
                  user.status === "active"
                    ? "text-sm font-medium text-emerald-700"
                    : "text-muted-foreground text-sm font-medium"
                }
              >
                {user.status}
              </span>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
