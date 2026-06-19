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
  branchId: string | null = null,
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
    branchId,
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
        doc(firestore, "users", "other-branch"),
        user("other-branch", "branch", "branch-2"),
      ),
      setDoc(
        doc(firestore, "users", "customer-user"),
        user("customer-user", "customer", null, "customer-1"),
      ),
      setDoc(doc(firestore, "repair_tickets", "repair-1"), {
        id: "repair-1",
        assignedTechnicianId: "technician-1",
        branchId: "branch-1",
        customerId: "customer-1",
        status: "in_progress",
        updatedAt: Timestamp.now(),
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

describe("Repair ticket rules", () => {
  it("allows only the assigned technician", async () => {
    await assertSucceeds(
      getDoc(
        doc(
          firestore("technician-1", "technician"),
          "repair_tickets",
          "repair-1",
        ),
      ),
    );
    await assertFails(
      getDoc(
        doc(
          firestore("technician-2", "technician"),
          "repair_tickets",
          "repair-1",
        ),
      ),
    );
  });

  it("scopes branch and customer reads", async () => {
    await assertSucceeds(
      getDoc(
        doc(firestore("branch-user", "branch"), "repair_tickets", "repair-1"),
      ),
    );
    await assertFails(
      getDoc(
        doc(firestore("other-branch", "branch"), "repair_tickets", "repair-1"),
      ),
    );
    await assertSucceeds(
      getDoc(
        doc(
          firestore("customer-user", "customer"),
          "repair_tickets",
          "repair-1",
        ),
      ),
    );
  });

  it("denies all direct client writes", async () => {
    await assertFails(
      setDoc(
        doc(
          firestore("technician-1", "technician"),
          "repair_tickets",
          "unauthorized",
        ),
        { status: "completed" },
      ),
    );
  });
});
