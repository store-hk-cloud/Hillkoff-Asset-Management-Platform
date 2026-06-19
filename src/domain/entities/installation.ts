import type { AssetId } from "@/domain/value-objects/asset-id";
import type { UserId } from "@/domain/value-objects/user-id";

export const INSTALLATION_STATUSES = [
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export type InstallationStatus = (typeof INSTALLATION_STATUSES)[number];

export interface InstallationChecklistItem {
  readonly id: string;
  readonly label: string;
  readonly required: boolean;
  readonly completed: boolean;
  readonly notes: string;
}

export interface InstallationLocation {
  readonly latitude: number;
  readonly longitude: number;
  readonly accuracy: number | null;
  readonly capturedAt: Date;
}

export interface InstallationFile {
  readonly id: string;
  readonly name: string;
  readonly storagePath: string;
  readonly contentType: string;
  readonly size: number;
  readonly uploadedAt: Date;
  readonly uploadedBy: UserId;
}

export interface CustomerTraining {
  readonly completed: boolean;
  readonly traineeName: string;
  readonly topics: readonly string[];
  readonly notes: string;
}

export interface CustomerSignature {
  readonly signerName: string;
  readonly storagePath: string;
  readonly signedAt: Date;
}

export interface Installation {
  readonly id: string;
  readonly installationNumber: string;
  readonly assetId: AssetId;
  readonly assetCode: string;
  readonly assetName: string;
  readonly customerId: string;
  readonly customerName: string;
  readonly address: string;
  readonly scheduledAt: Date;
  readonly assignedTechnicianId: UserId;
  readonly assignedTechnicianName: string;
  readonly status: InstallationStatus;
  readonly checklist: readonly InstallationChecklistItem[];
  readonly gpsLocation: InstallationLocation | null;
  readonly photos: readonly InstallationFile[];
  readonly training: CustomerTraining;
  readonly signature: CustomerSignature | null;
  readonly warrantyMonths: number;
  readonly startedAt: Date | null;
  readonly completedAt: Date | null;
  readonly createdAt: Date;
  readonly createdBy: UserId;
  readonly updatedAt: Date;
  readonly updatedBy: UserId;
  readonly version: number;
}

export interface ScheduleInstallationInput {
  readonly assetCode: string;
  readonly customerId: string;
  readonly customerName: string;
  readonly address: string;
  readonly scheduledAt: Date;
  readonly assignedTechnicianId: UserId;
  readonly assignedTechnicianName: string;
  readonly warrantyMonths: number;
}

export interface CompleteInstallationInput {
  readonly expectedVersion: number;
  readonly checklist: readonly InstallationChecklistItem[];
  readonly gpsLocation: InstallationLocation;
  readonly photos: readonly InstallationFile[];
  readonly training: CustomerTraining;
  readonly signature: CustomerSignature;
}
