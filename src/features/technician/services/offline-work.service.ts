"use client";

const DATABASE_NAME = "hillkoff-technician-offline";
const STORE_NAME = "work-drafts";
const VERSION = 1;

export interface OfflineWorkDraft<T> {
  readonly key: string;
  readonly payload: T;
  readonly files: readonly File[];
  readonly updatedAt: string;
}

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function read<T>(key: string): Promise<OfflineWorkDraft<T> | null> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(key);
    request.onsuccess = () =>
      resolve((request.result as OfflineWorkDraft<T> | undefined) ?? null);
    request.onerror = () => reject(request.error);
  });
}

async function write<T>(draft: OfflineWorkDraft<T>): Promise<void> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(draft);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function loadOfflineDraft<T>(
  key: string,
): Promise<OfflineWorkDraft<T> | null> {
  return read<T>(key);
}

export async function saveOfflinePayload<T>(
  key: string,
  payload: T,
): Promise<void> {
  const current = await read<T>(key);
  await write({
    key,
    payload,
    files: current?.files ?? [],
    updatedAt: new Date().toISOString(),
  });
}

export async function queueOfflineFiles<T>(
  key: string,
  files: readonly File[],
  fallbackPayload: T,
): Promise<number> {
  const current = await read<T>(key);
  const queued = [...(current?.files ?? []), ...files];
  await write({
    key,
    payload: current?.payload ?? fallbackPayload,
    files: queued,
    updatedAt: new Date().toISOString(),
  });
  return queued.length;
}

export async function clearOfflineFiles<T>(key: string): Promise<void> {
  const current = await read<T>(key);
  if (!current) return;
  await write({ ...current, files: [], updatedAt: new Date().toISOString() });
}

export async function deleteOfflineDraft(key: string): Promise<void> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}
