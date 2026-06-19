import "server-only";

import { getFirestore, type Firestore } from "firebase-admin/firestore";

import { getFirebaseAdminApp } from "@/firebase/admin";

export function getFirebaseAdminFirestore(): Firestore {
  return getFirestore(getFirebaseAdminApp());
}
