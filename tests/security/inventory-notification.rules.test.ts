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
let environment: RulesTestEnvironment;

function user(uid: string, role: string) {
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
    customerId: null,
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now,
    version: 0,
  };
}

beforeAll(async () => {
  environment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync(resolve("firestore.rules"), "utf8") },
  });
});

beforeEach(async () => {
  await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(async (context) => {
    await Promise.all([
      setDoc(
        doc(context.firestore(), "users", "warehouse"),
        user("warehouse", "warehouse"),
      ),
      setDoc(
        doc(context.firestore(), "users", "technician"),
        user("technician", "technician"),
      ),
      setDoc(
        doc(context.firestore(), "users", "other-technician"),
        user("other-technician", "technician"),
      ),
      setDoc(
        doc(context.firestore(), "users", "executive"),
        user("executive", "executive"),
      ),
      setDoc(doc(context.firestore(), "inventory_parts", "part-1"), {
        id: "part-1",
        partNumber: "P-001",
      }),
      setDoc(doc(context.firestore(), "inventory_movements", "move-1"), {
        id: "move-1",
      }),
      setDoc(doc(context.firestore(), "notification_queue", "notice-1"), {
        id: "notice-1",
        recipientUserIds: ["technician"],
        createdAt: Timestamp.now(),
      }),
    ]);
  });
});

afterAll(async () => {
  await environment.cleanup();
});

function firestore(uid: string, role: string) {
  return environment
    .authenticatedContext(uid, { role, email: `${uid}@example.com` })
    .firestore();
}

describe("Inventory and notification rules", () => {
  it("allows operational inventory reads but denies direct writes", async () => {
    await assertSucceeds(
      getDoc(
        doc(firestore("technician", "technician"), "inventory_parts", "part-1"),
      ),
    );
    await assertSucceeds(
      getDoc(
        doc(
          firestore("warehouse", "warehouse"),
          "inventory_movements",
          "move-1",
        ),
      ),
    );
    await assertFails(
      setDoc(
        doc(firestore("warehouse", "warehouse"), "inventory_parts", "part-2"),
        { partNumber: "P-002" },
      ),
    );
  });

  it("allows only the assigned technician and executive/admin to read notifications", async () => {
    await assertSucceeds(
      getDoc(
        doc(
          firestore("executive", "executive"),
          "notification_queue",
          "notice-1",
        ),
      ),
    );
    await assertSucceeds(
      getDoc(
        doc(
          firestore("technician", "technician"),
          "notification_queue",
          "notice-1",
        ),
      ),
    );
    await assertFails(
      getDoc(
        doc(
          firestore("other-technician", "technician"),
          "notification_queue",
          "notice-1",
        ),
      ),
    );
    await assertFails(
      setDoc(
        doc(
          firestore("executive", "executive"),
          "notification_queue",
          "notice-2",
        ),
        { status: "pending" },
      ),
    );
  });
});
