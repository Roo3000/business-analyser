"use client";

import { useState } from "react";
import { parseSalesFile } from "@/lib/parseSales";
import { calculateRevenueStats, projectRevenue } from "@/lib/analyseSales";
import { SalesRow, RevenueStats, RevenueProjection } from "@/types/sales";
import { Upload, FileSpreadsheet, TrendingUp, DollarSign, ShoppingCart, BarChart3 } from "lucide-react";

export default function AnalyserPage() {
  const [rows, setRows] = useState<SalesRow[]>([]);
  const [stats, setStats] = useState<RevenueStats | null>(null);
  const [projection, setProjection] = useState<RevenueProjection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setLoading(true);
    setError(null);
    setFileName(file.name);

    try {
      const parsedRows = await parseSalesFile(file);
      const calculatedStats = calculateRevenueStats(parsedRows);
      const calculatedProjection = projectRevenue(parsedRows, 30);

      setRows(parsedRows);
      setStats(calculatedStats);
      setProjection(calculatedProjection);
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

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-2 rounded-lg">
              <BarChart3 size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Business Analyser</h1>
              <p className="text-sm text-slate-500">Sales & Revenue Insights</p>
            </div>
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
              <p className="text-lg font-medium">Drop your sales file here</p>
              <p className="text-slate-500 text-sm mt-1">
                Supports CSV and Excel (.xlsx, .xls)
              </p>
            </div>

            <label className="mt-2 cursor-pointer">
              <span className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
                <FileSpreadsheet size={18} />
                Choose File
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
                Selected: <span className="font-medium">{fileName}</span>
              </p>
            )}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="mt-10 text-center text-slate-600">
            Processing your file...
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-8 bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-xl">
            {error}
          </div>
        )}

        {/* Results */}
        {stats && !loading && (
          <div className="mt-12 space-y-10">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <MetricCard
                title="Total Revenue"
                value={formatCurrency(stats.totalRevenue)}
                icon={<DollarSign size={20} />}
                color="blue"
              />
              <MetricCard
                title="Total Orders"
                value={stats.totalOrders.toLocaleString()}
                icon={<ShoppingCart size={20} />}
                color="indigo"
              />
              <MetricCard
                title="Avg. Order Value"
                value={formatCurrency(stats.averageOrderValue)}
                icon={<TrendingUp size={20} />}
                color="emerald"
              />
              <MetricCard
                title="Growth Rate"
                value={
                  stats.growthRate !== null
                    ? `${stats.growthRate > 0 ? "+" : ""}${stats.growthRate.toFixed(1)}%`
                    : "N/A"
                }
                icon={<BarChart3 size={20} />}
                color={stats.growthRate && stats.growthRate >= 0 ? "emerald" : "rose"}
              />
            </div>

            {/* Top Products */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-lg">Top Products by Revenue</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {stats.topProducts.map((item, index) => (
                  <div
                    key={item.product}
                    className="flex items-center justify-between px-6 py-3.5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400 text-sm w-5">{index + 1}</span>
                      <span className="font-medium">{item.product}</span>
                    </div>
                    <span className="font-semibold text-slate-700">
                      {formatCurrency(item.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Projection info */}
            {projection && (
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
                <h2 className="font-semibold text-lg text-blue-900 mb-1">
                  30-Day Revenue Projection
                </h2>
                <p className="text-blue-700 text-sm mb-4">{projection.method}</p>
                <p className="text-2xl font-bold text-blue-900">
                  {formatCurrency(
                    projection.projectedRevenue.reduce((sum, d) => sum + d.revenue, 0)
                  )}
                </p>
                <p className="text-sm text-blue-600 mt-1">
                  Estimated total over the next 30 days
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// Small reusable metric card
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