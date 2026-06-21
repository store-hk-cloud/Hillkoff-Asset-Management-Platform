import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";

import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const MINIMUM_PASSWORD_LENGTH = 12;

function readArgument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function printHelp() {
  console.log(`Provision the first Hillkoff administrator.

Usage:
  npm run auth:provision-admin
  npm run auth:provision-admin -- --email admin@hillkoff.com --display-name "Admin"

Credentials:
  Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and
  FIREBASE_ADMIN_PRIVATE_KEY, or use Google Application Default Credentials.

Optional non-interactive variables:
  HILLKOFF_ADMIN_EMAIL
  HILLKOFF_ADMIN_DISPLAY_NAME
  HILLKOFF_ADMIN_PASSWORD`);
}

function validateEmail(value) {
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a valid administrator email address.");
  }
  return email;
}

function validateDisplayName(value) {
  const displayName = value.trim();
  if (displayName.length === 0 || displayName.length > 120) {
    throw new Error("Display name must contain between 1 and 120 characters.");
  }
  return displayName;
}

function validatePassword(value) {
  if (value.length < MINIMUM_PASSWORD_LENGTH) {
    throw new Error(
      `Password must contain at least ${MINIMUM_PASSWORD_LENGTH} characters.`,
    );
  }
  return value;
}

async function askHidden(prompt) {
  if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
    throw new Error(
      "Interactive password entry requires a terminal. Set HILLKOFF_ADMIN_PASSWORD for a non-interactive run.",
    );
  }

  stdout.write(prompt);
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding("utf8");

  return new Promise((resolve, reject) => {
    let value = "";

    function cleanup() {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener("data", onData);
    }

    function onData(character) {
      if (character === "\u0003") {
        cleanup();
        stdout.write("\n");
        reject(new Error("Provisioning cancelled."));
        return;
      }

      if (character === "\r" || character === "\n") {
        cleanup();
        stdout.write("\n");
        resolve(value);
        return;
      }

      if (character === "\u007f" || character === "\b") {
        if (value.length > 0) {
          value = value.slice(0, -1);
          stdout.write("\b \b");
        }
        return;
      }

      if (character >= " ") {
        value += character;
        stdout.write("*");
      }
    }

    stdin.on("data", onData);
  });
}

function initializeAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID ??
    process.env.GOOGLE_CLOUD_PROJECT ??
    undefined;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  const explicitCredentialValues = [
    process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail,
    privateKey,
  ];
  const hasAnyExplicitCredential = explicitCredentialValues.some(Boolean);
  const hasAllExplicitCredentials = explicitCredentialValues.every(Boolean);

  if (hasAnyExplicitCredential && !hasAllExplicitCredentials) {
    throw new Error(
      "FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY must be provided together.",
    );
  }

  if (projectId && clientEmail && privateKey) {
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, "\n"),
      }),
      projectId,
    });
  }

  return initializeApp({
    credential: applicationDefault(),
    ...(projectId ? { projectId } : {}),
  });
}

async function getInput() {
  const terminal = createInterface({ input: stdin, output: stdout });

  try {
    const email = validateEmail(
      readArgument("--email") ??
        process.env.HILLKOFF_ADMIN_EMAIL ??
        (await terminal.question("Admin email: ")),
    );
    const displayName = validateDisplayName(
      readArgument("--display-name") ??
        process.env.HILLKOFF_ADMIN_DISPLAY_NAME ??
        (await terminal.question("Display name: ")),
    );

    terminal.close();

    const environmentPassword = process.env.HILLKOFF_ADMIN_PASSWORD;
    const password = validatePassword(
      environmentPassword ?? (await askHidden("Password: ")),
    );

    if (!environmentPassword) {
      const confirmation = await askHidden("Confirm password: ");
      if (password !== confirmation) {
        throw new Error("Passwords do not match.");
      }
    }

    return { email, displayName, password };
  } finally {
    terminal.close();
  }
}

async function provisionAdmin({ email, displayName, password }) {
  const app = initializeAdminApp();
  const auth = getAuth(app);
  const firestore = getFirestore(app);
  let user;
  let created = false;

  try {
    user = await auth.getUserByEmail(email);
    user = await auth.updateUser(user.uid, {
      email,
      password,
      displayName,
      disabled: false,
    });
  } catch (error) {
    if (error?.code !== "auth/user-not-found") {
      throw error;
    }

    user = await auth.createUser({
      email,
      password,
      displayName,
      disabled: false,
    });
    created = true;
  }

  await auth.setCustomUserClaims(user.uid, {
    ...(user.customClaims ?? {}),
    role: "admin",
  });

  const profileReference = firestore.collection("users").doc(user.uid);
  await firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(profileReference);
    const current = snapshot.data();
    const now = Timestamp.now();
    const currentVersion = current?.version;
    const version =
      Number.isSafeInteger(currentVersion) && currentVersion >= 0
        ? currentVersion + 1
        : 0;

    transaction.set(profileReference, {
      uid: user.uid,
      email,
      displayName,
      phoneNumber:
        typeof current?.phoneNumber === "string" ? current.phoneNumber : null,
      photoURL: typeof current?.photoURL === "string" ? current.photoURL : null,
      role: "admin",
      status: "active",
      warehouseId: null,
      customerId: null,
      lastLoginAt:
        current?.lastLoginAt instanceof Timestamp ? current.lastLoginAt : null,
      createdAt:
        current?.createdAt instanceof Timestamp ? current.createdAt : now,
      updatedAt: now,
      version,
    });
  });

  await auth.revokeRefreshTokens(user.uid);

  return { uid: user.uid, email, created };
}

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  printHelp();
  process.exit(0);
}

try {
  const input = await getInput();
  const result = await provisionAdmin(input);
  console.log(
    `${result.created ? "Created" : "Updated"} active admin ${result.email} (${result.uid}).`,
  );
  console.log("Sign in again to obtain the new admin role claim.");
} catch (error) {
  console.error(
    error instanceof Error ? `Provisioning failed: ${error.message}` : error,
  );
  process.exitCode = 1;
}
