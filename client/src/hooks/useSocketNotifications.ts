import { useState, useEffect } from 'react';
import { Branch } from '../types';
import { ActiveRole } from '../components/Navbar';
import { getSocket, playNotificationSound } from '../services/socket';
import { ToastData } from '../components/common/ToastNotification';

interface UseSocketNotificationsParams {
  selectedBranch: Branch | null;
  currentRole: ActiveRole;
  onRefresh: () => void;
}

export function useSocketNotifications({
  selectedBranch,
  currentRole,
  onRefresh,
}: UseSocketNotificationsParams) {
  const [toast, setToast] = useState<ToastData | null>(null);

  useEffect(() => {
    if (!selectedBranch) return;

    const socket = getSocket();
    socket.emit('join_branch', selectedBranch.id);

    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        onRefresh();
      }, 150);
    };

    // 1. New Order Created
    const handleOrderCreated = (data: any) => {
      playNotificationSound('kitchen_order');
      setToast({
        id: String(Date.now()),
        title: `🔴 New Order: ${data.tableNumber}`,
        message: `Round #${data.round.roundNumber} submitted with ${data.round.items.length} items.`,
        type: 'warning',
      });
      debouncedRefresh();
    };

    // 2. Kitchen Status Changed
    const handleItemStatusChanged = (data: any) => {
      if (data.status === 'ACCEPTED') {
        setToast({
          id: String(Date.now()),
          title: `🟡 Kitchen Accepted: ${data.itemName}`,
          message: `${data.tableNumber}: 3-minute modification window started.`,
          type: 'info',
        });
      }
      debouncedRefresh();
    };

    // 3. Item Ready (Waiter alert)
    const handleWaiterItemReady = (data: any) => {
      playNotificationSound('item_ready');
      setToast({
        id: String(Date.now()),
        title: `🟢 Order Ready: ${data.tableNumber}`,
        message: `${data.quantity}x ${data.itemName} is ready for pickup!`,
        type: 'success',
      });
      debouncedRefresh();
    };

    // 4. Bill Requested
    const handleBillRequested = (data: any) => {
      if (currentRole !== 'admin') return;
      playNotificationSound('bill_request');
      setToast({
        id: String(Date.now()),
        title: `💳 Bill Requested: ${data.tableNumber}`,
        message: `Customer/Waiter requested invoice for session #${data.sessionCode}.`,
        type: 'warning',
      });
      debouncedRefresh();
    };

    // 5. Payment Completed
    const handlePaymentCompleted = (data: any) => {
      playNotificationSound('payment_success');
      setToast({
        id: String(Date.now()),
        title: `🎉 Payment Succeeded: ${data.tableNumber}`,
        message: `Invoice #${data.invoiceNumber} (₹${data.amount}) settled via ${data.method}. Table is now AVAILABLE.`,
        type: 'success',
      });
      debouncedRefresh();
    };

    socket.on('order:created', handleOrderCreated);
    socket.on('item:status_changed', handleItemStatusChanged);
    socket.on('waiter:item_ready', handleWaiterItemReady);
    socket.on('bill:requested', handleBillRequested);
    socket.on('payment:completed', handlePaymentCompleted);

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      socket.off('order:created', handleOrderCreated);
      socket.off('item:status_changed', handleItemStatusChanged);
      socket.off('waiter:item_ready', handleWaiterItemReady);
      socket.off('bill:requested', handleBillRequested);
      socket.off('payment:completed', handlePaymentCompleted);
    };
  }, [selectedBranch, currentRole, onRefresh]);

  // Auto-dismiss toast after 5 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  return { toast, setToast };
}
