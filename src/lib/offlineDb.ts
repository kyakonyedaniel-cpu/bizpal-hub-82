const DB_NAME = 'smartbiz-offline';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('offline_sales')) {
        db.createObjectStore('offline_sales', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('offline_expenses')) {
        db.createObjectStore('offline_expenses', { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveOfflineSale(sale: any) {
  const db = await openDB();
  const tx = db.transaction('offline_sales', 'readwrite');
  tx.objectStore('offline_sales').add({ ...sale, _offline: true, _timestamp: Date.now() });
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveOfflineExpense(expense: any) {
  const db = await openDB();
  const tx = db.transaction('offline_expenses', 'readwrite');
  tx.objectStore('offline_expenses').add({ ...expense, _offline: true, _timestamp: Date.now() });
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getOfflineSales(): Promise<any[]> {
  const db = await openDB();
  const tx = db.transaction('offline_sales', 'readonly');
  const store = tx.objectStore('offline_sales');
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getOfflineExpenses(): Promise<any[]> {
  const db = await openDB();
  const tx = db.transaction('offline_expenses', 'readonly');
  const store = tx.objectStore('offline_expenses');
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function clearOfflineSales() {
  const db = await openDB();
  const tx = db.transaction('offline_sales', 'readwrite');
  tx.objectStore('offline_sales').clear();
}

export async function clearOfflineExpenses() {
  const db = await openDB();
  const tx = db.transaction('offline_expenses', 'readwrite');
  tx.objectStore('offline_expenses').clear();
}
