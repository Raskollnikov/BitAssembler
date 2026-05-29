import { useState } from "react";
import type { Utxo } from "../hooks/useUtxo";

interface Props {
  onFetch: (txid: string, vout: number) => void;
  loading: boolean;
  error: string | null;
  utxo: Utxo | null;
}

const TYPE_COLORS: Record<string, string> = {
  P2WPKH: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  P2TR: "bg-violet-500/10 text-violet-400 border border-violet-500/20",
  P2PKH: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  P2SH: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
};

export default function UtxoInput({ onFetch, loading, error, utxo }: Props) {
  const [txid, setTxid] = useState("");
  const [vout, setVout] = useState("0");

  function handleFetch() {
    if (txid.trim().length !== 64) return;
    onFetch(txid.trim(), parseInt(vout) || 0);
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
        <span className="text-xs font-mono text-zinc-500 tracking-widest uppercase">
          01 || Input UTXO
        </span>
      </div>

      <div className="flex gap-3 mb-3">
        <div className="flex-1">
          <label className="block text-xs text-zinc-500 mb-1.5">
            Transaction ID
          </label>
          <input
            className="w-full bg-zinc-950 border border-zinc-800 focus:border-orange-500/50 rounded-xl px-4 py-3 font-mono text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none transition-colors"
            placeholder="64-char hex txid..."
            value={txid}
            onChange={(e) => setTxid(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleFetch()}
          />
        </div>
        <div className="w-24">
          <label className="block text-xs text-zinc-500 mb-1.5">vout</label>
          <input
            className="w-full bg-zinc-950 border border-zinc-800 focus:border-orange-500/50 rounded-xl px-4 py-3 font-mono text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none transition-colors"
            placeholder="0"
            value={vout}
            onChange={(e) => setVout(e.target.value)}
          />
        </div>
      </div>

      <button
        onClick={handleFetch}
        disabled={loading || txid.length !== 64}
        className="w-full py-3 rounded-xl font-mono text-sm font-bold tracking-wide transition-all
          bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-200"
      >
        {loading ? "fetching..." : "→ FETCH UTXO"}
      </button>

      {error && (
        <p className="mt-3 text-xs font-mono text-red-400">✗ {error}</p>
      )}

      {utxo && utxo.address && (
        <div className="mt-4 flex items-center gap-3 bg-zinc-950 rounded-xl px-4 py-3">
          <span
            className={`text-xs font-mono px-2 py-0.5 rounded-md ${TYPE_COLORS[utxo.type] ?? ""}`}
          >
            {utxo.type}
          </span>
          <span className="text-xs font-mono text-zinc-500 flex-1 truncate">
            {utxo.address.slice(0, 14)}...{utxo.address.slice(-6)}
          </span>
          <span className="text-sm font-mono font-bold text-orange-400">
            {(Number(utxo.amountSats) / 1e8).toFixed(8)} BTC
          </span>
        </div>
      )}
    </div>
  );
}
