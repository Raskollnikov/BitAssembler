import { useState } from "react";

interface Props {
  hex: string | null;
  txid: string | null;
  onBroadcast: () => void;
}

export default function BroadcastPanel({ hex, txid, onBroadcast }: Props) {
  const [copied, setCopied] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);

  const copyHex = () => {
    if (!hex) return;
    navigator.clipboard.writeText(hex);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  async function handleBroadcast() {
    setBroadcasting(true);
    try {
      await onBroadcast();
    } finally {
      setBroadcasting(false);
    }
  }

  if (!hex) return null;

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <button
          onClick={handleBroadcast}
          disabled={broadcasting}
          className="flex-1 py-4 bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-800 disabled:text-zinc-500 rounded-2xl font-mono text-sm font-bold tracking-wide transition-all"
        >
          {broadcasting ? "broadcasting..." : "broadcast to mainnet"}
        </button>

        <button
          onClick={copyHex}
          className="px-5 py-4 border border-zinc-700 hover:border-zinc-500 rounded-2xl font-mono text-sm text-zinc-400 transition-all"
        >
          {copied ? "copied ✓" : "copy hex"}
        </button>

        <a
          href="https://mempool.space/tx/push"
          target="_blank"
          rel="noopener noreferrer"
          className="px-5 py-4 border border-zinc-700 hover:border-zinc-500 rounded-2xl font-mono text-sm text-zinc-400 transition-all flex items-center"
        >
          verify ↗
        </a>
      </div>

      {txid && (
        <div className="p-4 bg-zinc-900 border-l-2 border-emerald-500 rounded-r-2xl">
          <div className="text-xs text-zinc-500 mb-2">
            ✓ broadcast successful · confirmed in mempool
          </div>

          <div className="font-mono text-xs text-emerald-400 break-all">
            {txid}
          </div>

          <a
            href={`https://mempool.space/tx/${txid}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs text-emerald-600 hover:text-emerald-400 mt-2 block transition-colors"
          >
            view on mempool.space ↗
          </a>
        </div>
      )}
    </div>
  );
}
