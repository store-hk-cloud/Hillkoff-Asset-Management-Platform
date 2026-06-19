import { getFirestore, type Firestore } from "firebase/firestore";

import { getFirebaseClientApp } from "@/firebase/client";

export function getFirebaseFirestore(): Firestore {
  return getFirestore(getFirebaseClientApp());
}
