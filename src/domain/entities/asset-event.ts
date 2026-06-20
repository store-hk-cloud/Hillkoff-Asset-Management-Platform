import type { AssetId } from "@/domain/value-objects/asset-id";
import type { UserId } from "@/domain/value-objects/user-id";
import type { UserRole } from "@/domain/value-objects/user-role";

export const ASSET_EVENT_TYPES = [
  "created",
  "updated",
  "archived",
  "repair",
  "preventive_maintenance",
  "installation",
  "document",
  "warehouse_received",
  "branch_transferred",
  "transfer_requested",
  "transfer_dispatched",
  "transfer_received",
  "transfer_cancelled",
  "transfer_rejected",
  "transfer_returned",
  "technician_assigned",
  "technician_assignment_accepted",
  "technician_assignment_rejected",
  "customer_sold",
  "public_identity_created",
  "nfc_registered",
  "nfc_verified",
  "nfc_mismatch",
] as const;

export type AssetEventType = (typeof ASSET_EVENT_TYPES)[number];

export interface AssetFieldChange {
  readonly before: unknown;
  readonly after: unknown;
}

export interface AssetEvent {
  readonly id: string;
  readonly assetId: AssetId;
  readonly type: AssetEventType;
  readonly title: string;
  readonly description: string;
  readonly changes: Readonly<Record<string, AssetFieldChange>>;
  readonly actorId: UserId;
  readonly actorDisplayName: string;
  readonly actorRole: UserRole;
  readonly occurredAt: Date;
  readonly correlationId: string;
}
