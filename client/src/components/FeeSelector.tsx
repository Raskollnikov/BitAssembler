import type { FeeEstimates } from "../hooks/useFees";

interface Props {
  feeRate: number;
  onChange: (rate: number) => void;
  fee: bigint;
  fees: FeeEstimates | null;
}

export default function FeeSelector({ feeRate, onChange, fee, fees }: Props) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
        <span className="text-xs font-mono text-zinc-500 tracking-widest uppercase">
          04 || Fee Rate
        </span>
      </div>

      {fees ? (
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: "slow ~1hr", rate: fees.hourFee },
            { label: "normal ~30m", rate: fees.halfHourFee },
            { label: "fast 1 block", rate: fees.fastestFee },
          ].map((opt) => (
            <button
              key={opt.label}
              onClick={() => onChange(opt.rate)}
              className={`rounded-xl py-3 text-xs font-mono border transition-all ${
                feeRate === opt.rate
                  ? "border-orange-500 bg-orange-500/10 text-orange-400"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
              }`}
            >
              <div className="text-base font-bold">{opt.rate}</div>
              <div className="text-zinc-500">{opt.label}</div>
            </button>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: "slow", rate: 2 },
            { label: "normal", rate: 5 },
            { label: "fast", rate: 12 },
          ].map((opt) => (
            <button
              key={opt.label}
              onClick={() => onChange(opt.rate)}
              className={`rounded-xl py-3 text-xs font-mono border transition-all ${
                feeRate === opt.rate
                  ? "border-orange-500 bg-orange-500/10 text-orange-400"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
              }`}
            >
              <div className="text-base font-bold">{opt.rate}</div>
              <div className="text-zinc-500">{opt.label}</div>
            </button>
          ))}
        </div>
      )}

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
