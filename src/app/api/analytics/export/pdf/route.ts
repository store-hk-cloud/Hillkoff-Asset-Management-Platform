import { getCurrentSession } from "@/lib/auth/dal";
import { createPdfExport } from "@/lib/analytics/exports";
import { AnalyticsManagementService } from "@/services/analytics-management.service";

const service = new AnalyticsManagementService();

export async function GET() {
  const session = await getCurrentSession();
  if (!session || !service.canView(session.profile)) {
    return new Response("Unauthorized", { status: 401 });
  }
  const snapshot = await service.executiveDashboard(session.profile);
  return new Response(Uint8Array.from(createPdfExport(snapshot)).buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="hillkoff-dashboard.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
