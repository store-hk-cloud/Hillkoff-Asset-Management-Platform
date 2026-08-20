import type { Asset } from "@/domain/entities/asset";
import type { MovementLog } from "@/domain/entities/movement-log";
import { findWarehouse } from "@/domain/master-data/warehouses";

const CSV_COLUMNS = [
  "Asset Code",
  "Name",
  "Category",
  "Serial Number",
  "Condition",
  "Status",
  "Custody Type",
  "Warehouse ID",
  "Warehouse Name",
  "Location Name",
  "NFC Status",
  "NFC Tag Type",
  "NFC Registered At",
  "NFC Verified At",
  "Last Movement At",
  "Last Movement Type",
  "Last Movement Destination",
  "Last Movement Reference",
  "Installed At",
  "Created At",
  "Updated At",
] as const;

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function formatDate(value: Date | null): string {
  return value ? value.toISOString() : "";
}

/**
 * Builds a Map keyed by assetCode -> most recent movement, from a
 * flat, occurredAt-descending movement list (the repository has no
 * per-asset filter, so callers pass a broad recent-history fetch).
 */
function latestMovementByAssetCode(
  movements: readonly MovementLog[],
): ReadonlyMap<string, MovementLog> {
  const map = new Map<string, MovementLog>();
  for (const movement of movements) {
    if (!map.has(movement.assetCode)) {
      map.set(movement.assetCode, movement);
    }
  }
  return map;
}

export function buildAssetExportCsv(
  assets: readonly Asset[],
  movements: readonly MovementLog[],
): string {
  const latestMovements = latestMovementByAssetCode(movements);
  const lines = [CSV_COLUMNS.join(",")];

  for (const asset of assets) {
    const warehouse = findWarehouse(asset.warehouseId);
    const latestMovement = latestMovements.get(asset.assetCode);
    const row = [
      asset.assetCode,
      asset.name,
      asset.category,
      asset.serialNumber ?? "",
      asset.condition,
      asset.status,
      asset.custodyType,
      asset.warehouseId ?? "",
      warehouse?.nameEn ?? "",
      asset.locationName,
      asset.nfcStatus,
      asset.nfcTagType ?? "",
      formatDate(asset.nfcRegisteredAt),
      formatDate(asset.nfcVerifiedAt),
      formatDate(asset.lastMovementAt),
      latestMovement?.type ?? "",
      latestMovement?.destination.locationName ?? "",
      latestMovement?.referenceNumber ?? "",
      formatDate(asset.installedAt),
      formatDate(asset.createdAt),
      formatDate(asset.updatedAt),
    ];
    lines.push(row.map((value) => csvEscape(String(value))).join(","));
  }

  return `﻿${lines.join("\r\n")}\r\n`;
}
