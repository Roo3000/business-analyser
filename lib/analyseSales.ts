import { SalesRow, RevenueStats, RevenueProjection } from "@/types/sales";
import { format, parseISO, addDays, isValid } from "date-fns";

function parseDate(value: any): Date | null {
  if (value === null || value === undefined || value === "") return null;

  if (value instanceof Date) {
    return isValid(value) ? value : null;
  }

  if (typeof value === "number") {
    const date = new Date(Math.round((value - 25569) * 86400 * 1000));
    return isValid(date) ? date : null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    // Pure numeric string (Excel serial)
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      const num = parseFloat(trimmed);
      const date = new Date(Math.round((num - 25569) * 86400 * 1000));
      if (isValid(date)) return date;
    }

    let d = parseISO(trimmed);
    if (isValid(d)) return d;

    d = new Date(trimmed);
    if (isValid(d)) return d;
  }

  return null;
}

export function calculateRevenueStats(rows: SalesRow[]): RevenueStats {
  if (rows.length === 0) {
    return {
      totalRevenue: 0,
      totalOrders: 0,
      averageOrderValue: 0,
      totalCost: 0,
      totalProfit: 0,
      profitMargin: null,
      averageDailyRevenue: 0,
      revenueByPeriod: [],
      topProducts: [],
      growthRate: null,
    };
  }

  const totalRevenue = rows.reduce((sum, r) => sum + r.revenue, 0);
  const totalOrders = rows.length;
  const averageOrderValue = totalRevenue / totalOrders;

  // ----- NEW: Cost & Profit -----
  const totalCost = rows.reduce((sum, r) => sum + (r.cost || 0), 0);
  const totalProfit = totalRevenue - totalCost;
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : null;

  // ----- Average Daily Revenue -----
  const dates = rows
    .map((r) => parseDate(r.date))
    .filter((d): d is Date => d !== null)
    .sort((a, b) => a.getTime() - b.getTime());

  let averageDailyRevenue = 0;
  if (dates.length >= 2) {
    const daySpan = Math.max(
      1,
      Math.ceil((dates[dates.length - 1].getTime() - dates[0].getTime()) / (1000 * 60 * 60 * 24))
    );
    averageDailyRevenue = totalRevenue / daySpan;
  } else if (dates.length === 1) {
    averageDailyRevenue = totalRevenue;
  }

  // Group by month
  const monthlyMap = new Map<string, number>();
  rows.forEach((row) => {
    const date = parseDate(row.date);
    if (!date) return;
    const key = format(date, "yyyy-MM");
    monthlyMap.set(key, (monthlyMap.get(key) || 0) + row.revenue);
  });

  const revenueByPeriod = Array.from(monthlyMap.entries())
    .map(([period, revenue]) => ({ period, revenue }))
    .sort((a, b) => a.period.localeCompare(b.period));

  // Top products (now also includes profit when cost data exists)
  const productMap = new Map<string, { revenue: number; cost: number }>();
  rows.forEach((row) => {
    const current = productMap.get(row.product) || { revenue: 0, cost: 0 };
    current.revenue += row.revenue;
    current.cost += row.cost || 0;
    productMap.set(row.product, current);
  });

  const topProducts = Array.from(productMap.entries())
    .map(([product, data]) => ({
      product,
      revenue: data.revenue,
      profit: data.revenue - data.cost,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Growth rate
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
    totalCost,
    totalProfit,
    profitMargin,
    averageDailyRevenue,
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
      averageDailyRevenue: 0,
    };
  }

  const sorted = [...rows]
    .map((r) => ({ ...r, parsedDate: parseDate(r.date) }))
    .filter((r) => r.parsedDate !== null)
    .sort((a, b) => a.parsedDate!.getTime() - b.parsedDate!.getTime());

  if (sorted.length === 0) {
    return {
      projectedRevenue: [],
      method: "Could not parse dates",
      averageDailyRevenue: 0,
    };
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
    method: `Based on average daily revenue of $${avgDailyRevenue.toFixed(2)}`,
    averageDailyRevenue: avgDailyRevenue,
  };
}