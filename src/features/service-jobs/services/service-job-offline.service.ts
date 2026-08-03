"use client";

export type OfflineServiceJobDraft<T> = {
  readonly key: string;
  readonly jobId: string;
  readonly serverVersion: number;
  readonly payload: T;
  readonly updatedAt: string;
};

const DB = "hillkoff-service-job-offline";
const STORE = "drafts";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore(STORE, { keyPath: "key" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveServiceJobDraft<T>(
  draft: Omit<OfflineServiceJobDraft<T>, "updatedAt">,
) {
  const db = await openDb();
  const value = { ...draft, updatedAt: new Date().toISOString() };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  return value;
}

export async function loadServiceJobDraft<T>(
  key: string,
): Promise<OfflineServiceJobDraft<T> | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db
      .transaction(STORE, "readonly")
      .objectStore(STORE)
      .get(key);
    request.onsuccess = () =>
      resolve(
        (request.result as OfflineServiceJobDraft<T> | undefined) ?? null,
      );
    request.onerror = () => reject(request.error);
  });
}

export async function deleteServiceJobDraft(key: string) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function assertOnlineOnlyAction(
  action: "check_in" | "check_out" | "approve" | "issue" | "handoff" | "close",
  online = typeof navigator === "undefined" || navigator.onLine,
) {
  if (!online) {
    throw new Error(
      `${action} ต้องเชื่อมต่ออินเทอร์เน็ต / requires an online connection.`,
    );
  }
}
