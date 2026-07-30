import "server-only";

import { getFirebaseAdminFirestore } from "@/firebase/admin-firestore";
import {
  assignRepairSchema,
  createRepairSchema,
} from "@/features/repairs/schemas/repair.schema";
import { completePmSchema } from "@/features/pm/schemas/pm.schema";
import {
  sellAssetSchema,
  transferAssetSchema,
} from "@/features/warehouse/schemas/movement.schema";
import type {
  AiCommandEnvelope,
  AiCommandResult,
} from "@/application/commands/asset-commands";
import type { UserProfile } from "@/domain/entities/user-profile";
import { PmManagementService } from "@/services/pm-management.service";
import { RepairManagementService } from "@/services/repair-management.service";
import { WarehouseManagementService } from "@/services/warehouse-management.service";

export class AiCommandDispatcher {
  constructor(
    private readonly repairs = new RepairManagementService(),
    private readonly pm = new PmManagementService(),
    private readonly warehouse = new WarehouseManagementService(),
  ) {}

  async dispatch(
    envelope: AiCommandEnvelope,
    actor: UserProfile,
    request: Request,
  ): Promise<AiCommandResult> {
    if (actor.role !== "admin") {
      throw new Error("AI command execution requires admin role.");
    }
    const firestore = getFirebaseAdminFirestore();
    const commandId = crypto.randomUUID();
    const idempotencyRef = firestore
      .collection("command_events")
      .doc(envelope.idempotencyKey);

    const claim = await firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(idempotencyRef);
      const existing = snapshot.data();
      if (existing?.status === "completed") {
        return { completed: true as const, data: existing };
      }
      if (existing?.status === "pending") {
        throw new Error(
          "A command with this idempotency key is already in progress.",
        );
      }
      transaction.set(idempotencyRef, {
        id: commandId,
        command: envelope.command,
        idempotencyKey: envelope.idempotencyKey,
        entityId: null,
        actorId: actor.uid,
        status: "pending",
        occurredAt: new Date(),
        correlationId: commandId,
      });
      return { completed: false as const };
    });

    if (claim.completed) {
      return {
        commandId: String(claim.data.id),
        command: envelope.command,
        entityId: String(claim.data.entityId),
        status: "completed",
      };
    }
    const context = {
      actor,
      correlationId: commandId,
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: request.headers.get("user-agent"),
    };
    let entityId: string;

    try {
      switch (envelope.command) {
        case "CreateRepairTicket":
          entityId = (
            await this.repairs.create(
              createRepairSchema.parse(envelope.payload),
              context,
            )
          ).id;
          break;
        case "AssignTechnician": {
          const payload = envelope.payload as { repairId?: unknown };
          if (typeof payload.repairId !== "string") {
            throw new Error("repairId is required.");
          }
          entityId = (
            await this.repairs.assign(
              payload.repairId,
              assignRepairSchema.parse(payload),
              context,
            )
          ).id;
          break;
        }
        case "CompletePM": {
          const payload = envelope.payload as { pmId?: unknown };
          if (typeof payload.pmId !== "string")
            throw new Error("pmId is required.");
          entityId = (
            await this.pm.complete(
              payload.pmId,
              completePmSchema.parse(payload),
              context,
            )
          ).id;
          break;
        }
        case "TransferAsset":
          entityId = (
            await this.warehouse.transfer(
              transferAssetSchema.parse(envelope.payload),
              context,
            )
          ).id;
          break;
        case "SellAsset":
          entityId = (
            await this.warehouse.sell(
              sellAssetSchema.parse(envelope.payload),
              context,
            )
          ).id;
          break;
      }
    } catch (error) {
      await idempotencyRef.delete();
      throw error;
    }

    await idempotencyRef.update({
      entityId,
      status: "completed",
      occurredAt: new Date(),
    });
    return {
      commandId,
      command: envelope.command,
      entityId,
      status: "completed",
    };
  }
}
