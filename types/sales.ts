export interface SalesRow {
  date: string;
  orderId: string;
  product: string;
  quantity: number;
  unitPrice: number;
  revenue: number;
  cost?: number;        // ← NEW: money spent to buy this item (total cost for the line)
  customer?: string;
}

export interface RevenueStats {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  totalCost: number;           // ← NEW
  totalProfit: number;         // ← NEW
  profitMargin: number | null; // ← NEW (percentage)
  averageDailyRevenue: number; // ← NEW
  revenueByPeriod: { period: string; revenue: number }[];
  topProducts: { product: string; revenue: number; profit?: number }[];
  growthRate: number | null;
}

export interface RevenueProjection {
  projectedRevenue: { date: string; revenue: number }[];
  method: string;
  averageDailyRevenue: number; // so we can show the comparison easily
}