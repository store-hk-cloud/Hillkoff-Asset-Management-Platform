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

function user(
  uid: string,
  role: string,
  warehouseId: string | null = null,
  customerId: string | null = null,
) {
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
    customerId,
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
        doc(firestore, "users", "technician-1"),
        user("technician-1", "technician"),
      ),
      setDoc(
        doc(firestore, "users", "technician-2"),
        user("technician-2", "technician"),
      ),
      setDoc(
        doc(firestore, "users", "branch-user"),
        user("branch-user", "branch", "branch-1"),
      ),
      setDoc(
        doc(firestore, "users", "customer-user"),
        user("customer-user", "customer", null, "customer-1"),
      ),
      setDoc(doc(firestore, "pm_jobs", "pm-1"), {
        id: "pm-1",
        assignedTechnicianId: "technician-1",
        warehouseId: "branch-1",
        customerId: "customer-1",
        status: "scheduled",
        scheduledAt: Timestamp.now(),
      }),
    ]);
  });
});

afterAll(async () => {
  await testEnvironment.cleanup();
});

function firestore(uid: string, role: string) {
  return testEnvironment
    .authenticatedContext(uid, {
      role,
      email: `${uid}@example.com`,
    })
    .firestore();
}

describe("PM rules", () => {
  it("allows only the assigned technician", async () => {
    await assertSucceeds(
      getDoc(doc(firestore("technician-1", "technician"), "pm_jobs", "pm-1")),
    );
    await assertFails(
      getDoc(doc(firestore("technician-2", "technician"), "pm_jobs", "pm-1")),
    );
  });

  it("allows scoped warehouse and customer reads", async () => {
    await assertSucceeds(
      getDoc(doc(firestore("branch-user", "branch"), "pm_jobs", "pm-1")),
    );
    await assertSucceeds(
      getDoc(doc(firestore("customer-user", "customer"), "pm_jobs", "pm-1")),
    );
  });

  it("denies direct client writes", async () => {
    await assertFails(
      setDoc(
        doc(firestore("technician-1", "technician"), "pm_jobs", "unauthorized"),
        { status: "completed" },
      ),
    );
  });
});
