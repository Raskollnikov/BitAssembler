import { useRef, useState } from "react";
import { parseCSV, type CsvParseResult } from "../utils/csvParser";
import type { Output } from "../crypto/txBuilder";

interface Props {
  onImport: (outputs: Output[]) => void;
  onClear: () => void;
  active: boolean;
}

export default function CsvImport({ onImport, onClear }: Props) {
  const [result, setResult] = useState<CsvParseResult | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function processFile(file: File) {
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      alert("Please upload a .csv file");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      setResult(parsed);
      if (!parsed.hasErrors) onImport(parsed.validOutputs);
    };
    reader.readAsText(file);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function handleClear() {
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
    onClear();
  }

  const downloadTemplate = () => {
    const csv =
      "address,amount_sats\nbc1qexampleaddress,50000\nbc1qexampleaddress2,100000";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bitassembler_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
          <span className="text-xs font-mono text-zinc-500 tracking-widest uppercase">
            Batch CSV Import
          </span>
        </div>
        <button
          onClick={downloadTemplate}
          className="text-xs font-mono text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          download template
        </button>
      </div>

      {!result && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            dragging
              ? "border-orange-500 bg-orange-500/5"
              : "border-zinc-700 hover:border-zinc-500"
          }`}
        >
          <div className="text-2xl mb-2">📄</div>
          <p className="text-sm text-zinc-400 mb-1">
            drop CSV here or click to browse
          </p>
          <p className="text-xs text-zinc-600 font-mono">
            address,amount_sats, one recipient per line
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFile}
          />
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-zinc-950 rounded-xl p-3 text-center">
              <div className="text-xs text-zinc-500 mb-1">recipients</div>
              <div className="font-mono text-lg font-bold text-zinc-200">
                {result.rows.length}
              </div>
            </div>
            <div className="bg-zinc-950 rounded-xl p-3 text-center">
              <div className="text-xs text-zinc-500 mb-1">total sats</div>
              <div className="font-mono text-lg font-bold text-orange-400">
                {result.totalSats.toLocaleString()}
              </div>
            </div>
            <div className="bg-zinc-950 rounded-xl p-3 text-center">
              <div className="text-xs text-zinc-500 mb-1">status</div>
              <div
                className={`font-mono text-lg font-bold ${result.hasErrors ? "text-red-400" : "text-emerald-400"}`}
              >
                {result.hasErrors ? "errors" : "valid ✓"}
              </div>
            </div>
          </div>

          {result.hasErrors && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 space-y-1 max-h-40 overflow-y-auto">
              {result.rows
                .filter((r) => r.error)
                .map((r) => (
                  <div key={r.line} className="font-mono text-xs text-red-400">
                    line {r.line}: {r.error}
                  </div>
                ))}
            </div>
          )}

          {!result.hasErrors && (
            <div className="max-h-52 overflow-y-auto rounded-xl border border-zinc-800">
              <table className="w-full text-xs font-mono">
                <thead className="bg-zinc-950 sticky top-0">
                  <tr>
                    <th className="text-left p-2 text-zinc-500">#</th>
                    <th className="text-left p-2 text-zinc-500">address</th>
                    <th className="text-right p-2 text-zinc-500">sats</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((r, i) => (
                    <tr key={i} className="border-t border-zinc-800/50">
                      <td className="p-2 text-zinc-600">{i + 1}</td>
                      <td className="p-2 text-zinc-400 max-w-0">
                        <div className="truncate w-48">{r.address}</div>
                      </td>
                      <td className="p-2 text-right text-emerald-400">
                        {r.amountSats.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button
            onClick={handleClear}
            className="w-full py-2 border border-zinc-700 hover:border-red-500/50 hover:text-red-400 rounded-xl font-mono text-xs text-zinc-500 transition-all"
          >
            clear and start over
          </button>
        </div>
      )}
    </div>
  );
}
