const PRESETS = [
  { rate: 2, label: "slow", sub: "~1 hour" },
  { rate: 5, label: "normal", sub: "~20 min" },
  { rate: 12, label: "fast", sub: "~10 min" },
];

interface Props {
  feeRate: number;
  onChange: (rate: number) => void;
  fee: bigint;
}

export default function FeeSelector({ feeRate, onChange, fee }: Props) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
        <span className="text-xs font-mono text-zinc-500 tracking-widest uppercase">
          04 || Fee Rate
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {PRESETS.map((p) => (
          <button
            key={p.rate}
            onClick={() => onChange(p.rate)}
            className={`py-3 rounded-xl border transition-all text-center ${
              feeRate === p.rate
                ? "border-orange-500/50 bg-orange-500/10"
                : "border-zinc-800 hover:border-zinc-700 bg-zinc-950"
            }`}
          >
            <div
              className={`font-mono font-bold text-lg ${feeRate === p.rate ? "text-orange-400" : "text-zinc-300"}`}
            >
              {p.rate}
            </div>
            <div className="text-xs text-zinc-600 mt-0.5">{p.label}</div>
            <div className="text-xs text-zinc-700">{p.sub}</div>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-zinc-500 flex-shrink-0">
          Custom sat/vbyte
        </span>
        <input
          type="number"
          className="w-20 bg-zinc-950 border border-zinc-800 focus:border-orange-500/50 rounded-lg px-3 py-2 font-mono text-xs text-zinc-200 focus:outline-none transition-colors"
          value={feeRate}
          min={1}
          onChange={(e) => onChange(parseInt(e.target.value) || 1)}
        />
        <span className="text-xs text-zinc-600">
          <span className="font-mono text-orange-400">
            {fee.toLocaleString()} sats
          </span>
        </span>
      </div>
    </div>
  );
}
