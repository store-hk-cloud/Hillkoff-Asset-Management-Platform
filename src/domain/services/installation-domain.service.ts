import type { Asset } from "@/domain/entities/asset";
import type {
  CompleteInstallationInput,
  Installation,
  ScheduleInstallationInput,
} from "@/domain/entities/installation";
import { InstallationError } from "@/domain/errors/installation.error";
import type { UserId } from "@/domain/value-objects/user-id";

const DEFAULT_CHECKLIST = [
  "ตรวจสอบสภาพเครื่องและอุปกรณ์",
  "ตรวจสอบระบบไฟฟ้าและจุดเชื่อมต่อ",
  "ทดสอบการเปิดใช้งาน",
  "ทดสอบการทำงานตามมาตรฐาน",
  "ทำความสะอาดพื้นที่ติดตั้ง",
] as const;

export class InstallationDomainService {
  schedule(
    id: string,
    asset: Asset,
    input: ScheduleInstallationInput,
    actorId: UserId,
    now: Date,
  ): Installation {
    if (asset.status === "archived") {
      throw new InstallationError(
        "ASSET_ARCHIVED",
        "Archived assets cannot be installed.",
      );
    }

    if (
      asset.custodyType !== "customer" ||
      asset.customerId !== input.customerId
    ) {
      throw new InstallationError(
        "ASSET_NOT_ASSIGNED_TO_CUSTOMER",
        "The asset must be sold to this customer before installation.",
      );
    }

    return {
      id,
      installationNumber: `INS-${now
        .toISOString()
        .replace(/\D/g, "")
        .slice(0, 14)}-${id.slice(0, 6).toUpperCase()}`,
      assetId: asset.id,
      assetCode: asset.assetCode,
      assetName: asset.name,
      customerId: input.customerId,
      customerName: input.customerName.trim(),
      address: input.address.trim(),
      scheduledAt: input.scheduledAt,
      assignedTechnicianId: input.assignedTechnicianId,
      assignedTechnicianName: input.assignedTechnicianName.trim(),
      status: "scheduled",
      checklist: DEFAULT_CHECKLIST.map((label, index) => ({
        id: `check-${index + 1}`,
        label,
        required: true,
        completed: false,
        notes: "",
      })),
      gpsLocation: null,
      photos: [],
      training: {
        completed: false,
        traineeName: "",
        topics: [],
        notes: "",
      },
      signature: null,
      warrantyMonths: input.warrantyMonths,
      startedAt: null,
      completedAt: null,
      createdAt: now,
      createdBy: actorId,
      updatedAt: now,
      updatedBy: actorId,
      version: 0,
    };
  }

  start(installation: Installation, actorId: UserId, now: Date): Installation {
    if (installation.status !== "scheduled") {
      throw new InstallationError(
        "INVALID_INSTALLATION",
        "Only scheduled installations can be started.",
      );
    }

    return {
      ...installation,
      status: "in_progress",
      startedAt: now,
      updatedAt: now,
      updatedBy: actorId,
      version: installation.version + 1,
    };
  }

  complete(
    installation: Installation,
    asset: Asset,
    input: CompleteInstallationInput,
    actorId: UserId,
    now: Date,
  ): { installation: Installation; asset: Asset } {
    if (installation.version !== input.expectedVersion) {
      throw new InstallationError(
        "INSTALLATION_VERSION_CONFLICT",
        "The installation has changed. Reload and try again.",
      );
    }

    if (
      installation.status !== "scheduled" &&
      installation.status !== "in_progress"
    ) {
      throw new InstallationError(
        "INVALID_INSTALLATION",
        "The installation cannot be completed.",
      );
    }

    if (asset.status === "archived") {
      throw new InstallationError(
        "ASSET_ARCHIVED",
        "Archived assets cannot be installed.",
      );
    }

    if (
      asset.custodyType !== "customer" ||
      asset.customerId !== installation.customerId
    ) {
      throw new InstallationError(
        "ASSET_NOT_ASSIGNED_TO_CUSTOMER",
        "The asset is no longer assigned to this customer.",
      );
    }

    const submittedChecklist = new Map(
      input.checklist.map((item) => [item.id, item]),
    );
    const checklist = installation.checklist.map((item) => {
      const submitted = submittedChecklist.get(item.id);
      if (!submitted || (item.required && !submitted.completed)) {
        throw new InstallationError(
          "CHECKLIST_INCOMPLETE",
          "Complete all required checklist items.",
        );
      }
      return {
        ...item,
        completed: submitted.completed,
        notes: submitted.notes,
      };
    });

    if (checklist.some((item) => item.required && !item.completed)) {
      throw new InstallationError(
        "CHECKLIST_INCOMPLETE",
        "Complete all required checklist items.",
      );
    }

    if (!input.gpsLocation) {
      throw new InstallationError("GPS_REQUIRED", "GPS location is required.");
    }

    if (input.photos.length === 0) {
      throw new InstallationError(
        "PHOTO_REQUIRED",
        "At least one installation photo is required.",
      );
    }

    if (!input.training.completed || !input.training.traineeName.trim()) {
      throw new InstallationError(
        "TRAINING_REQUIRED",
        "Customer training and trainee name are required.",
      );
    }

    if (!input.signature.signerName.trim() || !input.signature.storagePath) {
      throw new InstallationError(
        "SIGNATURE_REQUIRED",
        "Customer signature is required.",
      );
    }

    const expiresAt = new Date(now);
    expiresAt.setUTCMonth(
      expiresAt.getUTCMonth() + installation.warrantyMonths,
    );

    return {
      installation: {
        ...installation,
        checklist,
        gpsLocation: input.gpsLocation,
        photos: input.photos,
        training: input.training,
        signature: input.signature,
        status: "completed",
        startedAt: installation.startedAt ?? now,
        completedAt: now,
        updatedAt: now,
        updatedBy: actorId,
        version: installation.version + 1,
      },
      asset: {
        ...asset,
        installedAt: now,
        installationLatitude: input.gpsLocation.latitude,
        installationLongitude: input.gpsLocation.longitude,
        locationName: installation.address,
        warranty: {
          status: "active",
          startedAt: now,
          expiresAt,
          installationId: installation.id,
        },
        updatedAt: now,
        updatedBy: actorId,
        version: asset.version + 1,
      },
    };
  }
}
