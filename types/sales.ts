export interface SalesRow {
  date: string;
  orderId: string;
  product: string;
  quantity: number;
  unitPrice: number;
  revenue: number;
  cost?: number;
  customer?: string;
}

export interface ProductStats {
  product: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number | null; // percentage
  quantity: number;
}

export interface RevenueStats {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number | null;
  averageDailyRevenue: number;
  revenueByPeriod: { period: string; revenue: number }[];
  revenueByDay: { date: string; revenue: number }[];
  topProducts: ProductStats[];
  topCustomers: { customer: string; revenue: number; orders: number }[];
  growthRate: number | null;
  dateRange: { min: string | null; max: string | null };
  /** Average revenue by day of week (0=Sun … 6=Sat). Used for seasonality. */
  dayOfWeekAvg: number[];
}

export interface RevenueProjection {
  projectedRevenue: { date: string; revenue: number }[];
  method: string;
  averageDailyRevenue: number;
  trendSlope: number | null;
}

export type ProjectionMethod = "average" | "trend" | "seasonal";