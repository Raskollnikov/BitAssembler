import { useState } from "react";

interface Segment {
  hex: string;
  color: string;
  label: string;
}

function parseSegments(hex: string): Segment[] {
  if (!hex || hex.length < 8) return [{ hex, color: "#6b7280", label: "raw" }];
  const segments: Segment[] = [];
  let i = 0;

  function take(bytes: number, color: string, label: string) {
    const chunk = hex.slice(i, i + bytes * 2);
    if (chunk) segments.push({ hex: chunk, color, label });
    i += bytes * 2;
  }
  function takeRest(color: string, label: string) {
    const chunk = hex.slice(i);
    if (chunk) segments.push({ hex: chunk, color, label });
    i = hex.length;
  }

  try {
    take(4, "#3b82f6", "version (little-endian)");
    take(2, "#52525b", "segwit marker + flag");
    take(1, "#52525b", "input count");
    take(32, "#eab308", "txid (reversed, little-endian)");
    take(4, "#eab308", "vout index");
    take(1, "#52525b", "scriptSig length (empty-segwit)");
    take(4, "#eab308", "sequence");

    const outCount = parseInt(hex.slice(i, i + 2), 16);
    take(1, "#52525b", `output count: ${outCount}`);

    for (let o = 0; o < outCount; o++) {
      take(8, "#22c55e", `output ${o + 1} amount (sats, LE)`);
      const scriptLen = parseInt(hex.slice(i, i + 2), 16);
      take(1, "#52525b", "script length");
      const isOpReturn = hex.slice(i, i + 2) === "6a";
      take(
        scriptLen,
        isOpReturn ? "#a855f7" : "#ef4444",
        isOpReturn ? "OP_RETURN data" : `output ${o + 1} scriptPubKey`,
      );
    }

    take(4, "#52525b", "locktime");
    take(1, "#52525b", "witness item count");
    const sigLen = parseInt(hex.slice(i, i + 2), 16);
    take(1, "#52525b", "signature byte length");
    take(sigLen, "#f97316", "DER signature + SIGHASH_ALL");
    const pubLen = parseInt(hex.slice(i, i + 2), 16);
    take(1, "#52525b", "pubkey byte length");
    take(pubLen, "#f97316", "compressed public key (33 bytes)");
    if (i < hex.length) takeRest("#52525b", "remaining");
  } catch {
    return [{ hex, color: "#6b7280", label: "raw hex" }];
  }
  return segments;
}

const LEGEND = [
  { color: "#3b82f6", label: "version" },
  { color: "#eab308", label: "input" },
  { color: "#22c55e", label: "output amt" },
  { color: "#ef4444", label: "script" },
  { color: "#f97316", label: "witness" },
  { color: "#a855f7", label: "OP_RETURN" },
  { color: "#52525b", label: "struct" },
];

export default function HexVisualizer({ hex }: { hex: string }) {
  const [tooltip, setTooltip] = useState<{
    label: string;
    x: number;
    y: number;
  } | null>(null);
  const segments = parseSegments(hex);
  const bytes = Math.ceil(hex.length / 2);

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-mono text-zinc-500 tracking-widest uppercase">
          Raw Transaction Hex
        </span>
        <span className="text-xs font-mono text-zinc-700">~{bytes} bytes</span>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-5">
        {LEGEND.map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-sm"
              style={{ background: l.color }}
            />
            <span className="text-xs text-zinc-600">{l.label}</span>
          </div>
        ))}
      </div>

      <div className="font-mono text-xs leading-loose break-all tracking-wide">
        {segments.map((seg, i) => (
          <span
            key={i}
            style={{ color: seg.color }}
            className="hover:bg-white/5 rounded px-0.5 cursor-default transition-colors"
            onMouseEnter={(e) => {
              const r = (e.target as HTMLElement).getBoundingClientRect();
              setTooltip({ label: seg.label, x: r.left, y: r.top - 32 });
            }}
            onMouseLeave={() => setTooltip(null)}
          >
            {seg.hex.match(/.{1,8}/g)?.join(" ")}{" "}
          </span>
        ))}
      </div>

      {tooltip && (
        <div
          style={{
            position: "fixed",
            left: tooltip.x,
            top: tooltip.y,
            zIndex: 9999,
          }}
          className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-mono px-3 py-1.5 rounded-lg pointer-events-none whitespace-nowrap"
        >
          {tooltip.label}
        </div>
      )}
    </div>
  );
}
