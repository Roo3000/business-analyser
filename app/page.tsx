import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center px-6">
      <div className="max-w-xl w-full text-center space-y-8">
        <div className="space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white text-2xl font-bold">
            BA
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Business Analyser
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            Upload a sales file. Get revenue, cost, profit, and projections in
            seconds.
          </p>
        </div>

        <ul className="text-left text-sm text-slate-600 dark:text-slate-400 space-y-2 max-w-sm mx-auto">
          <li className="flex gap-2">
            <span className="text-blue-600 dark:text-blue-400">✓</span>
            CSV / Excel upload with flexible columns
          </li>
          <li className="flex gap-2">
            <span className="text-blue-600 dark:text-blue-400">✓</span>
            Cost, profit, margin & growth metrics
          </li>
          <li className="flex gap-2">
            <span className="text-blue-600 dark:text-blue-400">✓</span>
            Trend & seasonal projections
          </li>
          <li className="flex gap-2">
            <span className="text-blue-600 dark:text-blue-400">✓</span>
            Multi-currency · English / Français · Dark mode
          </li>
        </ul>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/analyser"
            className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors w-full sm:w-auto"
          >
            Open Analyser →
          </Link>
          <Link
            href="/analyser"
            className="inline-flex items-center justify-center border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 px-6 py-3 rounded-lg font-medium transition-colors w-full sm:w-auto"
          >
            Try with sample data
          </Link>
        </div>

        <p className="text-xs text-slate-400 dark:text-slate-500">
          Designed for all kind of businesses
        </p>
      </div>
    </div>
  );
}