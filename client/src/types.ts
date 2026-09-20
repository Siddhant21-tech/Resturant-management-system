export type TableStatus = 'AVAILABLE' | 'OCCUPIED' | 'BILL_REQUESTED';

export type OrderRoundStatus = 'SUBMITTED' | 'ACCEPTED' | 'IN_PREPARATION' | 'READY' | 'SERVED' | 'CANCELLED';

export type ItemStatus = 'PENDING' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED';

export type PaymentMethod = 'CASH' | 'UPI' | 'CARD';

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  wallpaperUrl?: string | null;
  taxRate: number;
  currency: string;
  branches: Branch[];
}

export interface Branch {
  id: string;
  restaurantId: string;
  name: string;
  address?: string;
  phone?: string;
  isActive: boolean;
  kitchenStations: KitchenStation[];
  tables?: Table[];
}

export interface KitchenStation {
  id: string;
  branchId: string;
  name: string;
  colorCode: string;
  sortOrder: number;
}

export interface Table {
  id: string;
  branchId: string;
  number: string;
  capacity: number;
  zone: string;
  status: TableStatus;
  currentSessionId?: string | null;
  activeSession?: DiningSession | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'PLATFORM_ADMIN' | 'RESTAURANT_ADMIN' | 'MANAGER' | 'CASHIER' | 'WAITER' | 'KITCHEN_STAFF';
  pinCode: string;
}

export interface MenuCategory {
  id: string;
  branchId: string;
  name: string;
  sortOrder: number;
  items: MenuItem[];
}

export interface MenuItem {
  id: string;
  branchId: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isVeg: boolean;
  isAvailable: boolean;
  stationId?: string | null;
  station?: KitchenStation | null;
}

export interface DiningSession {
  id: string;
  branchId: string;
  tableId: string;
  table?: Table;
  waiterId?: string;
  waiter?: User;
  sessionCode: string;
  guestCount: number;
  status: 'ACTIVE' | 'BILL_REQUESTED' | 'COMPLETED' | 'CANCELLED';
  startedAt: string;
  closedAt?: string | null;
  orders: OrderRound[];
  bills?: Bill[];
}

export interface OrderRound {
  id: string;
  sessionId: string;
  roundNumber: number;
  source: 'WAITER' | 'CUSTOMER_QR' | 'POS';
  status: OrderRoundStatus;
  notes?: string;
  submittedAt: string;
  acceptedAt?: string | null;
  items: OrderItem[];
}

export interface OrderItem {
  id: string;
  roundId: string;
  menuItemId: string;
  menuItem: MenuItem;
  stationId?: string | null;
  station?: KitchenStation | null;
  quantity: number;
  unitPrice: number;
  notes?: string;
  status: ItemStatus;
  acceptedAt?: string | null;
  preparedAt?: string | null;
  createdAt: string;
  round?: {
    roundNumber: number;
    source: string;
    session: {
      table: { number: string };
      sessionCode: string;
    };
  };
  modificationWindow?: {
    allowed: boolean;
    reason?: string;
    secondsRemaining?: number;
  };
}

export interface Bill {
  id: string;
  sessionId: string;
  version: number;
  invoiceNumber: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  finalAmount: number;
  status: 'UNPAID' | 'PAID' | 'VOIDED';
  createdAt: string;
  updatedAt: string;
  items: BillItem[];
  adjustments: BillAdjustment[];
  payments: Payment[];
}

export interface BillItem {
  id: string;
  billId: string;
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface BillAdjustment {
  id: string;
  billId: string;
  type: string;
  userId: string;
  reason: string;
  oldValue: string;
  newValue: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  billId: string;
  amount: number;
  method: PaymentMethod;
  referenceNumber?: string;
  receivedByUserId?: string;
  status: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  restaurantId: string;
  branchId?: string;
  userId: string;
  action: string;
  detailsJson: string;
  createdAt: string;
}
