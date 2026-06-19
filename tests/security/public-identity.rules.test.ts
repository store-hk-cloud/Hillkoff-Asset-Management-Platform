import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  assertFails,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { collection, getDocs } from "firebase/firestore";
import { afterAll, beforeAll, describe, it } from "vitest";

let environment: RulesTestEnvironment;

beforeAll(async () => {
  environment = await initializeTestEnvironment({
    projectId: "demo-hillkoff-auth",
    firestore: {
      rules: readFileSync(resolve("firestore.rules"), "utf8"),
    },
  });
});

afterAll(async () => environment.cleanup());

describe("Public identity rules", () => {
  it("does not expose assets or NFC registrations anonymously", async () => {
    const firestore = environment.unauthenticatedContext().firestore();
    await assertFails(getDocs(collection(firestore, "assets")));
    await assertFails(getDocs(collection(firestore, "nfc_registrations")));
  });
});
