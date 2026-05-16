import { useState } from "react";
import type { Output } from "../App";
import { addressToScript } from "../crypto/address";

interface Props {
  outputs: Output[];
  onChange: (outputs: Output[]) => void;
  change: bigint;
  totalOut: bigint;
  fee: bigint;
  utxo: any;
}

function validateAddress(addr: string): boolean {
  if (!addr) return true;
  try {
    addressToScript(addr);
    return true;
  } catch {
    return false;
  }
}

export default function OutputsBuilder({
  outputs,
  onChange,
  change,
  totalOut,
  fee,
  utxo,
}: Props) {
  const [unit, setUnit] = useState<"sats" | "btc">("btc");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [tempValue, setTempValue] = useState("");

  function updateAddress(i: number, address: string) {
    const next = [...outputs];
    next[i] = { ...next[i], address };
    onChange(next);
  }

  function updateAmount(i: number, val: string) {
    setTempValue(val);

    const next = [...outputs];

    if (unit === "btc") {
      if (val === "" || val === ".") {
        next[i] = { ...next[i], amountSats: 0n };
      } else {
        const num = parseFloat(val);
        if (!isNaN(num) && num >= 0) {
          const sats = Math.round(num * 100_000_000);
          next[i] = { ...next[i], amountSats: BigInt(sats) };
        }
      }
    } else {
      const clean = val.replace(/\D/g, "");
      next[i] = { ...next[i], amountSats: clean ? BigInt(clean) : 0n };
    }

    onChange(next);
  }

  function displayAmount(sats: bigint, i: number): string {
    if (editingIndex === i) return tempValue;

    if (sats === 0n) return "";

    if (unit === "btc") {
      const btc = Number(sats) / 100_000_000;
      return btc.toFixed(8).replace(/\.?0+$/, "");
    }
    return sats.toString();
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
          <span className="text-xs font-mono text-zinc-500 tracking-widest uppercase">
            02 || OUTPUTS
          </span>
        </div>

        <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-lg p-0.5">
          <button
            onClick={() => setUnit("sats")}
            className={`px-3 py-1 rounded-md text-xs font-mono transition-all ${
              unit === "sats"
                ? "bg-orange-500 text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            sats
          </button>
          <button
            onClick={() => setUnit("btc")}
            className={`px-3 py-1 rounded-md text-xs font-mono transition-all ${
              unit === "btc"
                ? "bg-orange-500 text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            BTC
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {outputs.map((out, i) => {
          const isValid = validateAddress(out.address);

          return (
            <div key={i} className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="text-xs text-zinc-500 block mb-1.5">
                  Address
                </label>
                <input
                  className={`w-full bg-zinc-950 border rounded-xl px-4 py-3 font-mono text-sm placeholder-zinc-600 focus:outline-none transition-colors ${
                    !out.address
                      ? "border-zinc-700 focus:border-orange-500"
                      : isValid
                        ? "border-emerald-500/30 focus:border-emerald-500"
                        : "border-red-500/40 focus:border-red-500"
                  }`}
                  placeholder="bc1q... or 1... or 3... or bc1p..."
                  value={out.address}
                  onChange={(e) => updateAddress(i, e.target.value)}
                />
              </div>

              <div className="w-40">
                <label className="text-xs text-zinc-500 block mb-1.5">
                  Amount
                </label>
                <input
                  className="w-full bg-zinc-950 border border-zinc-700 focus:border-orange-500 rounded-xl px-4 py-3 font-mono text-sm placeholder-zinc-600 focus:outline-none transition-colors"
                  placeholder={unit === "btc" ? "0.00123456" : "50000"}
                  value={displayAmount(out.amountSats, i)}
                  onChange={(e) => updateAmount(i, e.target.value)}
                  onFocus={() => {
                    setEditingIndex(i);
                    setTempValue(displayAmount(out.amountSats, i));
                  }}
                  onBlur={() => setEditingIndex(null)}
                  inputMode={unit === "btc" ? "decimal" : "numeric"}
                />
              </div>

              <button
                onClick={() => onChange(outputs.filter((_, idx) => idx !== i))}
                disabled={outputs.length === 1}
                className="mb-1 w-10 h-10 rounded-xl border border-zinc-800 text-zinc-500 hover:text-red-400 hover:border-red-500/50 transition-all flex items-center justify-center"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={() =>
            onChange([...outputs, { address: "", amountSats: 0n }])
          }
          className="mt-4 text-xs font-mono text-orange-500 border border-dashed border-orange-500/30 hover:border-orange-500 rounded-lg px-5 py-2.5 transition-colors"
        >
          + add output
        </button>

        {change < 0n && (
          <p className="text-red-600 text-sm mt-2">
            you need {(totalOut + fee - utxo!.amountSats).toLocaleString()}{" "}
            extra sats
          </p>
        )}
      </div>
    </div>
  );
}
