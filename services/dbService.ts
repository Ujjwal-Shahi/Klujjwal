
import { AuditEntry } from '../types';

const DB_NAME = 'NoBrokerCallAnalyzerDB';
const DB_VERSION = 2;
const AUDIT_STORE_NAME = 'auditHistory';
const AGENTS_STORE_NAME = 'agents';
const AUDITORS_STORE_NAME = 'auditors';

let db: IDBDatabase;

const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        if (db) {
            return resolve(db);
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error("Database error:", request.error);
            reject("Error opening database");
        };

        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const dbInstance = (event.target as IDBOpenDBRequest).result;
            const oldVersion = event.oldVersion;

            if (oldVersion < 1) {
                if (!dbInstance.objectStoreNames.contains(AUDIT_STORE_NAME)) {
                    dbInstance.createObjectStore(AUDIT_STORE_NAME, { keyPath: 'id' });
                }
                if (!dbInstance.objectStoreNames.contains(AGENTS_STORE_NAME)) {
                    dbInstance.createObjectStore(AGENTS_STORE_NAME);
                }
                 if (!dbInstance.objectStoreNames.contains(AUDITORS_STORE_NAME)) {
                    dbInstance.createObjectStore(AUDITORS_STORE_NAME);
                }
            }
            if (oldVersion < 2) {
                const transaction = (event.target as IDBOpenDBRequest).transaction;
                if(transaction) {
                    const auditStore = transaction.objectStore(AUDIT_STORE_NAME);
                    if (!auditStore.indexNames.contains('audioHash')) {
                        auditStore.createIndex('audioHash', 'audioHash', { unique: false });
                    }
                }
            }
        };
    });
};

// --- Audit History Functions ---

export const getAllAuditEntries = async (): Promise<AuditEntry[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(AUDIT_STORE_NAME, 'readonly');
        const store = transaction.objectStore(AUDIT_STORE_NAME);
        const request = store.getAll();

        request.onerror = () => reject("Error fetching audit entries");
        request.onsuccess = () => resolve(request.result);
    });
};

export const getAuditEntryByHash = async (hash: string): Promise<AuditEntry | undefined> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(AUDIT_STORE_NAME, 'readonly');
        const store = transaction.objectStore(AUDIT_STORE_NAME);
        const index = store.index('audioHash');
        const request = index.get(hash);

        request.onerror = () => reject("Error fetching audit entry by hash");
        request.onsuccess = () => resolve(request.result);
    });
};

export const addAuditEntry = async (entry: AuditEntry): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(AUDIT_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(AUDIT_STORE_NAME);
        store.add(entry);

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => {
            console.error("Transaction error in addAuditEntry:", transaction.error);
            reject("Error adding audit entry");
        };
    });
};

export const updateAuditEntry = async (entry: AuditEntry): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(AUDIT_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(AUDIT_STORE_NAME);
        store.put(entry); // .put() will add or update the record based on its key

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => {
            console.error("Transaction error in updateAuditEntry:", transaction.error);
            reject("Error updating audit entry");
        };
    });
};

export const clearAuditEntries = async (): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(AUDIT_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(AUDIT_STORE_NAME);
        store.clear();

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => {
            console.error("Transaction error in clearAuditEntries:", transaction.error);
            reject("Error clearing audit entries");
        };
    });
};

export const bulkAddAuditEntries = async (entries: AuditEntry[]): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(AUDIT_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(AUDIT_STORE_NAME);

        entries.forEach(entry => store.put(entry)); // Use put to overwrite existing entries with same ID

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => {
            console.error("Transaction error in bulkAddAuditEntries:", transaction.error);
            reject("Error bulk adding audit entries");
        };
    });
};

// --- Agents/Auditors Functions ---

const getList = async (storeName: string): Promise<string[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get('list'); // Use a fixed key 'list'

        request.onerror = () => reject(`Error fetching from ${storeName}`);
        request.onsuccess = () => resolve(request.result || []);
    });
};

const saveList = async (storeName: string, list: string[]): Promise<void> => {
     const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        store.put(list, 'list');

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => {
            console.error(`Transaction error in saveList for ${storeName}:`, transaction.error);
            reject(`Error saving to ${storeName}`);
        };
    });
};

export const getAgents = () => getList(AGENTS_STORE_NAME);
export const saveAgents = (agents: string[]) => saveList(AGENTS_STORE_NAME, agents);
export const getAuditors = () => getList(AUDITORS_STORE_NAME);
export const saveAuditors = (auditors: string[]) => saveList(AUDITORS_STORE_NAME, auditors);
