import Link from "next/link";
import { CircleDollarSign, Package, UserRound } from "lucide-react";
import { notFound } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { RepairError } from "@/domain/errors/repair.error";
import { AssignRepairForm } from "@/features/repairs/components/assign-repair-form";
import { RepairWorkForm } from "@/features/repairs/components/repair-work-form";
import { requireSession } from "@/lib/auth/dal";
import { getServerTranslator } from "@/lib/i18n/server";
import { thaiPrimary } from "@/lib/i18n/thai-primary";
import { RepairManagementService } from "@/services/repair-management.service";

const service = new RepairManagementService();
type Props = { params: Promise<{ repairId: string }> };

export default async function RepairDetailPage({ params }: Props) {
  const { locale } = await getServerTranslator();
  const { profile } = await requireSession();
  const { repairId } = await params;
  let ticket;
  try {
    ticket = await service.get(repairId, profile);
  } catch (error) {
    if (
      error instanceof RepairError &&
      (error.code === "REPAIR_NOT_FOUND" ||
        error.code === "REPAIR_ACCESS_DENIED")
    ) {
      notFound();
    }
    throw error;
  }

  const partsTotal = ticket.partsUsed.reduce(
    (total, part) => total + part.quantity * part.unitCost,
    0,
  );
  const dateFormatter = new Intl.DateTimeFormat(
    locale === "th" ? "th-TH" : "en-US",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Bangkok",
    },
  );

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          className="text-muted-foreground hover:text-foreground text-sm"
          href="/service-jobs?workType=repair"
        >
          ← {thaiPrimary(locale, "งานซ่อม", "Repairs")}
        </Link>
        <PageHeader
          description={<span className="font-mono">{ticket.ticketNumber}</span>}
          eyebrow={thaiPrimary(locale, "งานซ่อม", "Repairs")}
          title={
            <span className="flex flex-wrap items-center gap-2">
              {ticket.title}
              <span className="bg-muted rounded-full px-2 py-1 text-xs font-medium">
                {ticket.status.replace("_", " ")}
              </span>
            </span>
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{thaiPrimary(locale, "ใบงาน", "Ticket")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <Detail
              label={thaiPrimary(locale, "เครื่อง", "Asset")}
              value={`${ticket.assetCode} · ${ticket.assetName}`}
            />
            <Detail
              label={thaiPrimary(locale, "อาการ", "Symptoms")}
              value={ticket.description}
            />
            <Detail
              label={thaiPrimary(locale, "เคลมประกัน", "Warranty claim")}
              value={
                ticket.warrantyClaim
                  ? ticket.warrantyClaimApproved === null
                    ? thaiPrimary(locale, "รอตรวจสอบ", "Pending check")
                    : ticket.warrantyClaimApproved
                      ? thaiPrimary(locale, "อนุมัติ", "Approved")
                      : thaiPrimary(locale, "ไม่เข้าเงื่อนไข", "Not covered")
                  : thaiPrimary(locale, "ไม่เคลม", "No claim")
              }
            />
            <Detail
              label={thaiPrimary(locale, "สร้างเมื่อ", "Created")}
              value={dateFormatter.format(ticket.createdAt)}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              {thaiPrimary(locale, "สรุปงานซ่อม", "Repair summary")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center gap-2">
              <UserRound
                aria-hidden="true"
                className="text-muted-foreground size-4"
              />
              <span>
                {ticket.assignedTechnicianName ??
                  thaiPrimary(locale, "ยังไม่มอบหมาย", "Unassigned")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CircleDollarSign
                aria-hidden="true"
                className="text-muted-foreground size-4"
              />
              <span>
                {thaiPrimary(locale, "ค่าแรง", "Labor")}{" "}
                {ticket.laborCost.toLocaleString(
                  locale === "th" ? "th-TH" : "en-US",
                )}{" "}
                THB
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Package
                aria-hidden="true"
                className="text-muted-foreground size-4"
              />
              <span>
                {thaiPrimary(locale, "อะไหล่", "Parts")}{" "}
                {partsTotal.toLocaleString(locale === "th" ? "th-TH" : "en-US")}{" "}
                THB ({ticket.partsUsed.length})
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {service.canAssign(profile) && ticket.status === "new" ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {thaiPrimary(locale, "มอบหมายช่าง", "Assign technician")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AssignRepairForm repairId={ticket.id} version={ticket.version} />
          </CardContent>
        </Card>
      ) : null}

      {service.canWork(profile, ticket) &&
      ticket.status !== "new" &&
      ticket.status !== "closed" ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {thaiPrimary(locale, "ปฏิบัติงานซ่อม", "Repair work")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RepairWorkForm
              initialLaborCost={ticket.laborCost}
              initialParts={ticket.partsUsed}
              initialPhotos={ticket.photos.map((photo) => ({
                id: photo.id,
                name: photo.name,
                storagePath: photo.storagePath,
                contentType: photo.contentType,
                size: photo.size,
              }))}
              initialRootCause={ticket.rootCause}
              initialSolution={ticket.solution}
              initialStatus={ticket.status}
              initialVersion={ticket.version}
              initialWarrantyClaim={ticket.warrantyClaim}
              repairId={ticket.id}
            />
          </CardContent>
        </Card>
      ) : null}

      {(!service.canWork(profile, ticket) || ticket.status === "closed") &&
      ticket.status !== "new" ? (
        <Card>
          <CardContent className="space-y-4 py-6 text-sm">
            <Detail
              label={thaiPrimary(locale, "สาเหตุหลัก", "Root cause")}
              value={ticket.rootCause || "—"}
            />
            <Detail
              label={thaiPrimary(locale, "วิธีแก้ไข", "Solution")}
              value={ticket.solution || "—"}
            />
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-1 font-medium whitespace-pre-wrap">{value}</dd>
    </div>
  );
}
