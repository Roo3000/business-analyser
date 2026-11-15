import React from "react";

export function MetricCard({
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
    blue: "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400",
    indigo: "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400",
    emerald: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400",
    rose: "bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400",
    amber: "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400",
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">
          {title}
        </span>
        <div className={`p-2 rounded-lg ${colorMap[color]}`}>{icon}</div>
      </div>
      <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
        {value}
      </p>
    </div>
  );
}
