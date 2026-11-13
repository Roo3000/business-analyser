"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { parseSalesFile } from "@/lib/parseSales";
import {
  calculateRevenueStats,
  projectRevenue,
  filterRowsByDate,
} from "@/lib/analyseSales";
import {
  SalesRow,
  RevenueStats,
  RevenueProjection,
  ProjectionMethod,
} from "@/types/sales";
import { translations, Lang } from "@/lib/i18n";
import {
  Upload,
  FileSpreadsheet,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  BarChart3,
  Wallet,
  PiggyBank,
  Percent,
  CalendarDays,
  Download,
  Users,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
  AreaChart,
} from "recharts";

const CURRENCIES = [
  { code: "USD", locale: "en-US", symbol: "$" },
  { code: "EUR", locale: "fr-FR", symbol: "€" },
  { code: "GBP", locale: "en-GB", symbol: "£" },
  { code: "CAD", locale: "en-CA", symbol: "C$" },
  { code: "XOF", locale: "fr-FR", symbol: "CFA" },
] as const;

type CurrencyCode = (typeof CURRENCIES)[number]["code"];

export default function AnalyserPage() {
  const [rows, setRows] = useState<SalesRow[]>([]);
  const [stats, setStats] = useState<RevenueStats | null>(null);
  const [projection, setProjection] = useState<RevenueProjection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  // Controls
  const [topN, setTopN] = useState(5);
  const [projectionDays, setProjectionDays] = useState(30);
  const [projectionMethod, setProjectionMethod] =
    useState<ProjectionMethod>("seasonal");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const [sourceCurrency, setSourceCurrency] = useState<CurrencyCode>("USD");
  const [rates, setRates] = useState<Record<string, number>>({ USD: 1 });
  const [ratesLoading, setRatesLoading] = useState(false);
  const [lang, setLang] = useState<Lang>("en");

  const t = translations[lang];

    // Approximate static rates (used as fallback / offline)
  const STATIC_RATES: Record<CurrencyCode, Record<CurrencyCode, number>> = {
    USD: { USD: 1, EUR: 0.92, GBP: 0.79, CAD: 1.36, XOF: 600 },
    EUR: { USD: 1.09, EUR: 1, GBP: 0.86, CAD: 1.48, XOF: 655 },
    GBP: { USD: 1.27, EUR: 1.16, GBP: 1, CAD: 1.72, XOF: 760 },
    CAD: { USD: 0.74, EUR: 0.68, GBP: 0.58, CAD: 1, XOF: 440 },
    XOF: { USD: 0.00167, EUR: 0.00153, GBP: 0.00132, CAD: 0.00227, XOF: 1 },
  };

  const fetchRates = useCallback(async (base: CurrencyCode) => {
    setRatesLoading(true);
    try {
      const res = await fetch(
        `https://api.frankfurter.app/latest?from=${base}`,
        { signal: AbortSignal.timeout(4000) }
      );
      if (!res.ok) throw new Error("Rate API unavailable");
      const data = await res.json();
      setRates({
        ...STATIC_RATES[base],
        [base]: 1,
        ...data.rates,
      });
    } catch {
      // Silent fallback — no crash
      setRates(STATIC_RATES[base] || { USD: 1, EUR: 1, GBP: 1, CAD: 1, XOF: 1 });
    } finally {
      setRatesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRates(sourceCurrency);
  }, [sourceCurrency, fetchRates]);

  const processData = (
    sourceRows: SalesRow[],
    days: number,
    method: ProjectionMethod,
    start: string,
    end: string
  ) => {
    const filtered = filterRowsByDate(
      sourceRows,
      start || null,
      end || null
    );
    const calculatedStats = calculateRevenueStats(filtered);
    const calculatedProjection = projectRevenue(filtered, days, method);
    setStats(calculatedStats);
    setProjection(calculatedProjection);
  };

  const handleFile = async (file: File) => {
    setLoading(true);
    setError(null);
    setFileName(file.name);
    setStartDate("");
    setEndDate("");

    try {
      const parsedRows = await parseSalesFile(file);
      setRows(parsedRows);
      processData(parsedRows, projectionDays, projectionMethod, "", "");
    } catch (err: any) {
      setError(err.message || "Failed to process the file");
      setRows([]);
      setStats(null);
      setProjection(null);
    } finally {
      setLoading(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const reprocess = (
    days = projectionDays,
    method = projectionMethod,
    start = startDate,
    end = endDate
  ) => {
    if (rows.length > 0) {
      processData(rows, days, method, start, end);
    }
  };

  const handleProjectionDaysChange = (days: number) => {
    setProjectionDays(days);
    reprocess(days, projectionMethod, startDate, endDate);
  };

  const handleMethodChange = (method: ProjectionMethod) => {
    setProjectionMethod(method);
    reprocess(projectionDays, method, startDate, endDate);
  };

  const handleDateFilter = () => {
    reprocess(projectionDays, projectionMethod, startDate, endDate);
  };

  const clearDateFilter = () => {
    setStartDate("");
    setEndDate("");
    reprocess(projectionDays, projectionMethod, "", "");
  };

  const currencyInfo = CURRENCIES.find((c) => c.code === currency) || CURRENCIES[0];

  /** Convert an amount from sourceCurrency into the display currency */
  const convert = (value: number): number => {
    if (sourceCurrency === currency) return value;
    const rate = rates[currency];
    if (rate === undefined) return value; // rates not loaded yet
    return value * rate;
  };

  const formatCurrency = (value: number) => {
    const converted = convert(value);
    return new Intl.NumberFormat(currencyInfo.locale, {
      style: "currency",
      currency: currencyInfo.code,
      maximumFractionDigits: 0,
    }).format(converted);
  };

  const formatPercent = (value: number | null) =>
    value === null ? "N/A" : `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;

  const chartData = useMemo(() => {
    if (!stats || !projection) return [];

    const historical = stats.revenueByDay.map((d) => ({
      date: d.date,
      actual: d.revenue,
      projected: null as number | null,
    }));

    const projected = projection.projectedRevenue.map((d) => ({
      date: d.date,
      actual: null as number | null,
      projected: d.revenue,
    }));

    return [...historical, ...projected];
  }, [stats, projection]);

  const exportCsv = () => {
    if (!stats) return;

    const lines: string[] = [];
    lines.push("Metric,Value");
    lines.push(`Total Revenue,${stats.totalRevenue}`);
    lines.push(`Total Orders,${stats.totalOrders}`);
    lines.push(`Average Order Value,${stats.averageOrderValue}`);
    lines.push(`Total Cost,${stats.totalCost}`);
    lines.push(`Total Profit,${stats.totalProfit}`);
    lines.push(`Profit Margin %,${stats.profitMargin ?? ""}`);
    lines.push(`Avg Daily Revenue,${stats.averageDailyRevenue}`);
    lines.push(`Growth Rate %,${stats.growthRate ?? ""}`);
    lines.push("");
    lines.push("Product,Revenue,Cost,Profit,Margin %,Quantity");
    stats.topProducts.slice(0, topN).forEach((p) => {
      lines.push(
        `"${p.product}",${p.revenue},${p.cost},${p.profit},${p.margin ?? ""},${p.quantity}`
      );
    });
    lines.push("");
    lines.push("Customer,Revenue,Orders");
    stats.topCustomers.forEach((c) => {
      lines.push(`"${c.customer}",${c.revenue},${c.orders}`);
    });
    lines.push("");
    lines.push("Date,Actual Revenue,Projected Revenue");
    chartData.forEach((d) => {
      lines.push(`${d.date},${d.actual ?? ""},${d.projected ?? ""}`);
    });

    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `business-analyser-export-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-2 rounded-lg">
              <BarChart3 size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">{t.appTitle}</h1>
              <p className="text-sm text-slate-500">{t.appSubtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Language */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">{t.language}</span>
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as Lang)}
                className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="en">English</option>
                <option value="fr">Français</option>
              </select>
            </div>

            {/* Source currency (of the uploaded file) */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">{t.sourceCurrency}</span>
              <select
                value={sourceCurrency}
                onChange={(e) =>
                  setSourceCurrency(e.target.value as CurrencyCode)
                }
                className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ))}
              </select>
            </div>

            {/* Display currency */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">{t.currency}</span>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ))}
              </select>
              {ratesLoading && (
                <span className="text-xs text-slate-400">…</span>
              )}
            </div>

            {stats && (
              <button
                onClick={exportCsv}
                className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Download size={16} />
                {t.exportCsv}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Upload Zone */}
        <div
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-slate-300 rounded-2xl bg-white p-12 text-center hover:border-blue-400 transition-colors"
        >
          <div className="flex flex-col items-center gap-4">
            <div className="bg-blue-50 p-4 rounded-full">
              <Upload className="text-blue-600" size={32} />
            </div>
            <div>
              <p className="text-lg font-medium">{t.dropTitle}</p>
              <p className="text-slate-500 text-sm mt-1">{t.dropHint}</p>
            </div>

            <label className="mt-2 cursor-pointer">
              <span className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
                <FileSpreadsheet size={18} />
                {t.chooseFile}
              </span>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={onFileChange}
                className="hidden"
              />
            </label>

            {fileName && (
              <p className="text-sm text-slate-600 mt-2">
                {t.selected}: <span className="font-medium">{fileName}</span>
              </p>
            )}
          </div>
        </div>

        {loading && (
          <div className="mt-10 text-center text-slate-600">{t.processing}</div>
        )}

        {error && (
          <div className="mt-8 bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-xl">
            {error}
          </div>
        )}

        {stats && !loading && (
          <div className="mt-12 space-y-10">
            {/* Controls */}
            <div className="flex flex-wrap gap-6 items-end bg-white border border-slate-200 rounded-2xl px-6 py-5">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-600">
                  {t.dateRange}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-slate-400">→</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleDateFilter}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium"
                  >
                    {t.apply}
                  </button>
                  {(startDate || endDate) && (
                    <button
                      onClick={clearDateFilter}
                      className="text-slate-500 hover:text-slate-700 text-sm underline"
                    >
                      {t.clear}
                    </button>
                  )}
                </div>
                {stats.dateRange.min && (
                  <p className="text-xs text-slate-400 mt-1">
                    {t.dataSpans} {stats.dateRange.min} → {stats.dateRange.max}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-slate-600">
                  {t.topProducts}:
                </label>
                <select
                  value={topN}
                  onChange={(e) => setTopN(Number(e.target.value))}
                  className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={3}>Top 3</option>
                  <option value={5}>Top 5</option>
                  <option value={10}>Top 10</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-slate-600">
                  {t.projection}:
                </label>
                <select
                  value={projectionDays}
                  onChange={(e) =>
                    handleProjectionDaysChange(Number(e.target.value))
                  }
                  className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={30}>30</option>
                  <option value={60}>60</option>
                  <option value={90}>90</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-slate-600">
                  {t.method}:
                </label>
                <select
                  value={projectionMethod}
                  onChange={(e) =>
                    handleMethodChange(e.target.value as ProjectionMethod)
                  }
                  className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="seasonal">{t.methodSeasonal}</option>
                  <option value="trend">{t.methodTrend}</option>
                  <option value="average">{t.methodAverage}</option>
                </select>
              </div>
            </div>

            {/* Core Revenue Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <MetricCard
                title={t.totalRevenue}
                value={formatCurrency(stats.totalRevenue)}
                icon={<DollarSign size={20} />}
                color="blue"
              />
              <MetricCard
                title={t.totalOrders}
                value={stats.totalOrders.toLocaleString()}
                icon={<ShoppingCart size={20} />}
                color="indigo"
              />
              <MetricCard
                title={t.avgOrderValue}
                value={formatCurrency(stats.averageOrderValue)}
                icon={<TrendingUp size={20} />}
                color="emerald"
              />
              <MetricCard
                title={t.growthRate}
                value={formatPercent(stats.growthRate)}
                icon={<BarChart3 size={20} />}
                color={
                  stats.growthRate && stats.growthRate >= 0 ? "emerald" : "rose"
                }
              />
            </div>

            {/* Cost & Profit Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <MetricCard
                title={t.totalCost}
                value={formatCurrency(stats.totalCost)}
                icon={<Wallet size={20} />}
                color="amber"
              />
              <MetricCard
                title={t.totalProfit}
                value={formatCurrency(stats.totalProfit)}
                icon={<PiggyBank size={20} />}
                color={stats.totalProfit >= 0 ? "emerald" : "rose"}
              />
              <MetricCard
                title={t.profitMargin}
                value={
                  stats.profitMargin !== null
                    ? `${stats.profitMargin.toFixed(1)}%`
                    : "N/A"
                }
                icon={<Percent size={20} />}
                color={
                  stats.profitMargin && stats.profitMargin >= 0
                    ? "emerald"
                    : "rose"
                }
              />
              <MetricCard
                title={t.avgDailyRevenue}
                value={formatCurrency(stats.averageDailyRevenue)}
                icon={<CalendarDays size={20} />}
                color="blue"
              />
            </div>

            {/* Revenue + Projection Chart */}
            {chartData.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h2 className="font-semibold text-lg mb-1">{t.revenueChart}</h2>
                <p className="text-sm text-slate-500 mb-6">
                  {projection?.method}
                </p>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => v.slice(5)}
                      />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) =>
                          v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`
                        }
                      />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        labelFormatter={(label) => label}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="actual"
                        name={lang === "fr" ? "Réel" : "Actual"}
                        stroke="#2563eb"
                        fill="#93c5fd"
                        fillOpacity={0.4}
                        strokeWidth={2}
                        connectNulls={false}
                      />
                      <Area
                        type="monotone"
                        dataKey="projected"
                        name={lang === "fr" ? "Projeté" : "Projected"}
                        stroke="#7c3aed"
                        fill="#c4b5fd"
                        fillOpacity={0.3}
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        connectNulls={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Projection summary */}
            {projection && (
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
                <h2 className="font-semibold text-lg text-blue-900 mb-1">
                  {t.projectionTitle(projectionDays)}
                </h2>
                <p className="text-blue-700 text-sm mb-5">{projection.method}</p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm text-blue-600 mb-1">
                      {t.currentAvgDaily}
                    </p>
                    <p className="text-2xl font-bold text-blue-900">
                      {formatCurrency(stats.averageDailyRevenue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-blue-600 mb-1">
                      {t.projectedDailyStart}
                    </p>
                    <p className="text-2xl font-bold text-blue-900">
                      {formatCurrency(
                        projection.projectedRevenue[0]?.revenue ?? 0
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-blue-600 mb-1">
                      {t.estimatedTotal(projectionDays)}
                    </p>
                    <p className="text-2xl font-bold text-blue-900">
                      {formatCurrency(
                        projection.projectedRevenue.reduce(
                          (sum, d) => sum + d.revenue,
                          0
                        )
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Product Cost Breakdown */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-lg">{t.productBreakdown}</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-left text-slate-500">
                      <th className="px-6 py-3 font-medium">#</th>
                      <th className="px-6 py-3 font-medium">
                        {lang === "fr" ? "Produit" : "Product"}
                      </th>
                      <th className="px-6 py-3 font-medium text-right">
                        {t.qty}
                      </th>
                      <th className="px-6 py-3 font-medium text-right">
                        {t.revenue}
                      </th>
                      <th className="px-6 py-3 font-medium text-right">
                        {t.cost}
                      </th>
                      <th className="px-6 py-3 font-medium text-right">
                        {t.profit}
                      </th>
                      <th className="px-6 py-3 font-medium text-right">
                        {t.margin}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stats.topProducts.slice(0, topN).map((item, index) => (
                      <tr key={item.product}>
                        <td className="px-6 py-3 text-slate-400">{index + 1}</td>
                        <td className="px-6 py-3 font-medium">{item.product}</td>
                        <td className="px-6 py-3 text-right">{item.quantity}</td>
                        <td className="px-6 py-3 text-right">
                          {formatCurrency(item.revenue)}
                        </td>
                        <td className="px-6 py-3 text-right">
                          {formatCurrency(item.cost)}
                        </td>
                        <td
                          className={`px-6 py-3 text-right font-medium ${
                            item.profit >= 0 ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {formatCurrency(item.profit)}
                        </td>
                        <td className="px-6 py-3 text-right">
                          {item.margin !== null
                            ? `${item.margin.toFixed(1)}%`
                            : "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top Products chart + Top Customers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                  <h2 className="font-semibold text-lg">
                    {t.topProductsByRevenue(topN)}
                  </h2>
                </div>
                <div className="h-64 p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats.topProducts.slice(0, topN)}
                      layout="vertical"
                      margin={{ left: 20, right: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) =>
                          v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`
                        }
                      />
                      <YAxis
                        type="category"
                        dataKey="product"
                        width={100}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Bar
                        dataKey="revenue"
                        fill="#2563eb"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                  <Users size={18} className="text-slate-500" />
                  <h2 className="font-semibold text-lg">{t.topCustomers}</h2>
                </div>
                {stats.topCustomers.length === 0 ? (
                  <div className="px-6 py-12 text-center text-slate-500 text-sm">
                    {t.noCustomerData}
                    <br />
                    {t.addCustomerColumn}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {stats.topCustomers.slice(0, 8).map((item, index) => (
                      <div
                        key={item.customer}
                        className="flex items-center justify-between px-6 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-slate-400 text-sm w-5">
                            {index + 1}
                          </span>
                          <span className="font-medium text-sm">
                            {item.customer}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold text-slate-700 text-sm">
                            {formatCurrency(item.revenue)}
                          </span>
                          <span className="block text-xs text-slate-500">
                            {item.orders}{" "}
                            {item.orders !== 1 ? t.orders : t.order}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Monthly breakdown */}
            {stats.revenueByPeriod.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                  <h2 className="font-semibold text-lg">{t.monthlyRevenue}</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-left text-slate-500">
                        <th className="px-6 py-3 font-medium">{t.month}</th>
                        <th className="px-6 py-3 font-medium text-right">
                          {t.revenue}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {stats.revenueByPeriod.map((row) => (
                        <tr key={row.period}>
                          <td className="px-6 py-3 font-medium">
                            {row.period}
                          </td>
                          <td className="px-6 py-3 text-right">
                            {formatCurrency(row.revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-600",
    amber: "bg-amber-50 text-amber-600",
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-slate-500 font-medium">{title}</span>
        <div className={`p-2 rounded-lg ${colorMap[color]}`}>{icon}</div>
      </div>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
    </div>
  );
}
