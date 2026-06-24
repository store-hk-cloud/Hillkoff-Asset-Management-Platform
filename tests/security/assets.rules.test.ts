import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, Timestamp, updateDoc } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

const PROJECT_ID = "demo-hillkoff-auth";
let testEnvironment: RulesTestEnvironment;

function userDocument(
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

function assetDocument(
  id: string,
  warehouseId: string | null,
  customerId: string | null,
) {
  const now = Timestamp.now();

  return {
    id,
    assetCode: id.toUpperCase(),
    name: id,
    description: "",
    category: "machine",
    serialNumber: null,
    condition: "operational",
    status: "active",
    warehouseId,
    customerId,
    locationName: "",
    installedAt: null,
    documents: [],
    searchKeywords: [id],
    version: 0,
    createdAt: now,
    createdBy: "admin",
    updatedAt: now,
    updatedBy: "admin",
    archivedAt: null,
    archivedBy: null,
  };
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

  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const firestore = context.firestore();
    await Promise.all([
      setDoc(doc(firestore, "users", "admin"), userDocument("admin", "admin")),
      setDoc(
        doc(firestore, "users", "branch-user"),
        userDocument("branch-user", "branch", "branch-a"),
      ),
      setDoc(
        doc(firestore, "users", "customer-user"),
        userDocument("customer-user", "customer", null, "customer-a"),
      ),
      setDoc(
        doc(firestore, "assets", "asset-a"),
        assetDocument("asset-a", "branch-a", "customer-a"),
      ),
      setDoc(
        doc(firestore, "assets", "asset-b"),
        assetDocument("asset-b", "branch-b", "customer-b"),
      ),
      setDoc(doc(firestore, "asset_events", "event-a"), {
        id: "event-a",
        assetId: "asset-a",
        type: "created",
        occurredAt: Timestamp.now(),
      }),
    ]);
  });
});

afterAll(async () => {
  await testEnvironment.cleanup();
});

describe("Asset security rules", () => {
  it("allows admin to read an asset", async () => {
    const firestore = testEnvironment
      .authenticatedContext("admin", {
        role: "admin",
        email: "admin@example.com",
      })
      .firestore();

    await assertSucceeds(getDoc(doc(firestore, "assets", "asset-a")));
  });

  it("scopes branch users to their warehouse", async () => {
    const firestore = testEnvironment
      .authenticatedContext("branch-user", {
        role: "branch",
        email: "branch-user@example.com",
      })
      .firestore();

    await assertSucceeds(getDoc(doc(firestore, "assets", "asset-a")));
    await assertFails(getDoc(doc(firestore, "assets", "asset-b")));
  });

  it("scopes customer users to their customer", async () => {
    const firestore = testEnvironment
      .authenticatedContext("customer-user", {
        role: "customer",
        email: "customer-user@example.com",
      })
      .firestore();

    await assertSucceeds(getDoc(doc(firestore, "assets", "asset-a")));
    await assertFails(getDoc(doc(firestore, "assets", "asset-b")));
  });

  it("allows scoped users to read related asset events", async () => {
    const firestore = testEnvironment
      .authenticatedContext("customer-user", {
        role: "customer",
        email: "customer-user@example.com",
      })
      .firestore();

    await assertSucceeds(getDoc(doc(firestore, "asset_events", "event-a")));
  });

  it("denies all direct client asset writes", async () => {
    const firestore = testEnvironment
      .authenticatedContext("admin", {
        role: "admin",
        email: "admin@example.com",
      })
      .firestore();

    await assertFails(
      updateDoc(doc(firestore, "assets", "asset-a"), {
        name: "Unauthorized direct write",
      }),
    );
  });

  it("keeps asset catalog and serial registry server-only", async () => {
    const firestore = testEnvironment
      .authenticatedContext("admin", {
        role: "admin",
        email: "admin@example.com",
      })
      .firestore();

    await assertFails(getDoc(doc(firestore, "asset_catalog", "ASSET-A")));
    await assertFails(
      setDoc(doc(firestore, "asset_serials", "SN-001"), {
        assetId: "asset-a",
      }),
    );
  });
});
