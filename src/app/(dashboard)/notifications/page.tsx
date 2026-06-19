import { Bell } from "lucide-react";
import { notFound } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth/dal";
import { NotificationManagementService } from "@/services/notification-management.service";

const service = new NotificationManagementService();
const formatter = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Bangkok",
});

export default async function NotificationsPage() {
  const { profile } = await requireSession();
  if (!service.canView(profile)) notFound();
  const items = await service.list(profile);

  return (
    <section className="space-y-6">
      <div>
        <p className="text-muted-foreground text-sm">Background Processing</p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Notification Center
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Queue นี้เป็น read-only จาก UI การส่งทั้งหมดทำผ่าน Cloud Functions
        </p>
      </div>
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <Bell
            aria-hidden="true"
            className="text-muted-foreground mx-auto mb-3 size-8"
          />
          <p className="text-muted-foreground text-sm">
            Notification queue empty
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-base">{item.title}</CardTitle>
                  <span className="bg-muted rounded-full px-2 py-1 text-xs">
                    {item.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>{item.body}</p>
                <p className="text-muted-foreground">
                  {item.type} · attempts {item.attempts}/{item.maxAttempts}
                </p>
                <p className="text-muted-foreground text-xs">
                  {formatter.format(item.createdAt)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
