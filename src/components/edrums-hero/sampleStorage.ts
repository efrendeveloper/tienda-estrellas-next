import { DrumInstrumentId } from "./types";

export interface StoredSample {
  laneId: DrumInstrumentId;
  fileName: string;
  buffer: ArrayBuffer;
  updatedAt: number;
}

const DB_NAME = "edrum_hero_db";
const DB_VERSION = 1;
const STORE_NAME = "drum_samples";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB no disponible"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "laneId" });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error("Error abriendo IndexedDB"));
    };
  });
}

export async function saveSampleToStorage(
  laneId: DrumInstrumentId,
  fileName: string,
  buffer: ArrayBuffer
): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);

      const record: StoredSample = {
        laneId,
        fileName,
        buffer,
        updatedAt: Date.now(),
      };

      const putRequest = store.put(record);
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    });
  } catch (err) {
    console.warn("No se pudo guardar el sample en IndexedDB:", err);
  }
}

export async function loadAllSamplesFromStorage(): Promise<StoredSample[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn("No se pudieron cargar samples desde IndexedDB:", err);
    return [];
  }
}

export async function deleteSampleFromStorage(laneId: DrumInstrumentId): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const delRequest = store.delete(laneId);

      delRequest.onsuccess = () => resolve();
      delRequest.onerror = () => reject(delRequest.error);
    });
  } catch (err) {
    console.warn("No se pudo eliminar el sample de IndexedDB:", err);
  }
}

export async function clearAllSamplesFromStorage(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const clearRequest = store.clear();

      clearRequest.onsuccess = () => resolve();
      clearRequest.onerror = () => reject(clearRequest.error);
    });
  } catch (err) {
    console.warn("No se pudieron limpiar los samples de IndexedDB:", err);
  }
}
