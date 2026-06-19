import { getCurrentSession } from "@/lib/auth/dal";
import { createExcelExport } from "@/lib/analytics/exports";
import { AnalyticsManagementService } from "@/services/analytics-management.service";

const service = new AnalyticsManagementService();

export async function GET() {
  const session = await getCurrentSession();
  if (!session || !service.canView(session.profile)) {
    return new Response("Unauthorized", { status: 401 });
  }
  const snapshot = await service.executiveDashboard(session.profile);
  return new Response(createExcelExport(snapshot), {
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": 'attachment; filename="hillkoff-dashboard.xls"',
      "Cache-Control": "no-store",
    },
  });
}
