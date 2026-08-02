import { Bell } from "lucide-react";
import { notFound } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import type { NotificationStatus } from "@/domain/entities/notification";
import { requireSession } from "@/lib/auth/dal";
import { getServerTranslator } from "@/lib/i18n/server";
import { NotificationManagementService } from "@/services/notification-management.service";

function notificationTone(status: NotificationStatus) {
  if (status === "sent") return "success" as const;
  if (status === "failed") return "danger" as const;
  if (status === "retry") return "warning" as const;
  return "neutral" as const;
}

const service = new NotificationManagementService();
export default async function NotificationsPage() {
  const { locale, t } = await getServerTranslator();
  const { profile } = await requireSession();
  if (!service.canView(profile)) notFound();
  const items = await service.list(profile);
  const formatter = new Intl.DateTimeFormat(
    locale === "th" ? "th-TH" : "en-US",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Bangkok",
    },
  );

  return (
    <section className="space-y-6">
      <PageHeader
        description={
          locale === "th"
            ? "คิวนี้เป็นแบบอ่านอย่างเดียวและการส่งทั้งหมดทำผ่าน Cloud Functions"
            : "This queue is read-only and delivery is handled by Cloud Functions."
        }
        eyebrow={t("nav.notifications")}
        title={t("notifications.title")}
      />
      {items.length === 0 ? (
        <EmptyState
          icon={Bell}
          message={
            locale === "th"
              ? "ยังไม่มีรายการแจ้งเตือน"
              : "Notification queue is empty"
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-base">{item.title}</CardTitle>
                  <StatusBadge tone={notificationTone(item.status)}>
                    {item.status}
                  </StatusBadge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>{item.body}</p>
                <p className="text-muted-foreground">
                  {item.type} · {locale === "th" ? "จำนวนครั้ง" : "attempts"}{" "}
                  {item.attempts}/{item.maxAttempts}
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
