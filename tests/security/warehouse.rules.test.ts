import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

const PROJECT_ID = "demo-hillkoff-auth";
let testEnvironment: RulesTestEnvironment;

function user(uid: string, role: string, warehouseId: string | null = null) {
  const now = Timestamp.now();
  return {
    uid,
    email: `${uid}@example.com`,
    displayName: uid,
    phoneNumber: null,
    photoURL: null,
    role,
    status: "active",
    warehouseId,
    customerId: null,
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now,
    version: 0,
  };
}

beforeAll(async () => {
  testEnvironment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(resolve("firestore.rules"), "utf8"),
    },
  });
});

beforeEach(async () => {
  await testEnvironment.clearFirestore();
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const firestore = context.firestore();
    await Promise.all([
      setDoc(
        doc(firestore, "users", "warehouse"),
        user("warehouse", "warehouse"),
      ),
      setDoc(
        doc(firestore, "users", "branch-a-user"),
        user("branch-a-user", "branch", "branch-a"),
      ),
      setDoc(
        doc(firestore, "users", "branch-c-user"),
        user("branch-c-user", "branch", "branch-c"),
      ),
      setDoc(doc(firestore, "movement_logs", "movement-1"), {
        id: "movement-1",
        involvedWarehouseIds: ["branch-a", "branch-b"],
        occurredAt: Timestamp.now(),
      }),
    ]);
  });
});

afterAll(async () => {
  await testEnvironment.cleanup();
});

describe("Warehouse movement rules", () => {
  it("allows warehouse users to read movement logs", async () => {
    const firestore = testEnvironment
      .authenticatedContext("warehouse", {
        role: "warehouse",
        email: "warehouse@example.com",
      })
      .firestore();

    await assertSucceeds(getDoc(doc(firestore, "movement_logs", "movement-1")));
  });

  it("allows an involved branch to read movement logs", async () => {
    const firestore = testEnvironment
      .authenticatedContext("branch-a-user", {
        role: "branch",
        email: "branch-a-user@example.com",
      })
      .firestore();

    await assertSucceeds(getDoc(doc(firestore, "movement_logs", "movement-1")));
  });

  it("denies an unrelated branch", async () => {
    const firestore = testEnvironment
      .authenticatedContext("branch-c-user", {
        role: "branch",
        email: "branch-c-user@example.com",
      })
      .firestore();

    await assertFails(getDoc(doc(firestore, "movement_logs", "movement-1")));
  });

  it("denies all direct client movement writes", async () => {
    const firestore = testEnvironment
      .authenticatedContext("warehouse", {
        role: "warehouse",
        email: "warehouse@example.com",
      })
      .firestore();

    await assertFails(
      setDoc(doc(firestore, "movement_logs", "unauthorized"), {
        involvedWarehouseIds: [],
        occurredAt: Timestamp.now(),
      }),
    );
  });
});
