import fs from 'fs';
import path from 'path';

// Types matching Prisma Schema
export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  taxRate: number;
  currency: string;
  createdAt: Date;
}

export interface Branch {
  id: string;
  restaurantId: string;
  name: string;
  address?: string;
  phone?: string;
  isActive: boolean;
  createdAt: Date;
}

export interface KitchenStation {
  id: string;
  branchId: string;
  name: string;
  colorCode: string;
  sortOrder: number;
  createdAt: Date;
}

export interface Table {
  id: string;
  branchId: string;
  number: string;
  capacity: number;
  zone: string;
  status: string; // "AVAILABLE" | "OCCUPIED" | "BILL_REQUESTED"
  currentSessionId?: string | null;
  createdAt: Date;
}

export interface User {
  id: string;
  restaurantId: string;
  branchId?: string | null;
  name: string;
  email: string;
  role: string;
  pinCode: string;
  createdAt: Date;
}

export interface MenuCategory {
  id: string;
  branchId: string;
  name: string;
  sortOrder: number;
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
  prepTimeMinutes?: number;
}

export interface DiningSession {
  id: string;
  branchId: string;
  tableId: string;
  waiterId?: string | null;
  sessionCode: string;
  guestCount: number;
  status: string; // "ACTIVE" | "BILL_REQUESTED" | "COMPLETED"
  startedAt: Date;
  closedAt?: Date | null;
}

export interface OrderRound {
  id: string;
  sessionId: string;
  roundNumber: number;
  source: string; // "WAITER" | "CUSTOMER_QR" | "POS"
  status: string;
  notes?: string | null;
  submittedAt: Date;
  acceptedAt?: Date | null;
}

export interface OrderItem {
  id: string;
  roundId: string;
  menuItemId: string;
  stationId?: string | null;
  quantity: number;
  unitPrice: number;
  notes?: string | null;
  status: string; // "PENDING" | "ACCEPTED" | "PREPARING" | "READY" | "SERVED" | "CANCELLED"
  acceptedAt?: Date | null;
  preparedAt?: Date | null;
  createdAt: Date;
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
  status: string; // "UNPAID" | "PAID" | "VOIDED"
  createdAt: Date;
  updatedAt: Date;
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
  createdAt: Date;
}

export interface Payment {
  id: string;
  billId: string;
  amount: number;
  method: string;
  referenceNumber?: string | null;
  receivedByUserId?: string | null;
  status: string;
  createdAt: Date;
}

export interface AuditLog {
  id: string;
  restaurantId: string;
  branchId?: string | null;
  userId: string;
  action: string;
  detailsJson: string;
  createdAt: Date;
}

// In-Memory Database Store with JSON Persistence
class RestaurantDatabase {
  private dbPath = path.join(__dirname, '../dev-db.json');

  restaurants: Restaurant[] = [];
  branches: Branch[] = [];
  kitchenStations: KitchenStation[] = [];
  tables: Table[] = [];
  users: User[] = [];
  menuCategories: MenuCategory[] = [];
  menuItems: MenuItem[] = [];
  diningSessions: DiningSession[] = [];
  orderRounds: OrderRound[] = [];
  orderItems: OrderItem[] = [];
  bills: Bill[] = [];
  billItems: BillItem[] = [];
  billAdjustments: BillAdjustment[] = [];
  payments: Payment[] = [];
  auditLogs: AuditLog[] = [];

  constructor() {
    this.initDefaultData();
  }

  save() {
    try {
      const dump = {
        restaurants: this.restaurants,
        branches: this.branches,
        kitchenStations: this.kitchenStations,
        tables: this.tables,
        users: this.users,
        menuCategories: this.menuCategories,
        menuItems: this.menuItems,
        diningSessions: this.diningSessions,
        orderRounds: this.orderRounds,
        orderItems: this.orderItems,
        bills: this.bills,
        billItems: this.billItems,
        billAdjustments: this.billAdjustments,
        payments: this.payments,
        auditLogs: this.auditLogs,
      };
      fs.writeFileSync(this.dbPath, JSON.stringify(dump, null, 2));
    } catch (e) {
      console.error('Error persisting database:', e);
    }
  }

  initDefaultData() {
    // 1. Restaurants
    const bistroId = 'rest-bistro-01';
    const spiceId = 'rest-spice-02';

    this.restaurants = [
      {
        id: bistroId,
        name: 'The Velvet Bistro',
        slug: 'the-velvet-bistro',
        taxRate: 5.0,
        currency: '₹',
        createdAt: new Date(),
      },
      {
        id: spiceId,
        name: 'Spice Symphony',
        slug: 'spice-symphony',
        taxRate: 5.0,
        currency: '₹',
        createdAt: new Date(),
      },
    ];

    // 2. Branches
    const downtownId = 'branch-downtown-01';
    const midtownId = 'branch-midtown-02';

    this.branches = [
      {
        id: downtownId,
        restaurantId: bistroId,
        name: 'Downtown Flagship',
        address: '42 Promenade Avenue, Connaught Place',
        phone: '+91 98765 43210',
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: midtownId,
        restaurantId: bistroId,
        name: 'Midtown Rooftop Lounge',
        address: 'Skydeck Level 14, Business Bay',
        phone: '+91 98765 43211',
        isActive: true,
        createdAt: new Date(),
      },
    ];

    // 3. Kitchen Stations
    const stMain = 'station-main';
    const stBar = 'station-bar';
    const stDessert = 'station-dessert';
    const stStarter = 'station-starter';

    this.kitchenStations = [
      {
        id: stMain,
        branchId: downtownId,
        name: 'Main Kitchen',
        colorCode: '#f97316',
        sortOrder: 1,
        createdAt: new Date(),
      },
      {
        id: stBar,
        branchId: downtownId,
        name: 'Bar & Beverage',
        colorCode: '#3b82f6',
        sortOrder: 2,
        createdAt: new Date(),
      },
      {
        id: stDessert,
        branchId: downtownId,
        name: 'Dessert & Bakery',
        colorCode: '#ec4899',
        sortOrder: 3,
        createdAt: new Date(),
      },
      {
        id: stStarter,
        branchId: downtownId,
        name: 'Starters & Pantry',
        colorCode: '#10b981',
        sortOrder: 4,
        createdAt: new Date(),
      },
    ];

    // 4. Staff Users
    const uRahul = 'user-rahul';
    const uSarah = 'user-sarah';
    const uMario = 'user-mario';
    const uPriya = 'user-priya';
    const uVikram = 'user-vikram';

    this.users = [
      {
        id: uRahul,
        restaurantId: bistroId,
        branchId: downtownId,
        name: 'Rahul Sharma',
        email: 'rahul@velvetbistro.com',
        role: 'WAITER',
        pinCode: '1001',
        createdAt: new Date(),
      },
      {
        id: uSarah,
        restaurantId: bistroId,
        branchId: downtownId,
        name: 'Sarah Jenkins',
        email: 'sarah@velvetbistro.com',
        role: 'WAITER',
        pinCode: '1002',
        createdAt: new Date(),
      },
      {
        id: uMario,
        restaurantId: bistroId,
        branchId: downtownId,
        name: 'Chef Mario Rossi',
        email: 'mario@velvetbistro.com',
        role: 'KITCHEN_STAFF',
        pinCode: '2001',
        createdAt: new Date(),
      },
      {
        id: uPriya,
        restaurantId: bistroId,
        branchId: downtownId,
        name: 'Priya Verma',
        email: 'priya@velvetbistro.com',
        role: 'CASHIER',
        pinCode: '3001',
        createdAt: new Date(),
      },
      {
        id: uVikram,
        restaurantId: bistroId,
        branchId: downtownId,
        name: 'Vikram Mehta',
        email: 'vikram@velvetbistro.com',
        role: 'MANAGER',
        pinCode: '9999',
        createdAt: new Date(),
      },
    ];

    // 5. Tables
    const t15Id = 'table-15';
    this.tables = [
      {
        id: t15Id,
        branchId: downtownId,
        number: 'Table 15',
        capacity: 4,
        zone: 'Main Dining',
        status: 'OCCUPIED',
        currentSessionId: 'session-s10045',
        createdAt: new Date(),
      },
      {
        id: 'table-01',
        branchId: downtownId,
        number: 'Table 01',
        capacity: 2,
        zone: 'Window View',
        status: 'AVAILABLE',
        currentSessionId: null,
        createdAt: new Date(),
      },
      {
        id: 'table-02',
        branchId: downtownId,
        number: 'Table 02',
        capacity: 4,
        zone: 'Main Dining',
        status: 'AVAILABLE',
        currentSessionId: null,
        createdAt: new Date(),
      },
      {
        id: 'table-03',
        branchId: downtownId,
        number: 'Table 03',
        capacity: 6,
        zone: 'Family Booth',
        status: 'AVAILABLE',
        currentSessionId: null,
        createdAt: new Date(),
      },
      {
        id: 'table-04',
        branchId: downtownId,
        number: 'Table 04',
        capacity: 2,
        zone: 'Patio Terrace',
        status: 'AVAILABLE',
        currentSessionId: null,
        createdAt: new Date(),
      },
      {
        id: 'table-05',
        branchId: downtownId,
        number: 'Table 05',
        capacity: 4,
        zone: 'Patio Terrace',
        status: 'AVAILABLE',
        currentSessionId: null,
        createdAt: new Date(),
      },
      {
        id: 'table-06',
        branchId: downtownId,
        number: 'Table 06',
        capacity: 8,
        zone: 'VIP Lounge',
        status: 'AVAILABLE',
        currentSessionId: null,
        createdAt: new Date(),
      },
    ];

    // 6. Menu Categories
    const catPizzas = 'cat-pizzas';
    const catMains = 'cat-mains';
    const catStarters = 'cat-starters';
    const catDrinks = 'cat-drinks';
    const catDesserts = 'cat-desserts';

    this.menuCategories = [
      { id: catPizzas, branchId: downtownId, name: 'Wood-Fired Pizzas', sortOrder: 1 },
      { id: catMains, branchId: downtownId, name: 'Burgers & Mains', sortOrder: 2 },
      { id: catStarters, branchId: downtownId, name: 'Artisanal Starters', sortOrder: 3 },
      { id: catDrinks, branchId: downtownId, name: 'Beverages & Coffee', sortOrder: 4 },
      { id: catDesserts, branchId: downtownId, name: 'Decadent Desserts', sortOrder: 5 },
    ];

    // 7. Menu Items with Station Routing
    const mMargherita = 'menu-margherita';
    const mTruffle = 'menu-truffle';
    const mBurger = 'menu-burger';
    const mBruschetta = 'menu-bruschetta';
    const mCoke = 'menu-coke';
    const mCoffee = 'menu-coffee';
    const mMojito = 'menu-mojito';
    const mLavaCake = 'menu-lavacake';
    const mTiramisu = 'menu-tiramisu';

    this.menuItems = [
      {
        id: mMargherita,
        branchId: downtownId,
        categoryId: catPizzas,
        name: 'Artisan Wood-Fired Margherita',
        description: 'San Marzano tomatoes, fresh buffalo mozzarella, fragrant sweet basil, extra virgin olive oil.',
        price: 300,
        stationId: stMain,
        isVeg: true,
        isAvailable: true,
        imageUrl: 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=500&auto=format&fit=crop&q=80',
      },
      {
        id: mTruffle,
        branchId: downtownId,
        categoryId: catPizzas,
        name: 'Truffle Mushroom Pizza',
        description: 'Wild forest mushrooms, fontina cheese, white truffle emulsion, thyme.',
        price: 380,
        stationId: stMain,
        isVeg: true,
        isAvailable: true,
        imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop&q=80',
      },
      {
        id: mBurger,
        branchId: downtownId,
        categoryId: catMains,
        name: 'Smoked Prime Burger',
        description: 'Brioche bun, smoked cheddar, house relish, caramelized onions, crisp potato wedges.',
        price: 320,
        stationId: stMain,
        isVeg: false,
        isAvailable: true,
        imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80',
      },
      {
        id: mBruschetta,
        branchId: downtownId,
        categoryId: catStarters,
        name: 'Classic Tomato Bruschetta',
        description: 'Toasted sourdough, heirloom tomatoes, roasted garlic, balsamic glaze.',
        price: 180,
        stationId: stStarter,
        isVeg: true,
        isAvailable: true,
        imageUrl: 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=500&auto=format&fit=crop&q=80',
      },
      {
        id: mCoke,
        branchId: downtownId,
        categoryId: catDrinks,
        name: 'Chilled Coca Cola',
        description: 'Ice cold classic refreshment with lemon wedge and fresh mint.',
        price: 80,
        stationId: stBar,
        isVeg: true,
        isAvailable: true,
        imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&auto=format&fit=crop&q=80',
      },
      {
        id: mCoffee,
        branchId: downtownId,
        categoryId: catDrinks,
        name: 'Specialty Roasted Coffee',
        description: 'Double shot arabica espresso poured over steamed velvety oat or dairy milk.',
        price: 120,
        stationId: stBar,
        isVeg: true,
        isAvailable: true,
        imageUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=500&auto=format&fit=crop&q=80',
      },
      {
        id: mMojito,
        branchId: downtownId,
        categoryId: catDrinks,
        name: 'Berry Mojito Mocktail',
        description: 'Fresh passionfruit puree, sparkling water, crushed ice, kaffir lime leaf.',
        price: 190,
        stationId: stBar,
        isVeg: true,
        isAvailable: true,
        imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=80',
      },
      {
        id: mLavaCake,
        branchId: downtownId,
        categoryId: catDesserts,
        name: 'Molten Chocolate Lava Cake',
        description: 'Warm chocolate cake with a molten Belgian dark ganache center, Madagascar vanilla bean scoop.',
        price: 240,
        stationId: stDessert,
        isVeg: true,
        isAvailable: true,
        imageUrl: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=500&auto=format&fit=crop&q=80',
      },
      {
        id: mTiramisu,
        branchId: downtownId,
        categoryId: catDesserts,
        name: 'Classic Venetian Tiramisu',
        description: 'Espresso-soaked savoiardi, mascarpone cream, Dutch cocoa dusting.',
        price: 220,
        stationId: stDessert,
        isVeg: true,
        isAvailable: true,
        imageUrl: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=500&auto=format&fit=crop&q=80',
      },
    ];

    // 8. Scenario: Table 15 Live Session (#S-10045) from user description!
    const s10045Id = 'session-s10045';
    this.diningSessions = [
      {
        id: s10045Id,
        branchId: downtownId,
        tableId: t15Id,
        waiterId: uRahul,
        sessionCode: 'S-10045',
        guestCount: 2,
        status: 'ACTIVE',
        startedAt: new Date(Date.now() - 5 * 60 * 1000),
        closedAt: null,
      },
    ];

    // Round #1: Pizza x 2, Coke x 2
    const r001Id = 'round-o001';
    this.orderRounds = [
      {
        id: r001Id,
        sessionId: s10045Id,
        roundNumber: 1,
        source: 'WAITER',
        status: 'ACCEPTED',
        notes: 'Customer requested extra crispy crust',
        submittedAt: new Date(Date.now() - 40 * 1000),
        acceptedAt: new Date(Date.now() - 35 * 1000), // Accepted 35 seconds ago -> 3m timer active!
      },
    ];

    this.orderItems = [
      {
        id: 'item-pizza-1',
        roundId: r001Id,
        menuItemId: mMargherita,
        stationId: stMain,
        quantity: 2,
        unitPrice: 300,
        notes: 'Extra crispy',
        status: 'ACCEPTED',
        acceptedAt: new Date(Date.now() - 35 * 1000),
        preparedAt: null,
        createdAt: new Date(Date.now() - 40 * 1000),
      },
      {
        id: 'item-coke-1',
        roundId: r001Id,
        menuItemId: mCoke,
        stationId: stBar,
        quantity: 2,
        unitPrice: 80,
        notes: 'With ice and lemon',
        status: 'PREPARING', // In preparation at the Bar
        acceptedAt: new Date(Date.now() - 35 * 1000),
        preparedAt: null,
        createdAt: new Date(Date.now() - 40 * 1000),
      },
    ];
  }
}

const store = new RestaurantDatabase();

// Export database API adhering to Prisma Client conventions
export const prisma = {
  restaurant: {
    findMany: async (args?: any) => {
      return store.restaurants.map((r) => ({
        ...r,
        branches: store.branches
          .filter((b) => b.restaurantId === r.id)
          .map((b) => ({
            ...b,
            kitchenStations: store.kitchenStations.filter((s) => s.branchId === b.id),
          })),
      }));
    },
  },

  branch: {
    findMany: async (args?: any) => {
      let res = store.branches;
      if (args?.where?.restaurantId) {
        res = res.filter((b) => b.restaurantId === args.where.restaurantId);
      }
      return res.map((b) => ({
        ...b,
        kitchenStations: store.kitchenStations.filter((s) => s.branchId === b.id),
        tables: store.tables.filter((t) => t.branchId === b.id),
      }));
    },
  },

  kitchenStation: {
    findMany: async (args?: any) => {
      let res = store.kitchenStations;
      if (args?.where?.branchId) {
        res = res.filter((s) => s.branchId === args.where.branchId);
      }
      return res.sort((a, b) => a.sortOrder - b.sortOrder);
    },
  },

  table: {
    findMany: async (args?: any) => {
      let res = store.tables;
      if (args?.where?.branchId) {
        res = res.filter((t) => t.branchId === args.where.branchId);
      }
      return res;
    },
    findUnique: async (args: { where: { id: string } }) => {
      return store.tables.find((t) => t.id === args.where.id) || null;
    },
    update: async (args: { where: { id: string }; data: Partial<Table> }) => {
      const idx = store.tables.findIndex((t) => t.id === args.where.id);
      if (idx !== -1) {
        store.tables[idx] = { ...store.tables[idx], ...args.data };
        store.save();
        return store.tables[idx];
      }
      throw new Error('Table not found');
    },
  },

  user: {
    findMany: async (args?: any) => {
      let res = store.users;
      if (args?.where?.branchId) {
        res = res.filter((u) => u.branchId === args.where.branchId);
      }
      return res;
    },
  },

  menuCategory: {
    findMany: async (args?: any) => {
      let res = store.menuCategories;
      if (args?.where?.branchId) {
        res = res.filter((c) => c.branchId === args.where.branchId);
      }
      return res.sort((a, b) => a.sortOrder - b.sortOrder).map((c) => ({
        ...c,
        items: store.menuItems
          .filter((m) => m.categoryId === c.id)
          .map((m) => ({
            ...m,
            station: store.kitchenStations.find((s) => s.id === m.stationId) || null,
          })),
      }));
    },
  },

  menuItem: {
    findMany: async (args?: any) => {
      let res = store.menuItems;
      if (args?.where?.id?.in) {
        const idSet = new Set(args.where.id.in);
        res = res.filter((m) => idSet.has(m.id));
      }
      return res.map((m) => ({
        ...m,
        station: store.kitchenStations.find((s) => s.id === m.stationId) || null,
      }));
    },
    create: async (args: { data: Omit<MenuItem, 'id'> }) => {
      const item = { ...args.data, id: `menu_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` };
      store.menuItems.push(item);
      store.save();
      return item;
    },
    update: async (args: { where: { id: string }; data: Partial<MenuItem> }) => {
      const idx = store.menuItems.findIndex((m) => m.id === args.where.id);
      if (idx !== -1) {
        store.menuItems[idx] = { ...store.menuItems[idx], ...args.data };
        store.save();
        return store.menuItems[idx];
      }
      throw new Error('MenuItem not found');
    },
  },

  diningSession: {
    count: async (args?: any) => {
      let res = store.diningSessions;
      if (args?.where?.branchId) res = res.filter((s) => s.branchId === args.where.branchId);
      if (args?.where?.status) res = res.filter((s) => s.status === args.where.status);
      return res.length;
    },
    findUnique: async (args: { where: { id: string } }) => {
      const s = store.diningSessions.find((x) => x.id === args.where.id);
      if (!s) return null;

      const table = store.tables.find((t) => t.id === s.tableId);
      const waiter = store.users.find((u) => u.id === s.waiterId);
      const branch = store.branches.find((b) => b.id === s.branchId);
      const restaurant = branch ? store.restaurants.find((r) => r.id === branch.restaurantId) : null;

      const orders = store.orderRounds
        .filter((r) => r.sessionId === s.id)
        .map((round) => ({
          ...round,
          items: store.orderItems
            .filter((item) => item.roundId === round.id)
            .map((item) => ({
              ...item,
              menuItem: store.menuItems.find((m) => m.id === item.menuItemId)!,
              station: store.kitchenStations.find((st) => st.id === item.stationId) || null,
            })),
        }));

      const bills = store.bills
        .filter((b) => b.sessionId === s.id)
        .map((bill) => ({
          ...bill,
          items: store.billItems.filter((i) => i.billId === bill.id),
          adjustments: store.billAdjustments.filter((a) => a.billId === bill.id),
          payments: store.payments.filter((p) => p.billId === bill.id),
        }));

      return {
        ...s,
        table,
        waiter,
        branch: branch ? { ...branch, restaurant } : null,
        orders,
        bills,
      };
    },
    create: async (args: { data: any; include?: any }) => {
      const newSession: DiningSession = {
        id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        branchId: args.data.branchId,
        tableId: args.data.tableId,
        waiterId: args.data.waiterId || null,
        sessionCode: args.data.sessionCode,
        guestCount: args.data.guestCount || 2,
        status: args.data.status || 'ACTIVE',
        startedAt: new Date(),
        closedAt: null,
      };
      store.diningSessions.push(newSession);
      store.save();
      return prisma.diningSession.findUnique({ where: { id: newSession.id } });
    },
    update: async (args: { where: { id: string }; data: Partial<DiningSession> }) => {
      const idx = store.diningSessions.findIndex((s) => s.id === args.where.id);
      if (idx !== -1) {
        store.diningSessions[idx] = { ...store.diningSessions[idx], ...args.data };
        store.save();
        return store.diningSessions[idx];
      }
      throw new Error('Session not found');
    },
  },

  orderRound: {
    create: async (args: { data: any; include?: any }) => {
      const roundId = `round_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const round: OrderRound = {
        id: roundId,
        sessionId: args.data.sessionId,
        roundNumber: args.data.roundNumber,
        source: args.data.source || 'WAITER',
        status: args.data.status || 'SUBMITTED',
        notes: args.data.notes || null,
        submittedAt: new Date(),
        acceptedAt: null,
      };
      store.orderRounds.push(round);

      if (args.data.items?.create) {
        for (const itemData of args.data.items.create) {
          const item: OrderItem = {
            id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            roundId,
            menuItemId: itemData.menuItemId,
            stationId: itemData.stationId || null,
            quantity: itemData.quantity || 1,
            unitPrice: itemData.unitPrice,
            notes: itemData.notes || null,
            status: itemData.status || 'PENDING',
            acceptedAt: null,
            preparedAt: null,
            createdAt: new Date(),
          };
          store.orderItems.push(item);
        }
      }
      store.save();

      const items = store.orderItems
        .filter((i) => i.roundId === roundId)
        .map((i) => ({
          ...i,
          menuItem: store.menuItems.find((m) => m.id === i.menuItemId)!,
          station: store.kitchenStations.find((st) => st.id === i.stationId) || null,
        }));

      return {
        ...round,
        items,
      };
    },
  },

  orderItem: {
    findMany: async (args?: any) => {
      let res = store.orderItems;
      if (args?.where?.stationId) {
        res = res.filter((i) => i.stationId === args.where.stationId);
      }
      if (args?.where?.status?.in) {
        const set = new Set(args.where.status.in);
        res = res.filter((i) => set.has(i.status));
      }

      return res.map((item) => {
        const round = store.orderRounds.find((r) => r.id === item.roundId);
        const session = round ? store.diningSessions.find((s) => s.id === round.sessionId) : null;
        const table = session ? store.tables.find((t) => t.id === session.tableId) : null;
        const waiter = session ? store.users.find((u) => u.id === session.waiterId) : null;

        return {
          ...item,
          menuItem: store.menuItems.find((m) => m.id === item.menuItemId)!,
          station: store.kitchenStations.find((st) => st.id === item.stationId) || null,
          round: round
            ? {
                ...round,
                session: session
                  ? {
                      ...session,
                      table: table ? { number: table.number } : { number: 'Table ?' },
                      waiter,
                    }
                  : null,
              }
            : null,
        };
      });
    },
    findUnique: async (args: { where: { id: string }; include?: any }) => {
      const item = store.orderItems.find((i) => i.id === args.where.id);
      if (!item) return null;

      const round = store.orderRounds.find((r) => r.id === item.roundId);
      const session = round ? store.diningSessions.find((s) => s.id === round.sessionId) : null;
      const table = session ? store.tables.find((t) => t.id === session.tableId) : null;

      return {
        ...item,
        menuItem: store.menuItems.find((m) => m.id === item.menuItemId)!,
        station: store.kitchenStations.find((st) => st.id === item.stationId) || null,
        round: round
          ? {
              ...round,
              session: session ? { ...session, table } : null,
            }
          : null,
      };
    },
    update: async (args: { where: { id: string }; data: Partial<OrderItem>; include?: any }) => {
      const idx = store.orderItems.findIndex((i) => i.id === args.where.id);
      if (idx !== -1) {
        store.orderItems[idx] = { ...store.orderItems[idx], ...args.data };
        store.save();
        const updated = store.orderItems[idx];
        return {
          ...updated,
          menuItem: store.menuItems.find((m) => m.id === updated.menuItemId)!,
          station: store.kitchenStations.find((st) => st.id === updated.stationId) || null,
        };
      }
      throw new Error('Order item not found');
    },
  },

  bill: {
    findMany: async (args?: any) => {
      let res = store.bills;
      if (args?.where?.status) {
        res = res.filter((b) => b.status === args.where.status);
      }
      return res.map((b) => ({
        ...b,
        items: store.billItems.filter((i) => i.billId === b.id),
        adjustments: store.billAdjustments.filter((a) => a.billId === b.id),
        payments: store.payments.filter((p) => p.billId === b.id),
      }));
    },
    findUnique: async (args: { where: { id: string }; include?: any }) => {
      const bill = store.bills.find((b) => b.id === args.where.id);
      if (!bill) return null;

      const session = store.diningSessions.find((s) => s.id === bill.sessionId);
      const table = session ? store.tables.find((t) => t.id === session.tableId) : null;
      const branch = session ? store.branches.find((b) => b.id === session.branchId) : null;
      const restaurant = branch ? store.restaurants.find((r) => r.id === branch.restaurantId) : null;

      return {
        ...bill,
        items: store.billItems.filter((i) => i.billId === bill.id),
        adjustments: store.billAdjustments.filter((a) => a.billId === bill.id),
        payments: store.payments.filter((p) => p.billId === bill.id),
        session: session
          ? {
              ...session,
              table,
              branch: branch ? { ...branch, restaurant } : null,
            }
          : null,
      };
    },
    create: async (args: { data: any; include?: any }) => {
      const billId = `bill_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const bill: Bill = {
        id: billId,
        sessionId: args.data.sessionId,
        version: args.data.version || 1,
        invoiceNumber: args.data.invoiceNumber,
        subtotal: args.data.subtotal || 0,
        taxAmount: args.data.taxAmount || 0,
        discountAmount: args.data.discountAmount || 0,
        finalAmount: args.data.finalAmount || 0,
        status: args.data.status || 'UNPAID',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.bills.push(bill);

      if (args.data.items?.create) {
        for (const item of args.data.items.create) {
          store.billItems.push({
            id: `bitem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            billId,
            menuItemId: item.menuItemId,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
          });
        }
      }

      if (args.data.adjustments?.create) {
        const adj = args.data.adjustments.create;
        store.billAdjustments.push({
          id: `badj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          billId,
          type: adj.type,
          userId: adj.userId,
          reason: adj.reason,
          oldValue: adj.oldValue,
          newValue: adj.newValue,
          createdAt: new Date(),
        });
      }

      store.save();
      return prisma.bill.findUnique({ where: { id: billId } });
    },
    update: async (args: { where: { id: string }; data: Partial<Bill>; include?: any }) => {
      const idx = store.bills.findIndex((b) => b.id === args.where.id);
      if (idx !== -1) {
        store.bills[idx] = { ...store.bills[idx], ...args.data, updatedAt: new Date() };
        store.save();
        return prisma.bill.findUnique({ where: { id: args.where.id } });
      }
      throw new Error('Bill not found');
    },
  },

  payment: {
    findMany: async (args?: any) => {
      let res = store.payments;
      if (args?.take) res = res.slice(0, args.take);
      return res.map((p) => {
        const bill = store.bills.find((b) => b.id === p.billId);
        const session = bill ? store.diningSessions.find((s) => s.id === bill.sessionId) : null;
        const table = session ? store.tables.find((t) => t.id === session.tableId) : null;
        return {
          ...p,
          bill: bill ? { ...bill, session: session ? { ...session, table } : null } : null,
        };
      });
    },
    create: async (args: { data: any }) => {
      const payment: Payment = {
        id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        billId: args.data.billId,
        amount: args.data.amount,
        method: args.data.method,
        referenceNumber: args.data.referenceNumber || null,
        receivedByUserId: args.data.receivedByUserId || null,
        status: args.data.status || 'SUCCESS',
        createdAt: new Date(),
      };
      store.payments.push(payment);
      store.save();
      return payment;
    },
  },

  auditLog: {
    findMany: async (args?: any) => {
      let res = store.auditLogs;
      if (args?.where?.branchId) {
        res = res.filter((l) => l.branchId === args.where.branchId);
      }
      return res.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },
    create: async (args: { data: any }) => {
      const log: AuditLog = {
        id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        restaurantId: args.data.restaurantId,
        branchId: args.data.branchId || null,
        userId: args.data.userId,
        action: args.data.action,
        detailsJson: args.data.detailsJson,
        createdAt: new Date(),
      };
      store.auditLogs.push(log);
      store.save();
      return log;
    },
  },
};
