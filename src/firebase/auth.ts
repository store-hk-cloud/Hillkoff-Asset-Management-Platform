import {
  browserLocalPersistence,
  getAuth,
  setPersistence,
  type Auth,
} from "firebase/auth";

import { getFirebaseClientApp } from "@/firebase/client";

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseClientApp());
}

export async function initializeFirebaseAuth(): Promise<Auth> {
  const auth = getFirebaseAuth();
  await setPersistence(auth, browserLocalPersistence);
  return auth;
}
