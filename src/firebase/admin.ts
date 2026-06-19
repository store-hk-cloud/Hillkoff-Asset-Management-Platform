import "server-only";

import {
  applicationDefault,
  cert,
  getApp,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";

import { getServerEnvironment } from "@/lib/env";

export function getFirebaseAdminApp(): App {
  if (getApps().length > 0) {
    return getApp();
  }

  const environment = getServerEnvironment();
  const projectId =
    environment.FIREBASE_ADMIN_PROJECT_ID ?? environment.GOOGLE_CLOUD_PROJECT;

  if (
    environment.FIREBASE_ADMIN_PROJECT_ID &&
    environment.FIREBASE_ADMIN_CLIENT_EMAIL &&
    environment.FIREBASE_ADMIN_PRIVATE_KEY
  ) {
    return initializeApp({
      credential: cert({
        projectId: environment.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: environment.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: environment.FIREBASE_ADMIN_PRIVATE_KEY.replace(
          /\\n/g,
          "\n",
        ),
      }),
      projectId: environment.FIREBASE_ADMIN_PROJECT_ID,
    });
  }

  return initializeApp({
    credential: applicationDefault(),
    ...(projectId ? { projectId } : {}),
  });
}
