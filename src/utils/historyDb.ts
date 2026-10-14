import { NormalizedAdItem, RawBulkRow } from '../types/amazon';

export interface HistoryRecord {
  id: string;
  fileName: string;
  uploadTime: string; // formatted e.g. "2026-10-14 12:45:20"
  itemCount: number;
  totalSpend: number;
  totalSales: number;
  overallAcos: number;
  items: NormalizedAdItem[];
  rawRows: RawBulkRow[];
  sheetName: string;
}

const DB_NAME = 'xiaolin_amz_history_db';
const STORE_NAME = 'history_reports';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result as IDBDatabase;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveHistoryReport(record: HistoryRecord): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(record);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getHistoryReports(): Promise<HistoryRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const records = request.result as HistoryRecord[];
      // Sort newest first
      records.sort((a, b) => new Date(b.uploadTime).getTime() - new Date(a.uploadTime).getTime());
      resolve(records);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deleteHistoryReport(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearAllHistoryReports(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
