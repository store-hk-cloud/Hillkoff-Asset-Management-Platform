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

function user(uid: string, role: string, customerId: string | null = null) {
  const now = Timestamp.now();
  return {
    uid,
    email: `${uid}@example.com`,
    displayName: uid,
    phoneNumber: null,
    photoURL: null,
    role,
    status: "active",
    branchId: null,
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
        doc(firestore, "users", "customer-user"),
        user("customer-user", "customer", "customer-1"),
      ),
      setDoc(
        doc(firestore, "users", "other-customer"),
        user("other-customer", "customer", "customer-2"),
      ),
      setDoc(doc(firestore, "installations", "installation-1"), {
        id: "installation-1",
        assignedTechnicianId: "technician-1",
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

function authenticated(uid: string, role: string) {
  return testEnvironment
    .authenticatedContext(uid, {
      role,
      email: `${uid}@example.com`,
    })
    .firestore();
}

describe("Installation rules", () => {
  it("allows only the assigned technician to read a job", async () => {
    await assertSucceeds(
      getDoc(
        doc(
          authenticated("technician-1", "technician"),
          "installations",
          "installation-1",
        ),
      ),
    );
    await assertFails(
      getDoc(
        doc(
          authenticated("technician-2", "technician"),
          "installations",
          "installation-1",
        ),
      ),
    );
  });

  it("scopes customer access by customer ID", async () => {
    await assertSucceeds(
      getDoc(
        doc(
          authenticated("customer-user", "customer"),
          "installations",
          "installation-1",
        ),
      ),
    );
    await assertFails(
      getDoc(
        doc(
          authenticated("other-customer", "customer"),
          "installations",
          "installation-1",
        ),
      ),
    );
  });

  it("denies direct client writes", async () => {
    await assertFails(
      setDoc(
        doc(
          authenticated("technician-1", "technician"),
          "installations",
          "unauthorized",
        ),
        { status: "completed" },
      ),
    );
  });
});
