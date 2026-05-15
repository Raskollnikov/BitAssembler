import { hash256 } from "./primitives.js";
const CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const GENERATOR = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];

function bech32Polymod(values: number[]): number {
  let chk = 1;
  for (const v of values) {
    const top = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) if ((top >> i) & 1) chk ^= GENERATOR[i];
  }
  return chk;
}

function bech32HrpExpand(hrp: string): number[] {
  const ret: number[] = [];
  for (let i = 0; i < hrp.length; i++) ret.push(hrp.charCodeAt(i) >> 5);
  ret.push(0);
  for (let i = 0; i < hrp.length; i++) ret.push(hrp.charCodeAt(i) & 31);
  return ret;
}

function bech32Decode(addr: string): { words: number[]; version: number } {
  const lower = addr.toLowerCase();
  const sep = lower.lastIndexOf("1");
  const hrp = lower.slice(0, sep);
  const data = lower.slice(sep + 1);

  const words: number[] = [];
  for (const c of data) {
    const idx = CHARSET.indexOf(c);
    if (idx < 0) throw new Error("Invalid bech32 char");
    words.push(idx);
  }

  const isBech32m =
    bech32Polymod([...bech32HrpExpand(hrp), ...words]) === 0x2bc830a3;
  const isBech32 = bech32Polymod([...bech32HrpExpand(hrp), ...words]) === 1;
  if (!isBech32 && !isBech32m) throw new Error("Invalid bech32 checksum");

  const version = words[0];
  const payload = words.slice(1, -6);

  const bytes: number[] = [];
  let acc = 0,
    bits = 0;
  for (const w of payload) {
    acc = (acc << 5) | w;
    bits += 5;
    while (bits >= 8) {
      bits -= 8;
      bytes.push((acc >> bits) & 0xff);
    }
  }

  return { words: bytes, version };
}

const BASE58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function base58Decode(str: string): Uint8Array {
  let num = BigInt(0);
  for (const c of str) {
    const idx = BASE58_ALPHABET.indexOf(c);
    if (idx < 0) throw new Error("Invalid base58 char");
    num = num * BigInt(58) + BigInt(idx);
  }

  let leadingZeros = 0;
  for (const c of str) {
    if (c === "1") leadingZeros++;
    else break;
  }

  const bytes: number[] = [];
  while (num > 0n) {
    bytes.unshift(Number(num & 0xffn));
    num >>= 8n;
  }
  return Uint8Array.from([...Array(leadingZeros).fill(0), ...bytes]);
}

function base58CheckDecode(addr: string): {
  version: number;
  hash: Uint8Array;
} {
  const decoded = base58Decode(addr);
  const payload = decoded.slice(0, -4);
  const checksum = decoded.slice(-4);
  const expectedCheck = hash256(payload).slice(0, 4);
  for (let i = 0; i < 4; i++) {
    if (checksum[i] !== expectedCheck[i])
      throw new Error("Invalid base58check checksum");
  }
  return { version: payload[0], hash: payload.slice(1) };
}

export type ScriptType = "P2WPKH" | "P2TR" | "P2PKH" | "P2SH";

export interface DecodedAddress {
  scriptPubKey: Uint8Array;
  type: ScriptType;
}

export function addressToScript(address: string): DecodedAddress {
  const lower = address.toLowerCase();

  if (lower.startsWith("bc1q")) {
    const { words } = bech32Decode(address);
    if (words.length !== 20) throw new Error("P2WPKH must be 20 bytes");
    return {
      scriptPubKey: Uint8Array.from([0x00, 0x14, ...words]),
      type: "P2WPKH",
    };
  }

  if (lower.startsWith("bc1p")) {
    const { words } = bech32Decode(address);
    if (words.length !== 32) throw new Error("P2TR must be 32 bytes");
    return {
      scriptPubKey: Uint8Array.from([0x51, 0x20, ...words]),
      type: "P2TR",
    };
  }

  if (address.startsWith("1")) {
    const { version, hash } = base58CheckDecode(address);
    if (version !== 0x00) throw new Error("Not a P2PKH address");
    return {
      scriptPubKey: Uint8Array.from([0x76, 0xa9, 0x14, ...hash, 0x88, 0xac]),
      type: "P2PKH",
    };
  }

  if (address.startsWith("3")) {
    const { version, hash } = base58CheckDecode(address);
    if (version !== 0x05) throw new Error("Not a P2SH address");
    return {
      scriptPubKey: Uint8Array.from([0xa9, 0x14, ...hash, 0x87]),
      type: "P2SH",
    };
  }

  throw new Error(`Unrecognized address format: ${address}`);
}
