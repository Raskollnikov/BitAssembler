import * as secp from "@noble/secp256k1";
import { sha256 } from "@noble/hashes/sha2.js";
import { ripemd160 } from "@noble/hashes/legacy.js";

export function hash256(data: Uint8Array): Uint8Array {
  return sha256(sha256(data));
}

export function hash160(data: Uint8Array): Uint8Array {
  return ripemd160(sha256(data));
}

export function hexToBytes(hex: string): Uint8Array {
  return Uint8Array.from(hex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function writeUInt32LE(n: number): Uint8Array {
  const buf = new Uint8Array(4);
  new DataView(buf.buffer).setUint32(0, n, true);
  return buf;
}

export function writeUInt64LE(n: bigint): Uint8Array {
  const buf = new Uint8Array(8);
  new DataView(buf.buffer).setBigUint64(0, n, true);
  return buf;
}

export function varInt(n: number): Uint8Array {
  if (n < 0xfd) return Uint8Array.from([n]);
  if (n <= 0xffff) return Uint8Array.from([0xfd, n & 0xff, (n >> 8) & 0xff]);
  throw new Error("varInt too large for this tool");
}

export function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;

  for (const a of arrays) {
    out.set(a, offset);
    offset += a.length;
  }

  return out;
}

export { secp, sha256 };
