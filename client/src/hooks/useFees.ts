import { useState, useEffect } from "react";

export interface FeeEstimates {
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  economyFee: number;
}

export function useFees() {
  const [fees, setFees] = useState<FeeEstimates | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    window
      .fetch("/api/fees")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setFees(data);
        }
      })
      .catch(() => {
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { fees, loading };
}
