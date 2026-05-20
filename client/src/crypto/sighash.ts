import {
  concat,
  hash256,
  hexToBytes,
  writeUInt32LE,
  writeUInt64LE,
  varInt,
} from "./primitives";
import { addressToScript } from "./address";
import type { Output, TxInput } from "./txBuilder";

function serializeOutput(out: Output): Uint8Array {
  const script = out.scriptPubKey ?? addressToScript(out.address!).scriptPubKey;
  return concat(writeUInt64LE(out.amountSats), varInt(script.length), script);
}

export function buildBIP143Sighash(
  input: TxInput,
  outputs: Output[],
): Uint8Array {
  const txidLE = hexToBytes(input.txid).reverse();
  const outpoint = concat(txidLE, writeUInt32LE(input.vout));

  const nVersion = writeUInt32LE(2);
  const hashPrevouts = hash256(outpoint);
  const hashSequence = hash256(writeUInt32LE(0xffffffff));

  const pubKeyHash = input.scriptPubKey.slice(2);
  const scriptCode = Uint8Array.from([
    0x19,
    0x76,
    0xa9,
    0x14,
    ...pubKeyHash,
    0x88,
    0xac,
  ]);

  const value = writeUInt64LE(input.amountSats);
  const nSequence = writeUInt32LE(0xffffffff);
  const hashOutputs = hash256(concat(...outputs.map(serializeOutput)));
  const nLocktime = writeUInt32LE(0);
  const sighashType = writeUInt32LE(1);

  const preimage = concat(
    nVersion,
    hashPrevouts,
    hashSequence,
    outpoint,
    scriptCode,
    value,
    nSequence,
    hashOutputs,
    nLocktime,
    sighashType,
  );

  return hash256(preimage);
}
