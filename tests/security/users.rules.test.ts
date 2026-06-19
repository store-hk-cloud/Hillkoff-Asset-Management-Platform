import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  collection,
} from "firebase/firestore";
import { beforeAll, beforeEach, afterAll, describe, expect, it } from "vitest";

const PROJECT_ID = "demo-hillkoff-auth";
const USERS = {
  admin: "admin-user",
  technician: "technician-user",
  disabled: "disabled-user",
} as const;

let testEnvironment: RulesTestEnvironment;

function userDocument(
  uid: string,
  role: string,
  status: "active" | "disabled" = "active",
) {
  const now = Timestamp.fromDate(new Date("2026-06-19T00:00:00.000Z"));

  return {
    uid,
    email: `${uid}@example.com`,
    displayName: uid,
    phoneNumber: null,
    photoURL: null,
    role,
    status,
    branchId: null,
    customerId: null,
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now,
    version: 0,
  };
}

function authenticatedFirestore(
  uid: string,
  role: string,
  email = `${uid}@example.com`,
) {
  return testEnvironment.authenticatedContext(uid, { role, email }).firestore();
}

beforeAll(async () => {
  testEnvironment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(resolve("firestore.rules"), "utf8"),
    },
    storage: {
      rules: readFileSync(resolve("storage.rules"), "utf8"),
    },
  });
});

beforeEach(async () => {
  await testEnvironment.clearFirestore();
  await testEnvironment.clearStorage();

  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const firestore = context.firestore();

    await Promise.all([
      setDoc(
        doc(firestore, "users", USERS.admin),
        userDocument(USERS.admin, "admin"),
      ),
      setDoc(
        doc(firestore, "users", USERS.technician),
        userDocument(USERS.technician, "technician"),
      ),
      setDoc(
        doc(firestore, "users", USERS.disabled),
        userDocument(USERS.disabled, "warehouse", "disabled"),
      ),
    ]);
  });
});

afterAll(async () => {
  await testEnvironment.cleanup();
});

describe("Firestore users rules", () => {
  it("allows an active user to read their own profile", async () => {
    const firestore = authenticatedFirestore(USERS.technician, "technician");

    await assertSucceeds(getDoc(doc(firestore, "users", USERS.technician)));
  });

  it("denies another non-admin user from reading a profile", async () => {
    const firestore = authenticatedFirestore(USERS.technician, "technician");

    await assertFails(getDoc(doc(firestore, "users", USERS.admin)));
  });

  it("allows an active admin to list profiles", async () => {
    const firestore = authenticatedFirestore(USERS.admin, "admin");
    const snapshot = await assertSucceeds(
      getDocs(collection(firestore, "users")),
    );

    expect(snapshot.size).toBe(3);
  });

  it("allows profile-safe fields and version to be updated", async () => {
    const firestore = authenticatedFirestore(USERS.technician, "technician");

    await assertSucceeds(
      updateDoc(doc(firestore, "users", USERS.technician), {
        displayName: "Updated technician",
        updatedAt: serverTimestamp(),
        version: 1,
      }),
    );
  });

  it("denies role escalation", async () => {
    const firestore = authenticatedFirestore(USERS.technician, "technician");

    await assertFails(
      updateDoc(doc(firestore, "users", USERS.technician), {
        role: "admin",
        updatedAt: serverTimestamp(),
        version: 1,
      }),
    );
  });

  it("denies disabled users", async () => {
    const firestore = authenticatedFirestore(USERS.disabled, "warehouse");

    await assertFails(getDoc(doc(firestore, "users", USERS.disabled)));
  });

  it("denies unauthenticated reads", async () => {
    const firestore = testEnvironment.unauthenticatedContext().firestore();

    await assertFails(getDoc(doc(firestore, "users", USERS.technician)));
  });
});
