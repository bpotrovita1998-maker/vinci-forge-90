// IndexedDB-based poster cache for 3D/CAD thumbnails
// Provides much larger storage capacity than localStorage (hundreds of MB vs 5-10MB)

const DB_NAME = 'ThumbnailPosterCache';
const STORE_NAME = 'posters';
const DB_VERSION = 1;

interface PosterCacheEntry {
  id: string;
  dataUrl: string;
  timestamp: number;
  modelUrl?: string;
}

class PosterCacheDB {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  // Initialize IndexedDB
  private async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB poster cache initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          objectStore.createIndex('timestamp', 'timestamp', { unique: false });
          console.log('Created poster cache object store');
        }
      };
    });
  }

  // Ensure DB is initialized before operations
  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      if (!this.initPromise) {
        this.initPromise = this.init();
      }
      await this.initPromise;
    }
    
    if (!this.db) {
      throw new Error('Failed to initialize IndexedDB');
    }
    
    return this.db;
  }

  // Get poster from cache
  async get(key: string): Promise<string | null> {
    try {
      const db = await this.ensureDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);

        request.onsuccess = () => {
          const entry = request.result as PosterCacheEntry | undefined;
          if (entry) {
            console.log(`Cache hit for poster: ${key}`);
            resolve(entry.dataUrl);
          } else {
            console.log(`Cache miss for poster: ${key}`);
            resolve(null);
          }
        };

        request.onerror = () => {
          console.error('Failed to get poster from cache:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Error getting poster from cache:', error);
      return null;
    }
  }

  // Save poster to cache
  async set(key: string, dataUrl: string, modelUrl?: string): Promise<void> {
    try {
      const db = await this.ensureDB();
      
      const entry: PosterCacheEntry = {
        id: key,
        dataUrl,
        timestamp: Date.now(),
        modelUrl
      };

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(entry);

        request.onsuccess = () => {
          console.log(`Cached poster: ${key}`);
          resolve();
        };

        request.onerror = () => {
          console.error('Failed to cache poster:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Error caching poster:', error);
      // Don't throw - caching failure shouldn't break the app
    }
  }

  // Delete old entries to free space (keeps most recent N entries)
  async cleanup(keepCount: number = 50): Promise<void> {
    try {
      const db = await this.ensureDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('timestamp');
        const request = index.openCursor(null, 'prev'); // Newest first

        let count = 0;
        const keysToDelete: string[] = [];

        request.onsuccess = () => {
          const cursor = request.result;
          if (cursor) {
            count++;
            if (count > keepCount) {
              keysToDelete.push(cursor.value.id);
            }
            cursor.continue();
          } else {
            // Delete old entries
            keysToDelete.forEach(key => {
              store.delete(key);
            });
            
            if (keysToDelete.length > 0) {
              console.log(`Cleaned up ${keysToDelete.length} old poster cache entries`);
            }
            resolve();
          }
        };

        request.onerror = () => {
          console.error('Failed to cleanup poster cache:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Error during poster cache cleanup:', error);
    }
  }

  // Delete specific poster
  async delete(key: string): Promise<void> {
    try {
      const db = await this.ensureDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(key);

        request.onsuccess = () => {
          console.log(`Deleted cached poster: ${key}`);
          resolve();
        };

        request.onerror = () => {
          console.error('Failed to delete poster from cache:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Error deleting poster from cache:', error);
    }
  }

  // Get cache stats
  async getStats(): Promise<{ count: number; totalSize: number }> {
    try {
      const db = await this.ensureDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          const entries = request.result as PosterCacheEntry[];
          const totalSize = entries.reduce((sum, entry) => sum + entry.dataUrl.length, 0);
          resolve({
            count: entries.length,
            totalSize
          });
        };

        request.onerror = () => {
          console.error('Failed to get cache stats:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return { count: 0, totalSize: 0 };
    }
  }

  // Clear all cached posters
  async clear(): Promise<void> {
    try {
      const db = await this.ensureDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => {
          console.log('Cleared all poster cache');
          resolve();
        };

        request.onerror = () => {
          console.error('Failed to clear poster cache:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Error clearing poster cache:', error);
    }
  }
}

// Export singleton instance
export const posterCache = new PosterCacheDB();

// Generate cache key for a model
export const getPosterCacheKey = (jobId?: string, url?: string): string | null => {
  if (jobId) return `3d-poster-${jobId}`;
  if (url) {
    try {
      return `3d-poster-${btoa(url).slice(0, 32)}`;
    } catch {
      // Handle URLs that can't be base64 encoded
      return `3d-poster-${url.slice(0, 32)}`;
    }
  }
  return null;
};
