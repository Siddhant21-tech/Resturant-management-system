import { useState, useEffect, useCallback } from 'react';
import { getOfflineQueue, flushOfflineQueue, QueuedOrder } from '../services/offlineQueue';

interface UseOfflineSimulatorParams {
  onOrderSynced?: (synced: QueuedOrder) => void;
  onRefresh?: () => void;
}

export function useOfflineSimulator({ onOrderSynced, onRefresh }: UseOfflineSimulatorParams = {}) {
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(false);
  const [pendingOfflineCount, setPendingOfflineCount] = useState(0);

  const updatePendingCount = useCallback(() => {
    const q = getOfflineQueue();
    setPendingOfflineCount(q.filter((i) => i.status === 'PENDING').length);
  }, []);

  // Check offline queue periodically
  useEffect(() => {
    updatePendingCount();
    const interval = setInterval(updatePendingCount, 2000);
    return () => clearInterval(interval);
  }, [updatePendingCount]);

  // When simulated offline is turned OFF, automatically flush queue
  useEffect(() => {
    if (!isSimulatedOffline) {
      flushOfflineQueue((synced) => {
        if (onOrderSynced) onOrderSynced(synced);
        if (onRefresh) onRefresh();
      }).then(({ syncedCount }) => {
        if (syncedCount > 0) {
          updatePendingCount();
        }
      });
    }
  }, [isSimulatedOffline, onOrderSynced, onRefresh, updatePendingCount]);

  return {
    isSimulatedOffline,
    setIsSimulatedOffline,
    pendingOfflineCount,
    updatePendingCount,
  };
}
