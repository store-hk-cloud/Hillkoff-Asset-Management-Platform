import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

const PROJECT_ID = "demo-hillkoff-auth";
const USER_ID = "profile-owner";

let testEnvironment: RulesTestEnvironment;

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
    const now = Timestamp.now();

    await Promise.all([
      setDoc(doc(context.firestore(), "users", USER_ID), {
        uid: USER_ID,
        email: `${USER_ID}@example.com`,
        displayName: "Profile owner",
        phoneNumber: null,
        photoURL: null,
        role: "technician",
        status: "active",
        branchId: null,
        customerId: null,
        lastLoginAt: null,
        createdAt: now,
        updatedAt: now,
        version: 0,
      }),
      setDoc(doc(context.firestore(), "users", "other-technician"), {
        uid: "other-technician",
        email: "other-technician@example.com",
        displayName: "Other technician",
        phoneNumber: null,
        photoURL: null,
        role: "technician",
        status: "active",
        branchId: null,
        customerId: null,
        lastLoginAt: null,
        createdAt: now,
        updatedAt: now,
        version: 0,
      }),
      setDoc(doc(context.firestore(), "installations", "installation-1"), {
        id: "installation-1",
        assignedTechnicianId: USER_ID,
        customerId: "customer-1",
        status: "in_progress",
      }),
      setDoc(doc(context.firestore(), "repair_tickets", "repair-1"), {
        id: "repair-1",
        assignedTechnicianId: USER_ID,
        branchId: null,
        customerId: "customer-1",
        status: "in_progress",
      }),
    ]);
  });
});

afterAll(async () => {
  await testEnvironment.cleanup();
});

describe("Storage profile rules", () => {
  it("allows an owner to upload a valid profile image", async () => {
    const storage = testEnvironment
      .authenticatedContext(USER_ID, {
        role: "technician",
        email: `${USER_ID}@example.com`,
      })
      .storage();
    const file = ref(storage, `users/${USER_ID}/profile/avatar.png`);

    await assertSucceeds(
      uploadBytes(file, new Uint8Array([1, 2, 3]), {
        contentType: "image/png",
        customMetadata: { ownerUid: USER_ID },
      }),
    );
  });

  it("denies a non-image upload", async () => {
    const storage = testEnvironment
      .authenticatedContext(USER_ID, {
        role: "technician",
        email: `${USER_ID}@example.com`,
      })
      .storage();
    const file = ref(storage, `users/${USER_ID}/profile/avatar.txt`);

    await assertFails(
      uploadBytes(file, new Uint8Array([1, 2, 3]), {
        contentType: "text/plain",
        customMetadata: { ownerUid: USER_ID },
      }),
    );
  });

  it("denies another user from uploading to the owner's path", async () => {
    const storage = testEnvironment
      .authenticatedContext("another-user", {
        role: "technician",
        email: "another-user@example.com",
      })
      .storage();
    const file = ref(storage, `users/${USER_ID}/profile/avatar.png`);

    await assertFails(
      uploadBytes(file, new Uint8Array([1, 2, 3]), {
        contentType: "image/png",
        customMetadata: { ownerUid: "another-user" },
      }),
    );
  });
});

describe("Installation evidence storage rules", () => {
  it("allows the assigned technician to upload a valid photo", async () => {
    const storage = testEnvironment
      .authenticatedContext(USER_ID, {
        role: "technician",
        email: `${USER_ID}@example.com`,
      })
      .storage();
    const file = ref(
      storage,
      "installations/installation-1/photos/photo-1.jpg",
    );

    await assertSucceeds(
      uploadBytes(file, new Uint8Array([1, 2, 3]), {
        contentType: "image/jpeg",
        customMetadata: {
          installationId: "installation-1",
          uploadedBy: USER_ID,
        },
      }),
    );
  });

  it("denies an unassigned technician", async () => {
    const storage = testEnvironment
      .authenticatedContext("other-technician", {
        role: "technician",
        email: "other-technician@example.com",
      })
      .storage();
    const file = ref(
      storage,
      "installations/installation-1/photos/photo-2.jpg",
    );

    await assertFails(
      uploadBytes(file, new Uint8Array([1, 2, 3]), {
        contentType: "image/jpeg",
        customMetadata: {
          installationId: "installation-1",
          uploadedBy: "other-technician",
        },
      }),
    );
  });

  it("restricts signature path and content type", async () => {
    const storage = testEnvironment
      .authenticatedContext(USER_ID, {
        role: "technician",
        email: `${USER_ID}@example.com`,
      })
      .storage();
    const file = ref(
      storage,
      "installations/installation-1/signature/customer-signature.png",
    );

    await assertFails(
      uploadBytes(file, new Uint8Array([1, 2, 3]), {
        contentType: "text/plain",
        customMetadata: {
          installationId: "installation-1",
          uploadedBy: USER_ID,
        },
      }),
    );
  });
});

describe("Repair evidence storage rules", () => {
  it("allows the assigned technician to upload repair photos", async () => {
    const storage = testEnvironment
      .authenticatedContext(USER_ID, {
        role: "technician",
        email: `${USER_ID}@example.com`,
      })
      .storage();

    await assertSucceeds(
      uploadBytes(
        ref(storage, "repairs/repair-1/photos/photo-1.jpg"),
        new Uint8Array([1, 2, 3]),
        {
          contentType: "image/jpeg",
          customMetadata: {
            repairId: "repair-1",
            uploadedBy: USER_ID,
          },
        },
      ),
    );
  });

  it("denies an unassigned technician from uploading repair photos", async () => {
    const storage = testEnvironment
      .authenticatedContext("other-technician", {
        role: "technician",
        email: "other-technician@example.com",
      })
      .storage();

    await assertFails(
      uploadBytes(
        ref(storage, "repairs/repair-1/photos/photo-2.jpg"),
        new Uint8Array([1, 2, 3]),
        {
          contentType: "image/jpeg",
          customMetadata: {
            repairId: "repair-1",
            uploadedBy: "other-technician",
          },
        },
      ),
    );
  });
});
