// Polyfill IndexedDB for Node.js test environment
import { indexedDB, IDBCursor, IDBKeyRange, IDBRequest, IDBTransaction, IDBFactory, IDBIndex, IDBObjectStore, IDBVersionChangeEvent, IDBDatabase, IDBOpenDBRequest } from 'fake-indexeddb';

globalThis.indexedDB = indexedDB;
globalThis.IDBCursor = IDBCursor;
globalThis.IDBKeyRange = IDBKeyRange;
globalThis.IDBRequest = IDBRequest;
globalThis.IDBTransaction = IDBTransaction;
globalThis.IDBFactory = IDBFactory;
globalThis.IDBIndex = IDBIndex;
globalThis.IDBObjectStore = IDBObjectStore;
globalThis.IDBVersionChangeEvent = IDBVersionChangeEvent;
globalThis.IDBDatabase = IDBDatabase;
globalThis.IDBOpenDBRequest = IDBOpenDBRequest;
