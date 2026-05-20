import { secp, hash256, hexToBytes, concat, bytesToHex } from "./primitives";
import { buildOpReturnScript, type Output, type TxInput } from "./txBuilder";
import { buildBIP143Sighash } from "./sighash";
import { addressToScript, base58Decode } from "./address";
import { varInt, writeUInt32LE, writeUInt64LE } from "./primitives";
import { hash160 } from "./primitives";

function wifToPrivKey(input: string): Uint8Array {
  const cleaned = input.trim();
  if (/^[0-9a-fA-F]{64}$/.test(cleaned)) return hexToBytes(cleaned);

  const decoded = base58Decode(cleaned);
  if (decoded.length < 4) throw new Error("WIF too short");

  const payload = decoded.slice(0, -4);
  const checksum = decoded.slice(-4);
  const expected = hash256(payload).slice(0, 4);
  for (let i = 0; i < 4; i++) {
    if (checksum[i] !== expected[i]) throw new Error("Invalid WIF checksum");
  }
  if (payload[0] !== 0x80) throw new Error("Invalid WIF version (not mainnet)");

  const isCompressed = payload.length === 34 && payload[33] === 0x01;
  if (!isCompressed && payload.length !== 33)
    throw new Error("Invalid WIF payload length");

  const privateKeyBytes = payload.slice(1, 33);
  if (privateKeyBytes.length !== 32)
    throw new Error("Invalid private key length in WIF");
  return Uint8Array.from(privateKeyBytes);
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

  const sighash = buildBIP143Sighash(input, allOutputs);

  const sigBytes = await secp.sign(sighash, privKey, { lowS: true, der: true });
  const derSig = Uint8Array.from([...sigBytes, 0x01]);

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

  const outputBytes = concat(
    ...allOutputs.map((out) => {
      const script =
        out.scriptPubKey ?? addressToScript(out.address!).scriptPubKey;
      return concat(
        writeUInt64LE(out.amountSats),
        varInt(script.length),
        script,
      );
    }),
  );

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

export function getAddressFromWif(wif: string): {
  pubKey: Uint8Array;
  pubKeyHash: Uint8Array;
} {
  const privKey = wifToPrivKey(wif);
  const pubKey = secp.getPublicKey(privKey, true);
  return { pubKey, pubKeyHash: hash160(pubKey) };
}
