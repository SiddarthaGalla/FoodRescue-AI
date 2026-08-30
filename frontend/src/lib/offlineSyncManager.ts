/**
 * Offline Sync Action Manager
 * Stores failed network operations when offline and auto-replays them when back online.
 */

export interface OfflineAction {
  id: string;
  url: string;
  method: string;
  body?: any;
  description: string;
  createdAt: number;
}

const STORAGE_KEY = 'foodrescue_offline_queue';

export class OfflineSyncManager {
  private queue: OfflineAction[] = [];
  private isProcessing = false;
  private listeners: ((count: number) => void)[] = [];

  constructor() {
    this.loadQueue();
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.processQueue();
      });
    }
  }

  private loadQueue() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      this.queue = raw ? JSON.parse(raw) : [];
    } catch {
      this.queue = [];
    }
  }

  private saveQueue() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
      this.notifyListeners();
    } catch (e) {
      console.warn('Failed to save offline queue:', e);
    }
  }

  public subscribe(fn: (count: number) => void) {
    this.listeners.push(fn);
    fn(this.queue.length);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((fn) => fn(this.queue.length));
  }

  public getPendingCount(): number {
    return this.queue.length;
  }

  public getQueue(): OfflineAction[] {
    return [...this.queue];
  }

  /**
   * Add an action to the offline queue
   */
  public enqueue(url: string, method: string, body?: any, description?: string) {
    const action: OfflineAction = {
      id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      url,
      method,
      body,
      description: description || `${method} ${url}`,
      createdAt: Date.now(),
    };

    this.queue.push(action);
    this.saveQueue();
    return action;
  }

  /**
   * Replay all pending queued actions to the backend server
   */
  public async processQueue(): Promise<{ replayed: number; failed: number }> {
    if (this.isProcessing || this.queue.length === 0 || !navigator.onLine) {
      return { replayed: 0, failed: 0 };
    }

    this.isProcessing = true;
    let replayed = 0;
    let failed = 0;
    const remainingQueue: OfflineAction[] = [];

    // Process actions sequentially
    for (const action of this.queue) {
      try {
        const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const options: RequestInit = {
          method: action.method,
          headers,
        };

        if (action.body && (action.method === 'POST' || action.method === 'PUT' || action.method === 'PATCH')) {
          options.body = typeof action.body === 'string' ? action.body : JSON.stringify(action.body);
        }

        const res = await fetch(action.url, options);
        if (res.ok || res.status === 200 || res.status === 201) {
          replayed++;
        } else {
          // Keep in queue if server error
          remainingQueue.push(action);
          failed++;
        }
      } catch (e) {
        remainingQueue.push(action);
        failed++;
      }
    }

    this.queue = remainingQueue;
    this.saveQueue();
    this.isProcessing = false;

    return { replayed, failed };
  }

  public clearQueue() {
    this.queue = [];
    this.saveQueue();
  }
}

export const offlineSyncManager = new OfflineSyncManager();
