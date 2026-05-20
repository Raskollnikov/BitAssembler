import { useMemo, useState } from "react";
import { useUtxo } from "./hooks/useUtxo";
import { signAndBuildTx, getAddressFromWif } from "./crypto/signer";
import { addressToScript } from "./crypto/address";
import { bytesToHex } from "./crypto/primitives";

import UtxoInput from "./components/UtxoInput";
import OutputsBuilder from "./components/OutputsBuilder";
import FeeSelector from "./components/FeeSelector";
import OpReturnField from "./components/OpReturnField";
import HexVisualizer from "./components/HexVisualizer";
import BroadcastPanel from "./components/BroadcastPanel";

import { useFees } from "./hooks/useFees";

export interface Output {
  address: string;
  amountSats: bigint;
}

function validateOutputs(outputs: Output[]): string | null {
  for (const out of outputs) {
    if (!out.address) return "Output has no address";
    try {
      addressToScript(out.address);
    } catch {
      return `Invalid address: ${out.address}`;
    }
    if (out.amountSats <= 0n) return "Amount must be > 0";
    if (out.amountSats < 546n)
      return `${out.amountSats} sats is below dust limit (546)`;
  }
  return null;
}

export default function App() {
  const { utxo, loading, error, fetch: fetchUtxo } = useUtxo();
  const [autoChange, setAutoChange] = useState(true);
  const [outputs, setOutputs] = useState<Output[]>([
    { address: "", amountSats: 0n },
  ]);
  const [feeRate, setFeeRate] = useState(5);
  const [opReturn, setOpReturn] = useState("");
  const [wif, setWif] = useState("");
  const [signedHex, setSignedHex] = useState<string | null>(null);
  const [txid, setTxid] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);

  const totalOut = outputs.reduce((s, o) => s + o.amountSats, 0n);

  const { fees } = useFees();

  const DUST_LIMIT = 546n;

  const estimatedVbytes = useMemo(() => {
    const overhead = 10n;
    const inputWeight = 68n;

    const outputVbytes = outputs.reduce((sum, out) => {
      if (!out.address) return sum;
      const addr = out.address.toLowerCase();
      if (addr.startsWith("bc1p")) return sum + 43n;
      if (addr.startsWith("bc1q")) return sum + 31n;
      if (out.address.startsWith("1")) return sum + 34n;
      if (out.address.startsWith("3")) return sum + 32n;
      return sum + 31n;
    }, 0n);

    const opReturnVbytes = opReturn
      ? 9n + BigInt(new TextEncoder().encode(opReturn).length)
      : 0n;

    const changeOutputVbytes = autoChange ? 31n : 0n;

    return (
      overhead +
      inputWeight +
      outputVbytes +
      opReturnVbytes +
      changeOutputVbytes
    );
  }, [outputs, opReturn, autoChange]);

  const fee = BigInt(feeRate) * estimatedVbytes;
  const change = utxo ? utxo.amountSats - totalOut - fee : 0n;
  const unaccounted = change;
  const manualWarning = !autoChange && unaccounted > 546n;

  const derivedAddress = useMemo(() => {
    if (!wif || wif.length < 51) return null;
    try {
      const { pubKeyHash } = getAddressFromWif(wif);
      return bytesToHex(pubKeyHash);
    } catch {
      return null;
    }
  }, [wif]);

  const wifMatchesUtxo = useMemo(() => {
    if (!derivedAddress || !utxo) return null;
    const sp = utxo.scriptPubKey;
    if (sp[0] === 0x00 && sp[1] === 0x14) {
      const pkh = sp.slice(2);
      return derivedAddress === bytesToHex(pkh);
    }
    if (sp[0] === 0x76 && sp[1] === 0xa9) {
      const pkh = sp.slice(3, 23);
      return derivedAddress === bytesToHex(pkh);
    }
    return null;
  }, [derivedAddress, utxo]);

  async function handleSign() {
    if (!utxo || !wif) return;

    if (wifMatchesUtxo === false) {
      alert(
        `WIF key does not match this UTXO,\nUTXO belongs to: ${utxo.address}`,
      );
      return;
    }

    if (utxo.type !== "P2WPKH") {
      alert(`only P2WPKH inputs are supported, this UTXO is ${utxo.type}.`);
      return;
    }

    const validOutputs = outputs.filter((o) => o.amountSats > 0n && o.address);
    const validationError = validateOutputs(validOutputs);
    if (validationError) {
      alert(validationError);
      return;
    }

    const changeOutput =
      autoChange && change >= DUST_LIMIT
        ? [{ address: utxo.address, amountSats: change }]
        : [];

    if (autoChange && change > 0n && change < DUST_LIMIT) {
      console.info(`${change} sats change is dust — absorbed into fee`);
    }

    const allOutputs = [...validOutputs, ...changeOutput].filter(
      (o) => o.amountSats > 0n,
    );

    if (allOutputs.length === 0) {
      alert("add at least one output");
      return;
    }

    setSigning(true);
    try {
      const result = await signAndBuildTx(
        utxo,
        allOutputs,
        wif,
        opReturn || undefined,
      );
      setSignedHex(result.hex);
      setTxid(result.txid);
    } catch (e: any) {
      console.error(e);
      alert(e.message || "failed to sign transaction");
    } finally {
      setSigning(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-12">
      <div className="max-w-2xl mx-auto px-6 pt-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-orange-500 rounded-2xl flex items-center justify-center text-xl">
              ₿
            </div>
            <h1 className="text-5xl font-bold tracking-tighter">
              BitAssembler
            </h1>
          </div>
          <p className="text-zinc-500 text-lg">
            Client-side • Private • Beautiful
          </p>
        </div>

        <div className="space-y-10">
          <UtxoInput
            onFetch={fetchUtxo}
            loading={loading}
            error={error}
            utxo={utxo}
          />
          <OutputsBuilder
            outputs={outputs}
            onChange={setOutputs}
            change={change}
            totalOut={totalOut}
            fee={fee}
            utxo={utxo}
          />
          <OpReturnField value={opReturn} onChange={setOpReturn} />
          <FeeSelector
            feeRate={feeRate}
            onChange={setFeeRate}
            fee={fee}
            fees={fees}
          />

          <div className="bg-zinc-900/70 border border-zinc-800 rounded-3xl p-8">
            <h3 className="text-xl font-semibold mb-6">Transaction Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              {[
                {
                  label: "INPUT",
                  value: utxo?.amountSats?.toString() ?? "-",
                  color: "text-zinc-300",
                },
                {
                  label: "SENDING",
                  value: totalOut.toString(),
                  color: "text-emerald-400",
                },
                {
                  label: "FEE",
                  value: fee.toString(),
                  color: "text-amber-400",
                },
                {
                  label: "CHANGE",
                  value:
                    autoChange && change > 0n && change < 546n
                      ? "dust → fee"
                      : change.toString(),
                  color:
                    change < 0n
                      ? "text-red-500"
                      : autoChange && change > 0n && change < 546n
                        ? "text-amber-400"
                        : "text-zinc-300",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="bg-zinc-950 rounded-2xl py-5 border border-zinc-800"
                >
                  <div className="text-xs text-zinc-500 mb-1">{item.label}</div>
                  <div
                    className={`text-xl font-mono font-semibold ${item.color}`}
                  >
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-8">
            <h3 className="text-2xl font-semibold mb-6">Sign Transaction</h3>

            <input
              type="text"
              className="w-full bg-black border border-zinc-700 focus:border-orange-500 rounded-2xl px-6 py-5 text-lg font-mono placeholder-zinc-600 focus:outline-none transition-all"
              placeholder="Enter WIF (starts with K or L...)"
              value={wif}
              onChange={(e) => setWif(e.target.value)}
            />

            {derivedAddress && utxo && (
              <p
                className={`text-xs font-mono mt-2 ${wifMatchesUtxo ? "text-emerald-400" : "text-red-400"}`}
              >
                {wifMatchesUtxo
                  ? "key matches this UTXO"
                  : "key does not match this UTXO"}
              </p>
            )}
            {derivedAddress && !utxo && (
              <p className="text-xs font-mono mt-2 text-zinc-500">
                fetch a UTXO to verify key ownership
              </p>
            )}

            <p className="mt-3 text-sm text-amber-500">
              never send your private key anywhere, signing happens locally
            </p>

            <button
              onClick={handleSign}
              disabled={
                signing ||
                !utxo ||
                !wif ||
                change < 0n ||
                wifMatchesUtxo === false
              }
              className="mt-6 w-full bg-orange-600 hover:bg-orange-500 active:bg-orange-700 disabled:bg-zinc-800 disabled:text-zinc-500 transition-all py-6 rounded-2xl text-xl font-semibold tracking-wide"
            >
              {signing
                ? "Signing with SECP256K1..."
                : "BUILD & SIGN TRANSACTION"}
            </button>

            <div className="flex items-center justify-between py-3 border-t border-zinc-800 mt-6">
              <div>
                <p className="text-sm text-zinc-300">Auto change</p>
                <p className="text-xs text-zinc-600">
                  {autoChange
                    ? `${change.toLocaleString()} sats back to your address`
                    : "you control all outputs manually"}
                </p>
              </div>
              <button
                onClick={() => setAutoChange((a) => !a)}
                className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${autoChange ? "bg-orange-500" : "bg-zinc-700"}`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${autoChange ? "left-7" : "left-1"}`}
                />
              </button>
            </div>

            {manualWarning && (
              <p className="text-xs font-mono text-amber-400 mt-2">
                {unaccounted.toLocaleString()} sats unaccounted, add a change
                output or they go to the miner
              </p>
            )}
          </div>

          {signedHex && <HexVisualizer hex={signedHex} />}

          <BroadcastPanel
            hex={signedHex}
            txid={txid}
            onBroadcast={async () => {
              if (!signedHex) return;
              const res = await fetch("/api/broadcast", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ hex: signedHex }),
              });
              const data = await res.json();
              if (data.txid) setTxid(data.txid);
              else alert(data.error);
            }}
          />
        </div>
      </div>
    </div>
  );
}
