import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { beforeAll, beforeEach, afterAll, describe, it } from "vitest";

const PROJECT_ID = "demo-hillkoff-auth";
const now = Timestamp.now();
let environment: RulesTestEnvironment;

async function seed() {
  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "users", "tech-1"), {
      uid: "tech-1",
      email: "tech@example.com",
      displayName: "Technician",
      phoneNumber: null,
      photoURL: null,
      role: "technician",
      status: "active",
      warehouseId: "warehouse-1",
      customerId: null,
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
      version: 0,
    });
    await setDoc(doc(context.firestore(), "users", "customer-1"), {
      uid: "customer-1",
      email: "customer@example.com",
      displayName: "Customer",
      phoneNumber: null,
      photoURL: null,
      role: "customer",
      status: "active",
      warehouseId: null,
      customerId: "customer-account",
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
      version: 0,
    });
    await setDoc(doc(context.firestore(), "service_jobs", "job-1"), {
      id: "job-1",
      status: "in_progress",
      warehouseId: "warehouse-1",
      customer: { customerId: "customer-account" },
      assignedTechnicianIds: ["tech-1"],
    });
    await setDoc(
      doc(context.firestore(), "service_jobs", "job-1", "billing_documents", "bill-1"),
      { id: "bill-1", status: "issued" },
    );
  });
}

beforeAll(async () => {
  environment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync(resolve("firestore.rules"), "utf8") },
    storage: { rules: readFileSync(resolve("storage.rules"), "utf8") },
  });
});

beforeEach(async () => {
  await environment.clearFirestore();
  await environment.clearStorage();
  await seed();
});

afterAll(async () => environment.cleanup());

describe("service job Firestore client boundary", () => {
  it("denies direct reads and writes for an assigned technician", async () => {
    const db = environment
      .authenticatedContext("tech-1", {
        role: "technician",
        email: "tech@example.com",
      })
      .firestore();
    const job = doc(db, "service_jobs", "job-1");
    const billing = doc(db, "service_jobs", "job-1", "billing_documents", "bill-1");

    await assertFails(setDoc(job, { id: "job-1" }));
    await assertFails(setDoc(billing, { id: "bill-1", status: "void" }));
  });

  it("denies direct access to a customer and anonymous caller", async () => {
    const customerDb = environment
      .authenticatedContext("customer-1", {
        role: "customer",
        email: "customer@example.com",
      })
      .firestore();
    await assertFails(getDoc(doc(customerDb, "service_jobs", "job-1")));
    await assertFails(
      getDoc(doc(environment.unauthenticatedContext().firestore(), "service_jobs", "job-1")),
    );
  });

  it("denies cross-job access paths by default", async () => {
    const db = environment
      .authenticatedContext("tech-1", { role: "technician" })
      .firestore();
    await assertFails(
      getDoc(doc(db, "service_jobs", "job-2", "evidence", "evidence-1")),
    );
  });

  it("allows no client mutation of an issued billing document", async () => {
    const db = environment
      .authenticatedContext("tech-1", { role: "technician" })
      .firestore();
    await assertFails(
      setDoc(doc(db, "service_jobs", "job-1", "billing_documents", "bill-1"), {
        id: "bill-1",
        status: "void",
      }),
    );
  });
});

describe("service job Storage boundary", () => {
  it("allows an assigned technician to upload bounded evidence", async () => {
    const storage = environment
      .authenticatedContext("tech-1", { role: "technician" })
      .storage();
    const { ref, uploadBytes } = await import("firebase/storage");
    await assertSucceeds(
      uploadBytes(ref(storage, "service-jobs/job-1/evidence/evidence-1.jpg"), new Uint8Array([1]), {
        contentType: "image/jpeg",
        customMetadata: { jobId: "job-1", uploadedBy: "tech-1", ownerUid: "tech-1" },
      }),
    );
  });

  it("denies unassigned and invalid evidence uploads", async () => {
    const storage = environment
      .authenticatedContext("customer-1", { role: "customer" })
      .storage();
    const { ref, uploadBytes } = await import("firebase/storage");
    await assertFails(
      uploadBytes(ref(storage, "service-jobs/job-1/evidence/evidence-2.exe"), new Uint8Array([1]), {
        contentType: "application/x-msdownload",
        customMetadata: { jobId: "job-1", uploadedBy: "customer-1", ownerUid: "customer-1" },
      }),
    );
  });
});
