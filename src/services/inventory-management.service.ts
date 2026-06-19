import "server-only";

import type {
  InventoryMovement,
  InventoryMovementInput,
  InventoryPart,
  InventoryPartInput,
} from "@/domain/entities/inventory";
import type { UserProfile } from "@/domain/entities/user-profile";
import { InventoryError } from "@/domain/errors/inventory.error";
import { InventoryDomainService } from "@/domain/services/inventory-domain.service";
import { FirestoreInventoryRepository } from "@/repositories/firestore/firestore-inventory.repository";

export class InventoryManagementService {
  constructor(
    private readonly repository = new FirestoreInventoryRepository(),
    private readonly domainService = new InventoryDomainService(),
  ) {}

  canView(profile: UserProfile): boolean {
    return ["admin", "warehouse", "technician", "executive"].includes(
      profile.role,
    );
  }

  canWrite(profile: UserProfile): boolean {
    return profile.role === "admin" || profile.role === "warehouse";
  }

  async list(profile: UserProfile) {
    this.requireView(profile);
    return this.repository.listParts();
  }

  async movements(profile: UserProfile) {
    this.requireView(profile);
    return this.repository.listMovements(200);
  }

  async create(
    input: InventoryPartInput,
    profile: UserProfile,
  ): Promise<InventoryPart> {
    this.requireWrite(profile);
    const part = this.domainService.createPart(
      this.repository.createId(),
      input,
      profile.uid,
      new Date(),
    );
    await this.repository.savePart(part, null);
    return part;
  }

  async update(
    id: string,
    input: InventoryPartInput & { expectedVersion: number },
    profile: UserProfile,
  ): Promise<InventoryPart> {
    this.requireWrite(profile);
    const current = await this.repository.findById(id);
    if (!current) {
      throw new InventoryError("PART_NOT_FOUND", "Part was not found.");
    }
    const part = this.domainService.updatePart(
      current,
      input,
      profile.uid,
      new Date(),
    );
    await this.repository.savePart(part, current.version);
    return part;
  }

  async move(
    input: InventoryMovementInput,
    profile: UserProfile,
  ): Promise<InventoryMovement> {
    this.requireWrite(profile);
    const current = await this.repository.findById(input.partId);
    if (!current) {
      throw new InventoryError("PART_NOT_FOUND", "Part was not found.");
    }
    const result = this.domainService.move(
      current,
      input,
      profile.uid,
      new Date(),
      { type: "manual", id: null },
    );
    await this.repository.commitMovement(
      result.part,
      result.movement,
      current.version,
    );
    return result.movement;
  }

  async deactivate(
    id: string,
    expectedVersion: number,
    profile: UserProfile,
  ): Promise<InventoryPart> {
    this.requireWrite(profile);
    const current = await this.repository.findById(id);
    if (!current) {
      throw new InventoryError("PART_NOT_FOUND", "Part was not found.");
    }
    const part = this.domainService.deactivatePart(
      current,
      expectedVersion,
      profile.uid,
      new Date(),
    );
    await this.repository.savePart(part, current.version);
    return part;
  }

  private requireView(profile: UserProfile) {
    if (!this.canView(profile)) {
      throw new InventoryError(
        "INVENTORY_ACCESS_DENIED",
        "You cannot view inventory.",
      );
    }
  }

  private requireWrite(profile: UserProfile) {
    if (!this.canWrite(profile)) {
      throw new InventoryError(
        "INVENTORY_ACCESS_DENIED",
        "You cannot change inventory.",
      );
    }
  }
}
