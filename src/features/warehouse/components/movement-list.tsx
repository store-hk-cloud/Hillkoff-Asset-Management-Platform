import type { MovementLog } from "@/domain/entities/movement-log";

const dateFormatter = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Bangkok",
});

const labels = {
  received: "รับเข้า",
  branch_transfer: "โอนสาขา",
  customer_sale: "ขายลูกค้า",
} as const;

export function MovementList({
  movements,
}: {
  movements: readonly MovementLog[];
}) {
  if (movements.length === 0) {
    return (
      <div className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
        ยังไม่มี Movement Log
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
          <div className="mt-4 grid gap-3 border-t pt-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground text-xs">ต้นทาง</p>
              <p>
                {movement.source.locationName || "—"} · Branch{" "}
                {movement.source.branchId ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">ปลายทาง</p>
              <p>
                {movement.destination.locationName || "—"} ·{" "}
                {movement.destination.customerId
                  ? `Customer ${movement.destination.customerId}`
                  : `Branch ${movement.destination.branchId ?? "—"}`}
              </p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
