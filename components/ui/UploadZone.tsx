import { Upload, FileSpreadsheet } from "lucide-react";

type Props = {
  dropTitle: string;
  dropHint: string;
  chooseFile: string;
  selectedLabel: string;
  fileName: string | null;
  onFile: (file: File) => void;
  onSample: () => void;
  sampleLabel?: string;
};

export function UploadZone({
  dropTitle,
  dropHint,
  chooseFile,
  selectedLabel,
  fileName,
  onFile,
  onSample,
  sampleLabel = "Try sample data",
}: Props) {
  return (
    <div
      onDrop={(e) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) onFile(file);
      }}
      onDragOver={(e) => e.preventDefault()}
      className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl bg-white dark:bg-slate-900 p-12 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="bg-blue-50 dark:bg-blue-950/50 p-4 rounded-full">
          <Upload className="text-blue-600 dark:text-blue-400" size={32} />
        </div>
        <div>
          <p className="text-lg font-medium text-slate-900 dark:text-slate-100">
            {dropTitle}
          </p>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {dropHint}
          </p>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <label className="cursor-pointer">
            <span className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
              <FileSpreadsheet size={18} />
              {chooseFile}
            </span>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onFile(file);
              }}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={onSample}
            className="inline-flex items-center gap-2 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            {sampleLabel}
          </button>
        </div>

        {fileName && (
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            {selectedLabel}:{" "}
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {fileName}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}