import { submitOrderRound } from './api';

export interface QueuedOrder {
  id: string;
  timestamp: number;
  sessionId: string;
  source: 'WAITER' | 'CUSTOMER_QR' | 'POS';
  tableNumber: string;
  items: { menuItemId: string; name: string; quantity: number; notes?: string }[];
  status: 'PENDING' | 'SYNCED' | 'FAILED';
  error?: string;
}

const STORAGE_KEY = 'restaurant_offline_order_queue';

export function getOfflineQueue(): QueuedOrder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveOfflineQueue(queue: QueuedOrder[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('Failed to save offline queue', e);
  }
}

export function enqueueOfflineOrder(order: Omit<QueuedOrder, 'id' | 'timestamp' | 'status'>): QueuedOrder {
  const queue = getOfflineQueue();
  const newOrder: QueuedOrder = {
    ...order,
    id: `offline_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: Date.now(),
    status: 'PENDING',
  };
  queue.push(newOrder);
  saveOfflineQueue(queue);
  return newOrder;
}

export async function flushOfflineQueue(
  onOrderSynced?: (syncedOrder: QueuedOrder) => void
): Promise<{ syncedCount: number; failedCount: number }> {
  const queue = getOfflineQueue();
  const pendingOrders = queue.filter((o) => o.status === 'PENDING');

  if (pendingOrders.length === 0) {
    return { syncedCount: 0, failedCount: 0 };
  }

  let syncedCount = 0;
  let failedCount = 0;

  for (const order of pendingOrders) {
    try {
      await submitOrderRound({
        sessionId: order.sessionId,
        source: order.source,
        notes: `[OFFLINE SYNC] Created at ${new Date(order.timestamp).toLocaleTimeString()}`,
        items: order.items.map((i) => ({
          menuItemId: i.menuItemId,
          quantity: i.quantity,
          notes: i.notes,
        })),
      });

      order.status = 'SYNCED';
      syncedCount++;
      if (onOrderSynced) onOrderSynced(order);
    } catch (err: any) {
      order.status = 'FAILED';
      order.error = err.message || 'Sync failed';
      failedCount++;
    }
  }

  // Retain only un-synced or recently synced items
  saveOfflineQueue(queue.filter((o) => o.status !== 'SYNCED'));
  return { syncedCount, failedCount };
}
