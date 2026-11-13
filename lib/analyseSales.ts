import {
  SalesRow,
  RevenueStats,
  RevenueProjection,
  ProjectionMethod,
  ProductStats,
} from "@/types/sales";
import {
  format,
  parseISO,
  addDays,
  isValid,
  isWithinInterval,
  startOfDay,
  getDay,
} from "date-fns";

export function parseDate(value: any): Date | null {
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

/** Filter rows by optional start/end date (inclusive) */
export function filterRowsByDate(
  rows: SalesRow[],
  startDate: string | null,
  endDate: string | null
): SalesRow[] {
  if (!startDate && !endDate) return rows;

  const start = startDate
    ? startOfDay(parseDate(startDate) || new Date(0))
    : null;
  const end = endDate
    ? startOfDay(parseDate(endDate) || new Date())
    : null;

  return rows.filter((row) => {
    const d = parseDate(row.date);
    if (!d) return false;
    const day = startOfDay(d);

    if (start && end) {
      return isWithinInterval(day, { start, end });
    }
    if (start) return day >= start;
    if (end) return day <= end;
    return true;
  });
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
      revenueByDay: [],
      topProducts: [],
      topCustomers: [],
      growthRate: null,
      dateRange: { min: null, max: null },
      dayOfWeekAvg: [0, 0, 0, 0, 0, 0, 0],
    };
  }

  const totalRevenue = rows.reduce((sum, r) => sum + r.revenue, 0);
  const totalOrders = rows.length;
  const averageOrderValue = totalRevenue / totalOrders;

  const totalCost = rows.reduce((sum, r) => sum + (r.cost || 0), 0);
  const totalProfit = totalRevenue - totalCost;
  const profitMargin =
    totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : null;

  const datedRows = rows
    .map((r) => ({ row: r, date: parseDate(r.date) }))
    .filter((x): x is { row: SalesRow; date: Date } => x.date !== null)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const dates = datedRows.map((x) => x.date);
  let averageDailyRevenue = 0;
  let minDate: string | null = null;
  let maxDate: string | null = null;

  if (dates.length >= 1) {
    minDate = format(dates[0], "yyyy-MM-dd");
    maxDate = format(dates[dates.length - 1], "yyyy-MM-dd");
  }

  if (dates.length >= 2) {
    const daySpan = Math.max(
      1,
      Math.ceil(
        (dates[dates.length - 1].getTime() - dates[0].getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );
    averageDailyRevenue = totalRevenue / daySpan;
  } else if (dates.length === 1) {
    averageDailyRevenue = totalRevenue;
  }

  // Daily series
  const dailyMap = new Map<string, number>();
  datedRows.forEach(({ row, date }) => {
    const key = format(date, "yyyy-MM-dd");
    dailyMap.set(key, (dailyMap.get(key) || 0) + row.revenue);
  });
  const revenueByDay = Array.from(dailyMap.entries())
    .map(([date, revenue]) => ({ date, revenue }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Day-of-week averages (for seasonality)
  const dowSum = [0, 0, 0, 0, 0, 0, 0];
  const dowCount = [0, 0, 0, 0, 0, 0, 0];
  revenueByDay.forEach(({ date, revenue }) => {
    const d = parseDate(date);
    if (!d) return;
    const dow = getDay(d); // 0=Sun … 6=Sat
    dowSum[dow] += revenue;
    dowCount[dow] += 1;
  });
  const dayOfWeekAvg = dowSum.map((sum, i) =>
    dowCount[i] > 0 ? sum / dowCount[i] : averageDailyRevenue
  );

  // Monthly
  const monthlyMap = new Map<string, number>();
  datedRows.forEach(({ row, date }) => {
    const key = format(date, "yyyy-MM");
    monthlyMap.set(key, (monthlyMap.get(key) || 0) + row.revenue);
  });
  const revenueByPeriod = Array.from(monthlyMap.entries())
    .map(([period, revenue]) => ({ period, revenue }))
    .sort((a, b) => a.period.localeCompare(b.period));

  // Top products with full cost breakdown
  const productMap = new Map<
    string,
    { revenue: number; cost: number; quantity: number }
  >();
  rows.forEach((row) => {
    const current = productMap.get(row.product) || {
      revenue: 0,
      cost: 0,
      quantity: 0,
    };
    current.revenue += row.revenue;
    current.cost += row.cost || 0;
    current.quantity += row.quantity;
    productMap.set(row.product, current);
  });
  const topProducts: ProductStats[] = Array.from(productMap.entries())
    .map(([product, data]) => {
      const profit = data.revenue - data.cost;
      const margin =
        data.revenue > 0 ? (profit / data.revenue) * 100 : null;
      return {
        product,
        revenue: data.revenue,
        cost: data.cost,
        profit,
        margin,
        quantity: data.quantity,
      };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Top customers
  const customerMap = new Map<string, { revenue: number; orders: number }>();
  rows.forEach((row) => {
    if (!row.customer) return;
    const current = customerMap.get(row.customer) || {
      revenue: 0,
      orders: 0,
    };
    current.revenue += row.revenue;
    current.orders += 1;
    customerMap.set(row.customer, current);
  });
  const topCustomers = Array.from(customerMap.entries())
    .map(([customer, data]) => ({
      customer,
      revenue: data.revenue,
      orders: data.orders,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

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
    revenueByDay,
    topProducts,
    topCustomers,
    growthRate,
    dateRange: { min: minDate, max: maxDate },
    dayOfWeekAvg,
  };
}

/**
 * Project future revenue.
 * - "average": flat average daily revenue
 * - "trend": simple linear regression on daily revenue series
 * - "seasonal": trend + day-of-week seasonality factors
 */
export function projectRevenue(
  rows: SalesRow[],
  days: number = 30,
  method: ProjectionMethod = "seasonal"
): RevenueProjection {
  if (rows.length === 0) {
    return {
      projectedRevenue: [],
      method: "No data",
      averageDailyRevenue: 0,
      trendSlope: null,
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
      trendSlope: null,
    };
  }

  const lastDate = sorted[sorted.length - 1].parsedDate!;
  const totalRevenue = sorted.reduce((sum, r) => sum + r.revenue, 0);
  const daySpan = Math.max(
    1,
    Math.ceil(
      (lastDate.getTime() - sorted[0].parsedDate!.getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );
  const avgDailyRevenue = totalRevenue / daySpan;

  // Daily series
  const dailyMap = new Map<string, number>();
  sorted.forEach((r) => {
    const key = format(r.parsedDate!, "yyyy-MM-dd");
    dailyMap.set(key, (dailyMap.get(key) || 0) + r.revenue);
  });
  const dailySeries = Array.from(dailyMap.entries())
    .map(([date, revenue]) => ({ date, revenue }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Linear regression
  let slope = 0;
  let intercept = avgDailyRevenue;

  if (
    (method === "trend" || method === "seasonal") &&
    dailySeries.length >= 3
  ) {
    const n = dailySeries.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    dailySeries.forEach((point, i) => {
      const x = i;
      const y = point.revenue;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
    });

    const denom = n * sumXX - sumX * sumX;
    if (denom !== 0) {
      slope = (n * sumXY - sumX * sumY) / denom;
      intercept = (sumY - slope * sumX) / n;
    }
  }

  // Day-of-week factors for seasonality
  const dowSum = [0, 0, 0, 0, 0, 0, 0];
  const dowCount = [0, 0, 0, 0, 0, 0, 0];
  dailySeries.forEach(({ date, revenue }) => {
    const d = parseDate(date);
    if (!d) return;
    const dow = getDay(d);
    dowSum[dow] += revenue;
    dowCount[dow] += 1;
  });
  const dowAvg = dowSum.map((sum, i) =>
    dowCount[i] > 0 ? sum / dowCount[i] : avgDailyRevenue
  );
  // Normalize so the average of factors ≈ 1
  const overallDowAvg =
    dowAvg.reduce((a, b) => a + b, 0) / 7 || avgDailyRevenue;
  const dowFactor = dowAvg.map((v) =>
    overallDowAvg > 0 ? v / overallDowAvg : 1
  );

  const projectedRevenue = [];
  const lastIndex = dailySeries.length - 1;

  for (let i = 1; i <= days; i++) {
    const futureDate = addDays(lastDate, i);
    let revenue: number;

    if (method === "average") {
      revenue = avgDailyRevenue;
    } else if (method === "trend" && dailySeries.length >= 3) {
      revenue = intercept + slope * (lastIndex + i);
      revenue = Math.max(0, revenue);
    } else if (method === "seasonal" && dailySeries.length >= 3) {
      // Base trend value
      const base = intercept + slope * (lastIndex + i);
      // Apply day-of-week seasonality
      const factor = dowFactor[getDay(futureDate)];
      revenue = Math.max(0, base * factor);
    } else {
      revenue = avgDailyRevenue;
    }

    projectedRevenue.push({
      date: format(futureDate, "yyyy-MM-dd"),
      revenue: Math.round(revenue * 100) / 100,
    });
  }

    let methodLabel: string;
  if (method === "seasonal" && dailySeries.length >= 3) {
    methodLabel = "Trend + day-of-week seasonality";
  } else if (method === "trend" && dailySeries.length >= 3) {
    methodLabel = "Linear trend";
  } else {
    methodLabel = "Flat average daily revenue";
  }

  return {
    projectedRevenue,
    method: methodLabel,
    averageDailyRevenue: avgDailyRevenue,
    trendSlope: method !== "average" ? slope : null,
  };
}