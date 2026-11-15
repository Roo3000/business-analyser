"use client";

import { MetricCard } from "@/components/ui/MetricCard";
import { UploadZone } from "@/components/ui/UploadZone";
import { ControlsBar } from "@/components/ui/ControlsBar";
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
  Moon,
  Sun,
  Target,
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
  Cell,
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
  const [previousStats, setPreviousStats] = useState<RevenueStats | null>(null);
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
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [rates, setRates] = useState<Record<string, number>>({ USD: 1 });
  const [ratesLoading, setRatesLoading] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [themeReady, setThemeReady] = useState(false);
  const [targetMargin, setTargetMargin] = useState(25);
  const [targetCostRatio, setTargetCostRatio] = useState(70);

  const t = translations[lang];

  // Approximate static rates (used as fallback / offline)
  // Values are "1 unit of base → how many of this currency"
  const STATIC_RATES: Record<CurrencyCode, Record<CurrencyCode, number>> = {
    USD: { USD: 1, EUR: 0.92, GBP: 0.79, CAD: 1.36, XOF: 600 },
    EUR: { USD: 1.09, EUR: 1, GBP: 0.86, CAD: 1.48, XOF: 655 },
    GBP: { USD: 1.27, EUR: 1.16, GBP: 1, CAD: 1.72, XOF: 760 },
    CAD: { USD: 0.74, EUR: 0.68, GBP: 0.58, CAD: 1, XOF: 440 },
    XOF: { USD: 0.00167, EUR: 0.00153, GBP: 0.00132, CAD: 0.00227, XOF: 1 },
  };

  // Fetch live rates when possible; fall back to static rates on failure
  const fetchRates = useCallback(async (base: CurrencyCode) => {
    setRatesLoading(true);
    try {
      const res = await fetch(
        `https://api.frankfurter.app/latest?from=${base}`,
        { signal: AbortSignal.timeout(4000) }
      );
      if (!res.ok) throw new Error("Rate API unavailable");
      const data = await res.json();
      // Merge with static so XOF (unsupported by frankfurter) still works
      setRates({
        ...STATIC_RATES[base],
        [base]: 1,
        ...data.rates,
      });
    } catch {
      // Silent fallback — no console error, no crash
      setRates(STATIC_RATES[base] || { USD: 1, EUR: 1, GBP: 1, CAD: 1, XOF: 1 });
    } finally {
      setRatesLoading(false);
    }
  }, []);

    // Init theme + targets from localStorage
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("theme");
      if (savedTheme === "light" || savedTheme === "dark") {
        setTheme(savedTheme);
      } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        setTheme("dark");
      }

      const savedMargin = localStorage.getItem("targetMargin");
      if (savedMargin !== null) {
        const n = Number(savedMargin);
        if (!Number.isNaN(n)) setTargetMargin(n);
      }

      const savedCost = localStorage.getItem("targetCostRatio");
      if (savedCost !== null) {
        const n = Number(savedCost);
        if (!Number.isNaN(n)) setTargetCostRatio(n);
      }

      const savedLang = localStorage.getItem("lang");
      if (savedLang === "en" || savedLang === "fr") {
        setLang(savedLang);
      }

      const savedCurrency = localStorage.getItem("currency");
      if (
        savedCurrency === "USD" ||
        savedCurrency === "EUR" ||
        savedCurrency === "GBP" ||
        savedCurrency === "CAD" ||
        savedCurrency === "XOF"
      ) {
        setCurrency(savedCurrency);
      }

      const savedSource = localStorage.getItem("sourceCurrency");
      if (
        savedSource === "USD" ||
        savedSource === "EUR" ||
        savedSource === "GBP" ||
        savedSource === "CAD" ||
        savedSource === "XOF"
      ) {
        setSourceCurrency(savedSource);
      }
    } finally {
      setThemeReady(true);
    }
  }, []);

  // Apply theme class to <html> and persist
  useEffect(() => {
    if (!themeReady) return;
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme, themeReady]);

  // Persist targets
  useEffect(() => {
    localStorage.setItem("targetMargin", String(targetMargin));
  }, [targetMargin]);

  useEffect(() => {
    localStorage.setItem("targetCostRatio", String(targetCostRatio));
  }, [targetCostRatio]);
  
  useEffect(() => {
    if (!themeReady) return;
    localStorage.setItem("lang", lang);
  }, [lang, themeReady]);

  useEffect(() => {
    if (!themeReady) return;
    localStorage.setItem("currency", currency);
  }, [currency, themeReady]);

  useEffect(() => {
    if (!themeReady) return;
    localStorage.setItem("sourceCurrency", sourceCurrency);
  }, [sourceCurrency, themeReady]);
  useEffect(() => {
    fetchRates(sourceCurrency);
  }, [sourceCurrency, fetchRates]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const processData = (
    sourceRows: SalesRow[],
    days: number,
    method: ProjectionMethod,
    start: string,
    end: string,
    product: string | null = null
  ) => {
    let working = sourceRows;
    if (product) {
      working = working.filter((r) => r.product === product);
    }
    const filtered = filterRowsByDate(
      working,
      start || null,
      end || null
    );
    const calculatedStats = calculateRevenueStats(filtered);
    const calculatedProjection = projectRevenue(filtered, days, method);
    setStats(calculatedStats);
    setProjection(calculatedProjection);

    // Previous period of the same length (for comparison)
    if (start && end) {
      const startD = new Date(start);
      const endD = new Date(end);
      const lengthMs = endD.getTime() - startD.getTime();
      const prevEnd = new Date(startD.getTime() - 24 * 60 * 60 * 1000); // day before start
      const prevStart = new Date(prevEnd.getTime() - lengthMs);
      const prevStartStr = prevStart.toISOString().slice(0, 10);
      const prevEndStr = prevEnd.toISOString().slice(0, 10);
      const prevFiltered = filterRowsByDate(sourceRows, prevStartStr, prevEndStr);
      setPreviousStats(calculateRevenueStats(prevFiltered));
    } else {
      setPreviousStats(null);
    }
  };

  const handleFile = async (file: File) => {
    setLoading(true);
    setError(null);
    setFileName(file.name);
    setStartDate("");
    setEndDate("");
    setSelectedProduct(null);
    setSelectedCustomer(null);

    try {
      const parsedRows = await parseSalesFile(file);
      setRows(parsedRows);
      processData(parsedRows, projectionDays, projectionMethod, "", "", null);
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
    end = endDate,
    product: string | null = selectedProduct
  ) => {
    if (rows.length > 0) {
      processData(rows, days, method, start, end, product);
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

  const setPreset = (preset: "7d" | "30d" | "thisMonth" | "lastMonth" | "all") => {
    if (!stats?.dateRange.max && preset !== "all") {
      // If no stats yet, try using rows
      if (rows.length === 0) return;
    }

    const maxStr = stats?.dateRange.max;
    if (!maxStr && preset !== "all") return;

    if (preset === "all") {
      setStartDate("");
      setEndDate("");
      reprocess(projectionDays, projectionMethod, "", "");
      return;
    }

    const max = new Date(maxStr!);
    let start = "";
    let end = maxStr!;

    if (preset === "7d") {
      const d = new Date(max);
      d.setDate(d.getDate() - 6);
      start = d.toISOString().slice(0, 10);
    } else if (preset === "30d") {
      const d = new Date(max);
      d.setDate(d.getDate() - 29);
      start = d.toISOString().slice(0, 10);
    } else if (preset === "thisMonth") {
      start = `${max.getFullYear()}-${String(max.getMonth() + 1).padStart(2, "0")}-01`;
    } else if (preset === "lastMonth") {
      const d = new Date(max.getFullYear(), max.getMonth() - 1, 1);
      start = d.toISOString().slice(0, 10);
      const lastDay = new Date(max.getFullYear(), max.getMonth(), 0);
      end = lastDay.toISOString().slice(0, 10);
    }

    setStartDate(start);
    setEndDate(end);
    reprocess(projectionDays, projectionMethod, start, end);
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

  const deltaPct = (current: number, previous: number): number | null => {
    if (previous === 0) return current === 0 ? 0 : null;
    return ((current - previous) / previous) * 100;
  };

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

  // All product names (from full dataset, for the filter dropdown)
  const allProducts = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => set.add(r.product));
    return Array.from(set).sort();
  }, [rows]);

  // Orders for the selected customer (respects current date/product filters via rows+stats path)
  const customerOrders = useMemo(() => {
    if (!selectedCustomer) return [];
    let list = rows.filter((r) => r.customer === selectedCustomer);
    if (selectedProduct) {
      list = list.filter((r) => r.product === selectedProduct);
    }
    // Apply date filter if set
    if (startDate || endDate) {
      list = filterRowsByDate(list, startDate || null, endDate || null);
    }
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [rows, selectedCustomer, selectedProduct, startDate, endDate]);

  // Auto-generated insights
  const insights = useMemo(() => {
    if (!stats || stats.totalOrders === 0) return [];

    const items: { text: string; type: "positive" | "negative" | "neutral" }[] = [];
    const isFr = lang === "fr";

    // 1. Period comparison
    if (previousStats && previousStats.totalRevenue > 0) {
      const pct =
        ((stats.totalRevenue - previousStats.totalRevenue) /
          previousStats.totalRevenue) *
        100;
      if (Math.abs(pct) >= 1) {
        items.push({
          type: pct >= 0 ? "positive" : "negative",
          text: isFr
            ? `CA ${pct >= 0 ? "en hausse" : "en baisse"} de ${Math.abs(pct).toFixed(1)}% vs période précédente`
            : `Revenue ${pct >= 0 ? "up" : "down"} ${Math.abs(pct).toFixed(1)}% vs previous period`,
        });
      }
    }

    // 2. Top product concentration
    if (stats.topProducts.length > 0 && stats.totalRevenue > 0) {
      const top = stats.topProducts[0];
      const share = (top.revenue / stats.totalRevenue) * 100;
      if (share >= 25) {
        items.push({
          type: share >= 40 ? "negative" : "neutral",
          text: isFr
            ? `"${top.product}" représente ${share.toFixed(0)}% du CA`
            : `"${top.product}" drives ${share.toFixed(0)}% of revenue`,
        });
      }
    }

    // 3. Negative margin products
    const losers = stats.topProducts.filter(
      (p) => p.margin !== null && p.margin < 0
    );
    if (losers.length > 0) {
      items.push({
        type: "negative",
        text: isFr
          ? `${losers.length} produit${losers.length > 1 ? "s" : ""} à marge négative (ex: ${losers[0].product})`
          : `${losers.length} product${losers.length > 1 ? "s" : ""} with negative margin (e.g. ${losers[0].product})`,
      });
    }

    // 4. Overall margin
    if (stats.profitMargin !== null) {
      if (stats.profitMargin < 10) {
        items.push({
          type: "negative",
          text: isFr
            ? `Marge globale faible: ${stats.profitMargin.toFixed(1)}%`
            : `Low overall margin: ${stats.profitMargin.toFixed(1)}%`,
        });
      } else if (stats.profitMargin >= 30) {
        items.push({
          type: "positive",
          text: isFr
            ? `Bonne marge globale: ${stats.profitMargin.toFixed(1)}%`
            : `Healthy overall margin: ${stats.profitMargin.toFixed(1)}%`,
        });
      }
    }

    // 5. Growth rate
    if (stats.growthRate !== null && Math.abs(stats.growthRate) >= 5) {
      items.push({
        type: stats.growthRate >= 0 ? "positive" : "negative",
        text: isFr
          ? `Croissance mensuelle: ${stats.growthRate >= 0 ? "+" : ""}${stats.growthRate.toFixed(1)}%`
          : `Month-over-month growth: ${stats.growthRate >= 0 ? "+" : ""}${stats.growthRate.toFixed(1)}%`,
      });
    }

    // 6. Top customer concentration
    if (stats.topCustomers.length > 0 && stats.totalRevenue > 0) {
      const topC = stats.topCustomers[0];
      const share = (topC.revenue / stats.totalRevenue) * 100;
      if (share >= 30) {
        items.push({
          type: "neutral",
          text: isFr
            ? `Client principal "${topC.customer}": ${share.toFixed(0)}% du CA`
            : `Top customer "${topC.customer}": ${share.toFixed(0)}% of revenue`,
        });
      }
    }

    return items.slice(0, 6);
  }, [stats, previousStats, lang]);

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-2 rounded-lg">
              <BarChart3 size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">{t.appTitle}</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t.appSubtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Theme toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? (
                <Sun size={18} className="text-amber-400" />
              ) : (
                <Moon size={18} className="text-slate-600" />
              )}
            </button>
            {/* Language */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">{t.language}</span>
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as Lang)}
                className="border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="en">English</option>
                <option value="fr">Français</option>
              </select>
            </div>

            {/* Source currency (of the uploaded file) */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">{t.sourceCurrency}</span>
              <select
                value={sourceCurrency}
                onChange={(e) =>
                  setSourceCurrency(e.target.value as CurrencyCode)
                }
                className="border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <span className="text-xs text-slate-500 dark:text-slate-400">{t.currency}</span>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                className="border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        <UploadZone
          dropTitle={t.dropTitle}
          dropHint={t.dropHint}
          chooseFile={t.chooseFile}
          selectedLabel={t.selected}
          fileName={fileName}
          onFile={handleFile}
          onSample={async () => {
            setLoading(true);
            setError(null);
            try {
              const res = await fetch("/sample-sales-data.csv");
              const blob = await res.blob();
              const file = new File([blob], "sample-sales-data.csv", {
                type: "text/csv",
              });
              await handleFile(file);
            } catch {
              setError("Could not load sample data");
              setLoading(false);
            }
          }}
        />

        {loading && (
          <div className="mt-10 text-center text-slate-600 dark:text-slate-400">{t.processing}</div>
        )}

        {error && (
          <div className="mt-8 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 px-5 py-4 rounded-xl">
            {error}
          </div>
        )}

        {stats && !loading && (
          <div className="mt-12 space-y-10">
            {/* Controls */}
            <ControlsBar
              startDate={startDate}
              endDate={endDate}
              onStartDate={setStartDate}
              onEndDate={setEndDate}
              onApplyDates={handleDateFilter}
              onClearDates={clearDateFilter}
              dataSpansLabel={t.dataSpans}
              dateMin={stats.dateRange.min}
              dateMax={stats.dateRange.max}
              onPreset={setPreset}
              dateRangeLabel={t.dateRange}
              applyLabel={t.apply}
              clearLabel={t.clear}
              topProductsLabel={t.topProducts}
              projectionLabel={t.projection}
              methodLabel={t.method}
              productLabel={lang === "fr" ? "Produit" : "Product"}
              allProductsLabel={lang === "fr" ? "Tous" : "All products"}
              topN={topN}
              onTopN={setTopN}
              projectionDays={projectionDays}
              onProjectionDays={handleProjectionDaysChange}
              projectionMethod={projectionMethod}
              onProjectionMethod={(m) => handleMethodChange(m as ProjectionMethod)}
              methodSeasonal={t.methodSeasonal}
              methodTrend={t.methodTrend}
              methodAverage={t.methodAverage}
              selectedProduct={selectedProduct}
              onSelectedProduct={(val) => {
                setSelectedProduct(val);
                reprocess(projectionDays, projectionMethod, startDate, endDate, val);
              }}
              allProducts={allProducts}
              lang={lang}
            />

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

            {/* Auto insights */}
            {insights.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                <h2 className="font-semibold text-lg mb-4">
                  {lang === "fr" ? "Points clés" : "Key insights"}
                </h2>
                <ul className="space-y-2">
                  {insights.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span
                        className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                          item.type === "positive"
                            ? "bg-emerald-500"
                            : item.type === "negative"
                            ? "bg-rose-500"
                            : "bg-slate-400"
                        }`}
                      />
                      <span className="text-slate-700">{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Period comparison */}
            {previousStats && previousStats.totalOrders > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                <h2 className="font-semibold text-lg mb-4">
                  {lang === "fr" ? "Comparaison avec la période précédente" : "vs Previous Period"}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    {
                      label: t.totalRevenue,
                      current: stats.totalRevenue,
                      previous: previousStats.totalRevenue,
                    },
                    {
                      label: t.totalOrders,
                      current: stats.totalOrders,
                      previous: previousStats.totalOrders,
                      isCount: true,
                    },
                    {
                      label: t.avgOrderValue,
                      current: stats.averageOrderValue,
                      previous: previousStats.averageOrderValue,
                    },
                    {
                      label: t.totalProfit,
                      current: stats.totalProfit,
                      previous: previousStats.totalProfit,
                    },
                  ].map((item) => {
                    const pct = deltaPct(item.current, item.previous);
                    const up = pct !== null && pct >= 0;
                    return (
                      <div
                        key={item.label}
                        className="rounded-xl border border-slate-100 p-4"
                      >
                        <p className="text-xs text-slate-500 mb-1">{item.label}</p>
                        <p className="text-lg font-bold">
                          {item.isCount
                            ? item.current.toLocaleString()
                            : formatCurrency(item.current)}
                        </p>
                        <p
                          className={`text-sm mt-1 font-medium ${
                            pct === null
                              ? "text-slate-400"
                              : up
                              ? "text-emerald-600"
                              : "text-rose-600"
                          }`}
                        >
                          {pct === null
                            ? "—"
                            : `${up ? "▲" : "▼"} ${Math.abs(pct).toFixed(1)}%`}
                          <span className="text-slate-400 font-normal ml-1">
                            {lang === "fr" ? "vs préc." : "vs prev"}
                          </span>
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Revenue + Projection Chart */}
            {chartData.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                <h2 className="font-semibold text-lg mb-1">{t.revenueChart}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
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
                        formatter={(value) => formatCurrency(Number(value ?? 0))}
                        labelFormatter={(label) => label}
                        contentStyle={{
                          backgroundColor: "var(--tooltip-bg, #1e293b)",
                          border: "1px solid #334155",
                          borderRadius: "8px",
                          color: "#f1f5f9",
                        }}
                        labelStyle={{ color: "#94a3b8" }}
                        itemStyle={{ color: "#f1f5f9" }}
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
              <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 rounded-2xl p-6">
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

            {/* Monthly revenue + Profit by product */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly bars */}
              {stats.revenueByPeriod.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                  <h2 className="font-semibold text-lg mb-4">
                    {t.monthlyRevenue}
                  </h2>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.revenueByPeriod}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          dataKey="period"
                          tick={{ fontSize: 11 }}
                          tickFormatter={(v) => v.slice(2)} // YY-MM
                        />
                        <YAxis
                          tick={{ fontSize: 11 }}
                          tickFormatter={(v) =>
                            v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`
                          }
                        />
                        <Tooltip
                          formatter={(value) => formatCurrency(Number(value ?? 0))}
                        />
                        <Bar
                          dataKey="revenue"
                          name={t.revenue}
                          fill="#2563eb"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Profit by product */}
              {stats.topProducts.some((p) => p.cost > 0 || p.profit !== 0) && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                  <h2 className="font-semibold text-lg mb-4">
                    {lang === "fr" ? "Profit par produit" : "Profit by product"}
                  </h2>
                  <div className="h-64">
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
                            v >= 1000 || v <= -1000
                              ? `${(v / 1000).toFixed(0)}k`
                              : `${v}`
                          }
                        />
                        <YAxis
                          type="category"
                          dataKey="product"
                          width={100}
                          tick={{ fontSize: 11 }}
                        />
                       <Tooltip
                          formatter={(value) => formatCurrency(Number(value ?? 0))}
                          labelFormatter={(label) => label}
                          contentStyle={{
                            backgroundColor: "var(--tooltip-bg, #1e293b)",
                            border: "1px solid #334155",
                            borderRadius: "8px",
                            color: "#f1f5f9",
                          }}
                          labelStyle={{ color: "#94a3b8" }}
                          itemStyle={{ color: "#f1f5f9" }}
                        />
                        <Bar
                          dataKey="profit"
                          name={t.profit}
                          radius={[0, 4, 4, 0]}
                        >
                          {stats.topProducts.slice(0, topN).map((entry, i) => (
                            <Cell
                              key={i}
                              fill={entry.profit >= 0 ? "#059669" : "#e11d48"}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>

            {/* Product Cost Breakdown */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-lg">{t.productBreakdown}</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800 text-left text-slate-500 dark:text-slate-400">
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
                        <td className="px-6 py-3 font-medium">
                          <button
                            type="button"
                            onClick={() => {
                              const next =
                                selectedProduct === item.product
                                  ? null
                                  : item.product;
                              setSelectedProduct(next);
                              reprocess(
                                projectionDays,
                                projectionMethod,
                                startDate,
                                endDate,
                                next
                              );
                            }}
                            className={`text-left hover:underline ${
                              selectedProduct === item.product
                                ? "text-blue-600"
                                : ""
                            }`}
                          >
                            {item.product}
                          </button>
                        </td>
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
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
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
                        formatter={(value) => formatCurrency(Number(value ?? 0))}
                        labelFormatter={(label) => label}
                        contentStyle={{
                          backgroundColor: "var(--tooltip-bg, #1e293b)",
                          border: "1px solid #334155",
                          borderRadius: "8px",
                          color: "#f1f5f9",
                        }}
                        labelStyle={{ color: "#94a3b8" }}
                        itemStyle={{ color: "#f1f5f9" }}
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

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
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
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedCustomer(
                                selectedCustomer === item.customer
                                  ? null
                                  : item.customer
                              )
                            }
                            className={`font-medium text-sm text-left hover:underline ${
                              selectedCustomer === item.customer
                                ? "text-blue-600"
                                : ""
                            }`}
                          >
                            {item.customer}
                          </button>
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

            {/* Customer detail */}
            {selectedCustomer && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="font-semibold text-lg">
                    {lang === "fr" ? "Détail client" : "Customer detail"}:{" "}
                    <span className="text-blue-600">{selectedCustomer}</span>
                  </h2>
                  <button
                    type="button"
                    onClick={() => setSelectedCustomer(null)}
                    className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 underline"
                  >
                    {lang === "fr" ? "Fermer" : "Close"}
                  </button>
                </div>
                {customerOrders.length === 0 ? (
                  <div className="px-6 py-8 text-center text-slate-500 text-sm">
                    {lang === "fr"
                      ? "Aucune commande pour ce client sur la période."
                      : "No orders for this customer in the selected period."}
                  </div>
                ) : (
                  <>
                    <div className="px-6 py-3 bg-slate-50 flex flex-wrap gap-6 text-sm border-b border-slate-100">
                      <div>
                        <span className="text-slate-500">
                          {lang === "fr" ? "Commandes" : "Orders"}:{" "}
                        </span>
                        <span className="font-semibold">
                          {customerOrders.length}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">{t.totalRevenue}: </span>
                        <span className="font-semibold">
                          {formatCurrency(
                            customerOrders.reduce((s, r) => s + r.revenue, 0)
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">
                          {lang === "fr" ? "Dernière commande" : "Last order"}:{" "}
                        </span>
                        <span className="font-semibold">
                          {customerOrders[0]?.date}
                        </span>
                      </div>
                    </div>
                    <div className="overflow-x-auto max-h-80">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-white">
                          <tr className="text-left text-slate-500 border-b border-slate-100">
                            <th className="px-6 py-2 font-medium">Date</th>
                            <th className="px-6 py-2 font-medium">
                              {lang === "fr" ? "Commande" : "Order"}
                            </th>
                            <th className="px-6 py-2 font-medium">
                              {lang === "fr" ? "Produit" : "Product"}
                            </th>
                            <th className="px-6 py-2 font-medium text-right">
                              {t.qty}
                            </th>
                            <th className="px-6 py-2 font-medium text-right">
                              {t.revenue}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {customerOrders.map((o, i) => (
                            <tr key={`${o.orderId}-${i}`}>
                              <td className="px-6 py-2">{o.date}</td>
                              <td className="px-6 py-2 text-slate-600">
                                {o.orderId}
                              </td>
                              <td className="px-6 py-2">{o.product}</td>
                              <td className="px-6 py-2 text-right">
                                {o.quantity}
                              </td>
                              <td className="px-6 py-2 text-right font-medium">
                                {formatCurrency(o.revenue)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Monthly breakdown */}
            {stats.revenueByPeriod.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                  <h2 className="font-semibold text-lg">{t.monthlyRevenue}</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800 text-left text-slate-500 dark:text-slate-400">
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


