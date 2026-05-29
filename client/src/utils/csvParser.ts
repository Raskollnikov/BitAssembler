import { addressToScript } from "../crypto/address";
import type { Output } from "../crypto/txBuilder";

export interface CsvRow {
  line: number;
  address: string;
  amountSats: bigint;
  error: string | null;
}

export interface CsvParseResult {
  rows: CsvRow[];
  validOutputs: Output[];
  totalSats: bigint;
  hasErrors: boolean;
}

function parseAmount(value: string): { sats: bigint; error?: string } {
  const trimmed = value.trim();
  if (trimmed === "") return { sats: 0n, error: "missing amount" };

  if (trimmed.includes(".") || trimmed.includes("e")) {
    const btc = parseFloat(trimmed);
    if (isNaN(btc) || !isFinite(btc)) {
      return { sats: 0n, error: `invalid BTC amount: ${trimmed}` };
    }
    if (btc < 0) return { sats: 0n, error: "amount cannot be negative" };
    const sats = Math.round(btc * 100_000_000);
    return { sats: BigInt(sats) };
  } else {
    try {
      const sats = BigInt(trimmed);
      if (sats < 0n) return { sats: 0n, error: "amount cannot be negative" };
      return { sats };
    } catch {
      return { sats: 0n, error: `invalid satoshi amount: ${trimmed}` };
    }
  }
}

export function parseCSV(raw: string): CsvParseResult {
  const lines = raw.trim().split("\n");

  const firstLine = lines[0].toLowerCase().replace(/\s/g, "");
  const dataLines = firstLine.includes("address") ? lines.slice(1) : lines;

  const rows: CsvRow[] = dataLines
    .map((line, i) => ({ line: i + 2, raw: line }))
    .filter((l) => l.raw.trim() !== "")
    .map(({ line, raw }) => {
      const parts = raw.split(",").map((s) => s.trim());
      const address = parts[0] ?? "";
      const amountRaw = parts[1] ?? "";

      if (!address) {
        return { line, address, amountSats: 0n, error: "missing address" };
      }
      if (!amountRaw) {
        return { line, address, amountSats: 0n, error: "missing amount" };
      }

      const { sats, error: amountError } = parseAmount(amountRaw);
      if (amountError) {
        return { line, address, amountSats: 0n, error: amountError };
      }

      if (sats < 546n) {
        return {
          line,
          address,
          amountSats: sats,
          error: `dust: ${sats} sats < 546`,
        };
      }

      try {
        addressToScript(address);
      } catch {
        return { line, address, amountSats: sats, error: "invalid address" };
      }

      return { line, address, amountSats: sats, error: null };
    });

  const hasErrors = rows.some((r) => r.error !== null);
  const validOutputs: Output[] = hasErrors
    ? []
    : rows.map((r) => ({ address: r.address, amountSats: r.amountSats }));

  const totalSats = rows
    .filter((r) => !r.error)
    .reduce((s, r) => s + r.amountSats, 0n);

  return { rows, validOutputs, totalSats, hasErrors };
}
