/**
 * IndexedDB Storage for Merkle Tree Snapshots
 * Persistent storage for change detection across sessions
 */

import { MerkleNode } from '../merkle/MerkleNode';

const DB_NAME = 'CodeEditorDB';
const DB_VERSION = 1;
const STORE_NAME = 'merkle_snapshots';

export interface SnapshotData {
  projectId: string;
  tree: any; // JSON representation of MerkleNode
  timestamp: number;
  rootHash: string;
  fileCount: number;
}

export class MerkleTreeStorage {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize IndexedDB
   */
  async init(): Promise<void> {
    if (this.db) {
      return Promise.resolve();
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = db.createObjectStore(STORE_NAME, {
            keyPath: 'projectId',
          });

          // Create indexes
          objectStore.createIndex('timestamp', 'timestamp', { unique: false });
          objectStore.createIndex('rootHash', 'rootHash', { unique: false });

          console.log('Object store created:', STORE_NAME);
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Save Merkle tree snapshot
   */
  async saveSnapshot(projectId: string, tree: MerkleNode): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const data: SnapshotData = {
        projectId,
        tree: tree.toJSON(),
        timestamp: Date.now(),
        rootHash: tree.getHash(),
        fileCount: tree.countFiles(),
      };

      const request = store.put(data);

      request.onsuccess = () => {
        console.log('Snapshot saved for project:', projectId);
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to save snapshot:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Load Merkle tree snapshot
   */
  async loadSnapshot(projectId: string): Promise<MerkleNode | null> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(projectId);

      request.onsuccess = () => {
        const result = request.result as SnapshotData | undefined;
        if (result && result.tree) {
          console.log('Snapshot loaded for project:', projectId);
          const tree = MerkleNode.fromJSON(result.tree);
          resolve(tree);
        } else {
          console.log('No snapshot found for project:', projectId);
          resolve(null);
        }
      };

      request.onerror = () => {
        console.error('Failed to load snapshot:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get snapshot metadata without loading the full tree
   */
  async getSnapshotInfo(projectId: string): Promise<Omit<SnapshotData, 'tree'> | null> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(projectId);

      request.onsuccess = () => {
        const result = request.result as SnapshotData | undefined;
        if (result) {
          const { tree, ...info } = result;
          resolve(info);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        console.error('Failed to get snapshot info:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Delete snapshot
   */
  async deleteSnapshot(projectId: string): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(projectId);

      request.onsuccess = () => {
        console.log('Snapshot deleted for project:', projectId);
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to delete snapshot:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get all snapshots (metadata only)
   */
  async getAllSnapshots(): Promise<Array<Omit<SnapshotData, 'tree'>>> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = (request.result as SnapshotData[]).map((r) => {
          const { tree, ...info } = r;
          return info;
        });
        resolve(results);
      };

      request.onerror = () => {
        console.error('Failed to get all snapshots:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Check if snapshot exists
   */
  async hasSnapshot(projectId: string): Promise<boolean> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.count(projectId);

      request.onsuccess = () => {
        resolve(request.result > 0);
      };

      request.onerror = () => {
        console.error('Failed to check snapshot:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Clear all snapshots
   */
  async clearAll(): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('All snapshots cleared');
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to clear snapshots:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
      console.log('IndexedDB connection closed');
    }
  }
}

// Singleton instance
let storageInstance: MerkleTreeStorage | null = null;

export function getMerkleTreeStorage(): MerkleTreeStorage {
  if (!storageInstance) {
    storageInstance = new MerkleTreeStorage();
  }
  return storageInstance;
}
