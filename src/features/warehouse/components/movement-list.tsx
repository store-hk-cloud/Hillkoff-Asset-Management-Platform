"use client";

import { useLanguage } from "@/components/providers/language-provider";
import type { MovementLog } from "@/domain/entities/movement-log";

export function MovementList({
  movements,
}: {
  movements: readonly MovementLog[];
}) {
  const { locale } = useLanguage();
  const dateFormatter = new Intl.DateTimeFormat(
    locale === "th" ? "th-TH" : "en-US",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Bangkok",
    },
  );
  const labels =
    locale === "th"
      ? {
          warehouse_movement: "ย้ายคลัง",
          customer_sale: "ขายลูกค้า",
        }
      : {
          warehouse_movement: "Warehouse movement",
          customer_sale: "Customer sale",
        };

  if (movements.length === 0) {
    return (
      <div className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
        {locale === "th" ? "ยังไม่มีประวัติการเคลื่อนไหว" : "No movement logs"}
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {movements.map((movement) => (
        <article className="bg-card rounded-xl border p-4" key={movement.id}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-muted-foreground text-xs font-medium">
                {labels[movement.type]} · {movement.movementNumber}
              </p>
              <p className="mt-1 font-semibold">{movement.assetName}</p>
              <p className="font-mono text-xs">{movement.assetCode}</p>
            </div>
            <time className="text-muted-foreground text-xs">
              {dateFormatter.format(movement.occurredAt)}
            </time>
          </div>
          {movement.referenceNumber ? (
            <div className="mt-3 text-sm">
              <span className="text-muted-foreground text-xs">
                {locale === "th" ? "เลขที่เอกสาร: " : "Document number: "}
              </span>
              <span className="font-medium">{movement.referenceNumber}</span>
            </div>
          ) : null}
          <div className="mt-4 grid gap-3 border-t pt-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground text-xs">
                {locale === "th" ? "ต้นทาง" : "Source"}
              </p>
              <p>
                {movement.source.name || movement.source.locationName || "—"} ·{" "}
                {movement.source.customerId
                  ? `Customer ${movement.source.customerId}`
                  : `Warehouse ${movement.source.warehouseId ?? "—"}`}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">
                {locale === "th" ? "ปลายทาง" : "Destination"}
              </p>
              <p>
                {movement.destination.name ||
                  movement.destination.locationName ||
                  "—"}{" "}
                ·{" "}
                {movement.destination.customerId
                  ? `Customer ${movement.destination.customerId}`
                  : `Warehouse ${movement.destination.warehouseId ?? "—"}`}
              </p>
            </div>
          </div>
          {movement.notes ? (
            <div className="bg-muted/50 mt-4 rounded-md p-3 text-sm">
              <p className="text-muted-foreground text-xs">
                {locale === "th" ? "หมายเหตุ" : "Notes"}
              </p>
              <p className="mt-1 whitespace-pre-wrap">{movement.notes}</p>
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}
