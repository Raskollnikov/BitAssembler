import { useState } from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
}

function toOpReturnHex(msg: string): string {
  if (!msg) return "";
  const bytes = new TextEncoder().encode(msg);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const len = bytes.length.toString(16).padStart(2, "0");
  return `6a${len} ${hex.match(/.{1,4}/g)?.join("") ?? hex}`;
}

export default function OpReturnField({ value, onChange }: Props) {
  const [enabled, setEnabled] = useState(false);
  const byteLen = new TextEncoder().encode(value).length;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
        <span className="text-xs font-mono text-zinc-500 tracking-widest uppercase">
          03 || OP_RETURN
        </span>
      </div>

      <button
        onClick={() => setEnabled((e) => !e)}
        className="mt-4 flex items-center gap-3 w-full text-left"
      >
        <div
          className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${enabled ? "bg-orange-500" : "bg-zinc-700"}`}
        >
          <div
            className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${enabled ? "left-4" : "left-0.5"}`}
          />
        </div>
        <span className="text-sm text-zinc-300">OP_RETURN message</span>
        <span className="text-xs text-zinc-600 ml-auto">
          0 sats · max 80 bytes
        </span>
      </button>

      {enabled && (
        <div className="mt-4">
          <input
            className="w-full bg-zinc-950 border border-zinc-800 focus:border-violet-500/50 rounded-xl px-4 py-3 font-mono text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none transition-colors"
            placeholder="your message on-chain..."
            value={value}
            maxLength={80}
            onChange={(e) => onChange(e.target.value)}
          />
          <div
            className={`text-xs mt-1.5 font-mono ${byteLen > 80 ? "text-red-400" : "text-zinc-600"}`}
          >
            {byteLen}/80 bytes
          </div>
          {value && (
            <div className="mt-3 px-4 py-3 bg-violet-500/5 border-l-2 border-violet-500/40 rounded-r-lg font-mono text-xs text-violet-400 break-all">
              {toOpReturnHex(value)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
