import { getStorage, type FirebaseStorage } from "firebase/storage";

import { getFirebaseClientApp } from "@/firebase/client";

export function getFirebaseStorage(): FirebaseStorage {
  return getStorage(getFirebaseClientApp());
}
