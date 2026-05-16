import { useState } from "react";

interface Props {
  hex: string | null;
  txid: string | null;
  onBroadcast: () => void;
}

export default function BroadcastPanel({ hex, txid, onBroadcast }: Props) {
  const [copied, setCopied] = useState(false);

  const copyHex = () => {
    if (!hex) return;
    navigator.clipboard.writeText(hex);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!hex) return null;

  return (
    <>
      <div className="ba-broadcast">
        <button className="ba-broadcast-btn primary" onClick={onBroadcast}>
          broadcast to mainnet
        </button>

        <button className="ba-broadcast-btn secondary" onClick={copyHex}>
          {copied ? "copied ✓" : "copy hex"}
        </button>

        <a
          href="https://mempool.space/tx/push"
          target="_blank"
          rel="noopener noreferrer"
          className="ba-broadcast-btn secondary"
          style={{
            textDecoration: "none",
            textAlign: "center",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          verify ↗
        </a>
      </div>

      {txid && (
        <div className="ba-txid-result">
          <div className="ba-txid-label">
            ✓ broadcast successful · confirmed in mempool
          </div>
          <div className="ba-txid-val">{txid}</div>

          <a
            href={`https://mempool.space/tx/${txid}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: "11px",
              color: "#22c55e",
              display: "block",
              marginTop: "6px",
            }}
          >
            view on mempool.space ↗
          </a>
        </div>
      )}
    </>
  );
}
