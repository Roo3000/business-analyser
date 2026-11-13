export interface SalesRow {
  date: string;          // e.g. "2025-01-15"
  orderId: string;
  product: string;
  quantity: number;
  unitPrice: number;
  revenue: number;       // quantity * unitPrice
  customer?: string;
}

export interface RevenueStats {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  revenueByPeriod: { period: string; revenue: number }[];
  topProducts: { product: string; revenue: number }[];
  growthRate: number | null; // percentage
}

export interface RevenueProjection {
  projectedRevenue: { date: string; revenue: number }[];
  method: string;
}