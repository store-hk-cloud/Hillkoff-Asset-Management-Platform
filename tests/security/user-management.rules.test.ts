import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  assertFails,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, Timestamp, updateDoc } from "firebase/firestore";
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
    await setDoc(
      doc(context.firestore(), "users", "admin"),
      user("admin", "admin"),
    );
  });
});

afterAll(async () => {
  await environment.cleanup();
});

describe("User management rules", () => {
  it("keeps privileged user creation on the server", async () => {
    const firestore = environment
      .authenticatedContext("admin", {
        role: "admin",
        email: "admin@example.com",
      })
      .firestore();

    await assertFails(
      setDoc(
        doc(firestore, "users", "employee"),
        user("employee", "technician"),
      ),
    );
  });

  it("denies direct role and status mutations even for administrators", async () => {
    const firestore = environment
      .authenticatedContext("admin", {
        role: "admin",
        email: "admin@example.com",
      })
      .firestore();

    await assertFails(
      updateDoc(doc(firestore, "users", "admin"), {
        role: "warehouse",
        status: "disabled",
        updatedAt: Timestamp.now(),
        version: 1,
      }),
    );
  });

  it("keeps invitation tokens server-only", async () => {
    const firestore = environment
      .authenticatedContext("admin", {
        role: "admin",
        email: "admin@example.com",
      })
      .firestore();

    await assertFails(getDoc(doc(firestore, "user_invitations", "token-hash")));
    await assertFails(
      setDoc(doc(firestore, "user_invitations", "token-hash"), {
        userId: "employee",
        status: "pending",
      }),
    );
  });
});
