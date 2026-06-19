import Link from "next/link";
import { CircleDollarSign, Package, UserRound } from "lucide-react";
import { notFound } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RepairError } from "@/domain/errors/repair.error";
import { AssignRepairForm } from "@/features/repairs/components/assign-repair-form";
import { RepairWorkForm } from "@/features/repairs/components/repair-work-form";
import { requireSession } from "@/lib/auth/dal";
import { RepairManagementService } from "@/services/repair-management.service";

const service = new RepairManagementService();
const dateFormatter = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Bangkok",
});

type Props = { params: Promise<{ repairId: string }> };

export default async function RepairDetailPage({ params }: Props) {
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

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          className="text-muted-foreground hover:text-foreground text-sm"
          href="/repairs"
        >
          ← Repair Management
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {ticket.title}
          </h1>
          <span className="bg-muted rounded-full px-2 py-1 text-xs font-medium">
            {ticket.status.replace("_", " ")}
          </span>
        </div>
        <p className="text-muted-foreground mt-1 font-mono text-sm">
          {ticket.ticketNumber}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ticket</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <Detail
              label="Asset"
              value={`${ticket.assetCode} · ${ticket.assetName}`}
            />
            <Detail label="อาการ" value={ticket.description} />
            <Detail
              label="สร้างเมื่อ"
              value={dateFormatter.format(ticket.createdAt)}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Service Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center gap-2">
              <UserRound
                aria-hidden="true"
                className="text-muted-foreground size-4"
              />
              <span>{ticket.assignedTechnicianName ?? "Unassigned"}</span>
            </div>
            <div className="flex items-center gap-2">
              <CircleDollarSign
                aria-hidden="true"
                className="text-muted-foreground size-4"
              />
              <span>Labor {ticket.laborCost.toLocaleString("th-TH")} THB</span>
            </div>
            <div className="flex items-center gap-2">
              <Package
                aria-hidden="true"
                className="text-muted-foreground size-4"
              />
              <span>
                Parts {partsTotal.toLocaleString("th-TH")} THB (
                {ticket.partsUsed.length})
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {service.canAssign(profile) && ticket.status === "new" ? (
        <Card>
          <CardHeader>
            <CardTitle>Assign Technician</CardTitle>
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
            <CardTitle>Repair Work</CardTitle>
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
              repairId={ticket.id}
            />
          </CardContent>
        </Card>
      ) : null}

      {(!service.canWork(profile, ticket) || ticket.status === "closed") &&
      ticket.status !== "new" ? (
        <Card>
          <CardContent className="space-y-4 py-6 text-sm">
            <Detail label="Root Cause" value={ticket.rootCause || "—"} />
            <Detail label="Solution" value={ticket.solution || "—"} />
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
