import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";

import { getClientEnvironment } from "@/lib/env";

export function getFirebaseClientApp(): FirebaseApp {
  if (getApps().length > 0) {
    return getApp();
  }

  const environment = getClientEnvironment();

  return initializeApp({
    apiKey: environment.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: environment.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: environment.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: environment.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: environment.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: environment.NEXT_PUBLIC_FIREBASE_APP_ID,
  });
}
