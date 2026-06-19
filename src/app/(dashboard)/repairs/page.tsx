import Link from "next/link";
import { Plus, UserRound, Wrench } from "lucide-react";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RepairStatus } from "@/domain/entities/repair-ticket";
import { requireSession } from "@/lib/auth/dal";
import { cn } from "@/lib/utils";
import { RepairManagementService } from "@/services/repair-management.service";

const service = new RepairManagementService();
const dateFormatter = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Bangkok",
});
const labels: Record<RepairStatus, string> = {
  new: "New",
  assigned: "Assigned",
  in_progress: "In Progress",
  waiting_parts: "Waiting Parts",
  completed: "Completed",
  closed: "Closed",
};

export const metadata = { title: "Repair Management" };

export default async function RepairsPage() {
  const { profile } = await requireSession();
  if (!service.canView(profile)) notFound();
  const tickets = await service.list(profile);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-muted-foreground text-sm">Service Operations</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Repair Management
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            ติดตามงานซ่อม สาเหตุ วิธีแก้ไข ค่าแรง และอะไหล่
          </p>
        </div>
        {service.canCreate(profile) ? (
          <Button asChild className="h-11 w-full sm:w-auto">
            <Link href="/repairs/new">
              <Plus aria-hidden="true" className="size-4" />
              Create Ticket
            </Link>
          </Button>
        ) : null}
      </div>

      {tickets.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <Wrench
            aria-hidden="true"
            className="text-muted-foreground mx-auto mb-3 size-8"
          />
          <p className="text-muted-foreground text-sm">ไม่มี Repair Ticket</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tickets.map((ticket) => (
            <Link
              className="group"
              href={`/repairs/${ticket.id}`}
              key={ticket.id}
            >
              <Card className="group-hover:border-primary/50 h-full transition-colors">
                <CardHeader className="gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-base">{ticket.title}</CardTitle>
                    <Status status={ticket.status} />
                  </div>
                  <p className="text-muted-foreground font-mono text-xs">
                    {ticket.ticketNumber}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="font-medium">
                    {ticket.assetCode} · {ticket.assetName}
                  </p>
                  <p className="text-muted-foreground line-clamp-2">
                    {ticket.description}
                  </p>
                  <div className="flex items-center gap-2">
                    <UserRound
                      aria-hidden="true"
                      className="text-muted-foreground size-4"
                    />
                    <span>
                      {ticket.assignedTechnicianName ?? "ยังไม่มอบหมายช่าง"}
                    </span>
                  </div>
                  <p className="text-muted-foreground border-t pt-3 text-xs">
                    Updated {dateFormatter.format(ticket.updatedAt)}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function Status({ status }: { status: RepairStatus }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-1 text-xs font-medium",
        status === "completed" || status === "closed"
          ? "bg-green-100 text-green-800"
          : status === "waiting_parts"
            ? "bg-amber-100 text-amber-800"
            : status === "in_progress"
              ? "bg-blue-100 text-blue-800"
              : "bg-muted text-muted-foreground",
      )}
    >
      {labels[status]}
    </span>
  );
}
