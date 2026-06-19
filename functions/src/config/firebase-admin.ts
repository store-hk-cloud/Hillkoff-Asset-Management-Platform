import { getApp, getApps, initializeApp, type App } from "firebase-admin/app";

export function getFunctionsAdminApp(): App {
  return getApps().length > 0 ? getApp() : initializeApp();
}
