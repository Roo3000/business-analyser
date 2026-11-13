import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Business Analyser</h1>
        <p className="text-slate-600 mb-8">Sales & Revenue Insights Tool</p>
        <Link
          href="/analyser"
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
        >
          Open Analyser →
        </Link>
      </div>
    </div>
  );
}