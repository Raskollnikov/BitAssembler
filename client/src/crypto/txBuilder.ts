import {
  concat,
  hexToBytes,
  varInt,
  writeUInt32LE,
  writeUInt64LE,
} from "./primitives";
import { addressToScript } from "./address";

export interface Output {
  address?: string;
  scriptPubKey?: Uint8Array;
  amountSats: bigint;
}

export interface TxInput {
  txid: string;
  vout: number;
  amountSats: bigint;
  scriptPubKey: Uint8Array;
}

export interface UnsignedTx {
  input: TxInput;
  outputs: Output[];
  opReturnMessage?: string;
}

export function buildOpReturnScript(message: string): Uint8Array {
  const data = new TextEncoder().encode(message);
  if (data.length > 80) throw new Error("OP_RETURN data max 80 bytes");
  return Uint8Array.from([0x6a, data.length, ...data]);
}

export function serializeOutput(out: Output): Uint8Array {
  const script = out.scriptPubKey ?? addressToScript(out.address!).scriptPubKey;
  return concat(writeUInt64LE(out.amountSats), varInt(script.length), script);
}

export function buildUnsignedTx(tx: UnsignedTx): Uint8Array {
  const { input, outputs, opReturnMessage } = tx;

  const allOutputs: Output[] = [...outputs];
  if (opReturnMessage) {
    allOutputs.push({
      scriptPubKey: buildOpReturnScript(opReturnMessage),
      amountSats: 0n,
    });
  }

  const txidLE = hexToBytes(input.txid).reverse();

  const version = writeUInt32LE(2);
  const marker = Uint8Array.from([0x00, 0x01]);
  const inCount = varInt(1);
  const inputBytes = concat(
    txidLE,
    writeUInt32LE(input.vout),
    varInt(0),
    writeUInt32LE(0xffffffff),
  );
  const outCount = varInt(allOutputs.length);
  const outputBytes = concat(...allOutputs.map(serializeOutput));
  const locktime = writeUInt32LE(0);

  const witnessPlaceholder = Uint8Array.from([0x00]);

  return concat(
    version,
    marker,
    inCount,
    inputBytes,
    outCount,
    outputBytes,
    witnessPlaceholder,
    locktime,
  );
}
