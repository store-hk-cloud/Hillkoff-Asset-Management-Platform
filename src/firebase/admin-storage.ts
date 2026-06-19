import "server-only";

import { getStorage, type Storage } from "firebase-admin/storage";

import { getFirebaseAdminApp } from "@/firebase/admin";

export function getFirebaseAdminStorage(): Storage {
  return getStorage(getFirebaseAdminApp());
}
