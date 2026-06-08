export type RoleName = 'ADMIN' | 'CAJA' | 'MOZO';
export type TableStatus = 'LIBRE' | 'OCUPADA' | 'CUENTA_PEDIDA' | 'RESERVADA';
export type OrderStatus = 'ABIERTO' | 'ENVIADO' | 'CUENTA_PEDIDA' | 'CERRADO' | 'CANCELADO';
export type OrderItemStatus = 'BORRADOR' | 'ENVIADO' | 'EN_PREPARACION' | 'LISTO' | 'SERVIDO' | 'CANCELADO';
export type PaymentMethod = 'EFECTIVO' | 'TARJETA_DEBITO' | 'TARJETA_CREDITO' | 'TRANSFERENCIA' | 'OTRO';
export type PrintSector = 'COCINA' | 'BARRA' | 'NINGUNO';

export interface User {
  id: number;
  name: string;
  username: string;
  role: RoleName;
  branchId: number;
  branchName?: string;
  active?: boolean;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export interface Mesa {
  id: number;
  number: number;
  name: string | null;
  capacity: number;
  status: TableStatus;
  branchId: number;
  orders: { id: number; status: OrderStatus; total: string }[];
}

export interface Category {
  id: number;
  name: string;
  sortOrder: number;
  active?: boolean;
}

export interface Product {
  id: number;
  name: string;
  description: string | null;
  price: string;
  image: string | null;
  categoryId: number;
  printSector: PrintSector;
  manualAvailable: boolean;
  autoAvailable: boolean;
  active: boolean;
  category?: Category;
  recipe?: { id: number; ingredientId: number; quantity: string; ingredient: Ingredient }[];
}

export interface ComboProduct {
  id: number;
  productId: number;
  quantity: number;
  product: Product;
}

export interface Combo {
  id: number;
  name: string;
  description: string | null;
  price: string;
  image: string | null;
  products: ComboProduct[];
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number | null;
  comboId: number | null;
  ingredientId: number | null;
  menuItemId: number | null;
  quantity: number;
  unitPrice: string;
  subtotal: string;
  status: OrderItemStatus;
  notes: string | null;
  product: Product | null;
  combo: Combo | null;
  ingredient: Ingredient | null;
}

export interface Order {
  id: number;
  tableId: number | null;
  status: OrderStatus;
  subtotal: string;
  total: string;
  notes: string | null;
  items: OrderItem[];
  waiter?: { id: number; name: string };
}

export type IngredientKind = 'COCINA' | 'BEBIDA';

export interface Ingredient {
  id: number;
  name: string;
  kind: IngredientKind;
  unit: string;
  currentStock: string;
  minStock: string;
  cost: string;
  active: boolean;
}

export interface PaymentLine {
  method: PaymentMethod;
  amount: number;
}

export interface Payment {
  id: number;
  orderId: number;
  total: string;
  createdAt: string;
  lines: { id: number; method: PaymentMethod; amount: string }[];
  order?: Order & { table?: { number: number; name: string | null } };
  cashier?: { name: string };
}

export interface MesaPendiente {
  id: number;
  number: number;
  name: string | null;
  orders: Order[];
}

export interface DashboardStats {
  salesToday: number;
  salesTodayChangePct: number | null;
  ordersToday: number;
  ordersTodayChange: number;
  activeTables: number;
  totalTables: number;
  tablesOccupancyPct: number;
  lowStockAlerts: number;
  pendingPrintJobs: number;
  salesLast7Days: { label: string; date: string; amount: number }[];
  ordersLast7Days: { label: string; date: string; count: number }[];
  topProducts: { name: string; quantity: number }[];
  alerts: {
    lowStockCount: number;
    disconnectedPrinters: number;
    allOk: boolean;
  };
  monthSummary: {
    totalSales: number;
    totalOrders: number;
    avgTicket: number;
    productsSold: number;
  };
  recentOrders: {
    id: number;
    time: string;
    location: string;
    status: string;
    statusLabel: string;
    total: number;
  }[];
}
