import { useState } from "react";
import { hexToBytes } from "../crypto/primitives";

export interface Utxo {
  txid: string;
  vout: number;
  amountSats: bigint;
  scriptPubKey: Uint8Array;
  address: string;
  type: "P2WPKH" | "P2TR" | "P2PKH" | "P2SH";
}

export function useUtxo() {
  const [utxo, setUtxo] = useState<Utxo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetch(txid: string, vout: number) {
    setLoading(true);
    setError(null);
    try {
      const res = await window.fetch(`/api/tx/${txid}`);
      if (!res.ok) throw new Error("UTXO not found");
      const data = await res.json();
      const output = data.vout[vout];
      if (!output) throw new Error(`vout ${vout} doesn't exist`);

      const typeMap: Record<string, Utxo["type"]> = {
        v0_p2wpkh: "P2WPKH",
        v1_p2tr: "P2TR",
        p2pkh: "P2PKH",
        p2sh: "P2SH",
      };

      setUtxo({
        txid,
        vout,
        amountSats: BigInt(output.value),
        scriptPubKey: hexToBytes(output.scriptpubkey),
        address: output.scriptpubkey_address,
        type: typeMap[output.scriptpubkey_type] ?? "P2WPKH",
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return { utxo, loading, error, fetch };
}
