type Preset = "7d" | "30d" | "thisMonth" | "lastMonth" | "all";

type Props = {
  // date filter
  startDate: string;
  endDate: string;
  onStartDate: (v: string) => void;
  onEndDate: (v: string) => void;
  onApplyDates: () => void;
  onClearDates: () => void;
  dataSpansLabel: string;
  dateMin: string | null;
  dateMax: string | null;
  onPreset: (p: Preset) => void;
  // labels
  dateRangeLabel: string;
  applyLabel: string;
  clearLabel: string;
  topProductsLabel: string;
  projectionLabel: string;
  methodLabel: string;
  productLabel: string;
  allProductsLabel: string;
  // values
  topN: number;
  onTopN: (n: number) => void;
  projectionDays: number;
  onProjectionDays: (n: number) => void;
  projectionMethod: string;
  onProjectionMethod: (m: string) => void;
  methodSeasonal: string;
  methodTrend: string;
  methodAverage: string;
  selectedProduct: string | null;
  onSelectedProduct: (p: string | null) => void;
  allProducts: string[];
  lang: string;
};

export function ControlsBar({
  startDate,
  endDate,
  onStartDate,
  onEndDate,
  onApplyDates,
  onClearDates,
  dataSpansLabel,
  dateMin,
  dateMax,
  onPreset,
  dateRangeLabel,
  applyLabel,
  clearLabel,
  topProductsLabel,
  projectionLabel,
  methodLabel,
  productLabel,
  allProductsLabel,
  topN,
  onTopN,
  projectionDays,
  onProjectionDays,
  projectionMethod,
  onProjectionMethod,
  methodSeasonal,
  methodTrend,
  methodAverage,
  selectedProduct,
  onSelectedProduct,
  allProducts,
  lang,
}: Props) {
  const inputClass =
    "border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelClass = "text-sm font-medium text-slate-600 dark:text-slate-300";

  const presets: { id: Preset; label: string }[] = [
    { id: "7d", label: lang === "fr" ? "7 jours" : "7 days" },
    { id: "30d", label: lang === "fr" ? "30 jours" : "30 days" },
    { id: "thisMonth", label: lang === "fr" ? "Ce mois" : "This month" },
    { id: "lastMonth", label: lang === "fr" ? "Mois dernier" : "Last month" },
    { id: "all", label: lang === "fr" ? "Tout" : "All time" },
  ];

  return (
    <div className="flex flex-wrap gap-6 items-end bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-5">
      <div className="flex flex-col gap-1">
        <label className={labelClass}>{dateRangeLabel}</label>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDate(e.target.value)}
            className={inputClass}
          />
          <span className="text-slate-400">→</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDate(e.target.value)}
            className={inputClass}
          />
          <button
            onClick={onApplyDates}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium"
          >
            {applyLabel}
          </button>
          {(startDate || endDate) && (
            <button
              onClick={onClearDates}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-sm underline"
            >
              {clearLabel}
            </button>
          )}
        </div>
        {dateMin && (
          <p className="text-xs text-slate-400 mt-1">
            {dataSpansLabel} {dateMin} → {dateMax}
          </p>
        )}
        <div className="flex flex-wrap gap-2 mt-2">
          {presets.map((p) => (
            <button
              key={p.id}
              onClick={() => onPreset(p.id)}
              className="text-xs px-2.5 py-1 rounded-full border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <label className={labelClass}>{topProductsLabel}:</label>
        <select
          value={topN}
          onChange={(e) => onTopN(Number(e.target.value))}
          className={inputClass}
        >
          <option value={3}>Top 3</option>
          <option value={5}>Top 5</option>
          <option value={10}>Top 10</option>
        </select>
      </div>

      <div className="flex items-center gap-3">
        <label className={labelClass}>{projectionLabel}:</label>
        <select
          value={projectionDays}
          onChange={(e) => onProjectionDays(Number(e.target.value))}
          className={inputClass}
        >
          <option value={30}>30</option>
          <option value={60}>60</option>
          <option value={90}>90</option>
        </select>
      </div>

      <div className="flex items-center gap-3">
        <label className={labelClass}>{methodLabel}:</label>
        <select
          value={projectionMethod}
          onChange={(e) => onProjectionMethod(e.target.value)}
          className={inputClass}
        >
          <option value="seasonal">{methodSeasonal}</option>
          <option value="trend">{methodTrend}</option>
          <option value="average">{methodAverage}</option>
        </select>
      </div>

      <div className="flex items-center gap-3">
        <label className={labelClass}>{productLabel}:</label>
        <select
          value={selectedProduct ?? ""}
          onChange={(e) => onSelectedProduct(e.target.value || null)}
          className={`${inputClass} max-w-[180px]`}
        >
          <option value="">{allProductsLabel}</option>
          {allProducts.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}