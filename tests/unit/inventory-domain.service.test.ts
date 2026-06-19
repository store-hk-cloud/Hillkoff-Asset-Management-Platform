import { describe, expect, it } from "vitest";

import type { InventoryPart } from "@/domain/entities/inventory";
import { InventoryError } from "@/domain/errors/inventory.error";
import { InventoryDomainService } from "@/domain/services/inventory-domain.service";
import { createUserId } from "@/domain/value-objects/user-id";

const service = new InventoryDomainService();
const actor = createUserId("warehouse-1");
const now = new Date("2026-06-19T12:00:00.000Z");

function part(overrides: Partial<InventoryPart> = {}): InventoryPart {
  return {
    id: "part-1",
    partNumber: "P-001",
    name: "Seal",
    description: "",
    unit: "piece",
    quantityOnHand: 10,
    reorderPoint: 3,
    unitCost: 100,
    active: true,
    createdAt: now,
    createdBy: actor,
    updatedAt: now,
    updatedBy: actor,
    version: 2,
    ...overrides,
  };
}

describe("InventoryDomainService", () => {
  it("receives stock and updates unit cost", () => {
    const result = service.move(
      part(),
      {
        partId: "part-1",
        type: "receive",
        quantity: 5,
        unitCost: 120,
        notes: "",
        expectedVersion: 2,
      },
      actor,
      now,
      { type: "manual", id: null },
    );

    expect(result.part.quantityOnHand).toBe(15);
    expect(result.part.unitCost).toBe(120);
    expect(result.movement.quantityAfter).toBe(15);
  });

  it("issues stock to a repair reference", () => {
    const result = service.move(
      part(),
      {
        partId: "part-1",
        type: "issue",
        quantity: 4,
        unitCost: null,
        notes: "",
        expectedVersion: 2,
      },
      actor,
      now,
      { type: "repair", id: "repair-1" },
    );

    expect(result.part.quantityOnHand).toBe(6);
    expect(result.movement.referenceType).toBe("repair");
  });

  it("supports signed stock adjustment", () => {
    const result = service.move(
      part(),
      {
        partId: "part-1",
        type: "adjustment",
        quantity: -2,
        unitCost: null,
        notes: "Count correction",
        expectedVersion: 2,
      },
      actor,
      now,
      { type: "manual", id: null },
    );
    expect(result.part.quantityOnHand).toBe(8);
  });

  it("rejects insufficient stock and stale versions", () => {
    expect(() =>
      service.move(
        part(),
        {
          partId: "part-1",
          type: "issue",
          quantity: 11,
          unitCost: null,
          notes: "",
          expectedVersion: 2,
        },
        actor,
        now,
        { type: "manual", id: null },
      ),
    ).toThrowError(InventoryError);

    expect(() =>
      service.move(
        part(),
        {
          partId: "part-1",
          type: "receive",
          quantity: 1,
          unitCost: null,
          notes: "",
          expectedVersion: 1,
        },
        actor,
        now,
        { type: "manual", id: null },
      ),
    ).toThrowError(InventoryError);
  });
});
