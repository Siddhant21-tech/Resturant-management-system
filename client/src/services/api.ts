const API_BASE = '/api';

export async function fetchRestaurants() {
  const res = await fetch(`${API_BASE}/restaurants`);
  return res.json();
}

export async function fetchBranches(restaurantId: string) {
  const res = await fetch(`${API_BASE}/restaurants/${restaurantId}/branches`);
  return res.json();
}

export async function fetchTables(branchId: string) {
  const res = await fetch(`${API_BASE}/branches/${branchId}/tables`);
  return res.json();
}

export async function fetchStations(branchId: string) {
  const res = await fetch(`${API_BASE}/branches/${branchId}/stations`);
  return res.json();
}

export async function fetchUsers(branchId: string) {
  const res = await fetch(`${API_BASE}/branches/${branchId}/users`);
  return res.json();
}

export async function fetchMenu(branchId: string) {
  const res = await fetch(`${API_BASE}/branches/${branchId}/menu`);
  return res.json();
}

export async function createSession(data: {
  branchId: string;
  tableId: string;
  waiterId?: string;
  guestCount: number;
}) {
  const res = await fetch(`${API_BASE}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function fetchSession(sessionId: string) {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}`);
  return res.json();
}

export async function requestBill(sessionId: string) {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/request-bill`, {
    method: 'POST',
  });
  return res.json();
}

export async function submitOrderRound(data: {
  sessionId: string;
  source: 'WAITER' | 'CUSTOMER_QR' | 'POS';
  notes?: string;
  items: { menuItemId: string; quantity: number; notes?: string }[];
}) {
  const res = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to submit order round');
  }
  return res.json();
}

export async function fetchKitchenTickets(branchId: string, stationId?: string) {
  const params = new URLSearchParams({ branchId });
  if (stationId) params.append('stationId', stationId);
  const res = await fetch(`${API_BASE}/orders/kitchen?${params.toString()}`);
  return res.json();
}

export async function updateItemStatus(itemId: string, status: string) {
  const res = await fetch(`${API_BASE}/orders/items/${itemId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  return res.json();
}

export async function modifyOrderItem(
  itemId: string,
  data: { quantity?: number; notes?: string }
) {
  const res = await fetch(`${API_BASE}/orders/items/${itemId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.reason || json.error || 'Modification not permitted');
  }
  return json;
}

export async function cancelOrderItem(itemId: string, reason: string) {
  const res = await fetch(`${API_BASE}/orders/items/${itemId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.reason || json.error || 'Cancellation not permitted');
  }
  return json;
}

export async function fetchBillForSession(sessionId: string) {
  const res = await fetch(`${API_BASE}/bills/session/${sessionId}`);
  return res.json();
}

export async function adjustBill(
  billId: string,
  data: {
    type?: string;
    reason: string;
    discountAmount?: number;
    modifiedItems?: any[];
    userId?: string;
  }
) {
  const res = await fetch(`${API_BASE}/bills/${billId}/adjust`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Failed to adjust bill');
  }
  return json;
}

export async function payBill(
  billId: string,
  data: {
    method: 'CASH' | 'UPI' | 'CARD';
    referenceNumber?: string;
    receivedByUserId?: string;
  }
) {
  const res = await fetch(`${API_BASE}/bills/${billId}/pay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function fetchAuditLogs(branchId?: string) {
  const params = branchId ? `?branchId=${branchId}` : '';
  const res = await fetch(`${API_BASE}/audit-logs${params}`);
  return res.json();
}

export async function fetchAnalytics(branchId?: string) {
  const params = branchId ? `?branchId=${branchId}` : '';
  const res = await fetch(`${API_BASE}/analytics/overview${params}`);
  return res.json();
}
