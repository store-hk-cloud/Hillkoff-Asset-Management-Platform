import type { Asset } from "@/domain/entities/asset";
import type {
  CompletePmInput,
  PmJob,
  SchedulePmInput,
} from "@/domain/entities/pm-job";
import { PmError } from "@/domain/errors/pm.error";
import type { UserId } from "@/domain/value-objects/user-id";

function addUtcMonths(date: Date, months: number): Date {
  const targetMonth = date.getUTCMonth() + months;
  const targetYear = date.getUTCFullYear() + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;
  const lastDay = new Date(
    Date.UTC(targetYear, normalizedMonth + 1, 0),
  ).getUTCDate();
  return new Date(
    Date.UTC(
      targetYear,
      normalizedMonth,
      Math.min(date.getUTCDate(), lastDay),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    ),
  );
}

export class PmDomainService {
  schedule(
    id: string,
    asset: Asset,
    input: SchedulePmInput,
    actorId: UserId,
    now: Date,
  ): PmJob {
    if (asset.status === "archived") {
      throw new PmError(
        "ASSET_ARCHIVED",
        "Archived assets cannot be scheduled for PM.",
      );
    }

    return {
      id,
      jobNumber: `PM-${now
        .toISOString()
        .replace(/\D/g, "")
        .slice(0, 14)}-${id.slice(0, 6).toUpperCase()}`,
      assetId: asset.id,
      assetCode: asset.assetCode,
      assetName: asset.name,
      branchId: asset.branchId,
      customerId: asset.customerId,
      title: input.title.trim(),
      scheduledAt: input.scheduledAt,
      assignedTechnicianId: input.assignedTechnicianId,
      assignedTechnicianName: input.assignedTechnicianName.trim(),
      assignmentStatus: "pending",
      assignmentRespondedAt: null,
      assignmentRejectionReason: null,
      status: "scheduled",
      checklist: input.checklistLabels.map((label, index) => ({
        id: `pm-check-${index + 1}`,
        label: label.trim(),
        required: true,
        completed: false,
        notes: "",
      })),
      completionNotes: "",
      recurrenceMonths: input.recurrenceMonths,
      nextDueAt: null,
      completedAt: null,
      createdAt: now,
      createdBy: actorId,
      updatedAt: now,
      updatedBy: actorId,
      version: 0,
    };
  }

  complete(
    job: PmJob,
    input: CompletePmInput,
    actorId: UserId,
    now: Date,
  ): PmJob {
    if (job.version !== input.expectedVersion) {
      throw new PmError(
        "PM_VERSION_CONFLICT",
        "The PM job has changed. Reload and try again.",
      );
    }
    if (job.status !== "scheduled") {
      throw new PmError(
        "INVALID_PM_STATUS",
        "Only scheduled PM jobs can be completed.",
      );
    }

    const submitted = new Map(input.checklist.map((item) => [item.id, item]));
    const checklist = job.checklist.map((item) => {
      const result = submitted.get(item.id);
      if (!result || (item.required && !result.completed)) {
        throw new PmError(
          "PM_CHECKLIST_INCOMPLETE",
          "Complete all required PM checklist items.",
        );
      }
      return {
        ...item,
        completed: result.completed,
        notes: result.notes.trim(),
      };
    });

    const nextDueAt =
      job.recurrenceMonths === null
        ? null
        : addUtcMonths(now, job.recurrenceMonths);

    return {
      ...job,
      status: "completed",
      checklist,
      completionNotes: input.completionNotes.trim(),
      nextDueAt,
      completedAt: now,
      updatedAt: now,
      updatedBy: actorId,
      version: job.version + 1,
    };
  }
}
