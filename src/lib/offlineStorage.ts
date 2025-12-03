import Dexie, { Table } from 'dexie';

// Types for offline storage
export interface OfflineTask {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority?: number;
  service_order_id: string;
  assigned_to?: string;
  due_date?: string;
  updated_at: string;
  synced: boolean;
}

export interface OfflineServiceOrder {
  id: string;
  order_number: string;
  status: string;
  scheduled_date?: string;
  description?: string;
  location?: string;
  client_id?: string;
  vessel_id?: string;
  updated_at: string;
  synced: boolean;
}

export interface PendingChange {
  id?: number;
  type: 'create' | 'update' | 'delete';
  table: string;
  entityId: string;
  data: any;
  createdAt: string;
  attempts: number;
}

export interface CachedData {
  key: string;
  data: any;
  cachedAt: string;
  expiresAt: string;
}

class OfflineDatabase extends Dexie {
  tasks!: Table<OfflineTask>;
  serviceOrders!: Table<OfflineServiceOrder>;
  pendingChanges!: Table<PendingChange>;
  cache!: Table<CachedData>;

  constructor() {
    super('AquaTaskOffline');
    
    this.version(1).stores({
      tasks: 'id, status, service_order_id, assigned_to, updated_at, synced',
      serviceOrders: 'id, order_number, status, scheduled_date, updated_at, synced',
      pendingChanges: '++id, type, table, entityId, createdAt',
      cache: 'key, cachedAt, expiresAt'
    });
  }
}

export const offlineDb = new OfflineDatabase();

// Cache management functions
export const cacheData = async (key: string, data: any, ttlMinutes: number = 60) => {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMinutes * 60000);
  
  await offlineDb.cache.put({
    key,
    data,
    cachedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString()
  });
};

export const getCachedData = async <T>(key: string): Promise<T | null> => {
  const cached = await offlineDb.cache.get(key);
  
  if (!cached) return null;
  
  if (new Date(cached.expiresAt) < new Date()) {
    await offlineDb.cache.delete(key);
    return null;
  }
  
  return cached.data as T;
};

export const clearExpiredCache = async () => {
  const now = new Date().toISOString();
  await offlineDb.cache.where('expiresAt').below(now).delete();
};

// Pending changes management
export const addPendingChange = async (
  type: 'create' | 'update' | 'delete',
  table: string,
  entityId: string,
  data: any
) => {
  await offlineDb.pendingChanges.add({
    type,
    table,
    entityId,
    data,
    createdAt: new Date().toISOString(),
    attempts: 0
  });
};

export const getPendingChanges = async () => {
  return await offlineDb.pendingChanges.orderBy('createdAt').toArray();
};

export const removePendingChange = async (id: number) => {
  await offlineDb.pendingChanges.delete(id);
};

export const incrementAttempts = async (id: number) => {
  const change = await offlineDb.pendingChanges.get(id);
  if (change) {
    await offlineDb.pendingChanges.update(id, { attempts: change.attempts + 1 });
  }
};

export const clearAllPendingChanges = async () => {
  await offlineDb.pendingChanges.clear();
};

// Task offline operations
export const saveTasksOffline = async (tasks: OfflineTask[]) => {
  await offlineDb.tasks.bulkPut(tasks.map(t => ({ ...t, synced: true })));
};

export const getOfflineTasks = async () => {
  return await offlineDb.tasks.toArray();
};

export const updateTaskOffline = async (id: string, updates: Partial<OfflineTask>) => {
  await offlineDb.tasks.update(id, { ...updates, synced: false, updated_at: new Date().toISOString() });
  await addPendingChange('update', 'tasks', id, updates);
};

// Service order offline operations
export const saveServiceOrdersOffline = async (orders: OfflineServiceOrder[]) => {
  await offlineDb.serviceOrders.bulkPut(orders.map(o => ({ ...o, synced: true })));
};

export const getOfflineServiceOrders = async () => {
  return await offlineDb.serviceOrders.toArray();
};

// Clear all offline data
export const clearOfflineData = async () => {
  await offlineDb.tasks.clear();
  await offlineDb.serviceOrders.clear();
  await offlineDb.pendingChanges.clear();
  await offlineDb.cache.clear();
};
