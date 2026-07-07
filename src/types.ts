export interface Card {
  id: number;
  name: string;
  bank: string;
  account_number: string;
  deleted?: number;
}

export interface Product {
  id: number;
  code?: string;
  name: string;
  price: number;
  cost: number;
  stock: number;
  initial_stock: number;
  category: string;
  image?: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Movement {
  id: number;
  product_id: number;
  product_name: string;
  type: 'entry' | 'waste' | 'sale' | 'cancellation';
  quantity: number;
  reason: string;
  timestamp: string;
}

export interface SaleItem {
  id: number;
  product_id?: number;
  product_name?: string;
  name?: string;
  quantity: number;
  price: number;
  unit_price?: number;
  subtotal?: number;
}

export interface Sale {
  id: number;
  total: number;
  payment_method: 'cash' | 'transfer' | 'split';
  payments?: { method: 'cash' | 'transfer'; amount: number }[];
  payments_json?: string;
  timestamp: string;
  cancelled?: number;
  card_id?: number | null;
  items?: SaleItem[];
  created_at?: string;
}

export interface Session {
  id: number;
  start_time: string;
  end_time: string | null;
  is_closed: number;
  name?: string;
  deleted?: number;
}

export interface ProductInput {
  name: string;
  code?: string;
  price: number;
  cost?: number;
  stock: number;
  initial_stock?: number;
  category?: string;
  image?: string | null;
}

export interface CardInput {
  name: string;
  bank: string;
  account_number: string;
}

export interface MoveInput {
  product_id: number;
  type: 'entry' | 'waste';
  quantity: number;
  reason?: string;
  session_id?: number;
  timestamp?: string;
  product_name?: string;
}

export interface SaleInput {
  items: SaleItem[];
  payment_method: 'cash' | 'transfer' | 'split';
  total: number;
  payments?: { method: 'cash' | 'transfer'; amount: number }[];
  timestamp: string;
  card_id?: number | null;
  customer_id?: number;
  status?: string;
  session_id?: number;
}

export interface SessionInput {
  start_time?: string;
  name?: string;
}

export interface TodayStats {
  totalSales: number;
  totalTransfer: number;
  totalSplit: number;
  totalNet: number;
  ticketCount: number;
  cancelledCount: number;
  previousDayStats?: {
    totalSales: number;
    totalNet: number;
    ticketCount: number;
  };
}

export interface DashboardData {
  todayStats: TodayStats;
  topProducts: { name: string; quantity: number; total: number }[];
  lowStockCount: number;
  recentSales: { id: number; total: number; payment_method: string; created_at: string }[];
  weeklySales: { day: string; total: number; net: number }[];
}
