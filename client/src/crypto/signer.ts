import { secp, hash256, hexToBytes, concat, bytesToHex } from "./primitives";
import { buildOpReturnScript, type Output, type TxInput } from "./txBuilder";
import { buildBIP143Sighash } from "./sighash";
import { addressToScript } from "./address";
import { varInt, writeUInt32LE, writeUInt64LE } from "./primitives";

function wifToPrivKey(wif: string): Uint8Array {
  const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let num = 0n;
  for (const c of wif) {
    const idx = BASE58.indexOf(c);
    if (idx < 0) throw new Error("Invalid WIF char");
    num = num * 58n + BigInt(idx);
  }
  const bytes: number[] = [];
  while (num > 0n) {
    bytes.unshift(Number(num & 0xffn));
    num >>= 8n;
  }
  return Uint8Array.from(bytes.slice(1, 33));
}

function derEncode(r: bigint, s: bigint): Uint8Array {
  const N = secp.CURVE.n;

  if (s > N / 2n) s = N - s;

  function encodeScalar(v: bigint): Uint8Array {
    const hex = v.toString(16).padStart(64, "0");
    const bytes = Uint8Array.from(
      hex.match(/.{2}/g)!.map((b) => parseInt(b, 16)),
    );
    let start = 0;
    while (start < bytes.length - 1 && bytes[start] === 0) start++;
    const trimmed = bytes.slice(start);
    return trimmed[0] & 0x80 ? Uint8Array.from([0x00, ...trimmed]) : trimmed;
  }

  const rb = encodeScalar(r);
  const sb = encodeScalar(s);

  const inner = Uint8Array.from([
    0x02,
    rb.length,
    ...rb,
    0x02,
    sb.length,
    ...sb,
  ]);

  return Uint8Array.from([0x30, inner.length, ...inner, 0x01]);
}

function serializeOutput(out: Output): Uint8Array {
  const script = out.scriptPubKey ?? addressToScript(out.address!).scriptPubKey;
  return concat(writeUInt64LE(out.amountSats), varInt(script.length), script);
}

export interface SignedTxResult {
  hex: string;
  txid: string;
}

export async function signAndBuildTx(
  input: TxInput,
  outputs: Output[],
  wif: string,
  opReturnMessage?: string,
): Promise<SignedTxResult> {
  const privKey = wifToPrivKey(wif);
  const pubKey = secp.getPublicKey(privKey, true);

  const allOutputs: Output[] = [...outputs];
  if (opReturnMessage) {
    allOutputs.push({
      scriptPubKey: buildOpReturnScript(opReturnMessage),
      amountSats: 0n,
    });
  }

  const sighash = buildBIP143Sighash(input, outputs, opReturnMessage);

  const sig = await secp.sign(sighash, privKey, { lowS: true });
  const derSig = derEncode(sig.r, sig.s);

  const witness = concat(
    Uint8Array.from([0x02]),
    varInt(derSig.length),
    derSig,
    varInt(pubKey.length),
    pubKey,
  );

  const txidLE = hexToBytes(input.txid).reverse();
  const inputBytes = concat(
    txidLE,
    writeUInt32LE(input.vout),
    varInt(0),
    writeUInt32LE(0xffffffff),
  );
  const outputBytes = concat(...allOutputs.map(serializeOutput));

  const raw = concat(
    writeUInt32LE(2),
    Uint8Array.from([0x00, 0x01]),
    varInt(1),
    inputBytes,
    varInt(allOutputs.length),
    outputBytes,
    witness,
    writeUInt32LE(0),
  );

  const nonWitness = concat(
    writeUInt32LE(2),
    varInt(1),
    inputBytes,
    varInt(allOutputs.length),
    outputBytes,
    writeUInt32LE(0),
  );
  const txid = bytesToHex(hash256(nonWitness).reverse());

  return { hex: bytesToHex(raw), txid };
}
