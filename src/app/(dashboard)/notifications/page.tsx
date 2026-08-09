import { Bell } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import type { NotificationStatus } from "@/domain/entities/notification";
import { NotificationSearchForm } from "@/features/notifications/components/notification-search-form";
import { notificationSearchSchema } from "@/features/notifications/schemas/notification.schema";
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

type Props = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function NotificationsPage({ searchParams }: Props) {
  const { locale, t } = await getServerTranslator();
  const { profile } = await requireSession();
  if (!service.canView(profile)) notFound();
  const params = await searchParams;
  const criteria = notificationSearchSchema.parse({
    status: params.status,
    type: params.type,
    limit: params.limit,
  });

  const allItems = await service.list(profile);
  const filtered = allItems.filter((item) => {
    if (criteria.status !== "all" && item.status !== criteria.status) {
      return false;
    }
    if (criteria.type !== "all" && item.type !== criteria.type) return false;
    return true;
  });
  const items = filtered.slice(0, criteria.limit);
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
      <NotificationSearchForm status={criteria.status} type={criteria.type} />
      {items.length === 0 ? (
        <EmptyState
          icon={Bell}
          message={
            filtered.length === 0 && allItems.length > 0
              ? locale === "th"
                ? "ไม่พบรายการแจ้งเตือนตามตัวกรอง"
                : "No notifications match these filters."
              : locale === "th"
                ? "ยังไม่มีรายการแจ้งเตือน"
                : "Notification queue is empty"
          }
        />
      ) : (
        <>
          <p className="text-muted-foreground text-sm">
            {locale === "th"
              ? `แสดง ${items.length} จาก ${filtered.length} รายการ`
              : `Showing ${items.length} of ${filtered.length} results`}
          </p>
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
                <CardContent className="space-y-1 text-sm">
                  <p className="text-muted-foreground">{item.body}</p>
                  <p className="text-muted-foreground text-xs">
                    {item.type} · {formatter.format(item.createdAt)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          {filtered.length > criteria.limit && criteria.limit < 150 ? (
            <div className="flex justify-center">
              <Link
                className="ghost-button rounded-md border px-4 py-2 text-sm"
                href={`/notifications?status=${criteria.status}&type=${criteria.type}&limit=${criteria.limit + 30}`}
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
        </>
      )}
    </section>
  );
}
