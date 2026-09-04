import { offlineSyncManager } from '../lib/offlineSyncManager';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = sessionStorage.getItem('foodrescue_token') || localStorage.getItem('foodrescue_token');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const method = (options.method || 'GET').toUpperCase();
  const fullUrl = `${BASE_URL}${endpoint}`;

  // If offline and making a state-modifying request, queue it automatically
  if (!navigator.onLine && (method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE')) {
    offlineSyncManager.enqueue(fullUrl, method, options.body, `Offline Action: ${endpoint}`);
    throw new Error('⚡ You are offline. Your action has been queued and will auto-sync when online!');
  }

  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data?.detail || data?.message || 'An unexpected error occurred';
      throw new Error(errorMsg);
    }

    return data as T;
  } catch (err: any) {
    if (!navigator.onLine && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      offlineSyncManager.enqueue(fullUrl, method, options.body, `Offline Action: ${endpoint}`);
      throw new Error('⚡ Network lost. Action queued for auto-sync when back online!');
    }
    throw err;
  }
}
