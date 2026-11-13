import { SalesRow, RevenueStats, RevenueProjection } from "@/types/sales";
import { format, parseISO, addDays, isValid } from "date-fns";

// Helper: try to parse different date formats
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  // Try ISO first
  let d = parseISO(dateStr);
  if (isValid(d)) return d;

  // Try common formats
  const formats = [
    dateStr, // already tried
  ];

  // Fallback: native Date
  d = new Date(dateStr);
  return isValid(d) ? d : null;
}

export function calculateRevenueStats(rows: SalesRow[]): RevenueStats {
  if (rows.length === 0) {
    return {
      totalRevenue: 0,
      totalOrders: 0,
      averageOrderValue: 0,
      revenueByPeriod: [],
      topProducts: [],
      growthRate: null,
    };
  }

  const totalRevenue = rows.reduce((sum, r) => sum + r.revenue, 0);
  const totalOrders = rows.length;
  const averageOrderValue = totalRevenue / totalOrders;

  // Group by month
  const monthlyMap = new Map<string, number>();

  rows.forEach((row) => {
    const date = parseDate(row.date);
    if (!date) return;

    const key = format(date, "yyyy-MM"); // e.g. "2025-03"
    monthlyMap.set(key, (monthlyMap.get(key) || 0) + row.revenue);
  });

  const revenueByPeriod = Array.from(monthlyMap.entries())
    .map(([period, revenue]) => ({ period, revenue }))
    .sort((a, b) => a.period.localeCompare(b.period));

  // Top products
  const productMap = new Map<string, number>();
  rows.forEach((row) => {
    productMap.set(row.product, (productMap.get(row.product) || 0) + row.revenue);
  });

  const topProducts = Array.from(productMap.entries())
    .map(([product, revenue]) => ({ product, revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Simple growth rate (last month vs previous month)
  let growthRate: number | null = null;
  if (revenueByPeriod.length >= 2) {
    const last = revenueByPeriod[revenueByPeriod.length - 1].revenue;
    const prev = revenueByPeriod[revenueByPeriod.length - 2].revenue;
    if (prev > 0) {
      growthRate = ((last - prev) / prev) * 100;
    }
  }

  return {
    totalRevenue,
    totalOrders,
    averageOrderValue,
    revenueByPeriod,
    topProducts,
    growthRate,
  };
}

export function projectRevenue(
  rows: SalesRow[],
  days: number = 30
): RevenueProjection {
  if (rows.length === 0) {
    return {
      projectedRevenue: [],
      method: "No data",
    };
  }

  // Calculate average daily revenue from the last 30 days of data (or all data)
  const sorted = [...rows]
    .map((r) => ({ ...r, parsedDate: parseDate(r.date) }))
    .filter((r) => r.parsedDate !== null)
    .sort((a, b) => a.parsedDate!.getTime() - b.parsedDate!.getTime());

  if (sorted.length === 0) {
    return { projectedRevenue: [], method: "Could not parse dates" };
  }

  const lastDate = sorted[sorted.length - 1].parsedDate!;
  const totalRevenue = sorted.reduce((sum, r) => sum + r.revenue, 0);
  const daySpan = Math.max(
    1,
    Math.ceil(
      (lastDate.getTime() - sorted[0].parsedDate!.getTime()) / (1000 * 60 * 60 * 24)
    )
  );

  const avgDailyRevenue = totalRevenue / daySpan;

  // Simple linear projection
  const projectedRevenue = [];
  for (let i = 1; i <= days; i++) {
    const futureDate = addDays(lastDate, i);
    projectedRevenue.push({
      date: format(futureDate, "yyyy-MM-dd"),
      revenue: Math.round(avgDailyRevenue * 100) / 100,
    });
  }

  return {
    projectedRevenue,
    method: `Average daily revenue ($${avgDailyRevenue.toFixed(2)}) based on historical data`,
  };
}